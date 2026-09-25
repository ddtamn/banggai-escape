/**
 * Import the exported static content into Neon, and print the reconciliation report.
 *
 *   pnpm --filter web migrate:export     # writes .migration/ at the repo root
 *   pnpm --filter @banggai/admin migrate:import   # reads it, validates, seeds
 *   pnpm --filter @banggai/admin migrate:import -- --replace   # re-seed entries that already exist
 *
 * One-shot migration tool, deleted after the public site reads from Neon. The snapshot
 * is an untrusted file: every record is re-validated against `@banggai/content-model`
 * here, because this is the process that writes rows.
 *
 * Guarantees:
 *   - Idempotent on `(kind, slug)` and on each media URL. Re-running is a no-op and says
 *     so, so it can be rehearsed against a branch as many times as needed.
 *   - Without `--replace`, an entry that already exists is left alone. With it, the
 *     draft is refreshed and a **new** published revision is appended — history is never
 *     rewritten.
 *   - Publishing one entry writes the revision and moves
 *     `content_entries.published_revision_id` inside a single `db.batch()`, which is the
 *     only atomic primitive available on the Neon HTTP driver. Atomicity is per entry,
 *     not per run: a run that dies part way leaves the entries it finished, correctly
 *     published, and reports the rest as still to do on the next attempt.
 */
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	type ContentKind,
	parsePayload,
	parseSiteSetting,
	parseSourcePayload,
	parseSourceSiteSetting,
	type SiteSettingKey,
	siteSettingKeys,
} from '@banggai/content-model';
import { neon } from '@neondatabase/serverless';
import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';
import { formatIssues } from '../src/lib/server/content/validate';
import {
	administrators,
	contentEntries,
	contentRevisions,
	mediaAssets,
	siteSettings,
	user,
} from '../src/lib/server/db/schema';
import { rewriteMediaRefs, rewriteSettingMediaRefs } from '../src/lib/server/media/references';

loadEnvFile();

const MIGRATION_DIR = fileURLToPath(new URL('../../../.migration/', import.meta.url));

// `pnpm run script -- a b` forwards the `--` itself, so drop a lone separator if present.
const args = process.argv.slice(2).filter((arg, index) => !(index === 0 && arg === '--'));
const replace = args.includes('--replace');
const authorOverride = args.find((arg) => arg.startsWith('--author='))?.slice('--author='.length);

const url = process.env.DATABASE_URL;

if (!url) {
	console.error('DATABASE_URL is not set (checked the environment and apps/admin/.env)');
	process.exit(1);
}

const db = drizzle(neon(url));
const now = new Date();

const records = {
	package: read<SnapshotRecord>('packages.json'),
	destination: read<SnapshotRecord>('destinations.json'),
	article: read<SnapshotRecord>('articles.json'),
} satisfies Record<ContentKind, SnapshotRecord[]>;

const settings = read<Record<string, unknown>>('settings.json');
const media = read<MediaEntry>('media.json');

// ---------------------------------------------------------------------------
// Validate everything before writing anything.
// ---------------------------------------------------------------------------

const problems: string[] = [];

for (const [kind, items] of Object.entries(records) as [ContentKind, SnapshotRecord[]][]) {
	for (const item of items) {
		// The snapshot holds *authored* records (the export writes what the modules say),
		// so it is checked against the source contract here. The rewritten, stored payload
		// is validated against the payload contract below, once media ids are resolved.
		const parsed = parseSourcePayload(kind, item.payload);

		if (!parsed.success)
			problems.push(...formatIssues(`${kind} ${item.slug}`, parsed.error.issues));
	}
}

const seen = new Set<string>();

for (const [kind, items] of Object.entries(records) as [ContentKind, SnapshotRecord[]][]) {
	for (const item of items) {
		const key = `${kind}:${item.slug}`;

		if (seen.has(key)) problems.push(`${key}: duplicate slug in the snapshot`);
		seen.add(key);
	}
}

for (const [key, value] of Object.entries(settings)) {
	if (!siteSettingKeys.includes(key as (typeof siteSettingKeys)[number])) {
		problems.push(`site_settings.${key}: not a known key in the content model`);
		continue;
	}

	const parsed = parseSourceSiteSetting(key as SiteSettingKey, value);

	if (!parsed.success) problems.push(...formatIssues(`site_settings.${key}`, parsed.error.issues));
}

const author = await resolveAuthor();

if (!author) {
	problems.push(
		'no revision author: provision an administrator (pnpm --filter @banggai/admin provision), ' +
			'or pass --author=<email>',
	);
}

if (problems.length > 0 || !author) {
	console.error(`Import aborted: ${problems.length} problem(s). Nothing was written.\n`);
	for (const problem of problems) console.error(`  ${problem}`);
	process.exit(1);
}

// ---------------------------------------------------------------------------
// Seed.
// ---------------------------------------------------------------------------

const existing = await db
	.select({
		id: contentEntries.id,
		kind: contentEntries.kind,
		slug: contentEntries.slug,
	})
	.from(contentEntries);

const existingByKey = new Map(existing.map((row) => [`${row.kind}:${row.slug}`, row]));

const revisionCeilings = await db
	.select({
		entryId: contentRevisions.entryId,
		next: sql<number>`max(${contentRevisions.revisionNumber}) + 1`.mapWith(Number),
	})
	.from(contentRevisions)
	.groupBy(contentRevisions.entryId);

const nextRevision = new Map(revisionCeilings.map((row) => [row.entryId, row.next]));

type Tally = { created: number; replaced: number; present: number };

const tallies: Record<ContentKind, Tally> = {
	package: { created: 0, replaced: 0, present: 0 },
	destination: { created: 0, replaced: 0, present: 0 },
	article: { created: 0, replaced: 0, present: 0 },
};

// ---------------------------------------------------------------------------
// Media first.
//
// Every payload about to be written references a media *id*, so the rows have to exist
// before the content that points at them. Rows are written one per URL and are additive
// and idempotent, so a run that dies after this point leaves a slightly fuller media
// library and nothing else.
// ---------------------------------------------------------------------------

const mediaTally: Tally = { created: 0, replaced: 0, present: 0 };

// One row per URL, not per reference: a destination's card image holds the bare asset id
// while its gallery holds the same image already resolved, and both are one asset. Every
// reference is folded into the name so the row stays traceable back to content.
const mediaByUrl = new Map<string, MediaEntry[]>();

for (const item of media) {
	mediaByUrl.set(item.resolved, [...(mediaByUrl.get(item.resolved) ?? []), item]);
}

for (const [resolved, items] of mediaByUrl) {
	const inserted = await db
		.insert(mediaAssets)
		.values({
			id: randomUUID(),
			externalUrl: resolved,
			// The reviewer's map back to content, e.g. `packages.json (slug).image +1 more`.
			originalName: describeMedia(items),
			createdAt: now,
			uploadedBy: author.userId,
		})
		.onConflictDoNothing({ target: mediaAssets.externalUrl })
		.returning({ id: mediaAssets.id });

	if (inserted.length > 0) mediaTally.created += 1;
	else mediaTally.present += 1;
}

// Read the ids back rather than trusting the inserts: a skipped conflict returns no row,
// and a re-run has to map to the ids that are already there.
const mediaIdByUrl = new Map(
	(
		await db.select({ id: mediaAssets.id, externalUrl: mediaAssets.externalUrl }).from(mediaAssets)
	).map((row) => [row.externalUrl, row.id]),
);

const resolvedByRef = new Map(media.map((item) => [item.ref, item.resolved]));

/** Authored media value -> the id of the row holding it. */
function resolveRef(ref: string): string | undefined {
	const resolved = resolvedByRef.get(ref);

	return resolved ? mediaIdByUrl.get(resolved) : undefined;
}

// ---------------------------------------------------------------------------
// Rewrite and re-validate, still before any content is written.
// ---------------------------------------------------------------------------

const prepared = new Map<string, Record<string, unknown>>();

for (const [kind, items] of Object.entries(records) as [ContentKind, SnapshotRecord[]][]) {
	for (const item of items) {
		const rewritten = rewriteMediaRefs(kind, item.payload, resolveRef);

		for (const ref of rewritten.unresolved) {
			problems.push(`${kind} ${item.slug}: no media row for ${ref.slice(0, 60)}`);
		}

		const parsed = parsePayload(kind, rewritten.payload);

		if (!parsed.success) {
			problems.push(...formatIssues(`stored ${kind} ${item.slug}`, parsed.error.issues));
		}

		prepared.set(`${kind}:${item.slug}`, rewritten.payload as Record<string, unknown>);
	}
}

const preparedSettings = new Map<string, unknown>();

for (const [key, value] of Object.entries(settings)) {
	if (!siteSettingKeys.includes(key as (typeof siteSettingKeys)[number])) continue;

	const rewritten = rewriteSettingMediaRefs(key, value, resolveRef);

	for (const ref of rewritten.unresolved) {
		problems.push(`site_settings.${key}: no media row for ${ref.slice(0, 60)}`);
	}

	const parsed = parseSiteSetting(key as SiteSettingKey, rewritten.value);

	if (!parsed.success) {
		problems.push(...formatIssues(`stored site_settings.${key}`, parsed.error.issues));
	}

	preparedSettings.set(key, rewritten.value);
}

if (problems.length > 0) {
	console.error(`Import aborted: ${problems.length} problem(s). No content was written.\n`);
	for (const problem of problems) console.error(`  ${problem}`);
	process.exit(1);
}

for (const [kind, items] of Object.entries(records) as [ContentKind, SnapshotRecord[]][]) {
	for (const item of items) {
		const match = existingByKey.get(`${kind}:${item.slug}`);
		// The rewritten payload, not the authored one: every media field now holds a
		// `media_assets.id`.
		const payload = prepared.get(`${kind}:${item.slug}`);

		if (!payload) continue;

		const featured = payload.featured === true;

		if (match && !replace) {
			tallies[kind].present += 1;
			continue;
		}

		const revisionId = randomUUID();

		if (match) {
			await db.batch([
				db
					.update(contentEntries)
					.set({
						draftPayload: payload,
						draftUpdatedAt: now,
						sortOrder: item.sortOrder,
						featured,
					})
					.where(eq(contentEntries.id, match.id)),
				db.insert(contentRevisions).values({
					id: revisionId,
					entryId: match.id,
					kind,
					revisionNumber: nextRevision.get(match.id) ?? 1,
					slug: item.slug,
					payload,
					authorId: author.userId,
					authorEmail: author.email,
					publishedAt: now,
				}),
				db
					.update(contentEntries)
					.set({ publishedRevisionId: revisionId })
					.where(eq(contentEntries.id, match.id)),
			]);

			tallies[kind].replaced += 1;
			continue;
		}

		const entryId = randomUUID();

		await db.batch([
			db.insert(contentEntries).values({
				id: entryId,
				kind,
				slug: item.slug,
				sortOrder: item.sortOrder,
				featured,
				draftPayload: payload,
				draftUpdatedAt: now,
			}),
			db.insert(contentRevisions).values({
				id: revisionId,
				entryId,
				kind,
				revisionNumber: 1,
				slug: item.slug,
				payload,
				authorId: author.userId,
				authorEmail: author.email,
				publishedAt: now,
			}),
			db
				.update(contentEntries)
				.set({ publishedRevisionId: revisionId })
				.where(eq(contentEntries.id, entryId)),
		]);

		tallies[kind].created += 1;
	}
}

const settingsTally: Tally = { created: 0, replaced: 0, present: 0 };
const settingsPresent = new Set(
	(await db.select({ key: siteSettings.key }).from(siteSettings)).map((row) => row.key),
);

for (const key of Object.keys(settings)) {
	const value = preparedSettings.get(key);

	if (value === undefined) continue;

	const exists = settingsPresent.has(key);

	if (exists && !replace) {
		settingsTally.present += 1;
		continue;
	}

	if (exists) {
		await db
			.update(siteSettings)
			.set({ value, updatedAt: now, updatedBy: author.userId })
			.where(eq(siteSettings.key, key));
		settingsTally.replaced += 1;
		continue;
	}

	await db.insert(siteSettings).values({ key, value, updatedAt: now, updatedBy: author.userId });
	settingsTally.created += 1;
}

// ---------------------------------------------------------------------------
// Reconcile.
// ---------------------------------------------------------------------------

const after = await db
	.select({ kind: contentEntries.kind, slug: contentEntries.slug })
	.from(contentEntries);

const expected = new Set(seen);
const extras = after.filter((row) => !expected.has(`${row.kind}:${row.slug}`));
const missing = [...expected].filter(
	(key) => !after.some((row) => `${row.kind}:${row.slug}` === key),
);

console.log(`\nImported from ${MIGRATION_DIR}${replace ? ' (--replace)' : ''}\n`);

console.table(
	Object.entries(records).map(([kind, items]) => ({
		kind,
		snapshot: items.length,
		created: tallies[kind as ContentKind].created,
		replaced: tallies[kind as ContentKind].replaced,
		'left as-is': tallies[kind as ContentKind].present,
		'featured in payload': items.filter(
			(item) => (item.payload as { featured?: boolean }).featured === true,
		).length,
		slug: items.map((item) => `${item.sortOrder}:${item.slug}`).join(' '),
	})),
);

console.table([
	{ collection: 'site_settings', snapshot: Object.keys(settings).length, ...settingsTally },
	{
		// One row per URL, not per reference: several fields can point at one image.
		collection: 'media_assets (by URL)',
		snapshot: mediaByUrl.size,
		...mediaTally,
	},
]);

console.table(nestedTotals(records));

console.log(
	`Media: ${media.length} reference(s) over ${mediaByUrl.size} ` +
		`distinct URL(s); ${media.filter((item) => item.source === 'provider-id').length} reference(s) still ` +
		'served from the legacy CDN host, which Phase 2 rewrites to R2.',
);

if (extras.length > 0) {
	console.warn(
		`\n${extras.length} row(s) in the database are not in this snapshot (a rename, or leftover ` +
			'from an earlier import):',
	);
	for (const row of extras) console.warn(`  ${row.kind}:${row.slug}`);
}

if (missing.length > 0) {
	console.error(`\n${missing.length} record(s) in the snapshot are missing from the database:`);
	for (const key of missing) console.error(`  ${key}`);
	process.exit(1);
}

const [{ entries }] = await db
	.select({ entries: sql<number>`count(*)`.mapWith(Number) })
	.from(contentEntries);
const [{ revisions }] = await db
	.select({ revisions: sql<number>`count(*)`.mapWith(Number) })
	.from(contentRevisions);

console.log(`\nTotals: ${entries} content_entries, ${revisions} content_revisions.`);

/** Nested collections, so a dropped itinerary day or gallery image is visible. */
function nestedTotals(records: Record<string, SnapshotRecord[]>) {
	const rows: { field: string; count: number }[] = [];
	const payloads = Object.values(records).flat();
	const sum = (field: string, pick: (payload: Record<string, unknown>) => unknown[]) =>
		rows.push({
			field,
			count: payloads.reduce(
				(total, item) => total + pick(item.payload as Record<string, unknown>).length,
				0,
			),
		});

	const array = (payload: Record<string, unknown>, key: string): unknown[] =>
		Array.isArray(payload[key]) ? payload[key] : [];

	sum('package.itinerary days', (payload) => array(payload, 'itinerary'));
	sum('package.highlights', (payload) => array(payload, 'highlights'));
	sum('package.included', (payload) => array(payload, 'included'));
	sum('destination.overview lines', (payload) => array(payload, 'overview'));
	sum('destination.experiences', (payload) => array(payload, 'experiences'));
	sum('destination.gallery images', (payload) => array(payload, 'gallery'));
	sum('article.body blocks', (payload) => array(payload, 'body'));
	sum('article.tags', (payload) => array(payload, 'tags'));

	return rows.filter((row) => row.count > 0);
}

/** The revision author: an explicit `--author=` email, else the first administrator. */
async function resolveAuthor(): Promise<{ userId: string | null; email: string } | undefined> {
	if (authorOverride) {
		const [match] = await db
			.select({ userId: user.id, email: user.email })
			.from(user)
			.where(eq(user.email, authorOverride))
			.limit(1);

		// Record the byline even when the address has no account yet.
		return match ?? { userId: null, email: authorOverride };
	}

	const [first] = await db
		.select({ userId: administrators.userId, email: user.email })
		.from(administrators)
		.innerJoin(user, eq(user.id, administrators.userId))
		.limit(1);

	return first;
}

type SnapshotRecord = { slug: string; sortOrder: number; payload: unknown };

type MediaEntry = {
	ref: string;
	resolved: string;
	source: 'provider-id' | 'absolute-url';
	usedBy: string[];
};

/** `packages.json[0] (slug).image` — and how many other fields point at the same asset. */
function describeMedia(items: MediaEntry[]): string {
	const [first] = items;
	const others = items.reduce((total, item) => total + item.usedBy.length, 0) - first.usedBy.length;

	return others > 0 ? `${first.usedBy[0]} +${others} more` : first.usedBy[0];
}

function read<T>(name: string): T {
	try {
		return JSON.parse(readFileSync(resolve(MIGRATION_DIR, name), 'utf8')) as T;
	} catch {
		console.error(
			`Could not read .migration/${name}. Run \`pnpm --filter web migrate:export\` first.`,
		);
		process.exit(1);
	}
}

/** Read `apps/admin/.env` without adding a dependency; real environment values win. */
function loadEnvFile() {
	let contents: string;

	try {
		contents = readFileSync(new URL('../.env', import.meta.url), 'utf8');
	} catch {
		return;
	}

	for (const line of contents.split('\n')) {
		const match = line.match(/^([A-Z_]+)=(.*)$/);
		if (match) process.env[match[1]] ??= match[2].replace(/^"|"$/g, '');
	}
}
