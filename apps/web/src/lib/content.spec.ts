/**
 * The presenters.
 *
 * The small functions that put a price, a duration and a table of contents on the page.
 * They are pure, which is exactly why they are worth a test: nothing else in the pipeline
 * would notice one of them quietly changing, and every one of them is on a page a visitor
 * sees.
 *
 * `formatPrice` is the interesting one. `toLocaleString('id-ID')` is the whole of it, and it
 * depends on the runtime shipping the ICU data for that locale — a Node build without it
 * returns `2850000` where the design wants `2.850.000`, and a wrong separator on a price is
 * the sort of thing that reaches production because nothing threw.
 */
import type { ArticlePayload, PackagePayload } from '@banggai/content-model';
import { describe, expect, it } from 'vitest';
import { badgeDays, durationLabel, formatPrice, tableOfContents } from './content';

const pkg = (overrides: Partial<Pick<PackagePayload, 'days' | 'nights'>> = {}) =>
	({ days: 7, nights: 6, ...overrides }) as Pick<PackagePayload, 'days' | 'nights'>;

describe('formatPrice', () => {
	it('groups rupiah with the locale’s own separator', () => {
		// Pinned rather than computed: if ICU is missing this is what changes, and the
		// failure is a wrong number on screen rather than an exception.
		expect(formatPrice(2850000)).toBe('IDR 2.850.000');
		expect(formatPrice(950000)).toBe('IDR 950.000');
	});

	it('leaves a round amount unadorned', () => {
		expect(formatPrice(1000000)).toBe('IDR 1.000.000');
	});

	it('renders zero rather than blank', () => {
		// The contract allows a non-negative price, so zero is reachable and must not read
		// as "no price set".
		expect(formatPrice(0)).toBe('IDR 0');
	});
});

describe('durationLabel', () => {
	it('names the days and nights of a multi-day trip', () => {
		expect(durationLabel(pkg())).toBe('7 Days 6 Nights');
	});

	it('uses the singular for one night', () => {
		expect(durationLabel(pkg({ days: 3, nights: 1 }))).toBe('3 Days 1 Night');
	});

	it('drops the nights entirely for a single-day trip', () => {
		// "1 Day 0 Nights" is the string a naive template produces, and it reads as though
		// the trip has an overnight stay it does not have.
		expect(durationLabel(pkg({ days: 1, nights: 0 }))).toBe('1 Day');
	});
});

describe('badgeDays', () => {
	it('zero-pads to the two digits the design uses', () => {
		expect(badgeDays({ days: 7 })).toBe('07 days');
		expect(badgeDays({ days: 12 })).toBe('12 days');
	});

	it('is singular for one day, and does not pad it', () => {
		expect(badgeDays({ days: 1 })).toBe('01 day');
	});
});

describe('tableOfContents', () => {
	const post = (body: ArticlePayload['body']) => ({ body }) as Pick<ArticlePayload, 'body'>;

	it('collects the headings, in the order they appear', () => {
		const toc = tableOfContents(
			post([
				{ kind: 'h', id: 'getting-there', text: 'Getting there' },
				{ kind: 'p', text: 'A paragraph between them.' },
				{ kind: 'h', id: 'getting-around', text: 'Getting around' },
			]),
		);

		expect(toc).toEqual([
			{ id: 'getting-there', text: 'Getting there' },
			{ id: 'getting-around', text: 'Getting around' },
		]);
	});

	it('is empty for an article with no headings', () => {
		// A table of contents with nothing in it must render nothing, not an empty list.
		expect(tableOfContents(post([{ kind: 'p', text: 'Just prose.' }]))).toEqual([]);
	});

	it('keeps the anchor id, because that is what the link points at', () => {
		// The id is a DOM id, and the contract's own rule is that it is unique per article;
		// dropping it here would produce a contents list whose links go nowhere.
		const [heading] = tableOfContents(
			post([{ kind: 'h', id: 'best-time-to-go', text: 'Best time to go' }]),
		);

		expect(heading.id).toBe('best-time-to-go');
	});
});
