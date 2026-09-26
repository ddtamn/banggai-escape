/**
 * One-shot data migration: create the page-copy setting rows.
 *
 * ## Why this exists
 *
 * `siteSettingSchemas` gained `siteCta`, `homePage` and five per-page keys. `loadSiteSettings`
 * refuses a key with no row at all, so the schema cannot be deployed until the rows exist —
 * and getting that order wrong is not hypothetical: `site.whatsapp` was added without seeding
 * production, and the first deploy of it took every page on the site to 500 while
 * `sitemap.xml` answered 200 throughout.
 *
 * The ordering is *safer* than that one was, because every field in these schemas carries the
 * copy it replaces as a Zod default. A row that omits a field parses, and the page renders the
 * current copy. So this migration is a convenience — it makes the existing values explicit and
 * editable in the admin — rather than a precondition for the site existing. See
 * `docs/08-content-data-layer.md`.
 *
 * ## Why it writes the schema's own defaults
 *
 * The values come from `schema.parse({})`, not from a transcription. That is the whole point:
 * a hand-typed copy of the strings is a second source of truth that will be edited in one place
 * and not the other, and the failure is silent — the row validates, the page renders, and
 * nothing says the migration and the schema now disagree. Deriving them means the row and the
 * schema cannot disagree, because one is computed from the other.
 *
 * ## Why it validates before writing
 *
 * Every value is parsed by its own contract first, and the script refuses to write a row that
 * does not satisfy it. A migration that writes and discovers later would leave a database the
 * read layer then refuses to serve.
 *
 * ## Running it
 *
 * ```sh
 * pnpm --filter @banggai/admin exec tsx scripts/add-page-copy-settings.ts
 * pnpm --filter @banggai/admin exec tsx scripts/add-page-copy-settings.ts --force
 * ```
 *
 * **Run it against every branch, production included, before deploying the schema** — and note
 * the asymmetry that tells you which half has been deployed: if `sitemap.xml` answers 200 while
 * every page answers 500, the schema is live and the rows are not.
 *
 * Idempotent: a key that already has a row is left alone, so it is safe to run in any order and
 * any number of times. Safe to delete once it has run against both branches.
 */

import { type SiteSettingKey, siteSettingSchemas } from '@banggai/content-model';
import { neon } from '@neondatabase/serverless';

/**
 * The keys this migration creates, in the order they should be written.
 *
 * Listed rather than derived from `siteSettingKeys`, because the whole point is to be the one
 * place that knows which keys are new. A key added to the schema later is deliberately *not*
 * picked up here: it would be seeded with empty values on a database that already holds real
 * copy, because the defaults are the copy as it was when this was written. Adding a key means
 * adding it here too.
 */
/**
 * Overwrite rows that already exist, rather than only creating missing ones.
 *
 * The default behaviour is create-only, and that is right: it means running this against a
 * database an editor has worked on cannot quietly throw their copy away. But it has a
 * consequence worth naming, because it bit during this work — **a corrected default in the
 * schema never reaches a row that already holds the old one.** The `galleryHint` default
 * gained a `{count}` token, the seeded row kept the sentence without it, and the live page
 * rendered "Swipe to see all photos" with no number. The row validated; nothing failed.
 *
 * So this flag is the way to push the schema's copy back out, for the case where the schema
 * was the thing that was wrong. It discards any edit made in the admin, so it is named for
 * what it does rather than hidden behind a prompt.
 */
const force = process.argv.includes('--force');

const KEYS = [
	'siteCta',
	'cards',
	'homePage',
	'packagesPage',
	'destinationsPage',
	'blogPage',
	'aboutPage',
	'contactPage',
	'packageDetail',
	'destinationDetail',
	'articleDetail',
] as const satisfies readonly SiteSettingKey[];

async function main() {
	const url = process.env.DATABASE_URL;

	if (!url) throw new Error('DATABASE_URL is not set. Run this through the admin package.');

	const sql = neon(url);

	// Every key the database has, filtered here rather than with `= any(…)`. There are around
	// twenty settings rows in total, so the round trip saved by pushing the filter into the
	// query is not worth reaching for driver-specific array syntax to get.
	const existing = await sql`select key from site_settings`;

	const present = new Set(existing.map((row) => String((row as { key: string }).key)));
	const missing = force ? KEYS : KEYS.filter((key) => !present.has(key));

	if (missing.length === 0) {
		console.log(`All ${KEYS.length} page-copy rows already exist — nothing to do.`);
		console.log("To roll them back to the schema's copy, re-run with --force.");
		return;
	}

	// Parsed before anything is written, so a bad value fails here rather than at the next
	// page render. The parse is also what produces the values: `parse({})` runs the schema's
	// defaults, so the row is the schema's own copy rather than a transcription of it.
	const values = missing.map((key) => {
		const parsed = siteSettingSchemas[key].safeParse({});

		if (!parsed.success) {
			const detail = parsed.error.issues
				.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
				.join('; ');

			throw new Error(`The defaults for "${key}" do not satisfy its own contract: ${detail}`);
		}

		return { key, value: parsed.data as Record<string, unknown> };
	});

	// `on conflict do nothing` becomes `do update` under `--force`, which is the only
	// difference between the two modes at the database.
	//
	// One insert per key, rather than a set-based one. There are seven, they run once, and a
	// loop is readable in a way that `jsonb_to_recordset` is not — which matters more here than
	// the seven round trips.
	//
	// `JSON.stringify(…)::jsonb` rather than a driver helper, because that is what the rest of
	// the admin does when it writes a settings value and this should not be the one place that
	// does it differently.
	//
	// `on conflict do nothing` as well as the check above: the read and the write are separate
	// statements, so two runs against one database could both see a key as missing. The
	// conflict clause is what makes that harmless.
	const onConflict = force
		? sql`on conflict (key) do update set value = excluded.value, updated_at = now()`
		: sql`on conflict (key) do nothing`;

	for (const { key, value } of values) {
		await sql`
			insert into site_settings (key, value)
			values (${key}, ${JSON.stringify(value)}::jsonb)
			${onConflict}
		`;
	}

	console.log(`${force ? 'Reset' : 'Created'} ${values.length} row(s):`);
	for (const { key, value } of values) {
		// The shape, not the copy: a log of forty full paragraphs is unreadable, and what a
		// reviewer needs to see is that the right keys landed with content in them.
		const top = Object.entries(value)
			.map(([field, fieldValue]) =>
				Array.isArray(fieldValue)
					? `${field}[${fieldValue.length}]`
					: typeof fieldValue === 'object' && fieldValue !== null
						? `${field}{${Object.keys(fieldValue).length}}`
						: field,
			)
			.join(', ');

		console.log(`  ${key}: ${top}`);
	}

	// The keys this script does *not* touch, so the log makes clear the run was scoped. Under
	// `--force` this cannot include any of `KEYS` — they were all just written — so filtering
	// by the list is what keeps the line from claiming otherwise.
	const untouched = [...present].filter((key) => !(KEYS as readonly string[]).includes(key));

	if (untouched.length > 0) {
		console.log(`\nUntouched (not page copy): ${untouched.join(', ')}`);
	}
}

await main();
