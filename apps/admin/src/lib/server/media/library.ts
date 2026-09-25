/**
 * The media library: reading it, and the two operations that destroy something.
 *
 * The rule the whole module is built around: **an asset that content still points at is
 * never removed.** Deleting bytes is a one-way door, and a published revision keeps
 * working forever, so the guard checks every place a reference can live — the current
 * draft of every entry, every historical revision, and every site setting.
 *
 * That makes deletion deliberately hard to reach, which is the point. Hiding something
 * (archiving) is the cheap, reversible action and is what an administrator normally
 * wants.
 */

import { collectMediaIds, collectSettingMediaIds } from '@banggai/content-model';
import { and, desc, eq, ilike, isNotNull, isNull, or, type SQL, sql } from 'drizzle-orm';
import { db as defaultDb } from '$lib/server/db';
import { contentEntries, contentRevisions, mediaAssets, siteSettings } from '$lib/server/db/schema';

/** A row as the library shows it. */
export type MediaAsset = {
	id: string;
	objectKey: string | null;
	externalUrl: string | null;
	originalName: string;
	mimeType: string | null;
	byteSize: number | null;
	width: number | null;
	height: number | null;
	altText: string | null;
	createdAt: Date;
	archivedAt: Date | null;
};

/**
 * What the library can be filtered to. `owned` means the bytes are in R2 and therefore
 * removable; `legacy` means they live on someone else's CDN and can only be hidden.
 */
export type MediaFilter = 'all' | 'owned' | 'legacy' | 'missing-alt' | 'archived';

export type MediaQuery = {
	filter?: MediaFilter;
	/** Free-text match on the file name. */
	search?: string;
	limit?: number;
};

const DEFAULT_LIMIT = 60;

/** One page of the library, newest first. */
export async function listMedia(query: MediaQuery = {}, db = defaultDb): Promise<MediaAsset[]> {
	const rows = await db
		.select(columns)
		.from(mediaAssets)
		.where(and(...conditions(query)))
		.orderBy(desc(mediaAssets.createdAt))
		.limit(query.limit ?? DEFAULT_LIMIT);

	return rows;
}

/**
 * How many rows each filter would show, so the UI can label the tabs without issuing one
 * query per tab.
 */
export async function countMedia(db = defaultDb): Promise<Record<MediaFilter, number>> {
	const [row] = await db
		.select({
			all: sql<number>`count(*) filter (where ${mediaAssets.archivedAt} is null)`.mapWith(Number),
			owned:
				sql<number>`count(*) filter (where ${mediaAssets.archivedAt} is null and ${mediaAssets.objectKey} is not null)`.mapWith(
					Number,
				),
			legacy:
				sql<number>`count(*) filter (where ${mediaAssets.archivedAt} is null and ${mediaAssets.externalUrl} is not null)`.mapWith(
					Number,
				),
			missingAlt:
				sql<number>`count(*) filter (where ${mediaAssets.archivedAt} is null and (${mediaAssets.altText} is null or ${mediaAssets.altText} = ''))`.mapWith(
					Number,
				),
			archived: sql<number>`count(*) filter (where ${mediaAssets.archivedAt} is not null)`.mapWith(
				Number,
			),
		})
		.from(mediaAssets);

	return {
		all: row?.all ?? 0,
		owned: row?.owned ?? 0,
		legacy: row?.legacy ?? 0,
		'missing-alt': row?.missingAlt ?? 0,
		archived: row?.archived ?? 0,
	};
}
export async function getMediaAsset(id: string, db = defaultDb): Promise<MediaAsset | null> {
	const [row] = await db.select(columns).from(mediaAssets).where(eq(mediaAssets.id, id)).limit(1);

	return row ?? null;
}

/**
 * Looks an asset up by its stored object key.
 *
 * Separate from `getMediaAsset` on purpose: the key is `<uuid>.<extension>`, so passing
 * one to an id lookup is a type error Postgres only catches at query time. The serving
 * route has a key and needs this shape.
 */
export async function getMediaAssetByObjectKey(
	objectKey: string,
	db = defaultDb,
): Promise<MediaAsset | null> {
	const [row] = await db
		.select(columns)
		.from(mediaAssets)
		.where(eq(mediaAssets.objectKey, objectKey))
		.limit(1);

	return row ?? null;
}

/** Alt text is required before an image is meaningful, so it is editable independently. */
export async function setAltText(id: string, altText: string, db = defaultDb): Promise<void> {
	await db
		.update(mediaAssets)
		.set({ altText: altText.trim() === '' ? null : altText.trim() })
		.where(eq(mediaAssets.id, id));
}

/** Hides an asset from the library. Reversible, and does not touch the bytes. */
export async function setArchived(id: string, archived: boolean, db = defaultDb): Promise<void> {
	await db
		.update(mediaAssets)
		.set({ archivedAt: archived ? new Date() : null })
		.where(eq(mediaAssets.id, id));
}

/** Where an asset is still used. */
export type MediaReference = {
	/** `package:island-hopping-coral-sanctuary`, or `site_settings.ctaBackground`. */
	readonly where: string;
	/** `draft` for the working copy, `published`/`revision N` for history. */
	readonly state: string;
};

/**
 * The rows a reference can hide in, fetched in three queries.
 *
 * Every payload is loaded and walked rather than queried: JSONB containment could answer
 * this in the database, but it would need a GIN index per shape and the walk has to agree
 * with the deletion guard's definition of "a media field" regardless. At this library's
 * size — tens of entries — the walk is cheaper than the index.
 */
export async function findReferences(id: string, db = defaultDb): Promise<MediaReference[]> {
	const [entries, revisions, settings] = await Promise.all([
		db
			.select({
				kind: contentEntries.kind,
				slug: contentEntries.slug,
				payload: contentEntries.draftPayload,
			})
			.from(contentEntries),
		db
			.select({
				id: contentRevisions.id,
				kind: contentRevisions.kind,
				slug: contentRevisions.slug,
				revisionNumber: contentRevisions.revisionNumber,
				payload: contentRevisions.payload,
				publishedRevisionId: contentEntries.publishedRevisionId,
			})
			.from(contentRevisions)
			.innerJoin(contentEntries, eq(contentEntries.id, contentRevisions.entryId)),
		db.select({ key: siteSettings.key, value: siteSettings.value }).from(siteSettings),
	]);

	return referencesIn(entries, revisions, settings, id);
}

/**
 * The pure half of `findReferences`, so the guard's actual decision is unit-testable
 * without a database.
 */
export function referencesIn(
	entries: { kind: string; slug: string; payload: unknown }[],
	revisions: {
		kind: string;
		slug: string;
		revisionNumber: number;
		payload: unknown;
		publishedRevisionId: string | null;
		id: string;
	}[],
	settings: { key: string; value: unknown }[],
	id: string,
): MediaReference[] {
	const found: MediaReference[] = [];

	for (const entry of entries) {
		if (collectMediaIds(kindOf(entry.kind), entry.payload).includes(id)) {
			found.push({ where: `${entry.kind}:${entry.slug}`, state: 'draft' });
		}
	}

	for (const revision of revisions) {
		if (!collectMediaIds(kindOf(revision.kind), revision.payload).includes(id)) continue;

		found.push({
			where: `${revision.kind}:${revision.slug}`,
			state:
				revision.publishedRevisionId === revision.id
					? 'published'
					: `revision ${revision.revisionNumber}`,
		});
	}

	for (const setting of settings) {
		if (collectSettingMediaIds(setting.key, setting.value).includes(id)) {
			found.push({ where: `site_settings.${setting.key}`, state: 'live' });
		}
	}

	return found;
}

/**
 * Removes an asset for good: the R2 object first, then the row.
 *
 * The order matters. If the object deletion fails the row is untouched and the caller can
 * retry, whereas archiving the row first and then failing to delete the bytes would leave
 * an object nothing in the library can ever find again.
 *
 * A legacy `externalUrl` has no bytes here to delete — the asset is only hidden, because
 * dropping the row would erase the record of what used to be rendered.
 */
export async function deleteMediaAsset(
	input: { id: string; bucket?: R2Bucket | undefined },
	db = defaultDb,
): Promise<{ ok: true; removedObject: boolean } | { ok: false; references: MediaReference[] }> {
	const asset = await getMediaAsset(input.id, db);

	if (!asset) return { ok: false, references: [] };

	const references = await findReferences(input.id, db);

	if (references.length > 0) return { ok: false, references };

	if (asset.objectKey && input.bucket) {
		await input.bucket.delete(asset.objectKey);
	}

	await db.delete(mediaAssets).where(eq(mediaAssets.id, input.id));

	return { ok: true, removedObject: Boolean(asset.objectKey && input.bucket) };
}

const columns = {
	id: mediaAssets.id,
	objectKey: mediaAssets.objectKey,
	externalUrl: mediaAssets.externalUrl,
	originalName: mediaAssets.originalName,
	mimeType: mediaAssets.mimeType,
	byteSize: mediaAssets.byteSize,
	width: mediaAssets.width,
	height: mediaAssets.height,
	altText: mediaAssets.altText,
	createdAt: mediaAssets.createdAt,
	archivedAt: mediaAssets.archivedAt,
};

function conditions(query: MediaQuery): SQL[] {
	const filters: SQL[] = [];

	switch (query.filter ?? 'all') {
		case 'owned':
			filters.push(isNull(mediaAssets.archivedAt), isNotNull(mediaAssets.objectKey));
			break;
		case 'legacy':
			filters.push(isNull(mediaAssets.archivedAt), isNotNull(mediaAssets.externalUrl));
			break;
		case 'missing-alt':
			filters.push(
				isNull(mediaAssets.archivedAt),
				or(isNull(mediaAssets.altText), eq(mediaAssets.altText, '')) as SQL,
			);
			break;
		case 'archived':
			filters.push(isNotNull(mediaAssets.archivedAt));
			break;
		default:
			filters.push(isNull(mediaAssets.archivedAt));
	}

	if (query.search) filters.push(ilike(mediaAssets.originalName, `%${query.search}%`));

	return filters;
}

/**
 * The stored `kind` is constrained to the three content kinds by the enum, so a value
 * outside them is a database that has drifted from the schema rather than user input.
 */
function kindOf(value: string): 'package' | 'destination' | 'article' {
	if (value === 'package' || value === 'destination' || value === 'article') return value;

	throw new Error(`Unknown content kind in the database: ${value}`);
}
