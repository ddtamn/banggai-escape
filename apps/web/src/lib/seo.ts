/**
 * Everything a page tells a crawler, a share card, or a search result about itself.
 *
 * ## Why this is one module and not markup in each page
 *
 * Open Graph, Twitter cards, canonical URLs and JSON-LD are four vocabularies describing one
 * fact — what this page is — and they have to agree. Written per page they drift: a page
 * updates its `<title>`, forgets the `og:title`, and the link preview now shows a different
 * name from the tab. Worse, the failures are invisible. Nothing breaks; a share just looks
 * wrong to whoever receives it.
 *
 * So the tags are built here, from one input, and a page states the fact once. Pure functions
 * with no `$app` or `$env` imports, which is what lets `seo.spec.ts` pin the rules in a plain
 * Node environment.
 *
 * ## What is deliberately absent
 *
 * - **No domain.** Every URL is absolute because a share card and a crawler both need one, and
 *   a relative `og:image` is silently dropped by several consumers. But which domain is a
 *   property of the *request*, not of this module, so callers pass an already-absolute
 *   canonical and the module derives the origin from it. That is why nothing here hardcodes
 *   `banggaiescape.com`: behind Cloudflare the request already knows the public host.
 * - **No `sameAs` from the social links.** Every social URL in the CMS is currently `href="#"`
 *   — an unconfigured placeholder. Emitting `"sameAs": ["#"]` would assert an identity the
 *   business has not claimed, and it is the kind of claim a consumer cannot check but will
 *   publish. `sameAs` is only emitted from a caller that has a real URL to give.
 * - **No keyword meta, no `robots` meta.** Both were removed from search engines as ranking
 *   signals years ago, and `robots.txt` plus a sitemap express crawl policy better than a
 *   per-page meta tag.
 */

/** A `<meta>` or `<link>` the head needs, in a shape the `Seo` component can render blindly. */
export type MetaTag =
	| { attribute: 'name'; key: string; content: string }
	| { attribute: 'property'; key: string; content: string }
	| { attribute: 'rel'; key: string; href: string };

/** The picture a share card shows. */
export type SeoImage = {
	/** Absolute, or site-relative — both are resolved against the canonical's origin. */
	url: string;
	alt: string;
	width?: number;
	height?: number;
};

/** One page's identity. Everything the head needs, and nothing it does not. */
export type SeoInput = {
	/** The document title. Also becomes `og:title`, so the two cannot disagree. */
	title: string;
	description: string;
	/**
	 * This page's canonical URL, absolute.
	 *
	 * `website` for a page that is about the site, `article` for a dated post. It is a real
	 * signal in a feed, not decoration: `article` gets the date and author treatments.
	 */
	canonical: string;
	image?: SeoImage | null;
	siteName: string;
	locale: string;
	/** ISO 8601, for `article:published_time`. Omitted rather than faked when absent. */
	publishedTime?: string | null;
	modifiedTime?: string | null;
	author?: string | null;
};

/**
 * The absolute form of a possibly-relative URL.
 *
 * Absolute inputs pass through untouched — the media library hands out absolute URLs, and
 * re-resolving one would be a no-op at best. A site-relative path is joined onto the origin so
 * a `/og-default.png` in `static/` can be used the same way as a media-library image.
 */
export function absoluteUrl(url: string, origin: string): string {
	if (/^https?:\/\//i.test(url)) return url;

	return new URL(url, origin).href;
}

/** The origin of an absolute URL, or the input unchanged if it has none to give. */
function originOf(absolute: string): string {
	try {
		return new URL(absolute).origin;
	} catch {
		return absolute;
	}
}

/**
 * The tag set for one page: description, canonical, Open Graph and Twitter.
 *
 * A `description` is emitted as a plain `name` tag *and* as `og:description` from the same
 * string, because they are different vocabularies that happen to want the same words; writing
 * them separately is how they start differing.
 */
export function buildMetaTags(input: SeoInput): MetaTag[] {
	const origin = originOf(input.canonical);
	const image = input.image ? { ...input.image, url: absoluteUrl(input.image.url, origin) } : null;

	// A publication date is what makes a page an article rather than a page *about* something.
	// Every `article:*` tag below hangs off this one decision, so a page cannot end up carrying
	// article metadata while declaring itself a website — a combination that says nothing and
	// reads as though something were misconfigured.
	const isArticle = Boolean(input.publishedTime);

	const tags: MetaTag[] = [
		{ attribute: 'name', key: 'description', content: input.description },
		{ attribute: 'rel', key: 'canonical', href: input.canonical },

		{ attribute: 'property', key: 'og:type', content: isArticle ? 'article' : 'website' },
		{ attribute: 'property', key: 'og:title', content: input.title },
		{ attribute: 'property', key: 'og:description', content: input.description },
		{ attribute: 'property', key: 'og:url', content: input.canonical },
		{ attribute: 'property', key: 'og:site_name', content: input.siteName },
		{ attribute: 'property', key: 'og:locale', content: input.locale },
	];

	if (image) {
		tags.push(
			{ attribute: 'property', key: 'og:image', content: image.url },
			{ attribute: 'property', key: 'og:image:alt', content: image.alt },
		);

		// Declared dimensions let a consumer lay the card out before the image arrives, which is
		// the difference between a card that reflows and one that does not. Omitted when the
		// media library has no dimensions for the asset rather than guessed at.
		if (image.width)
			tags.push({ attribute: 'property', key: 'og:image:width', content: String(image.width) });
		if (image.height)
			tags.push({ attribute: 'property', key: 'og:image:height', content: String(image.height) });

		tags.push({ attribute: 'name', key: 'twitter:card', content: 'summary_large_image' });
		tags.push({ attribute: 'name', key: 'twitter:image', content: image.url });
		tags.push({ attribute: 'name', key: 'twitter:image:alt', content: image.alt });
	} else {
		// A small card rather than a large one over a missing image. A consumer that honours
		// `summary_large_image` without an image renders an empty grey box; `summary` falls back
		// to a text card, which is at least readable.
		tags.push({ attribute: 'name', key: 'twitter:card', content: 'summary' });
	}

	tags.push({ attribute: 'name', key: 'twitter:title', content: input.title });
	tags.push({ attribute: 'name', key: 'twitter:description', content: input.description });

	// Only on an article, and only when the value is real. A `modifiedTime` alone does not
	// promote a page to an article — a package page that was re-priced last Tuesday is still a
	// product page, and the date belongs in its structured data, not in `article:*` tags that
	// no consumer will read.
	if (isArticle && input.publishedTime) {
		tags.push({
			attribute: 'property',
			key: 'article:published_time',
			content: input.publishedTime,
		});
	}
	if (isArticle && input.modifiedTime) {
		tags.push({ attribute: 'property', key: 'article:modified_time', content: input.modifiedTime });
	}
	// `author` is not an `article:` property, so it stands on its own: a page can name an
	// author without being dated, and a visitor looking for one benefits either way.
	if (input.author) {
		tags.push({ attribute: 'name', key: 'author', content: input.author });
	}

	return tags;
}

/**
 * Serialise a JSON-LD document for embedding in a `<script>` block.
 *
 * `<` becomes `<` and `&` becomes `&`, which is the whole reason this function
 * exists. `JSON.stringify` is correct JSON and *not* correct HTML: a payload
 * containing `</script>` — a `</script>` inside a code sample in a blog post, say — closes
 * the tag early and turns the remainder into markup the browser executes. Editors write those
 * posts, so this is reachable, not theoretical.
 */
export function jsonLdScript(document: unknown): string {
	return JSON.stringify(document)
		.replace(/</g, '\\u003c')
		.replace(/>/g, '\\u003e')
		.replace(/&/g, '\\u0026');
}

/**
 * A complete JSON-LD script element, ready to inject.
 *
 * Assembling the element here rather than in the component is not a matter of taste. A Svelte
 * script block ends at the first closing script tag in its *source*, whatever comment
 * surrounds it — so a component cannot spell out the very element it is trying to produce.
 * Keeping the literal in a plain TypeScript module puts it where the only parser reading it is
 * TypeScript's, which is also why the string is split here rather than written whole.
 *
 * Safe for the same reason `jsonLdScript` is: every `<` has already been escaped, so the
 * payload cannot terminate the element early.
 */
export function jsonLdBlock(document: unknown): string {
	return `<script type="application/ld+json">${jsonLdScript(document)}</` + `script>`;
}

/** One step in a breadcrumb trail, in order from the site root. */
export type Crumb = { name: string; path: string };

/**
 * A `BreadcrumbList`.
 *
 * The caller passes the whole trail, current page included, because a trail that does not end
 * at the page it is on describes a different page — and a consumer that notices the mismatch
 * discards the whole thing. Making the last step the caller's job removes the opportunity to
 * forget it.
 *
 * Positions are 1-based because the spec says so, and every `item` is absolute because
 * `BreadcrumbList.item` is a URL, not a fragment.
 */
export function breadcrumbList(origin: string, crumbs: readonly Crumb[]): unknown {
	return {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: crumbs.map((crumb, index) => ({
			'@type': 'ListItem',
			position: index + 1,
			name: crumb.name,
			item: absoluteUrl(crumb.path, origin),
		})),
	};
}

/** What the business is, for a home page or an about page. */
export type AgencyInput = {
	name: string;
	url: string;
	description: string;
	email?: string | null;
	/** The number as a human reads it, e.g. "(62) 813 5491 1647". This is what `telephone` takes. */
	phone?: string | null;
	/**
	 * The callable form of the same number, e.g. `tel:+6281354911647`.
	 *
	 * Kept separate because `telephone` is a *number* in schema.org and a `tel:` URI in it is
	 * a malformed value. The URI is what goes on the contact point's `url`, which is the field
	 * that exists to be dialled.
	 */
	phoneUrl?: string | null;
	/** Address lines as authored, plus the region and country structured data wants. */
	addressLines: readonly string[];
	country: string;
	addressRegion?: string | null;
	image?: string | null;
	logo?: string | null;
	priceRange?: string | null;
	/** Only real, absolute profile URLs. Placeholders must not reach this. */
	sameAs?: readonly string[];
};

/**
 * A `TravelAgency`, which is a `LocalBusiness` subtype.
 *
 * `TravelAgency` rather than a bare `LocalBusiness` because the distinction is the whole point:
 * it is what makes the address, phone and geo-relevant fields meaningful for a business whose
 * customers are visiting rather than calling round the corner.
 *
 * `PostalAddress` carries the last two address lines rather than an invented, separately
 * maintained region and country. The address is one string an editor typed; inventing a
 * separately editable `addressRegion` would be a second source of truth that can disagree with
 * the first, and a postal address that contradicts itself is worse than one that is merely
 * coarse.
 */
export function travelAgency(input: AgencyInput): unknown {
	const origin = originOf(input.url);
	const [street, ...rest] = input.addressLines;
	const locality = rest.at(0) ?? null;

	const agency: Record<string, unknown> = {
		'@context': 'https://schema.org',
		'@type': 'TravelAgency',
		'@id': `${input.url}#organization`,
		name: input.name,
		url: input.url,
		description: input.description,
		address: {
			'@type': 'PostalAddress',
			...(street ? { streetAddress: street } : {}),
			...(locality ? { addressLocality: locality } : {}),
			...(input.addressRegion ? { addressRegion: input.addressRegion } : {}),
			addressCountry: input.country,
		},
	};

	if (input.email) agency.email = input.email;
	if (input.phone) {
		agency.telephone = input.phone;
		// A separate contact point, because `telephone` cannot be dialled and this is the
		// field that exists to be: `url` carries the `tel:` URI a consumer can act on.
		agency.contactPoint = {
			'@type': 'ContactPoint',
			telephone: input.phone,
			contactType: 'reservations',
			...(input.phoneUrl ? { url: input.phoneUrl } : {}),
		};
	}
	if (input.image) agency.image = absoluteUrl(input.image, origin);
	if (input.logo) agency.logo = absoluteUrl(input.logo, origin);
	if (input.priceRange) agency.priceRange = input.priceRange;
	if (input.sameAs?.length) agency.sameAs = [...input.sameAs];

	return agency;
}

/** What a bookable trip is, for a package page. */
export type TripInput = {
	name: string;
	description: string;
	url: string;
	image?: string | null;
	/** Price as authored, in the site's currency. */
	price?: number | null;
	currency?: string;
	/** ISO 8601, if there is a real one. */
	modifiedTime?: string | null;
	tripType?: string | null;
	region?: string | null;
	durationDays?: number | null;
};

/**
 * A `TouristTrip` that is also a `Product`.
 *
 * `TouristTrip` is the accurate type — a scheduled trip to a place — but it inherits from
 * `Product`, and Google's travel-result support reads the product half: price, currency and
 * availability are what turn a rich result into a bookable one. Declaring both types is what
 * lets a consumer pick the more specific one and still find the commercial fields.
 */
export function touristTrip(input: TripInput): unknown {
	const origin = originOf(input.url);

	const trip: Record<string, unknown> = {
		'@context': 'https://schema.org',
		'@type': ['TouristTrip', 'Product'],
		'@id': `${input.url}#trip`,
		name: input.name,
		description: input.description,
		url: input.url,
	};

	if (input.image) trip.image = absoluteUrl(input.image, origin);
	if (input.tripType) trip.tripType = input.tripType;
	if (input.region) trip.touristType = input.region;
	if (input.durationDays) trip.duration = `P${input.durationDays}D`;

	if (typeof input.price === 'number') {
		trip.offers = {
			'@type': 'Offer',
			price: input.price,
			priceCurrency: input.currency ?? 'IDR',
			availability: 'https://schema.org/InStock',
			url: input.url,
		};
	}

	// `priceValidUntil` is what stops a price being shown as current forever. It is absent
	// rather than invented: a made-up expiry is a claim about when a price ends, and nobody
	// here knows that. A price with no expiry is a smaller problem than a false one.
	if (input.modifiedTime) trip.dateModified = input.modifiedTime;

	return trip;
}

/** What a destination is, for a destination page. */
export type PlaceInput = {
	name: string;
	description: string;
	url: string;
	image?: string | null;
	/** The region this place is in, as authored. */
	region?: string | null;
	country: string;
	modifiedTime?: string | null;
};

/**
 * A `TouristAttraction`.
 *
 * The accurate type for a destination, and a different one from a `TouristTrip`: a destination
 * is a place, a trip is a journey sold against it. Declaring a place as a bookable product
 * would put an offer on a page that has no price and no availability, which is exactly the kind
 * of claim that earns a structured-data penalty.
 */
export function touristAttraction(input: PlaceInput): unknown {
	const origin = originOf(input.url);

	const place: Record<string, unknown> = {
		'@context': 'https://schema.org',
		'@type': 'TouristAttraction',
		'@id': `${input.url}#place`,
		name: input.name,
		description: input.description,
		url: input.url,
		address: { '@type': 'PostalAddress', addressCountry: input.country },
	};

	if (input.region) place.touristType = input.region;
	if (input.image) place.image = absoluteUrl(input.image, origin);
	if (input.modifiedTime) place.dateModified = input.modifiedTime;

	return place;
}

/** What an article is, for a blog post. */
export type ArticleInput = {
	headline: string;
	description: string;
	url: string;
	image?: string | null;
	publishedTime: string;
	modifiedTime?: string | null;
	author: string;
	siteName: string;
	/** Absolute URL of the publisher's logo. A rich result shows it next to the headline. */
	publisherLogo?: string | null;
};

/**
 * A `BlogPosting`.
 *
 * `datePublished` and `dateModified` come from the revision, never from the payload's `date`
 * and `updated` fields. Those are display strings an editor typed for a human reader
 * — "March 12, 2026" — and a date a machine cannot parse is worth nothing here.
 */
export function blogPosting(input: ArticleInput): unknown {
	const origin = originOf(input.url);

	const publisher: Record<string, unknown> = { '@type': 'Organization', name: input.siteName };
	if (input.publisherLogo) publisher.logo = absoluteUrl(input.publisherLogo, origin);

	const article: Record<string, unknown> = {
		'@context': 'https://schema.org',
		'@type': 'BlogPosting',
		'@id': `${input.url}#article`,
		headline: input.headline,
		description: input.description,
		url: input.url,
		datePublished: input.publishedTime,
		author: { '@type': 'Person', name: input.author },
		publisher,
		mainEntityOfPage: { '@type': 'WebPage', '@id': input.url },
	};

	if (input.modifiedTime) article.dateModified = input.modifiedTime;
	if (input.image) article.image = absoluteUrl(input.image, origin);

	return article;
}
