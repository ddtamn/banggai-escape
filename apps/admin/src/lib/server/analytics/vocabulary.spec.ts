/**
 * Specs for the shared analytics vocabulary.
 *
 * The vocabulary lives in `@banggai/content-model` because both apps need it, and that
 * package has no test runner — so its specs run here, like `media/references.spec.ts`
 * does for the media walker. Anything that decides what may be *written* is worth
 * testing from somewhere, and the event parser is the endpoint's only input filter.
 */

import {
	analyticsDataPoint,
	analyticsEvents,
	analyticsRetentionDays,
	contentRefForPath,
	defaultAnalyticsRange,
	parseAnalyticsEvent,
	parseAnalyticsRange,
} from '@banggai/content-model';
import { describe, expect, it } from 'vitest';

describe('parseAnalyticsRange', () => {
	it('accepts every offered range, as a string or a number', () => {
		expect(parseAnalyticsRange('7')).toBe(7);
		expect(parseAnalyticsRange(30)).toBe(30);
		expect(parseAnalyticsRange('90')).toBe(90);
	});

	it('falls back to the default for anything else', () => {
		expect(parseAnalyticsRange('1')).toBe(defaultAnalyticsRange);
		expect(parseAnalyticsRange('365')).toBe(defaultAnalyticsRange);
		expect(parseAnalyticsRange('7.5')).toBe(defaultAnalyticsRange);
		expect(parseAnalyticsRange('abc')).toBe(defaultAnalyticsRange);
		expect(parseAnalyticsRange('')).toBe(defaultAnalyticsRange);
		expect(parseAnalyticsRange(undefined)).toBe(defaultAnalyticsRange);
		expect(parseAnalyticsRange(null)).toBe(defaultAnalyticsRange);
		expect(parseAnalyticsRange(['7'])).toBe(defaultAnalyticsRange);
	});

	it('never offers a range past the retention window', () => {
		expect(Math.max(...([7, 30, 90] as const))).toBeLessThanOrEqual(analyticsRetentionDays);
	});
});

describe('contentRefForPath', () => {
	it('maps a detail path to its kind and slug', () => {
		expect(contentRefForPath('/packages/untouched-banggai-discovery')).toEqual({
			kind: 'package',
			slug: 'untouched-banggai-discovery',
		});
		expect(contentRefForPath('/destinations/paisu-pok-lake')).toEqual({
			kind: 'destination',
			slug: 'paisu-pok-lake',
		});
		expect(contentRefForPath('/blog/how-to-get-to-banggai-islands')).toEqual({
			kind: 'article',
			slug: 'how-to-get-to-banggai-islands',
		});
	});

	it('does not treat a listing page as a content view', () => {
		expect(contentRefForPath('/packages')).toBeUndefined();
		expect(contentRefForPath('/destinations')).toBeUndefined();
		expect(contentRefForPath('/blog')).toBeUndefined();
	});

	it('ignores a path that is not a collection detail page', () => {
		expect(contentRefForPath('/')).toBeUndefined();
		expect(contentRefForPath('/about')).toBeUndefined();
		expect(contentRefForPath('/packages/a/b')).toBeUndefined();
		expect(contentRefForPath('/blog/drafts/one')).toBeUndefined();
		expect(contentRefForPath('/media/packages/x')).toBeUndefined();
	});

	it('refuses a slug the content contract would refuse', () => {
		expect(contentRefForPath('/packages/Not-Lowercase')).toBeUndefined();
		expect(contentRefForPath('/packages/trailing-')).toBeUndefined();
		expect(contentRefForPath('/packages/under_score')).toBeUndefined();
	});
});

describe('parseAnalyticsEvent', () => {
	it('accepts an event name and a path, and nothing else', () => {
		const result = parseAnalyticsEvent({ event: 'page_view', path: '/packages' });

		expect(result.success).toBe(true);
		expect(result.data).toEqual({ event: 'page_view', path: '/packages' });
	});

	it('accepts every event in the vocabulary', () => {
		for (const event of analyticsEvents) {
			expect(parseAnalyticsEvent({ event, path: '/' }).success).toBe(true);
		}
	});

	it('refuses an event that is not in the vocabulary', () => {
		expect(parseAnalyticsEvent({ event: 'package_view', path: '/' }).success).toBe(false);
		expect(parseAnalyticsEvent({ event: '', path: '/' }).success).toBe(false);
		expect(parseAnalyticsEvent({ event: 7, path: '/' }).success).toBe(false);
	});

	it('refuses a dimension the caller invented', () => {
		// Strict, not merely non-strict: an unexpected key is how a caller smuggles in a
		// dimension there is no column for.
		expect(parseAnalyticsEvent({ event: 'page_view', path: '/', slug: 'anything' }).success).toBe(
			false,
		);
		expect(parseAnalyticsEvent({ event: 'page_view', path: '/', email: 'a@b.c' }).success).toBe(
			false,
		);
	});

	it('refuses a path that could carry something personal', () => {
		for (const path of [
			'someone@example.com',
			'/contact?email=someone@example.com',
			'/packages/a#token',
			'/packages/a b',
			'/packages/a%2fb',
			'/a:b',
			'"quoted"',
			'/<script>',
			'packages',
			'//',
		]) {
			expect(parseAnalyticsEvent({ event: 'page_view', path }).success, path).toBe(false);
		}
	});

	it('refuses an over-long path', () => {
		expect(parseAnalyticsEvent({ event: 'page_view', path: `/${'a'.repeat(200)}` }).success).toBe(
			false,
		);
		expect(parseAnalyticsEvent({ event: 'page_view', path: `/${'a'.repeat(199)}` }).success).toBe(
			true,
		);
	});

	it('refuses a body that is not an object with those two fields', () => {
		expect(parseAnalyticsEvent(null).success).toBe(false);
		expect(parseAnalyticsEvent('page_view').success).toBe(false);
		expect(parseAnalyticsEvent([]).success).toBe(false);
		expect(parseAnalyticsEvent({}).success).toBe(false);
		expect(parseAnalyticsEvent({ event: 'page_view' }).success).toBe(false);
	});
});

describe('analyticsDataPoint', () => {
	it('writes the positional columns in the documented order', () => {
		const point = analyticsDataPoint({
			event: 'page_view',
			path: '/packages/untouched-banggai-discovery',
		});

		expect(point.blobs).toEqual([
			'page_view',
			'/packages/untouched-banggai-discovery',
			'package',
			'untouched-banggai-discovery',
		]);
		expect(point.doubles).toEqual([1]);
	});

	it('records exactly one index, because Analytics Engine drops a point with two', () => {
		const point = analyticsDataPoint({ event: 'contact_click', path: '/contact' });

		expect(point.indexes).toEqual(['contact_click']);
	});

	it('leaves kind and slug empty for a page that names no content', () => {
		expect(analyticsDataPoint({ event: 'page_view', path: '/about' }).blobs).toEqual([
			'page_view',
			'/about',
			'',
			'',
		]);
		expect(analyticsDataPoint({ event: 'page_view', path: '/packages' }).blobs).toEqual([
			'page_view',
			'/packages',
			'',
			'',
		]);
	});
});
