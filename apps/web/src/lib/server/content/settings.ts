/**
 * Reading the site's own settings.
 *
 * Settings are the chrome and the shared editorial blocks — brand and contact details, the
 * navigation, the footer, socials, and the features, testimonials, FAQs, stats and category
 * list that appear on more than one page. Unlike content they have **no draft and no
 * revision**: the admin validates on save and the public site reads `site_settings` directly,
 * so the stored value is the live value and a change is visible as soon as the edge cache
 * expires.
 *
 * Every key the contract declares must have a row. The settings screen writes all thirteen,
 * and a missing one would render a page with a hole in it — an empty nav, a footer with no
 * address — which is exactly the kind of failure that looks like a CSS bug rather than a
 * data problem. So it is reported as one.
 *
 * The stored value is validated **before** its media is resolved, for the reason set out in
 * `entries.ts`: a stored avatar is a `media_assets` id and a rendered one is an image, and
 * `mediaIdSchema` only accepts the first.
 */
import {
	collectSettingMediaIds,
	isMediaSettingKey,
	parseSiteSetting,
	type RenderedMedia,
	type RenderedSiteSettingValue,
	rewriteSettingMediaRefs,
	type SiteSettingKey,
	siteSettingKeys,
} from '@banggai/content-model';
import { database } from '$lib/server/db';
import { describeIssues } from './issues';
import { loadMedia } from './media';

/**
 * Every setting a page can render, keyed as `site_settings.key`.
 *
 * The mapped type is what makes a new key in the contract a type error here until it is
 * read: the value type resolves each key to its own shape, so `settings.nav` is `NavItem[]`
 * and `settings.faqs` is `FaqItem[]` rather than a union of everything. It is the *rendered*
 * value type, because by the time this returns every media field has been resolved.
 */
export type SiteSettings = { [Key in SiteSettingKey]: RenderedSiteSettingValue<Key> };

export async function loadSiteSettings(): Promise<SiteSettings> {
	const rows = await database()`select key, value from site_settings`;
	const stored = new Map(rows.map((row) => [String(row.key), row.value as unknown]));

	const missing = siteSettingKeys.filter((key) => !stored.has(key));

	if (missing.length > 0) {
		throw new Error(
			`site_settings has no row for ${missing.map((key) => `“${key}”`).join(', ')}, so the ` +
				'site chrome would render with holes in it.',
		);
	}

	// One lookup for every image any setting points at: the testimonial avatars and the
	// background shared by every page's CTA banner.
	const media = await loadMedia(
		siteSettingKeys.flatMap((key) => collectSettingMediaIds(key, stored.get(key))),
	);

	const values = siteSettingKeys.map((key) => {
		const parsed = parseSiteSetting(key, stored.get(key));

		if (!parsed.success) {
			throw new Error(
				`The stored site setting “${key}” does not satisfy its contract, so the site ` +
					`cannot be served:\n  ${describeIssues(parsed.error.issues).join('\n  ')}`,
			);
		}

		// `ctaBackground` is the one media setting that is not an image in the page: it is a
		// CSS background, so it resolves to a bare URL and has no description to carry. Every
		// other media field here is an `<img>`, so it resolves to the image the library
		// describes. See `RenderedSiteSettingValue` for why the two differ.
		const resolve: (id: string) => string | RenderedMedia = isMediaSettingKey(key)
			? (id) => media.url(id)
			: (id) => media.image(id);

		const { value } = rewriteSettingMediaRefs(key, parsed.data, resolve);

		return [key, value] as const;
	});

	// `Object.fromEntries` cannot know the keys are exactly `siteSettingKeys`, and the loop
	// above cannot assign through a union key. The assertion is the only way to say what the
	// contract already guarantees.
	return Object.fromEntries(values) as SiteSettings;
}
