/**
 * Turning the CMS's site settings into the structured data a crawler reads.
 *
 * ## Why this sits beside `seo.ts` and not inside it
 *
 * `seo.ts` takes plain values and is tested in isolation. The mapping from *this* content
 * model to those values — an `address` array of free-text lines, a `phone` written for a human
 * to read — is where the judgement lives, and it deserves its own file and its own reasons.
 * A component then asks for `siteAgency(site, origin)` and gets a correct document without
 * repeating the mapping on three pages.
 */
import { type Crumb, travelAgency } from './seo';

/** The shape this needs from `site_settings.site`. Structural, so a contract change is caught. */
export type SiteIdentity = {
	name: string;
	email: string;
	phone: string;
	tagline: string;
	address: string[];
	phoneHref: string;
	reviewCount?: number;
	/** Present so the placeholders can be filtered out; see `socialProfiles`. */
	socials?: { href: string }[];
};

/**
 * The ISO 3166-1 alpha-2 code for the country the business is in.
 *
 * Written out rather than parsed from the address because the address is prose an editor typed
 * for a human reader — "Central Sulawesi, Indonesia" — and guessing a country code out of a
 * free-text line is the kind of inference that is wrong silently and unfixably. The
 * structured-data consumer needs the code, so it is stated here once, next to the address it
 * has to agree with.
 */
export const COUNTRY = 'ID';

/**
 * The organisation, as `TravelAgency`.
 *
 * Declared on the home page, the about page and the contact page alike. That is not
 * duplication: all three carry the same `@id`, so a consumer merges them into one entity
 * rather than reporting three. One page claiming it would leave the other two looking like
 * pages with no organisation behind them.
 */
export function siteAgency(site: SiteIdentity, origin: string): unknown {
	const profiles = socialProfiles(site);

	return travelAgency({
		name: site.name,
		url: `${origin}/`,
		// The tagline, not a page description: this is the one line the business uses to
		// describe itself everywhere else, so it is the honest answer to "what is this".
		description: site.tagline,
		email: site.email,
		// Both forms, because schema.org wants them in different places: `telephone` is a
		// number a human reads, and the contact point's `url` is the `tel:` URI a consumer can
		// actually dial. The CMS already stores both, so neither has to be derived.
		phone: site.phone,
		phoneUrl: site.phoneHref,
		addressLines: site.address,
		country: COUNTRY,
		logo: `${origin}/logomark.png`,
		image: `${origin}/og-default.png`,
		// Empty when every link is a placeholder, and `travelAgency` then omits `sameAs`
		// entirely rather than emitting an empty array.
		...(profiles.length > 0 ? { sameAs: profiles } : {}),
	});
}

/**
 * Real social profile URLs, and nothing else.
 *
 * A `#` href, an empty string, or anything not on http(s) is not a profile and is dropped. This
 * runs the filter rather than trusting the data, so an editor leaving a placeholder in place
 * cannot put `#` into a `sameAs` array that a consumer will publish as fact.
 */
function socialProfiles(site: SiteIdentity): string[] {
	return (site.socials ?? [])
		.map((social) => social.href?.trim() ?? '')
		.filter((href) => /^https?:\/\//i.test(href));
}

/**
 * A breadcrumb trail, always rooted at the home page.
 *
 * The root is prepended rather than left to the caller because every trail in this site starts
 * there, and a caller who forgets produces a trail that disagrees with the site's own
 * navigation — which is the one thing a breadcrumb is checked against.
 */
export function siteCrumbs(...trail: Crumb[]): Crumb[] {
	return [{ name: 'Home', path: '/' }, ...trail];
}
