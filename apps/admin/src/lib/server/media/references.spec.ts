import { describe, expect, it } from 'vitest';
import {
	collectMediaIds,
	collectSettingMediaIds,
	rewriteMediaRefs,
	rewriteSettingMediaRefs,
} from './references';

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
		expect(collectMediaIds('article', articlePayload)).toEqual([A]);
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
