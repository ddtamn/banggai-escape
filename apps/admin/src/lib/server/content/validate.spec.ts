import { describe, expect, it } from 'vitest';
import {
	assertValidPayload,
	assertValidSiteSetting,
	ContentValidationError,
	formatIssues,
} from './validate';

/**
 * A `media_assets.id`. Stored payloads reference the row, not the CDN value the modules
 * author, so every fixture here uses a UUID — see the rejection case at the end.
 */
const MEDIA_ID = '11111111-1111-4111-8111-111111111111';

/** A package payload as it is stored in `content_entries.draft_payload`. */
const pkg = {
	slug: 'untouched-banggai-discovery',
	title: 'Untouched Banggai Discovery',
	subtitle: 'Seven days between karst lakes and empty reefs',
	region: 'Banggai Kepulauan',
	days: 7,
	nights: 6,
	tripType: 'Private Trip',
	price: 2850000,
	image: MEDIA_ID,
	groupSize: '2–8 travelers',
	accommodation: 'Beachfront bungalows',
	overview: 'A week on the quieter side of the archipelago.',
	highlights: [{ title: 'Paisu Pok', text: 'Swim in the karst lake.' }],
	included: ['Local guide'],
	itinerary: [{ label: 'Day 1', title: 'Arrival', text: 'Meet at Luwuk.' }],
	featured: true,
};

const destination = {
	slug: 'paisu-pok-lake',
	name: 'Paisu Pok Lake',
	region: 'Banggai',
	tagline: 'A karst lake in the mangroves.',
	image: MEDIA_ID,
	overview: ['Clear water, no current.'],
	quickInfo: {
		bestTime: 'April to October',
		duration: 'Half day',
		highlights: 'Snorkeling',
		accessibility: 'Short boardwalk',
	},
	experiences: [{ title: 'Swim', text: 'Float above the reef.' }],
	gallery: [MEDIA_ID],
};

const article = {
	slug: 'how-to-get-to-banggai-islands',
	category: 'Travel Tips',
	tags: ['Banggai'],
	title: 'How to Get to Banggai Islands',
	excerpt: 'Flights, transfers, and ferries.',
	image: MEDIA_ID,
	date: 'March 12, 2026',
	updated: 'March 20, 2026',
	readTime: '9 min read',
	author: 'Banggai Escape Team',
	authorRole: 'Local Guide',
	hero: MEDIA_ID,
	body: [{ kind: 'p', text: 'Start in Luwuk.' }],
};

describe('assertValidPayload', () => {
	it('accepts each kind as the static modules author it', () => {
		expect(() => assertValidPayload('package', pkg)).not.toThrow();
		expect(() => assertValidPayload('destination', destination)).not.toThrow();
		expect(() => assertValidPayload('article', article)).not.toThrow();
	});

	it('accepts a package without the optional featured flag', () => {
		const { featured: _omitted, ...withoutFeatured } = pkg;

		expect(() => assertValidPayload('package', withoutFeatured)).not.toThrow();
	});

	it('names the offending field in the thrown message', () => {
		try {
			assertValidPayload('package', { ...pkg, slug: 'Not A Slug' });
			expect.unreachable('expected a rejection');
		} catch (error) {
			expect(error).toBeInstanceOf(ContentValidationError);
			expect((error as ContentValidationError).issues[0]).toContain('slug');
		}
	});

	it('rejects unknown fields instead of silently dropping them', () => {
		// The contracts are strict objects, so a renamed field is a failure rather than
		// content that quietly stops rendering.
		expect(() => assertValidPayload('package', { ...pkg, priceFrom: 2850000 })).toThrow(
			ContentValidationError,
		);
	});

	it('rejects a required field that disappeared', () => {
		const { itinerary: _dropped, ...withoutItinerary } = pkg;

		expect(() => assertValidPayload('package', withoutItinerary)).toThrow(ContentValidationError);
	});

	it('rejects an empty required collection', () => {
		expect(() => assertValidPayload('package', { ...pkg, included: [] })).toThrow(
			ContentValidationError,
		);
		expect(() => assertValidPayload('destination', { ...destination, overview: [] })).toThrow(
			ContentValidationError,
		);
	});

	it('rejects a value outside the trip type union', () => {
		expect(() => assertValidPayload('package', { ...pkg, tripType: 'Group Tour' })).toThrow(
			ContentValidationError,
		);
	});

	it('rejects a negative price or a zero-day package', () => {
		expect(() => assertValidPayload('package', { ...pkg, price: -1 })).toThrow(
			ContentValidationError,
		);
		expect(() => assertValidPayload('package', { ...pkg, days: 0 })).toThrow(
			ContentValidationError,
		);
	});

	it('accepts a single-day package with no nights', () => {
		expect(() =>
			assertValidPayload('package', { ...pkg, days: 1, nights: 0, tripType: 'Open Trip' }),
		).not.toThrow();
	});

	it('validates the article body as a closed block union', () => {
		expect(() =>
			assertValidPayload('article', {
				...article,
				body: [
					{ kind: 'h', id: 'getting-there', text: 'Getting there' },
					{ kind: 'steps', items: [{ title: 'Fly', text: 'To Luwuk.' }] },
					{ kind: 'callout', title: 'Tip', text: 'Book early.' },
				],
			}),
		).not.toThrow();

		expect(() =>
			assertValidPayload('article', { ...article, body: [{ kind: 'quote', text: 'hi' }] }),
		).toThrow(ContentValidationError);
		// A heading without its anchor id would break the table of contents.
		expect(() =>
			assertValidPayload('article', { ...article, body: [{ kind: 'h', text: 'No id' }] }),
		).toThrow(ContentValidationError);
	});

	it('reports every problem at once, not just the first', () => {
		try {
			assertValidPayload('package', { ...pkg, slug: 'Bad Slug', price: -5, days: 0 });
			expect.unreachable('expected a rejection');
		} catch (error) {
			expect((error as ContentValidationError).issues).toHaveLength(3);
		}
	});
});

describe('assertValidSiteSetting', () => {
	it('accepts each key with the shape its page uses', () => {
		expect(() =>
			assertValidSiteSetting('site', {
				name: 'Banggai Escape',
				tagline: 'Island life.',
				locale: 'en',
				phone: '(62) 813 5491 1647',
				phoneHref: 'tel:+6281354911647',
				whatsapp: '6281354911647',
				email: 'hello@banggaiescape.com',
				address: ['Jl. Setia Budi, Luwuk Banggai'],
				reviewCount: 200,
			}),
		).not.toThrow();
		expect(() =>
			assertValidSiteSetting('faqs', [{ question: 'How?', answer: 'Like this.' }]),
		).not.toThrow();
		// A string-valued setting is not an object — this is why the column type is loose.
		expect(() => assertValidSiteSetting('ctaBackground', MEDIA_ID)).not.toThrow();
		expect(() => assertValidSiteSetting('blogCategories', ['Travel Tips'])).not.toThrow();
	});

	it('rejects a list setting passed as an object', () => {
		expect(() =>
			assertValidSiteSetting('faqs', { question: 'How?', answer: 'Like this.' }),
		).toThrow(ContentValidationError);
	});

	it('rejects a missing required field inside a nested item', () => {
		expect(() => assertValidSiteSetting('testimonials', [{ quote: 'Great', name: 'Ada' }])).toThrow(
			ContentValidationError,
		);
	});
});

describe('the stored contract is stricter than the authored one', () => {
	it('rejects an authored CDN value in a stored payload', () => {
		// The whole point of the Phase 2 rewrite: a payload is rewritten to reference a
		// `media_assets` row, and a bare CDN asset id left behind is a payload that was
		// never migrated. Accepting it would let an unmigrated record through silently.
		expect(() => assertValidPayload('package', { ...pkg, image: 'AB6AXuExampleAssetId' })).toThrow(
			ContentValidationError,
		);
		// A URL is not a row reference either.
		expect(() =>
			assertValidPayload('package', { ...pkg, image: 'https://cdn.example/a.jpg' }),
		).toThrow(ContentValidationError);
	});

	it('rejects an authored value for a media-valued site setting', () => {
		expect(() => assertValidSiteSetting('ctaBackground', 'AB6AXuExampleAssetId')).toThrow(
			ContentValidationError,
		);
	});
});

describe('formatIssues', () => {
	it('renders the field path and marks root-level failures', () => {
		expect(
			formatIssues('package', [
				{ path: ['itinerary', 0, 'title'], message: 'Too small' },
				{ path: [], message: 'Expected object' },
			]),
		).toEqual(['package → itinerary.0.title: Too small', 'package → (root): Expected object']);
	});
});
