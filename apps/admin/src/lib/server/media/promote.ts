/**
 * Copying legacy artwork into the bucket.
 *
 * The content import seeded one `media_assets` row per image the old site referenced, but
 * 28 of them point at someone else's CDN (`external_url`) — a design-tool host this project
 * does not control and cannot ask to keep serving. This module fetches those bytes, stores
 * them in R2, and repoints the row, which is what lets the legacy host be retired.
 *
 * **The row id never changes.** Published revisions and site settings reference assets by
 * id, so a promotion is invisible to every payload; only the resolution moves, and
 * `publicMediaUrl` starts returning `MEDIA_URL/<key>` for a row it previously passed
 * through as an external URL.
 *
 * It is safe to run repeatedly, and running it is the only way it finishes: a row is
 * eligible only while it has an `external_url` and no `object_key`, so a promoted row is
 * skipped, and a batch that dies part way leaves the rest to the next run.
 */
import { and, eq, inArray, isNotNull, isNull, sql } from 'drizzle-orm';
import { db as defaultDb } from '$lib/server/db';
import { mediaAssets } from '$lib/server/db/schema';
import { objectKeyFor } from './keys';
import { formatBytes, MAX_UPLOAD_BYTES, validateUpload } from './validate';

type Database = typeof defaultDb;

/**
 * How many images are fetched at once.
 *
 * These are independent network round trips, so the whole batch is wall-clock bound rather
 * than CPU bound: 28 images at this width take a few seconds and stay well inside a Worker
 * request, where one at a time would test the patience of whoever is watching. Small enough
 * that a burst does not look like an attack to the host being read.
 */
const CONCURRENCY = 4;

/** What a single image did. */
export type PromoteOutcome = {
	id: string;
	name: string;
	ok: boolean;
	/** Why it failed, or what was stored — for the message the administrator reads. */
	detail: string;
};

export type PromoteReport = {
	outcomes: PromoteOutcome[];
	/** Rows still on the legacy host once this run finished. */
	remaining: number;
};

/**
 * Rejects anything that is not a plain https URL to a public host.
 *
 * The server is the one making the request, from a URL that came out of the database —
 * which is the shape of an SSRF bug. Nothing in the admin can set `external_url` today (a
 * one-shot import writes it), but a guard that holds only while that stays true is not a
 * guard. `fetch` from a Worker is already blocked from reaching private addresses, so this
 * is the cheap layer in front of it, and it fails loudly rather than silently skipping.
 */
export function assertRemoteUrl(value: string): string {
	let url: URL;

	try {
		url = new URL(value);
	} catch {
		throw new Error(`not a URL: ${value}`);
	}

	if (url.protocol !== 'https:') {
		throw new Error(`only https is fetched, not ${url.protocol}`);
	}

	const host = url.hostname.toLowerCase();

	// A hostname, not an address: no legitimate image host here is a bare literal, and
	// rejecting literals covers loopback, link-local, and private ranges in one rule.
	const isAddress = /^[\d.]+$/.test(host) || host.startsWith('[');

	if (isAddress) throw new Error(`refusing to fetch an address: ${host}`);
	if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal')) {
		throw new Error(`refusing to fetch an internal host: ${host}`);
	}

	return url.toString();
}

/** The database rows a promotion could act on: bytes elsewhere, nothing in the bucket yet. */
export function isPromotable(row: {
	externalUrl: string | null;
	objectKey: string | null;
}): boolean {
	return row.externalUrl !== null && row.objectKey === null;
}

/**
 * Copies legacy artwork into R2, one row per image.
 *
 * Pass `ids` for a single image; omit it to work through everything still on the legacy
 * host. A row that fails is reported and does not stop the batch — a single dead URL should
 * not block the other twenty-seven.
 */
export async function promoteLegacyAssets(input: {
	bucket: R2Bucket | undefined;
	ids?: readonly string[];
	db?: Database;
}): Promise<PromoteReport> {
	const db = input.db ?? defaultDb;

	if (!input.bucket) {
		return {
			outcomes: [
				{
					id: '',
					name: '',
					ok: false,
					detail: 'The media bucket is not bound in this environment.',
				},
			],
			remaining: await countLegacy(db),
		};
	}

	const bucket = input.bucket;

	const rows = await db
		.select({
			id: mediaAssets.id,
			externalUrl: mediaAssets.externalUrl,
			objectKey: mediaAssets.objectKey,
			originalName: mediaAssets.originalName,
		})
		.from(mediaAssets)
		.where(
			input.ids
				? inArray(mediaAssets.id, [...input.ids])
				: and(isNotNull(mediaAssets.externalUrl), isNull(mediaAssets.objectKey)),
		);

	const eligible = rows.filter(isPromotable);
	const outcomes: PromoteOutcome[] = [];

	for (let index = 0; index < eligible.length; index += CONCURRENCY) {
		const batch = eligible.slice(index, index + CONCURRENCY);

		outcomes.push(
			...(await Promise.all(batch.map((row) => promoteOne(row, bucket, db).catch(toOutcome(row))))),
		);
	}

	return { outcomes, remaining: await countLegacy(db) };
}

/** How many rows still resolve to the legacy host. */
export async function countLegacy(db: Database = defaultDb): Promise<number> {
	const [row] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(mediaAssets)
		.where(isNotNull(mediaAssets.externalUrl));

	return row?.count ?? 0;
}

async function promoteOne(
	row: { id: string; externalUrl: string | null; originalName: string },
	bucket: R2Bucket,
	db: Database,
): Promise<PromoteOutcome> {
	const url = assertRemoteUrl(row.externalUrl ?? '');
	const response = await fetch(url);

	if (!response.ok) {
		return {
			id: row.id,
			name: row.originalName,
			ok: false,
			detail: `${response.status} from the host`,
		};
	}

	// Redirects are followed, so what answered is not necessarily what was asked for.
	assertRemoteUrl(response.url);

	const declaredLength = Number(response.headers.get('content-length') ?? Number.NaN);

	if (Number.isFinite(declaredLength) && declaredLength > MAX_UPLOAD_BYTES) {
		return {
			id: row.id,
			name: row.originalName,
			ok: false,
			detail: `${formatBytes(declaredLength)} is over the ${formatBytes(MAX_UPLOAD_BYTES)} limit`,
		};
	}

	const bytes = new Uint8Array(await response.arrayBuffer());

	const decision = validateUpload({
		bytes,
		fileName: row.originalName,
		// The Content-Type is deliberately *not* passed as the declared type. It comes from a
		// third party rather than from a user, and `validateUpload` treats a declared type
		// that disagrees with the bytes as tampering — a host labelling a JPEG
		// `application/octet-stream` would block the promotion for no security gain, since the
		// bytes decide both the MIME type and the extension either way.
		declaredType: null,
	});

	if (!decision.ok) {
		return { id: row.id, name: row.originalName, ok: false, detail: decision.reason };
	}

	const objectKey = objectKeyFor(decision.extension);

	await bucket.put(objectKey, bytes, {
		httpMetadata: { contentType: decision.mimeType },
		// Provenance lives on the object rather than in a column: `media_assets` has a check
		// constraint that a row has *either* a key or a URL, and keeping both would make the
		// old host look like a live fallback.
		customMetadata: { mediaAssetId: row.id, promotedFrom: url.slice(0, 900) },
	});

	try {
		await db
			.update(mediaAssets)
			.set({
				objectKey,
				externalUrl: null,
				mimeType: decision.mimeType,
				byteSize: decision.byteSize,
				width: decision.width,
				height: decision.height,
			})
			.where(eq(mediaAssets.id, row.id));
	} catch (error) {
		// Same discipline as an upload: an object nothing points at is an orphan.
		await bucket.delete(objectKey);

		throw error;
	}

	return {
		id: row.id,
		name: row.originalName,
		ok: true,
		detail: `${decision.mimeType}, ${formatBytes(decision.byteSize)}`,
	};
}

/** A thrown error inside the batch becomes that image's outcome rather than killing the run. */
function toOutcome(row: { id: string; originalName: string }) {
	return (error: unknown): PromoteOutcome => ({
		id: row.id,
		name: row.originalName,
		ok: false,
		detail: error instanceof Error ? error.message : String(error),
	});
}
