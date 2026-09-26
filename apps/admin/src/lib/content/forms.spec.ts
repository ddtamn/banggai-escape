import {
	parseSiteSetting,
	type SiteSettingKey,
	siteSettingKeys,
	siteSettingSchemas,
} from '@banggai/content-model';
import { describe, expect, it } from 'vitest';
import {
	countsFor,
	type FieldSpec,
	initialSettingCounts,
	isSiteSettingKey,
	parseSettingForm,
	readPath,
	settingFormValues,
	settingGroups,
	settingKeys,
	settingNotes,
	settingSpecs,
} from './forms';

/**
 * One `media_assets.id`. A stored setting references the row, not the CDN value the static
 * modules author.
 */
const MEDIA_ID = '22222222-2222-4222-8222-222222222222';

/** A form submission, built the way a browser builds one: `path[i].field` plus `path.__count`. */
function submission(entries: Record<string, string>): FormData {
	const form = new FormData();

	for (const [key, value] of Object.entries(entries)) form.set(key, value);

	return form;
}

describe('setting specs', () => {
	it('covers every key in the contract, exactly once', () => {
		// The three structures are separate records, so nothing but a test stops one drifting
		// behind the contract — and a key missing from a *group* is the quiet failure: the
		// page renders the groups, so the key simply never appears and nothing errors.
		expect([...settingKeys].sort()).toEqual([...siteSettingKeys].sort());

		const grouped = settingGroups.flatMap((group) => group.keys);

		expect([...grouped].sort()).toEqual([...siteSettingKeys].sort());
		expect(new Set(grouped).size).toBe(grouped.length);
	});

	it('gives every key a note for the index', () => {
		expect([...Object.keys(settingNotes)].sort()).toEqual([...siteSettingKeys].sort());
	});

	it('guards the route parameter', () => {
		expect(isSiteSettingKey('faqs')).toBe(true);
		expect(isSiteSettingKey('nope')).toBe(false);
		expect(isSiteSettingKey(undefined)).toBe(false);
		// Not a prototype member such as `constructor`, which a bare `in` check would allow.
		expect(isSiteSettingKey('toString')).toBe(false);
	});
});

describe('parsing a setting', () => {
	it('round-trips a row list into a value the contract accepts', () => {
		const value = parseSettingForm(
			'faqs',
			submission({
				'faqs.__count': '2',
				'faqs[0].question': 'Do I need a visa?',
				'faqs[0].answer': 'Most visitors get one on arrival.',
				'faqs[1].question': 'When should I come?',
				'faqs[1].answer': 'April to October.',
			}),
		);

		expect(value).toEqual([
			{ question: 'Do I need a visa?', answer: 'Most visitors get one on arrival.' },
			{ question: 'When should I come?', answer: 'April to October.' },
		]);
		expect(parseSiteSetting('faqs', value).success).toBe(true);
	});

	it('coerces a number field out of the string a browser submits', () => {
		const value = parseSettingForm(
			'site',
			submission({
				'site.name': 'Banggai Escape',
				'site.tagline': 'Beyond the usual Sulawesi',
				'site.locale': 'en',
				'site.phone': '+62 812 0000',
				'site.phoneHref': 'tel:+628120000',
				'site.whatsapp': '628120000',
				'site.email': 'hello@banggaiescape.com',
				'site.address.__count': '2',
				'site.address[0]': 'Luwuk',
				'site.address[1]': 'Banggai, Central Sulawesi',
				'site.reviewCount': '1240',
			}),
		);

		expect(readPath(value, 'reviewCount')).toBe(1240);
		expect(parseSiteSetting('site', value).success).toBe(true);
	});

	it('turns a blank optional field into an absent one', () => {
		// The contract's only optional field is `contactChannels[].extra`, and `.optional()`
		// permits absence rather than emptiness — so an untouched input has to disappear
		// instead of arriving as `''`. Without that, a channel with no second line is
		// unpublishable and there is nothing an administrator could type to fix it.
		const value = parseSettingForm(
			'contactChannels',
			submission({
				'contactChannels.__count': '1',
				'contactChannels[0].icon': 'fa-phone',
				'contactChannels[0].title': 'Call us',
				'contactChannels[0].text': 'Any day, 8am to 8pm.',
				'contactChannels[0].value': '+62 812 0000',
				'contactChannels[0].extra': '',
				'contactChannels[0].href': 'tel:+628120000',
			}),
		);

		expect(value).toEqual([
			{
				icon: 'fa-phone',
				title: 'Call us',
				text: 'Any day, 8am to 8pm.',
				value: '+62 812 0000',
				extra: undefined,
				href: 'tel:+628120000',
			},
		]);
		expect(parseSiteSetting('contactChannels', value).success).toBe(true);
	});

	it('keeps a stored media reference as the row id', () => {
		const value = parseSettingForm('ctaBackground', submission({ ctaBackground: MEDIA_ID }));

		expect(value).toBe(MEDIA_ID);
		expect(parseSiteSetting('ctaBackground', value).success).toBe(true);
	});

	it('empties a list when every row was removed', () => {
		// `__count` is authoritative rather than the presence of `path[0]`: otherwise a
		// submission that removed every row would look identical to one that never had any,
		// and an empty array — which the contract rejects for `nav` — would be unreachable
		// from the form.
		expect(parseSettingForm('nav', submission({ 'nav.__count': '0' }))).toEqual([]);
		expect(parseSiteSetting('nav', []).success).toBe(false);
	});
});

describe('seeding a form', () => {
	it('opens with as many rows as are stored', () => {
		// The regression this pins: a setting's value *is* its root field's value, so handing
		// it to the walker unwrapped reads `array['faqs']`, finds nothing, and opens the form
		// with one blank row however many are stored.
		const stored = [
			{ question: 'One?', answer: 'Yes.' },
			{ question: 'Two?', answer: 'Yes.' },
			{ question: 'Three?', answer: 'Yes.' },
		];

		expect(initialSettingCounts('faqs', stored)).toEqual({ faqs: 3 });
		expect(countsFor([settingSpecs.faqs], stored)).toEqual({ faqs: 1 });
	});

	it('counts a list nested inside an object', () => {
		const site = { address: ['Luwuk', 'Banggai'] };

		expect(initialSettingCounts('site', site)['site.address']).toBe(2);
	});

	it('wraps a value so the path walkers can read it back', () => {
		const values = settingFormValues('ctaBackground', MEDIA_ID);

		expect(readPath(values, 'ctaBackground')).toBe(MEDIA_ID);
		expect(readPath(settingFormValues('faqs', [{ question: 'One?' }]), 'faqs[0].question')).toBe(
			'One?',
		);
	});
});

describe('the site form and the site contract cannot drift apart', () => {
	/**
	 * The object schema underneath a setting, however it is wrapped.
	 *
	 * Three shapes have to be peeled: a `ZodArray` (the `rows` settings hold a list of items,
	 * so the fields to compare are the *item*'s), a `ZodPrefault` (the page-copy settings are
	 * `.prefault({})` at the root), and a plain object. Returns undefined for anything else —
	 * a list of plain strings has no fields, and there is nothing to compare.
	 */
	function objectSchema(schema: unknown): { shape: Record<string, unknown> } | undefined {
		const node = schema as {
			shape?: Record<string, unknown>;
			def?: Record<string, unknown>;
			element?: unknown;
		};

		if (node?.shape) return { shape: node.shape };
		if (node?.element) return objectSchema(node.element);

		// `def.innerType` is the wrapped schema; `def.type` names it. Two hops rather than
		// `.unwrap()` because the wrapper differs between the array and the object case.
		const inner = node?.def?.innerType;
		if (inner) return objectSchema(inner);

		return undefined;
	}

	/** Both directions of the disagreement, as `contract path → what the form does with it`. */
	type Drift = { path: string; missing: string[]; extra: string[] };

	/**
	 * Walks the contract and the form spec in parallel, comparing children at each object level.
	 *
	 * Parallel rather than a flat list of names on purpose. A flattened comparison cannot see
	 * a nested object at all — `homePage`'s seven bands are children of the root, so a flat
	 * check would confirm the bands *exist* and never look inside them, which is where the
	 * About paragraphs and their `min(2)` live.
	 */
	function compare(
		schema: unknown,
		fields: readonly FieldSpec[],
		path: string,
		into: Drift[],
	): void {
		const object = objectSchema(schema);
		if (!object) return;

		const contract = Object.keys(object.shape).sort();
		const byName = new Map(fields.map((field) => [field.name, field]));

		const missing = contract.filter((name) => !byName.has(name));
		const extra = fields.map((field) => field.name).filter((name) => !contract.includes(name));

		if (missing.length > 0 || extra.length > 0) into.push({ path, missing, extra });

		for (const [name, childSchema] of Object.entries(object.shape)) {
			const field = byName.get(name);

			// Only `object` and `rows` own nested fields. A `list` holds scalars, so there is
			// nothing below it to compare.
			if (field && (field.type === 'object' || field.type === 'rows')) {
				compare(childSchema, field.fields, `${path}.${name}`, into);
			}
		}
	}

	function driftFor(key: SiteSettingKey): Drift[] {
		const found: Drift[] = [];

		const spec = settingSpecs[key] as Extract<FieldSpec, { type: 'object' | 'rows' }>;

		compare(siteSettingSchemas[key], spec.fields, key, found);

		return found;
	}

	/** The settings whose value is a list of objects or an object — the ones with fields. */
	const objectSettings = settingKeys.filter(
		(key) => settingSpecs[key].type === 'object' || settingSpecs[key].type === 'rows',
	);

	it('covers every object setting, so a new one is checked the day it is added', () => {
		// The page-copy settings were added after this test was first written, and it did not
		// notice them. That is the failure mode of a test scoped to one key: it protects the key
		// it names and is silent about every key added since.
		expect(objectSettings).toContain('site');
		expect(objectSettings).toContain('homePage');
		expect(objectSettings).toContain('siteCta');
		expect(objectSettings).toContain('packagesPage');
		expect(objectSettings).toContain('nav');
	});

	it.each(objectSettings)('%s: the form and the contract declare the same fields', (key) => {
		// The failure this prevents is silent and total. A key with no field is not something
		// the type checker or the build notices: the form compiles, the page renders, and an
		// editor filling in every field they can see still cannot save — because
		// `parseSiteSetting` rejects the result. The only symptom is a save that fails naming a
		// field that is not on the screen.
		//
		// That is not hypothetical. `whatsapp` was added to the contract and to the form, and
		// nothing checked that the two agreed, so the site-profile fixtures in this file and in
		// `validate.spec.ts` drifted and CI caught it a session later.
		const drift = driftFor(key);

		// Each disagreement is reported with its path, so a failure names the band and the field
		// rather than two bare lists.
		expect(
			drift.map((entry) => `${entry.path}: missing [${entry.missing}], extra [${entry.extra}]`),
		).toEqual([]);
	});

	it('looks inside nested objects, not just at their existence', () => {
		// The walk has to recurse for this file to be worth anything on `homePage`: its seven
		// bands are children of the root, so a flat comparison would confirm they exist and
		// never look at what is inside them.
		expect(driftFor('homePage')).toEqual([]);

		// Proven by handing it a contract with a gap one level down and seeing the path arrive
		// with that level's name in it. `root` is absent from the result because its own
		// children agree — only `root.outer` is missing `inner`.
		const found: Drift[] = [];

		compare(
			{ shape: { outer: { shape: { inner: {} } } } },
			[{ type: 'object', name: 'outer', label: 'Outer', fields: [] }],
			'root',
			found,
		);

		expect(found).toEqual([{ path: 'root.outer', missing: ['inner'], extra: [] }]);
	});
});
