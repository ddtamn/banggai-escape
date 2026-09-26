import {
	collectMediaIds,
	collectSettingMediaIds,
	contentKinds,
	mediaFieldsFor,
	rewriteMediaRefs,
	rewriteSettingMediaRefs,
} from '@banggai/content-model';
import { describe, expect, it } from 'vitest';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';

const packagePayload = {
	slug: 'island-hopping',
	title: 'Island Hopping',
	image: A,
	highlights: [{ title: 'Reefs', text: 'Coral.' }],
	itinerary: [{ label: 'Day 1', title: 'Arrive', text: 'Luwuk.' }],
};

const destinationPayload = {
	slug: 'paisu-pok-lake',
	name: 'Paisu Pok',
	image: A,
	gallery: [A, B],
	overview: ['Clear water.'],
	experiences: [{ title: 'Swim', text: 'Float.' }],
};

const articlePayload = {
	slug: 'getting-there',
	title: 'Getting there',
	image: A,
	hero: B,
	body: [
		{ kind: 'p', text: 'Start in Luwuk.' },
		{ kind: 'steps', items: [{ title: 'Fly', text: 'To Luwuk.' }] },
	],
};

describe('collectMediaIds', () => {
	it('finds the card image', () => {
		expect(collectMediaIds('package', packagePayload)).toEqual([A]);
	});

	it('finds a nested gallery, keeping duplicates', () => {
		// Duplicates are kept on purpose: a caller counting references wants the count.
		expect(collectMediaIds('destination', destinationPayload)).toEqual([A, A, B]);
	});

	it('ignores text that merely looks like content', () => {
		// The two images and nothing from `body`: a paragraph and a list of steps are objects
		// full of strings, and a walker that matched on shape rather than field name would
		// find media in all of them.
		expect(collectMediaIds('article', articlePayload)).toEqual([A, B]);
	});

	it('finds nothing in a payload with no media', () => {
		expect(collectMediaIds('article', { slug: 'x', title: 'x', body: [] })).toEqual([]);
	});

	it('walks arbitrary depth', () => {
		expect(collectMediaIds('package', { a: { b: [{ image: B }] } })).toEqual([B]);
	});
});

describe('rewriteMediaRefs', () => {
	it('replaces every occurrence and reports none unresolved', () => {
		const result = rewriteMediaRefs('destination', destinationPayload, (ref) =>
			ref === A ? 'id-a' : 'id-b',
		);

		expect(result.unresolved).toEqual([]);
		expect(result.payload).toMatchObject({ image: 'id-a', gallery: ['id-a', 'id-b'] });
	});

	it('leaves the original value in place and names it when nothing resolves', () => {
		const result = rewriteMediaRefs('package', packagePayload, () => undefined);

		expect(result.unresolved).toEqual([A]);
		// Not blanked: a payload written with a hole in it would be worse than the ref.
		expect(result.payload).toMatchObject({ image: A });
	});

	it('does not mutate the payload it was given', () => {
		const before = structuredClone(destinationPayload);

		rewriteMediaRefs('destination', destinationPayload, () => 'new');

		expect(destinationPayload).toEqual(before);
	});

	it('leaves non-media fields untouched', () => {
		const result = rewriteMediaRefs('article', articlePayload, () => 'id') as {
			payload: typeof articlePayload;
		};

		expect(result.payload.title).toBe('Getting there');
		expect(result.payload.body[1]).toEqual({
			kind: 'steps',
			items: [{ title: 'Fly', text: 'To Luwuk.' }],
		});
	});
});

describe('site settings', () => {
	it('finds an avatar nested inside each testimonial', () => {
		const testimonials = [
			{ quote: 'Lovely.', name: 'Ada', country: 'ID', avatar: A },
			{ quote: 'Great.', name: 'Bo', country: 'NL', avatar: B },
		];

		expect(collectSettingMediaIds('testimonials', testimonials)).toEqual([A, B]);
	});

	it('finds a setting whose whole value is the reference', () => {
		// `ctaBackground` has no field to match on: the value at the JSON root is the ref,
		// which is why these two are separate functions.
		expect(collectSettingMediaIds('ctaBackground', A)).toEqual([A]);
	});

	it('rewrites a root-level setting value', () => {
		const result = rewriteSettingMediaRefs('ctaBackground', A, () => 'id-a');

		expect(result).toEqual({ value: 'id-a', unresolved: [] });
	});

	it('reports a root-level value it cannot resolve', () => {
		expect(rewriteSettingMediaRefs('ctaBackground', A, () => undefined)).toEqual({
			value: A,
			unresolved: [A],
		});
	});

	it('ignores a non-string root value instead of crashing', () => {
		expect(rewriteSettingMediaRefs('ctaBackground', null, () => 'id')).toEqual({
			value: null,
			unresolved: [],
		});
	});

	it('rewrites avatars and leaves the surrounding text alone', () => {
		const result = rewriteSettingMediaRefs(
			'testimonials',
			[{ quote: 'Lovely.', name: 'Ada', country: 'ID', avatar: A }],
			() => 'id-a',
		);

		expect(result.unresolved).toEqual([]);
		expect(result.value).toEqual([
			{ quote: 'Lovely.', name: 'Ada', country: 'ID', avatar: 'id-a' },
		]);
	});
});

/**
 * What the public site does with the same walker: it substitutes a **rendered image** rather
 * than another id, because that is the shape a page renders. These run here, in the admin,
 * because this is where the walker is already covered.
 */
describe('resolving a reference to a rendered image', () => {
	/** An image, or `null` alt for an asset nobody has described. */
	const image = (id: string) => ({ src: `https://media.example/${id}`, alt: null });

	it('substitutes an object, not a string', () => {
		const result = rewriteMediaRefs('destination', destinationPayload, image);

		expect(result.unresolved).toEqual([]);
		expect(result.payload).toMatchObject({
			image: { src: `https://media.example/${A}`, alt: null },
			gallery: [{ src: `https://media.example/${A}` }, { src: `https://media.example/${B}` }],
		});
	});

	it('still refuses to blank a reference it cannot resolve', () => {
		const result = rewriteMediaRefs('package', packagePayload, () => undefined);

		expect(result.unresolved).toEqual([A]);
		expect(result.payload).toMatchObject({ image: A });
	});

	it('substitutes avatars inside settings, for the site the same way', () => {
		const result = rewriteSettingMediaRefs(
			'testimonials',
			[{ quote: 'Lovely.', name: 'Ada', country: 'ID', avatar: A }],
			image,
		);

		expect(result.value).toEqual([
			{
				quote: 'Lovely.',
				name: 'Ada',
				country: 'ID',
				avatar: { src: `https://media.example/${A}`, alt: null },
			},
		]);
	});

	/**
	 * The guard on the two halves of the rendered type.
	 *
	 * `RenderedPayloadFor` is derived from `mediaFieldsByKind` so a new media field cannot be
	 * added to a payload without changing what a page renders. That derivation is a *type*,
	 * which nothing executes — so if the two lists ever drift, this is what notices. The
	 * fields that came back holding images have to be exactly the declared media fields, and
	 * no other field may have been touched.
	 */
	it('touches exactly the fields the contract declares as media', () => {
		const payloads = {
			package: packagePayload,
			destination: destinationPayload,
			article: articlePayload,
		} as const;

		for (const kind of contentKinds) {
			const resolved = rewriteMediaRefs(kind, payloads[kind], image).payload as Record<
				string,
				unknown
			>;

			const imageFields = Object.entries(resolved)
				.filter(([, value]) => holdsImages(value))
				.map(([field]) => field);

			expect(imageFields.sort()).toEqual([...mediaFieldsFor(kind)].sort());
		}
	});
});

/** Whether a value is a rendered image, or a non-empty list of them (`gallery`). */
function holdsImages(value: unknown): boolean {
	if (Array.isArray(value)) return value.length > 0 && value.every(isImage);

	return isImage(value);
}

/**
 * Matched on the shape a rendered image has, not on "is an object": a payload is full of
 * nested objects that must be left alone (`itinerary`, `highlights`), and only a resolved
 * reference grows a `src`.
 */
function isImage(value: unknown): boolean {
	return (
		typeof value === 'object' &&
		value !== null &&
		!Array.isArray(value) &&
		typeof (value as { src?: unknown }).src === 'string'
	);
}
