/**
 * The content service: everything that reads or changes an entry.
 *
 * ## The rule that shapes this file
 *
 * **A draft may be incomplete. A published revision may not.**
 *
 * Editing and publishing are separate facts, and a half-finished edit has to be saveable —
 * otherwise the only way to work is to compose a whole valid payload in one sitting, which
 * no real editorial process does. So `saveDraft` stores whatever the form submitted, and
 * **`publish` is the gate**: it validates against the contract and refuses, with the
 * offending fields named, if the draft cannot be published. The public site only ever
 * reads `content_revisions`, which are therefore always valid.
 *
 * ## Status is derived, never stored
 *
 * `publishedRevisionId`, `draftPayload` and `archivedAt` are enough to say which of the
 * four states an entry is in, and deriving it means a save cannot forget to update a
 * status column. The derivation is a pure function so it can be tested directly.
 *
 * Publishing is one `db.batch()` — insert the revision, move the pointer, record any
 * redirect — because the HTTP driver has no interactive transaction. Client-generated ids
 * make the three statements order-independent within the batch.
 */
import { randomUUID } from 'node:crypto';
import type { ContentKind } from '@banggai/content-model';
import { and, asc, desc, eq, ilike, isNull, max, ne, sql } from 'drizzle-orm';
import { db as defaultDb } from '$lib/server/db';
import { contentEntries, contentRevisions, slugRedirects } from '$lib/server/db/schema';
import { assertValidPayload, ContentValidationError } from './validate';

type Database = typeof defaultDb;

/** The four states the list labels. Derived — see the module comment. */
export type ContentStatus = 'draft' | 'published' | 'changed' | 'archived';

export type EntrySummary = {
	id: string;
	kind: ContentKind;
	slug: string;
	sortOrder: number;
	featured: boolean;
	archivedAt: Date | null;
	status: ContentStatus;
	/** Whether the *draft* would pass the contract, so the list can warn before publish. */
	publishable: boolean;
	title: string;
	updatedAt: Date;
	publishedAt: Date | null;
	revisionCount: number;
};

export type EntryDetail = {
	id: string;
	kind: ContentKind;
	slug: string;
	sortOrder: number;
	featured: boolean;
	archivedAt: Date | null;
	status: ContentStatus;
	/** The working copy as stored, which may not satisfy the contract yet. */
	draft: Record<string, unknown>;
	/** The revision the public site serves, if any. */
	published: { id: string; revisionNumber: number; publishedAt: Date; slug: string } | null;
	/** Problems in the draft, in the same `kind → field: message` shape the forms show. */
	issues: string[];
};

export type RevisionSummary = {
	id: string;
	revisionNumber: number;
	slug: string;
	authorEmail: string;
	publishedAt: Date;
	/** The revision the public site serves right now. */
	current: boolean;
};

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

/**
 * The list screen.
 *
 * `status` filters on the derived value, so it is applied **after** the rows are read.
 * That is deliberate: expressing "the draft differs from the published revision" in SQL
 * means comparing two JSONB columns, and the honest version of that comparison is the
 * same code the labels use. At this library's size — tens of entries — one query and a
 * filter in memory beats a second definition of the same rule.
 */
export async function listEntries(
	kind: ContentKind,
	options: { status?: ContentStatus | 'all'; search?: string } = {},
	db: Database = defaultDb,
): Promise<EntrySummary[]> {
	const rows = await db
		.select({
			id: contentEntries.id,
			slug: contentEntries.slug,
			sortOrder: contentEntries.sortOrder,
			featured: contentEntries.featured,
			archivedAt: contentEntries.archivedAt,
			draftPayload: contentEntries.draftPayload,
			updatedAt: contentEntries.updatedAt,
			publishedRevisionId: contentEntries.publishedRevisionId,
			publishedPayload: contentRevisions.payload,
			publishedAt: contentRevisions.publishedAt,
		})
		.from(contentEntries)
		.leftJoin(contentRevisions, eq(contentRevisions.id, contentEntries.publishedRevisionId))
		.where(
			and(
				eq(contentEntries.kind, kind),
				options.search ? ilike(contentEntries.slug, `%${options.search}%`) : undefined,
			),
		)
		.orderBy(asc(contentEntries.sortOrder), asc(contentEntries.slug));

	const counts = await db
		.select({ entryId: contentRevisions.entryId, count: sql<number>`count(*)`.mapWith(Number) })
		.from(contentRevisions)
		.groupBy(contentRevisions.entryId);

	const revisionCounts = new Map(counts.map((row) => [row.entryId, row.count]));

	const summaries = rows.map((row) => {
		const status = deriveStatus({
			archivedAt: row.archivedAt,
			draftPayload: row.draftPayload,
			publishedPayload: row.publishedPayload ?? null,
		});

		return {
			id: row.id,
			kind,
			slug: row.slug,
			sortOrder: row.sortOrder,
			featured: row.featured,
			archivedAt: row.archivedAt,
			status,
			publishable: compileIssues(kind, row.draftPayload).length === 0,
			title: displayTitle(kind, row.draftPayload) ?? row.slug,
			updatedAt: row.updatedAt,
			publishedAt: row.publishedAt ?? null,
			revisionCount: revisionCounts.get(row.id) ?? 0,
		};
	});

	const filter = options.status ?? 'all';

	return filter === 'all' ? summaries : summaries.filter((entry) => entry.status === filter);
}

/** How many entries sit in each state, for the filter tabs. */
export async function countByStatus(
	kind: ContentKind,
	db: Database = defaultDb,
): Promise<Record<ContentStatus | 'all', number>> {
	return countStatuses(await listEntries(kind, { status: 'all' }, db));
}

/**
 * The same tally, from rows that have already been read.
 *
 * Split out because the overview needs the counts *and* the entries — for its totals and its
 * recent-edits list — and asking for both through `countByStatus` would read every entry
 * twice. The rule for what counts as published stays here, in one place, rather than being
 * restated by a second caller.
 */
export function countStatuses(
	entries: readonly Pick<EntrySummary, 'status'>[],
): Record<ContentStatus | 'all', number> {
	return {
		all: entries.length,
		draft: entries.filter((entry) => entry.status === 'draft').length,
		published: entries.filter((entry) => entry.status === 'published').length,
		changed: entries.filter((entry) => entry.status === 'changed').length,
		archived: entries.filter((entry) => entry.status === 'archived').length,
	};
}

export async function getEntry(
	kind: ContentKind,
	slug: string,
	db: Database = defaultDb,
): Promise<EntryDetail | null> {
	const [row] = await db
		.select({
			id: contentEntries.id,
			slug: contentEntries.slug,
			sortOrder: contentEntries.sortOrder,
			featured: contentEntries.featured,
			archivedAt: contentEntries.archivedAt,
			draftPayload: contentEntries.draftPayload,
			publishedRevisionId: contentEntries.publishedRevisionId,
			revisionNumber: contentRevisions.revisionNumber,
			publishedAt: contentRevisions.publishedAt,
			publishedSlug: contentRevisions.slug,
			publishedPayload: contentRevisions.payload,
		})
		.from(contentEntries)
		.leftJoin(contentRevisions, eq(contentRevisions.id, contentEntries.publishedRevisionId))
		.where(and(eq(contentEntries.kind, kind), eq(contentEntries.slug, slug)))
		.limit(1);

	if (!row) return null;

	return {
		id: row.id,
		kind,
		slug: row.slug,
		sortOrder: row.sortOrder,
		featured: row.featured,
		archivedAt: row.archivedAt,
		status: deriveStatus({
			archivedAt: row.archivedAt,
			draftPayload: row.draftPayload,
			publishedPayload: row.publishedPayload ?? null,
		}),
		draft: row.draftPayload,
		published:
			row.publishedRevisionId && row.publishedAt
				? {
						id: row.publishedRevisionId,
						revisionNumber: row.revisionNumber ?? 0,
						publishedAt: row.publishedAt,
						slug: row.publishedSlug ?? row.slug,
					}
				: null,
		issues: compileIssues(kind, row.draftPayload),
	};
}

export async function listRevisions(
	entryId: string,
	currentRevisionId: string | null,
	db: Database = defaultDb,
): Promise<RevisionSummary[]> {
	const rows = await db
		.select({
			id: contentRevisions.id,
			revisionNumber: contentRevisions.revisionNumber,
			slug: contentRevisions.slug,
			authorEmail: contentRevisions.authorEmail,
			publishedAt: contentRevisions.publishedAt,
		})
		.from(contentRevisions)
		.where(eq(contentRevisions.entryId, entryId))
		.orderBy(desc(contentRevisions.revisionNumber));

	return rows.map((row) => ({ ...row, current: row.id === currentRevisionId }));
}

/** Redirects recorded for this kind, so the edit screen can show where old URLs go. */
export async function listRedirects(
	kind: ContentKind,
	db: Database = defaultDb,
): Promise<{ fromSlug: string; toSlug: string }[]> {
	return db
		.select({ fromSlug: slugRedirects.fromSlug, toSlug: slugRedirects.toSlug })
		.from(slugRedirects)
		.where(eq(slugRedirects.kind, kind))
		.orderBy(asc(slugRedirects.fromSlug));
}

// ---------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------

/**
 * Saves the working copy, creating the entry if it does not exist yet.
 *
 * Deliberately does **not** validate: see the module comment. `publish` is the gate.
 *
 * A slug change is applied here rather than at publish, because the slug is the entry's
 * identity on screen — the list, the URLs of future links, and the redirect all follow it.
 * When the entry is published, the *previous* published slug is recorded as a permanent
 * redirect, computed from the last revision rather than from a guess.
 */
export async function saveDraft(
	input: {
		kind: ContentKind;
		slug: string;
		payload: Record<string, unknown>;
		userId: string | null;
	},
	db: Database = defaultDb,
): Promise<{ id: string; created: boolean; redirectedFrom: string | null }> {
	const nextSlug = String(input.payload.slug ?? input.slug);
	const now = new Date();

	const [existing] = await db
		.select({
			id: contentEntries.id,
			slug: contentEntries.slug,
			publishedRevisionId: contentEntries.publishedRevisionId,
		})
		.from(contentEntries)
		.where(and(eq(contentEntries.kind, input.kind), eq(contentEntries.slug, input.slug)))
		.limit(1);

	const [clash] = await db
		.select({ id: contentEntries.id })
		.from(contentEntries)
		.where(and(eq(contentEntries.kind, input.kind), eq(contentEntries.slug, nextSlug)))
		.limit(1);

	if (clash && clash.id !== existing?.id) throw new SlugTakenError(nextSlug);

	if (!existing) {
		// A new entry goes to the end of its kind, so inserting one cannot reshuffle the
		// public order that `sortOrder` exists to control.
		const [tail] = await db
			.select({ last: max(contentEntries.sortOrder) })
			.from(contentEntries)
			.where(eq(contentEntries.kind, input.kind));

		const id = randomUUID();

		await db.insert(contentEntries).values({
			id,
			kind: input.kind,
			slug: nextSlug,
			sortOrder: (tail?.last ?? -1) + 1,
			draftPayload: input.payload,
			draftUpdatedAt: now,
			updatedAt: now,
		});

		return { id, created: true, redirectedFrom: null };
	}

	// The published slug is what visitors are currently linked to, so changing it is the
	// one case that needs a redirect.
	let redirectedFrom: string | null = null;

	if (existing.publishedRevisionId && existing.slug !== nextSlug) {
		const [published] = await db
			.select({ slug: contentRevisions.slug })
			.from(contentRevisions)
			.where(eq(contentRevisions.id, existing.publishedRevisionId))
			.limit(1);

		if (published && published.slug !== nextSlug) {
			redirectedFrom = published.slug;
		}
	}

	await db
		.update(contentEntries)
		.set({
			slug: nextSlug,
			draftPayload: input.payload,
			draftUpdatedAt: now,
			updatedAt: now,
		})
		.where(eq(contentEntries.id, existing.id));

	if (redirectedFrom) {
		await db
			.insert(slugRedirects)
			.values({ id: randomUUID(), kind: input.kind, fromSlug: redirectedFrom, toSlug: nextSlug })
			// A slug can be reused, so an existing redirect for it is moved rather than
			// duplicated — the newest destination is the correct one.
			.onConflictDoUpdate({
				target: [slugRedirects.kind, slugRedirects.fromSlug],
				set: { toSlug: nextSlug },
			});
	}

	return { id: existing.id, created: false, redirectedFrom };
}

/**
 * Thrown when a slug is already in use by another entry of the same kind.
 *
 * Checked before the insert rather than caught from the unique index, so the message can
 * name the conflict. The index is still the real guard — two administrators saving the
 * same slug at once would otherwise race past this check.
 */
export class SlugTakenError extends Error {
	constructor(slug: string) {
		super(`The slug “${slug}” is already used by another item.`);
		this.name = 'SlugTakenError';
	}
}

/** Thrown by `publish` when the draft cannot be published. */
export class NotPublishableError extends Error {
	readonly issues: string[];

	constructor(issues: string[]) {
		super(`Draft cannot be published:\n  ${issues.join('\n  ')}`);
		this.name = 'NotPublishableError';
		this.issues = issues;
	}
}

/**
 * Publishes the current draft as a new immutable revision.
 *
 * Three statements in one `db.batch()`: the revision, the pointer, and the redirect when
 * the slug moved since the last publish. The revision number is read first, which is a
 * race only if two administrators publish the same entry in the same instant; the unique
 * `(entry_id, revision_number)` index turns that into a failed batch rather than two
 * revisions claiming the same number.
 */
export async function publish(input: {
	kind: ContentKind;
	slug: string;
	authorId: string | null;
	authorEmail: string;
}): Promise<{ revisionNumber: number; redirectFrom: string | null }> {
	return publishWith(input, defaultDb);
}

export async function publishWith(
	input: {
		kind: ContentKind;
		slug: string;
		authorId: string | null;
		authorEmail: string;
	},
	db: Database,
): Promise<{ revisionNumber: number; redirectFrom: string | null }> {
	const entry = await getEntry(input.kind, input.slug, db);

	if (!entry) throw new Error(`No ${input.kind} with slug ${input.slug}.`);

	if (entry.status === 'archived') {
		throw new NotPublishableError(['This content is archived. Restore it first.']);
	}

	const issues = compileIssues(input.kind, entry.draft);

	if (issues.length > 0) throw new NotPublishableError(issues);

	const [latest] = await db
		.select({ number: max(contentRevisions.revisionNumber) })
		.from(contentRevisions)
		.where(eq(contentRevisions.entryId, entry.id));

	const revisionNumber = (latest?.number ?? 0) + 1;
	const revisionId = randomUUID();

	// The slug as published last time, so a redirect is recorded against the URL people
	// actually have rather than against the working copy.
	const redirectFrom =
		entry.published && entry.published.slug !== entry.slug ? entry.published.slug : null;

	const insertRevision = db.insert(contentRevisions).values({
		id: revisionId,
		entryId: entry.id,
		kind: input.kind,
		revisionNumber,
		slug: entry.slug,
		payload: entry.draft,
		authorId: input.authorId,
		authorEmail: input.authorEmail,
	});

	const movePointer = db
		.update(contentEntries)
		.set({ publishedRevisionId: revisionId, updatedAt: new Date() })
		.where(eq(contentEntries.id, entry.id));

	// Two literal tuples rather than a built array: drizzle types `batch` for a tuple, and a
	// conditional array cannot express one. Duplicating the two shared statements is the
	// price of not casting the type away.
	if (redirectFrom) {
		const recordRedirect = db
			.insert(slugRedirects)
			.values({ id: randomUUID(), kind: input.kind, fromSlug: redirectFrom, toSlug: entry.slug })
			.onConflictDoUpdate({
				target: [slugRedirects.kind, slugRedirects.fromSlug],
				set: { toSlug: entry.slug },
			});

		await db.batch([insertRevision, movePointer, recordRedirect]);
	} else {
		await db.batch([insertRevision, movePointer]);
	}

	return { revisionNumber, redirectFrom };
}

/**
 * Takes the entry off the public site without discarding anything.
 *
 * The revisions and the draft are untouched, so publishing again puts the same page back.
 */
export async function unpublish(
	kind: ContentKind,
	slug: string,
	db: Database = defaultDb,
): Promise<boolean> {
	const entry = await getEntry(kind, slug, db);

	if (!entry) return false;

	await db
		.update(contentEntries)
		.set({ publishedRevisionId: null, updatedAt: new Date() })
		.where(eq(contentEntries.id, entry.id));

	return true;
}

/**
 * Copies a revision's payload into the draft.
 *
 * Only the draft: an old revision is not republished by this, because putting a version
 * back on the public site should be a separate, deliberate act. Restore, then look at the
 * preview, then publish.
 */
export async function restoreRevision(
	input: { kind: ContentKind; slug: string; revisionId: string },
	db: Database = defaultDb,
): Promise<boolean> {
	const entry = await getEntry(input.kind, input.slug, db);

	if (!entry) return false;

	const [revision] = await db
		.select({ payload: contentRevisions.payload, entryId: contentRevisions.entryId })
		.from(contentRevisions)
		.where(eq(contentRevisions.id, input.revisionId))
		.limit(1);

	// A revision from another entry would move content between items.
	if (!revision || revision.entryId !== entry.id) return false;

	await db
		.update(contentEntries)
		.set({ draftPayload: revision.payload, draftUpdatedAt: new Date(), updatedAt: new Date() })
		.where(eq(contentEntries.id, entry.id));

	return true;
}

export async function setArchived(
	input: { kind: ContentKind; slug: string; archived: boolean },
	db: Database = defaultDb,
): Promise<boolean> {
	return updateEntry(
		input.kind,
		input.slug,
		{ archivedAt: input.archived ? new Date() : null },
		db,
	);
}

export async function setFeatured(
	input: { kind: ContentKind; slug: string; featured: boolean },
	db: Database = defaultDb,
): Promise<boolean> {
	return updateEntry(input.kind, input.slug, { featured: input.featured }, db);
}

/**
 * Moves an entry one place up or down.
 *
 * Swapping with the neighbour keeps `sortOrder` dense and unchanged in meaning; rewriting
 * every row's position would work too but touches the whole kind for a one-place move, and
 * two concurrent moves would interleave into a duplicate.
 */
export async function move(
	input: { kind: ContentKind; slug: string; direction: 'up' | 'down' },
	db: Database = defaultDb,
): Promise<boolean> {
	const [current] = await db
		.select({ id: contentEntries.id, sortOrder: contentEntries.sortOrder })
		.from(contentEntries)
		.where(and(eq(contentEntries.kind, input.kind), eq(contentEntries.slug, input.slug)))
		.limit(1);

	if (!current) return false;

	const [neighbour] = await db
		.select({ id: contentEntries.id, sortOrder: contentEntries.sortOrder })
		.from(contentEntries)
		.where(
			and(
				eq(contentEntries.kind, input.kind),
				ne(contentEntries.id, current.id),
				input.direction === 'up'
					? sql`${contentEntries.sortOrder} < ${current.sortOrder}`
					: sql`${contentEntries.sortOrder} > ${current.sortOrder}`,
			),
		)
		// The nearest neighbour in the direction of travel.
		.orderBy(
			input.direction === 'up' ? desc(contentEntries.sortOrder) : asc(contentEntries.sortOrder),
		)
		.limit(1);

	if (!neighbour) return false;

	// `db.batch` is the only atomic primitive here; the two updates must not be observed
	// half-applied, or the list would briefly show two entries claiming one position.
	await db.batch([
		db
			.update(contentEntries)
			.set({ sortOrder: neighbour.sortOrder })
			.where(eq(contentEntries.id, current.id)),
		db
			.update(contentEntries)
			.set({ sortOrder: current.sortOrder })
			.where(eq(contentEntries.id, neighbour.id)),
	]);

	return true;
}

/** Deletes an entry and, by cascade, its revisions. Refused while it is published. */
export async function deleteEntry(
	input: { kind: ContentKind; slug: string },
	db: Database = defaultDb,
): Promise<{ ok: true } | { ok: false; reason: string }> {
	const entry = await getEntry(input.kind, input.slug, db);

	if (!entry) return { ok: false, reason: 'That content no longer exists.' };

	if (entry.published) {
		return {
			ok: false,
			reason: 'Unpublish it first — this is the version the public site is serving.',
		};
	}

	// The redirects that point *at* this slug are left alone on purpose: they are how the
	// old URL keeps resolving, and deleting them would turn a moved page into a 404.
	await db.delete(contentEntries).where(eq(contentEntries.id, entry.id));

	return { ok: true };
}

// ---------------------------------------------------------------------------
// Status derivation, shared with the tests
// ---------------------------------------------------------------------------

export function deriveStatus(input: {
	archivedAt: Date | null;
	draftPayload: Record<string, unknown>;
	publishedPayload: Record<string, unknown> | null;
}): ContentStatus {
	if (input.archivedAt) return 'archived';
	if (!input.publishedPayload) return 'draft';

	return stableStringify(input.draftPayload) === stableStringify(input.publishedPayload)
		? 'published'
		: 'changed';
}

export function statusLabels(): Record<ContentStatus, string> {
	return {
		draft: 'Draft',
		published: 'Published',
		changed: 'Published — unpublished changes',
		archived: 'Archived',
	};
}

/** Problems in a stored payload, as readable lines. Never throws. */
function compileIssues(kind: ContentKind, payload: unknown): string[] {
	try {
		assertValidPayload(kind, payload);

		return [];
	} catch (error) {
		if (error instanceof ContentValidationError) return error.issues;

		throw error;
	}
}

/**
 * JSON with object keys in a stable order, for comparing two payloads.
 *
 * Key order is not meaningful in JSON, and a payload that has been through the import or a
 * revision restore can carry the same data in a different order. Comparing raw
 * `JSON.stringify` output would call that a change and label a page "unpublished changes"
 * forever.
 */
export function stableStringify(value: unknown): string {
	if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;

	if (value && typeof value === 'object') {
		const entries = Object.entries(value as Record<string, unknown>)
			.filter(([, item]) => item !== undefined)
			.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

		return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`).join(',')}}`;
	}

	return JSON.stringify(value) ?? 'null';
}

/** The field a list shows as the entry's name. Titles differ per kind by design. */
/**
 * The name to show for a payload: its `name` or `title`, or null when that is blank.
 *
 * Blank rather than merely absent is the case that matters, because a draft is allowed to be
 * incomplete: `title ?? name ?? slug` leaves an **empty** heading on screen for an entry
 * whose title has been cleared, which is both an unnamed page and a row in the list that
 * says nothing. Null here is what lets the caller fall back to the slug.
 */
export function displayTitle(kind: ContentKind, payload: Record<string, unknown>): string | null {
	const field = kind === 'destination' ? 'name' : 'title';
	const value = payload[field];

	return typeof value === 'string' && value.trim() !== '' ? value : null;
}

async function updateEntry(
	kind: ContentKind,
	slug: string,
	values: Partial<{ archivedAt: Date | null; featured: boolean }>,
	db: Database,
): Promise<boolean> {
	const result = await db
		.update(contentEntries)
		.set({ ...values, updatedAt: new Date() })
		.where(and(eq(contentEntries.kind, kind), eq(contentEntries.slug, slug)))
		.returning({ id: contentEntries.id });

	return result.length > 0;
}

/** Archived entries are hidden from the library but keep their slug reserved. */
export function activeOnly() {
	return isNull(contentEntries.archivedAt);
}
