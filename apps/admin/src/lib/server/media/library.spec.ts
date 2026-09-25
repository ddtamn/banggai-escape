import { describe, expect, it, vi } from 'vitest';

// The guard is exercised through the pure `referencesIn`, so the client is never built —
// stub the module so importing this file cannot reach Neon.
vi.mock('$lib/server/db', () => ({ db: {} }));

const { referencesIn } = await import('./library');

const ASSET = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';

const entry = (slug: string, image: string) => ({
	kind: 'package',
	slug,
	payload: { slug, image },
});

const revision = (
	slug: string,
	image: string,
	revisionNumber: number,
	id: string,
	publishedRevisionId: string | null,
) => ({
	id,
	kind: 'package',
	slug,
	revisionNumber,
	payload: { slug, image },
	publishedRevisionId,
});

describe('referencesIn', () => {
	it('finds nothing when no payload mentions the asset', () => {
		expect(
			referencesIn(
				[entry('a', OTHER)],
				[revision('a', OTHER, 1, 'r1', null)],
				[{ key: 'ctaBackground', value: OTHER }],
				ASSET,
			),
		).toEqual([]);
	});

	it('names the entry whose draft still points at it', () => {
		expect(referencesIn([entry('island-hopping', ASSET)], [], [], ASSET)).toEqual([
			{ where: 'package:island-hopping', state: 'draft' },
		]);
	});

	it('marks the revision the entry publishes as published', () => {
		expect(referencesIn([], [revision('a', ASSET, 2, 'r2', 'r2')], [], ASSET)).toEqual([
			{ where: 'package:a', state: 'published' },
		]);
	});

	it('still counts superseded history, so restoring it cannot break an image', () => {
		const references = referencesIn(
			[],
			[revision('a', ASSET, 1, 'r1', 'r2'), revision('a', OTHER, 2, 'r2', 'r2')],
			[],
			ASSET,
		);

		expect(references).toEqual([{ where: 'package:a', state: 'revision 1' }]);
	});

	it('finds a site setting whose value is the reference itself', () => {
		expect(referencesIn([], [], [{ key: 'ctaBackground', value: ASSET }], ASSET)).toEqual([
			{ where: 'site_settings.ctaBackground', state: 'live' },
		]);
	});

	it('finds an avatar nested inside a setting', () => {
		const references = referencesIn(
			[],
			[],
			[
				{
					key: 'testimonials',
					value: [{ quote: 'Nice.', name: 'Ada', country: 'ID', avatar: ASSET }],
				},
			],
			ASSET,
		);

		expect(references).toEqual([{ where: 'site_settings.testimonials', state: 'live' }]);
	});

	it('reports every place at once, so one refusal lists them all', () => {
		const references = referencesIn(
			[entry('a', ASSET), entry('b', OTHER)],
			[revision('a', ASSET, 1, 'r1', 'r1')],
			[{ key: 'ctaBackground', value: ASSET }],
			ASSET,
		);

		expect(references).toHaveLength(3);
		expect(references.map((reference) => reference.where)).toEqual([
			'package:a',
			'package:a',
			'site_settings.ctaBackground',
		]);
	});

	it('refuses to invent a content kind it does not know', () => {
		// A stored kind outside the three is a schema that has drifted, not user input, so
		// it fails loudly rather than silently reporting "not referenced" and allowing a
		// delete.
		expect(() =>
			referencesIn([{ kind: 'page', slug: 'a', payload: { image: ASSET } }], [], [], ASSET),
		).toThrow('Unknown content kind');
	});
});
