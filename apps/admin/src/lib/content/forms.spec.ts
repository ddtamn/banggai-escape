import { parseSiteSetting, siteProfileSchema, siteSettingKeys } from '@banggai/content-model';
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
	 * Every field name a spec *contains*, at any depth.
	 *
	 * A `FieldSpec` is a recursive union — `object` and `rows` own nested `fields` — so the
	 * site profile is one spec with a tree inside it. Two things follow: the root's own name is
	 * the setting key (`site`), not a field of the profile, and comparing the contract to the
	 * root would compare a list of leaves to a list of branches and find everything missing.
	 */
	function containedNames(spec: FieldSpec): string[] {
		if (!('fields' in spec)) return [];

		return spec.fields.flatMap((child) => [child.name, ...containedNames(child)]);
	}

	/**
	 * Contract keys an editor cannot leave out.
	 *
	 * Asked of the schema rather than read from a list, so adding a required field to
	 * `siteProfileSchema` makes this test demand a form field without anyone editing a second
	 * thing. `safeParse(undefined)` is how a Zod field is asked whether absence is allowed,
	 * which works whether the field is `.optional()`, has a default, or is simply required.
	 */
	const requiredKeys = Object.entries(siteProfileSchema.shape)
		.filter(([, schema]) => !schema.safeParse(undefined).success)
		.map(([key]) => key)
		.sort();

	const formFields = new Set(containedNames(settingSpecs.site));
	const contractFields = new Set(Object.keys(siteProfileSchema.shape));

	it('finds the required keys, so the rest of this file is not vacuous', () => {
		// A schema change that made everything optional would otherwise turn the test below
		// into a loop over nothing, which passes.
		expect(requiredKeys.length).toBeGreaterThan(3);
	});

	it('finds the form fields, so a spec that stopped nesting would not pass by finding none', () => {
		expect(formFields.has('whatsapp')).toBe(true);
	});

	it('gives every required contract key a field in the form', () => {
		// The failure this prevents is silent and total. A required key with no field is not
		// something the type checker or the build notices: the form compiles, the page renders,
		// and an editor filling in every field they can see still cannot save — because
		// `parseSiteSetting` rejects the result. The only symptom is a save that fails with a
		// message naming a field that does not exist on the screen.
		//
		// That is not hypothetical. `whatsapp` was added to the contract and to the form, and
		// nothing checked that the two agreed, so the site-profile fixtures in this file and in
		// `validate.spec.ts` drifted and CI caught it a session later.
		expect(requiredKeys.filter((key) => !formFields.has(key))).toEqual([]);
	});

	it('has no form field the contract does not define', () => {
		// The other direction. A stray field is an input the editor can fill in and the
		// contract will then reject the whole record for, which is the same silent trap.
		expect([...formFields].filter((name) => !contractFields.has(name))).toEqual([]);
	});
});
