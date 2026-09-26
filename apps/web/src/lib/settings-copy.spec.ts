/**
 * The page-copy settings must be safe to deploy before the data exists.
 *
 * ## Why this file exists
 *
 * Adding a field to a `strictObject` setting is a deploy-ordering hazard, and it has already
 * caused one outage: `site.whatsapp` was added as *required*, the seeding migration was run
 * only against `dev`, and the first deploy of the schema took every page on the site to 500
 * while `sitemap.xml` — which reads no settings — carried on answering 200.
 *
 * Every page-copy field therefore carries the copy it replaces as a Zod default. The property
 * that makes that safe is not "the defaults exist" but "**an absent or empty value parses**",
 * because a default that is never reached is no protection at all. That is what these tests
 * assert, against the real schemas rather than against a description of them.
 */

import { homePageCopySchema, innerPageCopySchema, siteCtaSchema } from '@banggai/content-model';
import { describe, expect, it } from 'vitest';

/** Every leaf path in a parsed value, so "all populated" can be asserted rather than eyeballed. */
function leafPaths(value: unknown, prefix = ''): string[] {
	if (value === null || typeof value !== 'object') return [prefix];

	return Object.entries(value).flatMap(([key, child]) =>
		leafPaths(child, prefix ? `${prefix}.${key}` : key),
	);
}

describe('page copy is safe to deploy before the data exists', () => {
	it('parses an absent value, so a missing key is the current copy and not a 500', () => {
		// The property the whole design rests on. If this fails, the site is one deploy away
		// from being down again.
		expect(siteCtaSchema.safeParse(undefined).success).toBe(true);
		expect(homePageCopySchema.safeParse(undefined).success).toBe(true);
		expect(innerPageCopySchema.safeParse(undefined).success).toBe(true);
	});

	it('parses an empty object, so a half-written row is not a broken site either', () => {
		// An editor who has filled in nothing yet, and a migration that wrote `{}` as a
		// placeholder, are both states the site has to survive.
		expect(siteCtaSchema.safeParse({}).success).toBe(true);
		expect(homePageCopySchema.safeParse({}).success).toBe(true);
		expect(innerPageCopySchema.safeParse({}).success).toBe(true);
	});

	it('populates every leaf from an empty object, with no empty string left behind', () => {
		// The `prefault({})` on each band exists precisely so that a nested object is not the
		// one thing that arrives empty. And an empty string is worse than absent: it renders an
		// empty paragraph with its margin, which is a visible gap.
		for (const [name, schema] of [
			['siteCta', siteCtaSchema],
			['homePage', homePageCopySchema],
			['innerPage', innerPageCopySchema],
		] as const) {
			const parsed = schema.parse({}) as Record<string, unknown>;

			for (const path of leafPaths(parsed)) {
				const value = path
					.split('.')
					.reduce<unknown>((node, key) => (node as Record<string, unknown>)[key], parsed);

				expect(value, `${name}.${path} is empty`).not.toBe('');
				expect(value, `${name}.${path} is missing`).not.toBeUndefined();
			}
		}
	});

	it('fills the nested About band, which has fields the shared band shape does not', () => {
		// `body` and `actionLabel` exist only on this band, so the `section()` helper — which
		// knows only the fields it was handed — would leave them out without its own
		// `prefault`. This is the test that says so.
		const about = homePageCopySchema.parse({}).about;

		expect(about.body).toHaveLength(2);
		expect(about.actionLabel).toBeTruthy();
	});

	it('lets a stored value override every default', () => {
		// A default is a floor, not a ceiling. If an editor's value were being ignored the page
		// would be uneditable in the most confusing way possible: the form would save, the
		// database would change, and nothing on the site would move.
		const stored = { title: 'Edited title', text: 'Edited text', ctaLabel: 'Edited label' };

		expect(siteCtaSchema.parse(stored)).toEqual(stored);
	});
});

describe('page copy rejects what it should', () => {
	it('refuses a blank string, which would render an empty heading', () => {
		const parsed = homePageCopySchema.safeParse({ heading: '' });

		expect(parsed.success).toBe(false);
	});

	it('refuses an unknown key, so a typo in a migration is caught rather than ignored', () => {
		// `strictObject` is the reason. A misspelled field that a permissive schema dropped
		// would leave an editor editing something that does not exist.
		expect(homePageCopySchema.safeParse({ headng: 'Discover Banggai' }).success).toBe(false);
	});

	it('refuses an About section with fewer than two paragraphs', () => {
		// The layout is a two-column grid with one paragraph each, so a single stored paragraph
		// would render a hole in the second column.
		const one = homePageCopySchema.safeParse({ about: { body: ['Only one.'] } });

		expect(one.success).toBe(false);
	});

	it('treats an absent hero subtitle as "no standfirst" rather than an empty one', () => {
		// Different on purpose: absent renders nothing, empty renders an empty paragraph with
		// its bottom margin. Storing `''` would put a visible gap under the heading.
		const parsed = innerPageCopySchema.parse({});

		expect(parsed.heroSubtitle).toBeUndefined();
	});
});
