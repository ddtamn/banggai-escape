/**
 * Export the static content modules to a JSON snapshot for the admin import.
 *
 *   pnpm --filter web migrate:export
 *
 * This is a one-shot migration tool, deleted after the public site reads from Neon. It
 * exists so the two apps can exchange content without creating a permanent cross-app
 * import (`apps/admin` must never import from `apps/web`, or the reverse).
 *
 * Every record is validated against `@banggai/content-model` before it is written, so
 * the snapshot is proof that the contracts match the content that is live today. A
 * failure here means a contract is wrong, not that the content is wrong — fix the
 * schema in `packages/content-model`.
 *
 * Two things the importer depends on:
 *   - `sortOrder` is the array index. The homepage picks its four packages by position
 *     (`packages.slice(0, 4)`), not by the `featured` flag, so position is content.
 *   - Media values are exported verbatim, exactly as authored (a bare CDN asset id, or
 *     an already-absolute URL). `img()` is applied at render time and is a no-op on an
 *     absolute URL, so this keeps the rendered output identical.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	type ContentKind,
	isMediaSettingKey,
	mediaFieldsByKind,
	mediaSettingFieldNames,
	parseSourcePayload,
	parseSourceSiteSetting,
	siteSettingKeys,
} from '@banggai/content-model';
import * as content from '../src/lib/data/content';
import { destinations } from '../src/lib/data/destinations';
import { img } from '../src/lib/data/media';
import { packages } from '../src/lib/data/packages';
import { posts } from '../src/lib/data/posts';
import * as site from '../src/lib/data/site';

const OUT_DIR = fileURLToPath(new URL('../../../.migration/', import.meta.url));

/** Collections that map one-to-one onto the `content_kind` enum. */
const collections: { kind: ContentKind; file: string; items: { slug: string }[] }[] = [
	{ kind: 'package', file: 'packages.json', items: packages },
	{ kind: 'destination', file: 'destinations.json', items: destinations },
	{ kind: 'article', file: 'articles.json', items: posts },
];

/**
 * The shared editorial blocks, keyed as `site_settings.key`. Written out longhand
 * rather than derived, because the mapping from key to module value is the thing a
 * human needs to review.
 */
const settings: Record<string, unknown> = {
	site: site.site,
	nav: site.nav,
	languages: site.languages,
	socials: site.socials,
	footerDestinations: site.footerDestinations,
	features: content.features,
	testimonials: content.testimonials,
	faqs: content.faqs,
	stats: content.stats,
	visionMission: content.visionMission,
	contactChannels: content.contactChannels,
	blogCategories: content.blogCategories,
	ctaBackground: content.ctaBackground,
};

const problems: string[] = [];
const records: Record<string, { slug: string; sortOrder: number; payload: unknown }[]> = {};

for (const { kind, file, items } of collections) {
	records[file] = items.map((item, sortOrder) => {
		// The *source* contract: these modules still hold authored media values, not ids.
		const parsed = parseSourcePayload(kind, item);

		if (!parsed.success) problems.push(...describeIssues(kind, item.slug, parsed.error.issues));

		return { slug: item.slug, sortOrder, payload: item };
	});
}

for (const key of siteSettingKeys) {
	if (!(key in settings)) {
		problems.push(`site_settings.${key}: no value exported for this key`);
		continue;
	}

	const parsed = parseSourceSiteSetting(key, settings[key]);

	if (!parsed.success)
		problems.push(...describeIssues(`site_settings.${key}`, '', parsed.error.issues));
}

for (const key of Object.keys(settings)) {
	if (!siteSettingKeys.includes(key as (typeof siteSettingKeys)[number])) {
		problems.push(`site_settings.${key}: exported but not a known key in the content model`);
	}
}

if (problems.length > 0) {
	console.error(`Export aborted: ${problems.length} contract problem(s).\n`);
	for (const problem of problems) console.error(`  ${problem}`);
	console.error(
		'\nFix the schema in packages/content-model, or the content if it is genuinely wrong.',
	);
	process.exit(1);
}

const media = collectMediaRefs(settings);

mkdirSync(OUT_DIR, { recursive: true });
writeJson('packages.json', records['packages.json']);
writeJson('destinations.json', records['destinations.json']);
writeJson('articles.json', records['articles.json']);
writeJson('settings.json', settings);
writeJson('media.json', media);

/**
 * Distinct assets, not distinct references. Several fields can point at one image — a
 * destination's card `image` holds the bare asset id while its `gallery` holds the same
 * image already resolved through `img()` — and both resolve to the same URL, so the
 * media library stores one row either way.
 */
const distinctUrls = new Set(media.map((entry) => entry.resolved));

const counts = {
	package: records['packages.json'].length,
	destination: records['destinations.json'].length,
	article: records['articles.json'].length,
	siteSetting: Object.keys(settings).length,
	mediaRef: media.length,
};

writeJson('snapshot.json', {
	exportedAt: new Date().toISOString(),
	exportedFrom: 'apps/web/src/lib/data',
	counts,
	media: {
		providerId: media.filter((entry) => entry.source === 'provider-id').length,
		absoluteUrl: media.filter((entry) => entry.source === 'absolute-url').length,
		distinctUrls: distinctUrls.size,
	},
});

console.log(`Wrote ${OUT_DIR}`);
console.table(counts);
console.log(
	`Media: ${media.length} reference(s) to ${distinctUrls.size} distinct URL(s); ` +
		`${media.filter((m) => m.source === 'provider-id').length} reference(s) use a bare CDN asset id ` +
		'that Phase 2 migrates to R2, the rest are absolute URLs.',
);

/** One distinct media value, with every field that references it. */
type MediaEntry = {
	ref: string;
	/** The URL the site serves today, at the default width. */
	resolved: string;
	source: 'provider-id' | 'absolute-url';
	/** e.g. `destinations.json[2].payload.gallery[1]` — the reviewer's map back to content. */
	usedBy: string[];
};

function collectMediaRefs(settings: Record<string, unknown>): MediaEntry[] {
	const found: { path: string; ref: string }[] = [];

	// Field names come from the contract, so this collection and the admin's rewrite and
	// reference scan cannot drift apart.
	for (const { kind, file, items } of collections) {
		for (const item of items) {
			walk(item, `${file} (${item.slug})`, mediaFieldsByKind[kind], found);
		}
	}

	for (const [key, value] of Object.entries(settings)) {
		// `ctaBackground` holds the ref itself, so there is no field name to match on.
		if (isMediaSettingKey(key)) {
			collectStrings(value, `settings.json.${key}`, found);
			continue;
		}

		walk(value, `settings.json.${key}`, mediaSettingFieldNames, found);
	}

	const byRef = new Map<string, MediaEntry>();

	for (const { path, ref } of found) {
		const entry = byRef.get(ref);

		if (entry) {
			entry.usedBy.push(path);
			continue;
		}

		byRef.set(ref, {
			ref,
			resolved: img(ref),
			source: /^https?:/.test(ref) ? 'absolute-url' : 'provider-id',
			usedBy: [path],
		});
	}

	return [...byRef.values()].sort((a, b) => a.ref.localeCompare(b.ref));
}

function walk(
	value: unknown,
	path: string,
	fields: readonly string[],
	found: { path: string; ref: string }[],
) {
	if (Array.isArray(value)) {
		value.forEach((item, index) => {
			walk(item, `${path}[${index}]`, fields, found);
		});
		return;
	}

	if (!value || typeof value !== 'object') return;

	for (const [key, child] of Object.entries(value)) {
		const childPath = `${path}.${key}`;

		if (fields.includes(key)) {
			collectStrings(child, childPath, found);
			continue;
		}

		walk(child, childPath, fields, found);
	}
}

function collectStrings(value: unknown, path: string, found: { path: string; ref: string }[]) {
	if (typeof value === 'string' && value.length > 0) {
		found.push({ path, ref: value });
		return;
	}

	if (Array.isArray(value)) {
		value.forEach((item, index) => {
			collectStrings(item, `${path}[${index}]`, found);
		});
	}
}

/** `issues` from Zod, rendered as `kind slug field: message`. */
function describeIssues(
	scope: string,
	slug: string,
	issues: { path: PropertyKey[]; message: string }[],
) {
	const where = slug ? `${scope} ${slug}` : scope;

	return issues.map((issue) => {
		const field = issue.path.length > 0 ? issue.path.join('.') : '(root)';

		return `${where} → ${field}: ${issue.message}`;
	});
}

function writeJson(name: string, data: unknown) {
	writeFileSync(resolve(OUT_DIR, name), `${JSON.stringify(data, null, 2)}\n`);
}
