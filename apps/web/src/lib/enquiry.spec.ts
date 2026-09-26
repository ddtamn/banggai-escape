/**
 * The enquiry composer decides what a human on the other end of WhatsApp actually reads,
 * so its rules are worth pinning: a number that would produce a dead link, a date that
 * `Date` would silently roll over, a group size that is authored prose rather than data.
 */

import { describe, expect, it } from 'vitest';
import {
	type BookingPackage,
	composeEnquiry,
	durationLabel,
	maxGuestsFrom,
	whatsappLink,
	whatsappNumber,
} from './enquiry';

const pkg: BookingPackage = {
	slug: '4d3n-banggai-island-odyssey',
	title: '4D3N Banggai Island Odyssey',
	days: 4,
	nights: 3,
	maxGuests: 8,
};

describe('whatsappNumber', () => {
	it('accepts a bare international number', () => {
		expect(whatsappNumber('6281354911647')).toBe('6281354911647');
	});

	it('strips the punctuation people type into a CMS field', () => {
		expect(whatsappNumber('+62 813-5491-1647')).toBe('6281354911647');
		expect(whatsappNumber('(62) 813 5491 1647')).toBe('6281354911647');
	});

	it('rejects anything too short or too long to be a real number', () => {
		// A number `wa.me` would refuse has to fail here, where it can be handled, rather
		// than becoming a link that silently does nothing.
		expect(whatsappNumber('1234567')).toBeNull();
		expect(whatsappNumber('1234567890123456')).toBeNull();
	});

	it('rejects empty and missing values', () => {
		expect(whatsappNumber(null)).toBeNull();
		expect(whatsappNumber(undefined)).toBeNull();
		expect(whatsappNumber('')).toBeNull();
		expect(whatsappNumber('   ')).toBeNull();
	});

	it('refuses a value that has no digits at all', () => {
		expect(whatsappNumber('not a number')).toBeNull();
	});
});

describe('whatsappLink', () => {
	it('produces a click-to-chat URL with the message encoded', () => {
		const link = whatsappLink('6281354911647', 'Hello & welcome');

		expect(link).toBe('https://wa.me/6281354911647?text=Hello%20%26%20welcome');
	});

	it('encodes a newline rather than dropping it', () => {
		// A literal newline in a query string is truncated by some clients, which would
		// silently cut the message in half.
		const link = whatsappLink('6281354911647', 'one\ntwo');

		expect(link).toContain('%0A');
		expect(link).not.toContain('\n');
	});
});

describe('maxGuestsFrom', () => {
	it('reads the ceiling out of the authored display string', () => {
		expect(maxGuestsFrom('Min 2, Max 8')).toBe(8);
		expect(maxGuestsFrom('Min 4, Max 12')).toBe(12);
	});

	it('tolerates the spacing variations that prose allows', () => {
		expect(maxGuestsFrom('Min 2,Max 6')).toBe(6);
		expect(maxGuestsFrom('min 2  /  max 10')).toBe(10);
	});

	it('returns null rather than guessing when there is no ceiling to read', () => {
		// The caller falls back to its own cap. Inventing a number here would put a limit
		// in front of a real enquiry that the operator never agreed to.
		expect(maxGuestsFrom('Min 2')).toBeNull();
		expect(maxGuestsFrom('Flexible')).toBeNull();
		expect(maxGuestsFrom('')).toBeNull();
		expect(maxGuestsFrom(null)).toBeNull();
	});

	it('refuses a zero, which is prose rather than a capacity', () => {
		expect(maxGuestsFrom('Min 0, Max 0')).toBeNull();
	});
});

describe('durationLabel', () => {
	it('reads as the trip is sold', () => {
		expect(durationLabel({ days: 4, nights: 3 })).toBe('4D3N');
	});

	it('handles a single-day trip with no night at all', () => {
		expect(durationLabel({ days: 1, nights: 0 })).toBe('1D0N');
	});
});

describe('composeEnquiry', () => {
	it('includes every choice the visitor made', () => {
		const message = composeEnquiry({
			package: pkg,
			dateFrom: '2026-07-12',
			dateTo: '2026-07-19',
			guests: 2,
		});

		expect(message).toContain('4D3N Banggai Island Odyssey (4D3N)');
		expect(message).toContain('12 July 2026 to 19 July 2026');
		expect(message).toContain('Guests: 2');
	});

	it('omits lines for choices the visitor did not make', () => {
		const message = composeEnquiry({ guests: 4 });

		// A wall of "not specified" makes the operator's job harder, not easier.
		expect(message).not.toContain('Package:');
		expect(message).not.toContain('Name:');
		expect(message).toContain('Guests: 4');
	});

	it('says the dates are flexible rather than leaving a hole', () => {
		// Absence reads as an oversight; "flexible" is information.
		expect(composeEnquiry({ guests: 2 })).toContain('Dates: flexible');
	});

	it('handles a single date without inventing the other', () => {
		const from = composeEnquiry({ dateFrom: '2026-07-12' });
		const to = composeEnquiry({ dateTo: '2026-07-19' });

		expect(from).toContain('From: 12 July 2026');
		expect(from).not.toContain('Dates: flexible');
		expect(to).toContain('To: 19 July 2026');
	});

	it('keeps an unparseable date visible instead of printing Invalid Date', () => {
		// A bad value should be readable by the operator, who can then ask about it.
		expect(composeEnquiry({ dateFrom: 'soon' })).toContain('From: soon');
	});

	it('does not roll an impossible date over into a real one', () => {
		// `new Date('2026-02-31')` becomes 3 March. Silently wrong is worse than wrong.
		expect(composeEnquiry({ dateFrom: '2026-02-31' })).toContain('From: 2026-02-31');
	});

	it('carries the free text and the name from the contact form', () => {
		const message = composeEnquiry({
			name: 'Sarah',
			message: 'We are a family of five.',
		});

		expect(message).toContain('Name: Sarah');
		expect(message).toContain('We are a family of five.');
	});

	it('still produces a sendable message from nothing at all', () => {
		// An empty enquiry must not compose to an empty string, which would open WhatsApp
		// with a blank message box.
		const message = composeEnquiry({});

		expect(message.trim().length).toBeGreaterThan(0);
		expect(message).toContain('Banggai Escape');
	});

	it('records the page the enquiry came from, without the query string', () => {
		// A query string can carry anything, so only scheme, host and path are echoed.
		const message = composeEnquiry(
			{ guests: 2 },
			'https://banggaiescape.com/packages?ref=ad&email=a@b.c',
		);

		expect(message).toContain('Sent from https://banggaiescape.com/packages');
		expect(message).not.toContain('ref=ad');
		expect(message).not.toContain('a@b.c');
	});

	it('does not echo the origin when it is not a usable URL', () => {
		const message = composeEnquiry({ guests: 2 }, 'not-a-url');

		expect(message).not.toContain('Sent from');
	});

	it('trims the root path rather than sending a bare trailing slash', () => {
		expect(composeEnquiry({}, 'https://banggaiescape.com/')).toContain(
			'Sent from https://banggaiescape.com',
		);
	});
});
