/**
 * Reading published content.
 *
 * Everything a visitor can see comes from here, and the shape of these queries follows from
 * one fact about the admin: **a published revision is always valid.** `publish` validates the
 * draft against `@banggai/content-model` and refuses to write a revision that fails, so
 * `content_revisions.payload` is the one column a page can be rendered from without a
 * fallback. A payload that fails to parse here therefore means the contract moved underneath
 * stored data — a bug to surface loudly, not a page to render half of.
 *
 * Three decisions worth naming:
 *
 * - **The public URL is `content_entries.slug`, not the revision's.** `saveDraft` moves the
 *   entry's slug the moment an editor renames a page, and the redirect it records points at
 *   that new slug. Matching on `content_revisions.slug` would 404 a renamed page until it was
 *   republished, which is the opposite of what the redirect promises.
 * - **Only `published_revision_id` is read.** An entry with unpublished changes still serves
 *   the revision the pointer names, and a revision that is not the pointer's target is
 *   history. Selecting "the newest revision" would leak drafts onto the live site.
 * - **Validation runs before resolution, not after.** Stored media fields hold `media_assets`
 *   ids, which the contract checks as uuids; rendered ones hold URLs. Resolving first would
 *   hand `z.uuid()` a URL and fail every page on the site.
 */
import {
	type ContentKind,
	collectMediaIds,
	type PayloadFor,
	parsePayload,
	rewriteMediaRefs,
} from '@banggai/content-model';
import { database } from '$lib/server/db';
import { describeIssues } from './issues';
import { loadMedia } from './media';

/** One published page, ready to render: the payload with its media ids resolved to URLs. */
export type PublishedEntry<Kind extends ContentKind> = {
	slug: string;
	/** Position within its kind, as the admin ordered it. Lower comes first. */
	sortOrder: number;
	featured: boolean;
	payload: PayloadFor<Kind>;
};

/** Every published, unarchived entry of one kind, in the order the admin put them. */
export async function loadPublishedEntries<Kind extends ContentKind>(
	kind: Kind,
): Promise<PublishedEntry<Kind>[]> {
	const rows = await database()`
		select e.slug, e.sort_order, e.featured, r.payload
		from content_entries e
		join content_revisions r on r.id = e.published_revision_id
		where e.kind = ${kind} and e.archived_at is null
		order by e.sort_order, e.slug
	`;

	return hydrate(kind, rows.map(toRow));
}

/**
 * One published entry, or null when nothing published answers to that slug.
 *
 * A null here is not a 404 by itself: the caller checks `resolveSlugRedirect` before it
 * gives up, because a slug that has moved is the most likely reason for a miss.
 */
export async function loadPublishedEntry<Kind extends ContentKind>(
	kind: Kind,
	slug: string,
): Promise<PublishedEntry<Kind> | null> {
	const rows = await database()`
		select e.slug, e.sort_order, e.featured, r.payload
		from content_entries e
		join content_revisions r on r.id = e.published_revision_id
		where e.kind = ${kind} and e.slug = ${slug} and e.archived_at is null
		limit 1
	`;

	const [entry] = await hydrate(kind, rows.map(toRow));

	return entry ?? null;
}

/** The columns both queries select. Narrowed here so the mapping below is typed. */
type Row = {
	slug: string;
	sortOrder: number;
	featured: boolean;
	payload: unknown;
};

/**
 * The driver hands back `Record<string, any>` rows: it knows the columns came from Postgres,
 * not what they are called. Named fields are what the rest of this module can work with, and
 * the coercions make the value types explicit — Postgres already types `sort_order` as an
 * integer and `featured` as a boolean, and the payload arrives as a parsed JSON object rather
 * than a string, which is why nothing here calls `JSON.parse`.
 */
function toRow(row: Record<string, unknown>): Row {
	return {
		slug: String(row.slug),
		sortOrder: Number(row.sort_order),
		featured: Boolean(row.featured),
		payload: row.payload,
	};
}

/**
 * Validates each stored payload, then resolves every image the page will render — one
 * lookup for the whole page rather than one per reference.
 */
async function hydrate<Kind extends ContentKind>(
	kind: Kind,
	rows: readonly Row[],
): Promise<PublishedEntry<Kind>[]> {
	const entries = rows.map((row) => {
		const parsed = parseAs(kind, row.payload);

		if (!parsed.ok) {
			throw new Error(
				`The published ${kind} “${row.slug}” does not satisfy its contract, so it cannot ` +
					`be served:\n  ${parsed.issues.join('\n  ')}`,
			);
		}

		return {
			slug: row.slug,
			sortOrder: row.sortOrder,
			featured: row.featured,
			payload: parsed.payload,
		};
	});

	const media = await loadMedia(entries.flatMap((entry) => collectMediaIds(kind, entry.payload)));

	return entries.map((entry) => ({
		...entry,
		payload: rewriteMediaRefs(kind, entry.payload, (id) => media.url(id))
			.payload as PayloadFor<Kind>,
	}));
}

type Parsed<Kind extends ContentKind> =
	| { ok: true; payload: PayloadFor<Kind> }
	| { ok: false; issues: string[] };

/**
 * `parsePayload` picks its schema out of a record keyed by the same `kind`, so the data it
 * returns *is* that kind's payload by construction — but TypeScript widens the result to the
 * union of all three, and only an assertion puts it back. Keeping that assertion here means
 * it appears once, next to the reasoning, instead of at every call site.
 */
function parseAs<Kind extends ContentKind>(kind: Kind, value: unknown): Parsed<Kind> {
	const parsed = parsePayload(kind, value);

	if (!parsed.success) return { ok: false, issues: describeIssues(parsed.error.issues) };

	return { ok: true, payload: parsed.data as PayloadFor<Kind> };
}
