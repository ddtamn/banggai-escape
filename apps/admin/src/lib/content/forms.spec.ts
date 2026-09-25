import { parseSiteSetting, siteSettingKeys } from '@banggai/content-model';
import { describe, expect, it } from 'vitest';
import {
	countsFor,
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
