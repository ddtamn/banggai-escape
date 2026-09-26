import { describe, expect, it } from 'vitest';
import {
	absoluteUrl,
	blogPosting,
	breadcrumbList,
	buildMetaTags,
	jsonLdScript,
	type SeoInput,
	touristTrip,
	travelAgency,
} from './seo';

const base: SeoInput = {
	title: 'Untouched Banggai Discovery — Banggai Escape',
	description: 'Three days across mirror lakes and reef sanctuaries.',
	canonical: 'https://banggaiescape.com/packages/untouched-banggai-discovery',
	siteName: 'Banggai Escape',
	locale: 'en_US',
};

const image = {
	url: 'https://media.banggaiescape.com/a.jpg',
	alt: 'A turquoise lagoon',
	width: 1408,
	height: 768,
};

/**
 * The `content` of one tag, or undefined when it is absent.
 *
 * Narrowing happens here rather than at each call site: `MetaTag` is a union, and the `rel`
 * variant has an `href` where the other two have `content`, so asking for `.content` on the
 * union is a type error. A test that wanted the href would deserve its own accessor.
 */
const contentOf = (tags: ReturnType<typeof buildMetaTags>, key: string): string | undefined => {
	const tag = tags.find((candidate) => candidate.key === key);

	return tag && 'content' in tag ? tag.content : undefined;
};

/** The `href` of one `<link>`. */
const hrefOf = (tags: ReturnType<typeof buildMetaTags>, key: string): string | undefined => {
	const tag = tags.find((candidate) => candidate.key === key);

	return tag && 'href' in tag ? tag.href : undefined;
};

/**
 * A built document as a flat lookup.
 *
 * The builders return `unknown` on purpose — they are producing JSON-LD, and typing a schema
 * document field by field would restate schema.org in this file. Reading a property off it
 * needs a type, and `unknown` will not do; `Record<string, unknown>` is the honest middle,
 * because every read below is then checked by the assertion rather than asserted by the type.
 */
type Fields = Record<string, unknown>;

/** One nested object of a document, narrowed so its own properties can be asserted on. */
const nested = (document: Fields, key: string): Fields => (document[key] ?? {}) as Fields;

describe('absoluteUrl', () => {
	it('passes an absolute URL through untouched', () => {
		expect(absoluteUrl('https://media.example.com/a.jpg', 'https://banggaiescape.com')).toBe(
			'https://media.example.com/a.jpg',
		);
	});

	it('resolves a site-relative path against the origin', () => {
		expect(absoluteUrl('/og-default.png', 'https://banggaiescape.com')).toBe(
			'https://banggaiescape.com/og-default.png',
		);
	});

	it('is case-insensitive about the scheme, because a crawler is not', () => {
		expect(absoluteUrl('HTTPS://media.example.com/a.jpg', 'https://banggaiescape.com')).toBe(
			'HTTPS://media.example.com/a.jpg',
		);
	});
});

describe('buildMetaTags', () => {
	const tags = buildMetaTags({ ...base, image });

	it('declares a canonical URL, and it is the one passed in', () => {
		expect(hrefOf(tags, 'canonical')).toBe(base.canonical);
	});

	it('uses one description for both vocabularies that want one', () => {
		// Two separately authored strings is how a page ends up with a tab description and a
		// share description that say different things.
		expect(contentOf(tags, 'description')).toBe(base.description);
		expect(contentOf(tags, 'og:description')).toBe(base.description);
	});

	it('uses one title for the tab and the card', () => {
		expect(contentOf(tags, 'og:title')).toBe(base.title);
		expect(contentOf(tags, 'twitter:title')).toBe(base.title);
	});

	it('resolves a relative og:image to absolute, because a share card cannot use a relative one', () => {
		const relative = buildMetaTags({ ...base, image: { url: '/og-default.png', alt: 'x' } });
		expect(contentOf(relative, 'og:image')).toBe('https://banggaiescape.com/og-default.png');
	});

	it('carries the image dimensions, so a card need not reflow when it arrives', () => {
		expect(contentOf(tags, 'og:image:width')).toBe('1408');
		expect(contentOf(tags, 'og:image:height')).toBe('768');
	});

	it('omits the dimensions it was not given rather than guessing them', () => {
		const noSize = buildMetaTags({ ...base, image: { url: '/a.png', alt: 'x' } });
		expect(contentOf(noSize, 'og:image:width')).toBeUndefined();
		expect(contentOf(noSize, 'og:image:height')).toBeUndefined();
	});

	it('asks for a large card when there is an image and a small one when there is not', () => {
		expect(contentOf(tags, 'twitter:card')).toBe('summary_large_image');
		// A large card with no image is an empty grey box in most consumers.
		expect(contentOf(buildMetaTags(base), 'twitter:card')).toBe('summary');
	});

	it('omits every image tag when there is no image', () => {
		const bare = buildMetaTags(base);
		expect(contentOf(bare, 'og:image')).toBeUndefined();
		expect(contentOf(bare, 'twitter:image')).toBeUndefined();
	});

	it('is a website, not an article, until a publication date exists', () => {
		expect(contentOf(tags, 'og:type')).toBe('website');
		expect(
			contentOf(buildMetaTags({ ...base, publishedTime: '2026-03-12T00:00:00.000Z' }), 'og:type'),
		).toBe('article');
	});

	it('states article times only when they are real', () => {
		const bare = buildMetaTags({ ...base });
		expect(contentOf(bare, 'article:published_time')).toBeUndefined();
		expect(contentOf(bare, 'article:modified_time')).toBeUndefined();

		const dated = buildMetaTags({
			...base,
			publishedTime: '2026-03-12T00:00:00.000Z',
			modifiedTime: '2026-04-02T09:30:00.000Z',
		});
		expect(contentOf(dated, 'article:published_time')).toBe('2026-03-12T00:00:00.000Z');
		expect(contentOf(dated, 'article:modified_time')).toBe('2026-04-02T09:30:00.000Z');
	});

	it('never carries article metadata on a page that declares itself a website', () => {
		// A package re-priced last Tuesday is still a product page. Emitting `article:*` beside
		// `og:type: website` is a set of tags that says nothing and reads as misconfiguration.
		const repriced = buildMetaTags({ ...base, modifiedTime: '2026-04-02T09:30:00.000Z' });

		expect(contentOf(repriced, 'og:type')).toBe('website');
		expect(contentOf(repriced, 'article:modified_time')).toBeUndefined();
		expect(contentOf(repriced, 'article:published_time')).toBeUndefined();
	});

	it('names an author without needing the page to be dated', () => {
		// `author` is not an `article:` property, so it stands on its own: a page can name who
		// wrote it without being dated, and a visitor looking for one benefits either way.
		expect(contentOf(tags, 'author')).toBeUndefined();

		const authored = buildMetaTags({ ...base, author: 'Sari' });
		expect(contentOf(authored, 'author')).toBe('Sari');
		expect(contentOf(authored, 'og:type')).toBe('website');
	});

	it('emits no two tags with the same key, which is how duplicates happen', () => {
		const keys = tags.map((tag) => `${tag.attribute}:${tag.key}`);
		expect(new Set(keys).size).toBe(keys.length);
	});
});

describe('jsonLdScript', () => {
	it('escapes < so a payload cannot close the script element early', () => {
		// A blog post about HTML will contain this. The browser, not the crawler, is the thing
		// being defended here.
		const out = jsonLdScript({ name: '</script><img src=x onerror=alert(1)>' });
		expect(out).not.toContain('</script>');
		expect(out).toContain('\\u003c');
	});

	it('escapes > and & so no entity can be reassembled into a tag', () => {
		expect(jsonLdScript({ a: '>' })).toContain('\\u003e');
		expect(jsonLdScript({ a: '&' })).toContain('\\u0026');
	});

	it('still produces valid JSON once parsed back', () => {
		const value = { name: 'Danau Paisu Pok', count: 3, tags: ['a & b', '<c>'] };
		expect(JSON.parse(jsonLdScript(value))).toEqual(value);
	});
});

describe('breadcrumbList', () => {
	it('numbers positions from one, as the spec requires', () => {
		const list = breadcrumbList('https://banggaiescape.com', [
			{ name: 'Home', path: '/' },
			{ name: 'Packages', path: '/packages' },
		]) as { itemListElement: { position: number }[] };

		expect(list.itemListElement.map((item) => item.position)).toEqual([1, 2]);
	});

	it('makes every item absolute', () => {
		const list = breadcrumbList('https://banggaiescape.com', [{ name: 'Home', path: '/' }]) as {
			itemListElement: { item: string }[];
		};

		expect(list.itemListElement[0].item).toBe('https://banggaiescape.com/');
	});
});

describe('travelAgency', () => {
	const agency = travelAgency({
		name: 'Banggai Escape',
		url: 'https://banggaiescape.com/',
		description: 'Island journeys across the Banggai Archipelago.',
		email: 'hello@banggaiescape.com',
		phone: '(62) 813 5491 1647',
		phoneUrl: 'tel:+6281354911647',
		addressLines: ['Jl. Setia Budi, Luwuk Banggai', 'Central Sulawesi, Indonesia'],
		country: 'ID',
		logo: '/logomark.png',
	}) as Fields;

	it('is a TravelAgency, so the address and phone mean something', () => {
		expect(agency['@type']).toBe('TravelAgency');
		expect(agency['@id']).toBe('https://banggaiescape.com/#organization');
	});

	it('splits the authored address into street and locality', () => {
		expect(nested(agency, 'address').addressLocality).toBe('Central Sulawesi, Indonesia');
		expect(nested(agency, 'address').streetAddress).toBe('Jl. Setia Budi, Luwuk Banggai');
		expect(nested(agency, 'address').addressCountry).toBe('ID');
	});

	it('resolves a relative logo against the site origin', () => {
		expect(agency.logo).toBe('https://banggaiescape.com/logomark.png');
	});

	it('keeps the readable number in telephone and the dialable URI on the contact point', () => {
		// `telephone` is a number in schema.org. A `tel:` URI in it is a malformed value, and
		// the field a consumer can act on is the contact point's `url`.
		expect(agency.telephone).toBe('(62) 813 5491 1647');
		expect(nested(agency, 'contactPoint').url).toBe('tel:+6281354911647');
	});

	it('omits the contact point url rather than inventing a dialable form', () => {
		const noUrl = travelAgency({
			name: 'x',
			url: 'https://banggaiescape.com/',
			description: 'd',
			phone: '(62) 813 5491 1647',
			addressLines: [],
			country: 'ID',
		}) as Fields;

		expect(nested(noUrl, 'contactPoint').url).toBeUndefined();
	});

	it('omits sameAs entirely when given no real profile URLs', () => {
		// Every social link in the CMS is currently `href="#"`. Emitting that would assert an
		// identity the business has not claimed.
		expect(agency.sameAs).toBeUndefined();
	});

	it('keeps sameAs when given real ones', () => {
		const linked = travelAgency({
			name: 'x',
			url: 'https://banggaiescape.com/',
			description: 'd',
			addressLines: [],
			country: 'ID',
			sameAs: ['https://instagram.com/banggaiescape'],
		}) as Fields;

		expect(linked.sameAs).toEqual(['https://instagram.com/banggaiescape']);
	});

	it('copes with an empty address rather than emitting a blank one', () => {
		const bare = travelAgency({
			name: 'x',
			url: 'https://banggaiescape.com/',
			description: 'd',
			addressLines: [],
			country: 'ID',
		}) as Fields;

		expect(nested(bare, 'address').streetAddress).toBeUndefined();
	});
});

describe('touristTrip', () => {
	const trip = touristTrip({
		name: 'Untouched Banggai Discovery',
		description: 'Three days across mirror lakes.',
		url: 'https://banggaiescape.com/packages/untouched-banggai-discovery',
		image: 'https://media.banggaiescape.com/a.jpg',
		price: 2850000,
		durationDays: 3,
		region: 'Luwuk - Banggai Kepulauan',
	}) as Fields;

	it('declares both TouristTrip and Product, so travel and commerce both find it', () => {
		expect(trip['@type']).toEqual(['TouristTrip', 'Product']);
	});

	it('expresses duration as an ISO 8601 period, not a number of nights', () => {
		expect(trip.duration).toBe('P3D');
	});

	it('offers the price in the site currency', () => {
		expect(nested(trip, 'offers').price).toBe(2850000);
		expect(nested(trip, 'offers').priceCurrency).toBe('IDR');
	});

	it('omits the offer rather than claiming a price of zero', () => {
		const free = touristTrip({
			name: 'x',
			description: 'd',
			url: 'https://banggaiescape.com/x',
		}) as Fields;

		expect(free.offers).toBeUndefined();
	});

	it('states no price expiry, because nobody knows when the price ends', () => {
		// A fabricated `priceValidUntil` is a claim about the future. Its absence is a smaller
		// problem than a false one.
		expect(nested(trip, 'offers').priceValidUntil).toBeUndefined();
	});
});

describe('blogPosting', () => {
	const post = blogPosting({
		headline: 'Why the lake is glass',
		description: 'A short explanation.',
		url: 'https://banggaiescape.com/blog/why-the-lake-is-glass',
		image: 'https://media.banggaiescape.com/a.jpg',
		publishedTime: '2026-03-12T00:00:00.000Z',
		modifiedTime: '2026-04-02T09:30:00.000Z',
		author: 'Sari',
		siteName: 'Banggai Escape',
	}) as Fields;

	it('dates the post with machine dates', () => {
		expect(post.datePublished).toBe('2026-03-12T00:00:00.000Z');
		expect(post.dateModified).toBe('2026-04-02T09:30:00.000Z');
	});

	it('names both the byline and the publisher', () => {
		expect(nested(post, 'author').name).toBe('Sari');
		expect(nested(post, 'publisher').name).toBe('Banggai Escape');
	});

	it('points mainEntityOfPage at the article itself', () => {
		expect(nested(post, 'mainEntityOfPage')['@id']).toBe(
			'https://banggaiescape.com/blog/why-the-lake-is-glass',
		);
	});
});
