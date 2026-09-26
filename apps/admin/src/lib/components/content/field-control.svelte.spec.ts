/**
 * `FieldControl`, rendered.
 *
 * The file in this app with the most branching in it: one component turns ten kinds of
 * field spec into markup, including the repeatable ones, which recurse into it. `svelte-check`
 * can confirm every branch *typechecks* and that is all — it cannot tell you that a `media`
 * field with a stale id shows the "no longer in the library" warning instead of a broken
 * image, or that a repeatable field posts a `__count` its own rows agree with. Both of those
 * are rendering edge cases, which is exactly what a component test is for.
 *
 * These run in the **`client`** Vitest project — real Chromium, real DOM — which had no
 * files until now. The server project covers the form model's invariants in
 * `forms.spec.ts`; this covers what those specs hand to a component.
 *
 * The `counts` and `blockKindState` props are `$state` objects the page owns, and the
 * component mutates them in place. Plain objects work here because every test is about the
 * first render; the add/remove behaviour is covered by the browser checks, where the page
 * supplies real state.
 */

import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import FieldControl from '$lib/components/content/FieldControl.svelte';
import type { FieldSpec, MediaOption } from '$lib/content/forms';

const MEDIA: readonly MediaOption[] = [
	{
		id: '11111111-1111-4111-8111-111111111111',
		label: 'Karst lake at dawn',
		url: 'https://media.test/a.jpg',
	},
	{ id: '22222222-2222-4222-8222-222222222222', label: 'Boat on the strait', url: null },
];

/**
 * Render one field, and hand back the queries the assertions below make.
 *
 * `path` defaults to the spec's own `name`, which is what the page passes for a field at the
 * root of a payload — the path is the input's `name`, and the spec's name is the field's.
 */
async function field(spec: FieldSpec, values: Record<string, unknown> = {}, path = spec.name) {
	// Awaited: `render` mounts on a microtask, so reading `container` from the synchronous
	// return finds a document the component has not reached yet.
	const screen = await render(FieldControl, {
		props: {
			spec,
			path,
			values,
			counts: { [path]: 1 },
			blockKindState: {},
			media: MEDIA,
		},
	});

	return {
		...screen,
		input: (name: string) => screen.container.querySelector(`[name="${name}"]`),
		all: (selector: string) => [...screen.container.querySelectorAll(selector)],
	};
}

describe('FieldControl', () => {
	describe('scalar fields', () => {
		it('renders a text field labelled, named and carrying its value', async () => {
			const { input } = await field(
				{ type: 'text', name: 'title', label: 'Title' },
				{ title: 'Karst' },
			);

			const control = input('title') as HTMLInputElement | null;

			expect(control?.tagName).toBe('INPUT');
			expect(control?.type).toBe('text');
			expect(control?.value).toBe('Karst');
		});

		it('renders an absent value as empty, not as the string "undefined"', async () => {
			const { input } = await field({ type: 'text', name: 'title', label: 'Title' });

			expect((input('title') as HTMLInputElement).value).toBe('');
		});

		it('gives a slug field the pattern that matches the contract', async () => {
			// The contract's slug rule is enforced here as a browser pattern as well as on
			// the server, so the obvious mistake is caught before a round trip.
			const { input } = await field({ type: 'slug', name: 'slug', label: 'Slug' });

			expect((input('slug') as HTMLInputElement).pattern).toBe('[a-z0-9]+(-[a-z0-9]+)*');
		});

		it('renders a number field with its minimum and a numeric value', async () => {
			const { input } = await field(
				{ type: 'number', name: 'price', label: 'Price per person (IDR)', min: 0 },
				{ price: 2850000 },
			);

			const control = input('price') as HTMLInputElement;

			expect(control.type).toBe('number');
			expect(control.min).toBe('0');
			expect(control.value).toBe('2850000');
		});

		it('renders prose as a textarea, not a single-line input', async () => {
			const { input } = await field(
				{ type: 'words', name: 'overview', label: 'Overview' },
				{ overview: 'A week on the quieter side.' },
			);

			const control = input('overview') as HTMLTextAreaElement;

			expect(control.tagName).toBe('TEXTAREA');
			expect(control.value).toBe('A week on the quieter side.');
		});

		it('renders a select with every option, marking the stored one', async () => {
			const { all } = await field(
				{
					type: 'select',
					name: 'tripType',
					label: 'Trip type',
					options: ['Open Trip', 'Private Trip'],
				},
				{ tripType: 'Private Trip' },
			);

			const options = all('option') as HTMLOptionElement[];

			expect(options.map((option) => option.value)).toEqual(['Open Trip', 'Private Trip']);
			expect(options.filter((option) => option.selected).map((o) => o.value)).toEqual([
				'Private Trip',
			]);
		});

		it('renders a boolean as a checkbox that reflects the stored value', async () => {
			const on = await field(
				{ type: 'boolean', name: 'featured', label: 'Featured' },
				{ featured: true },
			);
			const off = await field(
				{ type: 'boolean', name: 'featured', label: 'Featured' },
				{ featured: false },
			);

			expect((on.input('featured') as HTMLInputElement).checked).toBe(true);
			// A checkbox left `undefined` would be checked in the DOM but absent from the
			// submission, which is the quiet way to feature something by accident.
			expect((off.input('featured') as HTMLInputElement).checked).toBe(false);
		});
	});

	describe('media fields', () => {
		it('lists the library and marks the chosen asset', async () => {
			const { all, input } = await field(
				{ type: 'media', name: 'image', label: 'Card image' },
				{ image: MEDIA[1].id },
			);

			const options = all('option') as HTMLOptionElement[];

			// The empty option first, so a field can be cleared without deleting the entry.
			expect(options[0].value).toBe('');
			expect(options.filter((option) => option.selected).map((o) => o.value)).toEqual([
				MEDIA[1].id,
			]);
			expect((input('image') as HTMLSelectElement | null)?.name).toBe('image');
		});

		it('previews an asset that has a URL, and stays decorative', async () => {
			const { container } = await field(
				{ type: 'media', name: 'image', label: 'Card image' },
				{ image: MEDIA[0].id },
			);

			const image = container.querySelector('img');

			expect(image?.getAttribute('src')).toBe(MEDIA[0].url);
			// The label beside it already names the field, so the thumbnail repeats nothing.
			expect(image?.getAttribute('alt')).toBe('');
		});

		it('names the problem when the stored asset is gone from the library', async () => {
			// A media id that no longer resolves is a database inconsistency, not a missing
			// image. Saying so beats rendering a broken <img> nobody investigates.
			const { container, all } = await field(
				{ type: 'media', name: 'image', label: 'Card image' },
				{ image: '99999999-9999-4999-8999-999999999999' },
			);

			expect(container.textContent).toContain('no longer in the library');
			expect(all('img')).toHaveLength(0);
		});

		it('renders no preview and no warning when nothing is chosen', async () => {
			const { container, all } = await field({ type: 'media', name: 'image', label: 'Card image' });

			expect(all('img')).toHaveLength(0);
			expect(container.textContent).not.toContain('no longer in the library');
		});
	});

	describe('repeatable fields', () => {
		const highlights: FieldSpec = {
			type: 'rows',
			name: 'highlights',
			label: 'Highlights',
			fields: [
				{ type: 'text', name: 'title', label: 'Title' },
				{ type: 'text', name: 'text', label: 'Text' },
			],
			atLeastOne: true,
		};

		it('renders one row per count, with child names that address it', async () => {
			const { input } = await field(highlights, {}, 'highlights');

			// The count travels in a hidden input, and the rows themselves are named by
			// index — a submission missing either half cannot be read back.
			expect((input('highlights.__count') as HTMLInputElement).value).toBe('1');
			expect(input('highlights[0].title')).not.toBeNull();
			expect(input('highlights[0].text')).not.toBeNull();
		});

		it('honours a count the page seeded, and names each row', async () => {
			const screen = await render(FieldControl, {
				spec: highlights,
				path: 'highlights',
				values: { highlights: [{ title: 'A' }, { title: 'B' }] },
				counts: { highlights: 2 },
				blockKindState: {},
				media: MEDIA,
			});

			expect(
				(screen.container.querySelector('[name="highlights.__count"]') as HTMLInputElement).value,
			).toBe('2');
			expect(
				(screen.container.querySelector('[name="highlights[1].title"]') as HTMLInputElement).value,
			).toBe('B');
		});

		it('states the minimum when the contract requires one', async () => {
			const { container } = await field(highlights);

			expect(container.textContent).toContain('at least one is required');
		});

		it('renders a list field as one input per item, seeded from the payload', async () => {
			const { input, container } = await field(
				{
					type: 'list',
					name: 'included',
					label: 'What is included',
					item: 'text',
					atLeastOne: true,
				},
				{ included: ['Local guide', 'Flights'] },
			);

			expect((input('included.__count') as HTMLInputElement).value).toBe('1');
			expect((input('included[0]') as HTMLInputElement).value).toBe('Local guide');
			expect(container.textContent).toContain('1 item');
		});

		it('nests an object field as a group, keeping the parent path', async () => {
			const { input } = await field(
				{
					type: 'object',
					name: 'quickInfo',
					label: 'Quick info',
					fields: [{ type: 'text', name: 'bestTime', label: 'Best time' }],
				},
				{ quickInfo: { bestTime: 'April to October' } },
			);

			expect((input('quickInfo.bestTime') as HTMLInputElement).value).toBe('April to October');
		});
	});

	describe('article blocks', () => {
		const body: FieldSpec = { type: 'blocks', name: 'body', label: 'Body' };

		it('renders one fieldset per block, with its kind posted as a hidden input', async () => {
			const { input, all } = await field(body, {}, 'body');

			// The kind is what the contract's discriminated union switches on, so it has to
			// be in the submission even though no visible control carries it.
			expect((input('body.__count') as HTMLInputElement).value).toBe('1');
			expect((input('body[0].kind') as HTMLInputElement).value).toBe('p');
			expect(all('fieldset')).toHaveLength(1);
		});

		it('renders the fields of the selected kind, and only those', async () => {
			// A `steps` block has no `text` field; a paragraph has no `items`. Rendering the
			// wrong one would post a key the contract rejects.
			const { input } = await field(body, {}, 'body');

			expect(input('body[0].text')).not.toBeNull();
			expect(input('body[0].items')).toBeNull();
		});
	});
});
