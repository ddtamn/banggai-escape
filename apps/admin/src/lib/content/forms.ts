/**
 * The content forms, declared once as data.
 *
 * Three content kinds need list screens, edit screens, a preview, and a parser that
 * turns a submitted form back into a payload. They differ only in their fields, so the
 * fields are a **spec** and everything else is one implementation driven by it. A second
 * copy of "how a package is edited" is how the four places it matters — render, parse,
 * validate, preview — drift apart.
 *
 * The spec is framework-free on purpose: the page component renders it, the form action
 * parses with it, and the unit tests exercise both without a browser.
 *
 * ## How a submitted form becomes a payload
 *
 * Input names are **paths**: `highlights[0].title`, `included[2]`, `body[1].items[0].text`.
 * The renderer builds them with `childPath`/`itemPath`; the parser reads them back with
 * the same two functions, so the two cannot disagree about a name.
 *
 * Anything repeatable carries a hidden `__count` input, because the number of rows is
 * structural: there is no way to say "zero rows" with names alone, and counting indices
 * until one is missing breaks as soon as a middle row is removed. `__count` is written by
 * small `$state` in the page, so add/remove works with JavaScript and the initial rows
 * work without it.
 */
import type { ContentKind } from '@banggai/content-model';

/** Re-exported so the content UI imports its types from one place. */
export type { ContentKind };

/** A form field, as data. */
export type FieldSpec =
	/** One line of text. */
	| { readonly type: 'text'; readonly name: string; readonly label: string; readonly hint?: string }
	/** Multi-line prose. */
	| {
			readonly type: 'words';
			readonly name: string;
			readonly label: string;
			readonly hint?: string;
	  }
	/** A URL segment: lowercase words, single hyphens. */
	| { readonly type: 'slug'; readonly name: string; readonly label: string }
	| {
			readonly type: 'number';
			readonly name: string;
			readonly label: string;
			readonly hint?: string;
			/** Declared for the browser's own validation; the contract still decides. */
			readonly min?: number;
	  }
	| {
			readonly type: 'select';
			readonly name: string;
			readonly label: string;
			readonly options: readonly string[];
	  }
	| { readonly type: 'boolean'; readonly name: string; readonly label: string }
	/** A `media_assets` row, chosen by id. */
	| { readonly type: 'media'; readonly name: string; readonly label: string }
	| {
			readonly type: 'object';
			readonly name: string;
			readonly label: string;
			readonly fields: readonly FieldSpec[];
	  }
	/** A repeatable list of plain strings (`included`) or of media ids (`gallery`). */
	| {
			readonly type: 'list';
			readonly name: string;
			readonly label: string;
			readonly item: 'text' | 'media';
	  }
	/** A repeatable group of fields (`highlights`, `itinerary`). */
	| {
			readonly type: 'rows';
			readonly name: string;
			readonly label: string;
			readonly fields: readonly FieldSpec[];
	  }
	/** The article body: a closed union of block kinds, each with its own fields. */
	| { readonly type: 'blocks'; readonly name: string; readonly label: string };

/** One kind in the article body union, and the fields it owns. */
export type BlockSpec = {
	readonly kind: string;
	readonly label: string;
	readonly fields: readonly FieldSpec[];
};

const titleAndText: readonly FieldSpec[] = [
	{ type: 'text', name: 'title', label: 'Title' },
	{ type: 'text', name: 'text', label: 'Text' },
];

/** The four block kinds the contract allows. `h` needs an anchor id for the contents list. */
export const blockSpecs: readonly BlockSpec[] = [
	{ kind: 'p', label: 'Paragraph', fields: [{ type: 'words', name: 'text', label: 'Text' }] },
	{
		kind: 'h',
		label: 'Heading',
		fields: [
			{ type: 'text', name: 'id', label: 'Anchor id', hint: 'Lowercase, hyphenated' },
			{ type: 'text', name: 'text', label: 'Text' },
		],
	},
	{
		kind: 'steps',
		label: 'Steps',
		fields: [{ type: 'rows', name: 'items', label: 'Steps', fields: titleAndText }],
	},
	{
		kind: 'callout',
		label: 'Callout',
		fields: [
			{ type: 'text', name: 'title', label: 'Title' },
			{ type: 'words', name: 'text', label: 'Text' },
		],
	},
];

export const blockKinds = blockSpecs.map((block) => block.kind);

/**
 * Field order is the screen order, and the field groups are the same ones the marketing
 * site uses: what it is, then how to sell it, then the detail.
 */
export const fieldSpecs: Record<ContentKind, readonly FieldSpec[]> = {
	package: [
		{ type: 'slug', name: 'slug', label: 'Slug' },
		{ type: 'text', name: 'title', label: 'Title' },
		{ type: 'text', name: 'subtitle', label: 'Subtitle' },
		{ type: 'text', name: 'region', label: 'Region' },
		{
			type: 'select',
			name: 'tripType',
			label: 'Trip type',
			options: ['Open Trip', 'Private Trip'],
		},
		{ type: 'number', name: 'days', label: 'Days', min: 1 },
		{ type: 'number', name: 'nights', label: 'Nights', min: 0 },
		{ type: 'number', name: 'price', label: 'Price per person (IDR)', min: 0 },
		{ type: 'media', name: 'image', label: 'Card image' },
		{ type: 'text', name: 'groupSize', label: 'Group size' },
		{ type: 'text', name: 'accommodation', label: 'Accommodation' },
		{ type: 'words', name: 'overview', label: 'Overview' },
		{ type: 'rows', name: 'highlights', label: 'Highlights', fields: titleAndText },
		{ type: 'list', name: 'included', label: 'What is included', item: 'text' },
		{
			type: 'rows',
			name: 'itinerary',
			label: 'Itinerary',
			fields: [
				{ type: 'text', name: 'label', label: 'Day label', hint: 'e.g. Day 1' },
				{ type: 'text', name: 'title', label: 'Title' },
				{ type: 'words', name: 'text', label: 'Text' },
			],
		},
		{ type: 'boolean', name: 'featured', label: 'Feature on the homepage' },
	],
	destination: [
		{ type: 'slug', name: 'slug', label: 'Slug' },
		{ type: 'text', name: 'name', label: 'Name' },
		{ type: 'text', name: 'region', label: 'Region' },
		{ type: 'text', name: 'tagline', label: 'Tagline' },
		{ type: 'media', name: 'image', label: 'Card image' },
		{ type: 'list', name: 'overview', label: 'Overview paragraphs', item: 'text' },
		{
			type: 'object',
			name: 'quickInfo',
			label: 'Quick info',
			fields: [
				{ type: 'text', name: 'bestTime', label: 'Best time' },
				{ type: 'text', name: 'duration', label: 'Duration' },
				{ type: 'text', name: 'highlights', label: 'Highlights' },
				{ type: 'text', name: 'accessibility', label: 'Accessibility' },
			],
		},
		{ type: 'rows', name: 'experiences', label: 'Experiences', fields: titleAndText },
		{ type: 'list', name: 'gallery', label: 'Gallery', item: 'media' },
		{ type: 'boolean', name: 'featured', label: 'Feature on the homepage' },
	],
	article: [
		{ type: 'slug', name: 'slug', label: 'Slug' },
		{ type: 'text', name: 'title', label: 'Title' },
		{ type: 'text', name: 'category', label: 'Category' },
		{ type: 'list', name: 'tags', label: 'Tags', item: 'text' },
		{ type: 'words', name: 'excerpt', label: 'Excerpt' },
		{ type: 'media', name: 'image', label: 'Card image' },
		{ type: 'media', name: 'hero', label: 'Hero image' },
		{
			type: 'text',
			name: 'date',
			label: 'Published date',
			hint: 'As displayed, e.g. March 12, 2026',
		},
		{ type: 'text', name: 'updated', label: 'Updated date', hint: 'As displayed' },
		{ type: 'text', name: 'readTime', label: 'Read time', hint: 'e.g. 9 min read' },
		{ type: 'text', name: 'author', label: 'Byline name' },
		{ type: 'text', name: 'authorRole', label: 'Byline role' },
		{ type: 'blocks', name: 'body', label: 'Body' },
	],
};

/** `label` → `publishedAt`-style formatting is the caller's job; this is the label only. */
export const kindLabels: Record<ContentKind, string> = {
	package: 'Package',
	destination: 'Destination',
	article: 'Article',
};

export const kinds: readonly ContentKind[] = ['package', 'destination', 'article'];

/** One row of the draft preview. */
export type PreviewRow = {
	readonly label: string;
	/** Empty for a media row: the page renders the image instead of text. */
	readonly text: string;
	/** Media ids, so the page can resolve them to URLs. */
	readonly media: readonly string[];
};

/**
 * Flattens a payload into labelled rows for the preview.
 *
 * The preview is the *administrator's* view of what they have entered, not a rendering of
 * the public page: the marketing components live in `apps/web`, and importing them would
 * cross the app boundary (AGENTS.md rule 7). So this walks the same spec the editor uses
 * and reports what is stored, which is what makes a missing field visible before publish
 * rather than after.
 */
export function describePayload(kind: ContentKind, payload: Record<string, unknown>): PreviewRow[] {
	const rows: PreviewRow[] = [];

	const walk = (fields: readonly FieldSpec[], source: unknown, prefix: string) => {
		for (const field of fields) {
			const label = prefix ? `${prefix} · ${field.label}` : field.label;
			const value = readPath(source, field.name);

			switch (field.type) {
				case 'media':
					rows.push({
						label,
						text: typeof value === 'string' ? '' : '— not set —',
						media: typeof value === 'string' ? [value] : [],
					});
					break;

				case 'object':
					walk(field.fields, value, label);
					break;

				case 'list': {
					const items = Array.isArray(value) ? value : [];

					if (field.item === 'media') {
						rows.push({
							label,
							text: items.length === 0 ? '— empty —' : '',
							media: items.map(String),
						});
						break;
					}

					rows.push({
						label,
						text: items.length === 0 ? '— empty —' : items.join(' · '),
						media: [],
					});
					break;
				}

				case 'rows': {
					const items = Array.isArray(value) ? value : [];

					if (items.length === 0) {
						rows.push({ label, text: '— empty —', media: [] });
						break;
					}

					for (const [index, item] of items.entries()) {
						walk(field.fields, item, `${label} ${index + 1}`);
					}
					break;
				}

				case 'blocks': {
					const items = Array.isArray(value) ? value : [];

					if (items.length === 0) {
						rows.push({ label, text: '— empty —', media: [] });
						break;
					}

					for (const [index, item] of items.entries()) {
						const blockKind = String(readPath(item, 'kind') ?? 'unknown');
						const spec = blockSpecs.find((block) => block.kind === blockKind);

						walk(spec?.fields ?? [], item, `${label} ${index + 1} (${blockKind})`);
					}
					break;
				}

				case 'boolean':
					rows.push({ label, text: value === true ? 'Yes' : 'No', media: [] });
					break;

				default: {
					const text =
						value === undefined || value === null || value === '' ? '— not set —' : String(value);

					rows.push({ label, text, media: [] });
				}
			}
		}
	};

	walk(fieldSpecs[kind], payload, '');

	return rows;
}

/** One choosable image, as the media fields render it. */
export type MediaOption = {
	readonly id: string;
	readonly label: string;
	readonly url: string | null;
};

/** Guards a route parameter before it reaches a query. */
export function isContentKind(value: string | undefined): value is ContentKind {
	return value === 'package' || value === 'destination' || value === 'article';
}

// ---------------------------------------------------------------------------
// Names
// ---------------------------------------------------------------------------

/** The input name for a field inside a group. */
export function childPath(parent: string, name: string): string {
	return parent ? `${parent}.${name}` : name;
}

/** The input name for one item of a repeatable list. */
export function itemPath(parent: string, index: number): string {
	return `${parent}[${index}]`;
}

/** The hidden input that carries how many items a repeatable field has. */
export function countName(parent: string): string {
	return `${parent}.__count`;
}

/**
 * Reads a value out of the payload for a field path.
 *
 * The renderer needs the current value of `highlights[1].title` while it is building the
 * form, and the path is already the input name — so it is also the address of the value.
 * One traversal instead of a per-field getter keeps the two in step for free.
 */
export function readPath(source: unknown, path: string): unknown {
	let current: unknown = source;

	for (const step of tokenise(path)) {
		if (current === null || typeof current !== 'object') return undefined;

		current = Array.isArray(current)
			? current[step.index ?? Number.NaN]
			: (current as Record<string, unknown>)[step.key ?? ''];
	}

	return current;
}

/**
 * `highlights[0].title` → `{key:'highlights'}, {index:0}, {key:'title'}`.
 *
 * A malformed path yields no steps rather than throwing: the input name is built by this
 * module, so a bad one is a bug in the spec rather than anything a visitor can send.
 */
function tokenise(path: string): { key?: string; index?: number }[] {
	const steps: { key?: string; index?: number }[] = [];

	for (const part of path.split('.')) {
		const match = part.match(/^([^[]*)((?:\[\d+\])*)$/);

		if (!match) return [];

		if (match[1]) steps.push({ key: match[1] });

		for (const index of match[2].matchAll(/\[(\d+)\]/g)) {
			steps.push({ index: Number(index[1]) });
		}
	}

	return steps;
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

/**
 * How many rows each repeatable field should open with.
 *
 * One for an empty field rather than zero, so a new entry shows something to type into and
 * an administrator is not asked to understand why the form is blank. Once they remove it,
 * the count stays removed — that is what makes "you need at least one" reachable.
 */
export function initialCounts(
	kind: ContentKind,
	payload: Record<string, unknown>,
): Record<string, number> {
	const counts: Record<string, number> = {};

	const walk = (fields: readonly FieldSpec[], source: unknown, prefix: string) => {
		for (const field of fields) {
			const path = childPath(prefix, field.name);

			if (field.type === 'list' || field.type === 'rows' || field.type === 'blocks') {
				const value = readPath(source, field.name);

				counts[path] = Math.max(1, Array.isArray(value) ? value.length : 0);

				if (field.type === 'rows') {
					// Rows nest only inside a `steps` block, which is handled below.
					continue;
				}

				continue;
			}

			if (field.type === 'object') {
				walk(field.fields, readPath(source, field.name), path);
			}
		}
	};

	walk(fieldSpecs[kind], payload, '');

	// The article body nests one level deeper than the spec walk above, so blocks are
	// counted separately.
	if (kind === 'article') {
		const blocks = readPath(payload, 'body');

		for (const [index, block] of (Array.isArray(blocks) ? blocks : []).entries()) {
			const path = itemPath('body', index);
			const spec = blockSpecs.find((entry) => entry.kind === String(readPath(block, 'kind')));

			for (const field of spec?.fields ?? []) {
				if (field.type !== 'rows' && field.type !== 'list') continue;

				const value = readPath(block, field.name);

				counts[childPath(path, field.name)] = Math.max(1, Array.isArray(value) ? value.length : 0);
			}
		}
	}

	return counts;
}

/** The block kind selected for each position of the article body. */
export function initialBlockKinds(
	kind: ContentKind,
	payload: Record<string, unknown>,
): Record<string, string> {
	if (kind !== 'article') return {};

	const blocks = readPath(payload, 'body');
	const kindsByPath: Record<string, string> = {};

	for (const [index, block] of (Array.isArray(blocks) ? blocks : []).entries()) {
		const blockKind = String(readPath(block, 'kind') ?? '');

		kindsByPath[itemPath('body', index)] = blockKinds.includes(blockKind) ? blockKind : 'p';
	}

	return kindsByPath;
}

/**
 * Builds a payload from submitted form data.
 *
 * This does **not** validate — the contract does, in the action, so a failure is reported
 * with the same `kind → field: message` lines as everywhere else. What this does is
 * coercion: numbers from strings, checkboxes from presence, `''` from an untouched field
 * into an absent value so the contract says "required" rather than "expected number,
 * received string".
 *
 * The payload is returned even on a shape this could not finish, so the form can be
 * re-rendered with what the administrator typed.
 */
export function parseContentForm(kind: ContentKind, form: FormData): Record<string, unknown> {
	const payload: Record<string, unknown> = {};

	for (const spec of fieldSpecs[kind]) {
		payload[spec.name] = readField(spec, spec.name, form);
	}

	return payload;
}

/** Reads the fields a block kind owns, and nothing else — the union is strict. */
function readBlock(
	index: number,
	parent: string,
	form: FormData,
): Record<string, unknown> | undefined {
	const path = itemPath(parent, index);
	const kind = form.get(childPath(path, 'kind'))?.toString();

	const spec = blockSpecs.find((block) => block.kind === kind);

	// An unknown kind is left out rather than guessed at; the contract then fails on the
	// body, and the form shows which block.
	if (!spec) return undefined;

	const block: Record<string, unknown> = { kind: spec.kind };

	for (const field of spec.fields) {
		block[field.name] = readField(field, childPath(path, field.name), form);
	}

	return block;
}

function readField(spec: FieldSpec, path: string, form: FormData): unknown {
	switch (spec.type) {
		case 'text':
		case 'words':
		case 'slug':
			return text(form.get(path));

		case 'number': {
			const raw = text(form.get(path));

			// Absent rather than NaN: the contract's own "required" reads better than
			// "expected number, received nan".
			return raw === '' ? undefined : Number(raw);
		}

		case 'select':
			return text(form.get(path));

		case 'boolean':
			// A missing checkbox is how a browser submits "unchecked".
			return form.get(path) !== null;

		case 'media':
			return text(form.get(path)) || undefined;

		case 'object': {
			const value: Record<string, unknown> = {};

			for (const field of spec.fields) {
				value[field.name] = readField(field, childPath(path, field.name), form);
			}

			return value;
		}

		case 'list': {
			const count = countOf(path, form);
			const items: unknown[] = [];

			for (let index = 0; index < count; index += 1) {
				const item = text(form.get(itemPath(path, index)));

				if (spec.item === 'media') items.push(item || undefined);
				else items.push(item);
			}

			return items;
		}

		case 'rows': {
			const count = countOf(path, form);
			const rows: unknown[] = [];

			for (let index = 0; index < count; index += 1) {
				const row: Record<string, unknown> = {};
				const rowPath = itemPath(path, index);

				for (const field of spec.fields) {
					row[field.name] = readField(field, childPath(rowPath, field.name), form);
				}

				rows.push(row);
			}

			return rows;
		}

		case 'blocks': {
			const count = countOf(path, form);
			const blocks: unknown[] = [];

			for (let index = 0; index < count; index += 1) {
				const block = readBlock(index, path, form);

				if (block) blocks.push(block);
			}

			return blocks;
		}
	}
}

/**
 * How many items a repeatable field has.
 *
 * `__count` is authoritative. Without it a submission that removed every row would be
 * indistinguishable from one that never had any, and the field could never become empty —
 * which is a state the contract rejects on purpose.
 */
function countOf(path: string, form: FormData): number {
	const raw = form.get(countName(path));

	if (raw === null) return 0;

	const count = Number.parseInt(raw.toString(), 10);

	if (!Number.isFinite(count) || count < 0) return 0;

	// A hostile submission could claim a huge count; each row costs a few field reads, so
	// this is a cheap sanity bound rather than a real limit.
	return Math.min(count, 500);
}

function text(value: FormDataEntryValue | null): string {
	return value === null ? '' : value.toString().trim();
}
