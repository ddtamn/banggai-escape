/**
 * Specs for the analytics SQL builder and its row mapping.
 *
 * The SQL cannot be run here — that needs a Cloudflare token and a deployed Worker — so
 * what is pinned instead is everything that would make it wrong or unsafe: the dataset it
 * reads, the sampling-aware aggregation the numbers depend on, the shape of the window,
 * and the fact that the only varying part of a query is a number that has already been
 * forced onto an allowlist.
 */

import { analyticsDataset, parseAnalyticsRange } from '@banggai/content-model';
import { describe, expect, it } from 'vitest';
import {
	analyticsQueries,
	fillMissingDays,
	mapContentViews,
	mapCtaClicks,
	mapDailyViews,
	mapEventTotals,
	mapTopPages,
} from './queries';

const ranges = [7, 30, 90] as const;

describe('analyticsQueries', () => {
	it('reads the shared dataset in every query', () => {
		for (const sql of Object.values(analyticsQueries(30))) {
			expect(sql).toContain(`FROM ${analyticsDataset}`);
		}
	});

	it('aggregates with the sample interval, never a bare count', () => {
		const queries = analyticsQueries(30);

		for (const [name, sql] of Object.entries(queries)) {
			// A sampled row stands for many original rows, so `COUNT()` under-reports. Every
			// count has to be a sum of `_sample_interval`.
			expect(sql, name).toContain('SUM(_sample_interval)');
			expect(sql, name).not.toMatch(/COUNT\s*\(/i);
		}
	});

	it('windows every query by the requested number of days', () => {
		for (const days of ranges) {
			for (const [name, sql] of Object.entries(analyticsQueries(days))) {
				expect(sql, `${name} at ${days}`).toContain(`INTERVAL '${days}' DAY`);
				expect(sql, `${name} at ${days}`).toContain('timestamp > NOW()');
			}
		}
	});

	it('filters the rankings to page views and leaves the clicks alone', () => {
		const queries = analyticsQueries(30);

		expect(queries.dailyViews).toContain("blob1 = 'page_view'");
		expect(queries.topPages).toContain("blob1 = 'page_view'");
		expect(queries.contentViews).toContain("blob1 = 'page_view'");
		// The click list is the complement, so the two never double-count an event.
		expect(queries.ctaClicks).toContain("blob1 != 'page_view'");
	});

	it('groups the content list on kind and slug, and excludes pages that have neither', () => {
		const sql = analyticsQueries(30).contentViews;

		expect(sql).toContain('blob3 AS kind');
		expect(sql).toContain('blob4 AS slug');
		expect(sql).toContain("blob3 != ''");
		expect(sql).toContain('GROUP BY kind, slug');
	});

	it('buckets the chart by UTC day and sorts it oldest first', () => {
		const sql = analyticsQueries(30).dailyViews;

		expect(sql).toContain("toStartOfInterval(timestamp, INTERVAL '1' DAY)");
		expect(sql).toContain("'%Y-%m-%d'");
		expect(sql).toContain('ORDER BY day ASC');
	});
});

describe('the range cannot reach the query as text', () => {
	it('coerces a hostile range to the default before the SQL is built', () => {
		const days = parseAnalyticsRange("7' DAY; DROP TABLE banggai_site_events; --");
		const sql = analyticsQueries(days).eventTotals;

		expect(days).toBe(30);
		expect(sql).toContain("INTERVAL '30' DAY");
		expect(sql).not.toContain('DROP');
		expect(sql).not.toContain(';');
	});

	it('accepts only the offered ranges through the same path', () => {
		expect(analyticsQueries(parseAnalyticsRange('90')).dailyViews).toContain("INTERVAL '90' DAY");
		expect(analyticsQueries(parseAnalyticsRange('9999')).dailyViews).toContain("INTERVAL '30' DAY");
	});
});

describe('fillMissingDays', () => {
	const rows = [
		{ day: '2026-03-10', views: 4 },
		{ day: '2026-03-08', views: 7 },
	];

	it('returns one entry per day, oldest first, ending today', () => {
		const filled = fillMissingDays(rows, 3, new Date('2026-03-10T12:00:00Z'));

		expect(filled.map((day) => day.day)).toEqual(['2026-03-08', '2026-03-09', '2026-03-10']);
	});

	it('fills a quiet day with zero rather than dropping it', () => {
		const filled = fillMissingDays(rows, 3, new Date('2026-03-10T12:00:00Z'));

		// This is the point of the function: without the zero the chart would draw three
		// bars where there are three days, one of them empty, and read as steady traffic.
		expect(filled).toEqual([
			{ day: '2026-03-08', views: 7 },
			{ day: '2026-03-09', views: 0 },
			{ day: '2026-03-10', views: 4 },
		]);
	});

	it('always returns exactly the requested window', () => {
		expect(fillMissingDays([], 7, new Date('2026-03-10T12:00:00Z'))).toHaveLength(7);
		expect(fillMissingDays(rows, 30, new Date('2026-03-10T12:00:00Z'))).toHaveLength(30);
		expect(fillMissingDays(rows, 90, new Date('2026-03-10T12:00:00Z'))).toHaveLength(90);
	});

	it('drops a row that falls outside the window', () => {
		const filled = fillMissingDays(
			[{ day: '2026-01-01', views: 99 }],
			2,
			new Date('2026-03-10T12:00:00Z'),
		);

		expect(filled.every((day) => day.views === 0)).toBe(true);
	});
});

describe('row mapping', () => {
	it('coerces the strings the API returns into numbers', () => {
		// The SQL API renders every value as a string, so a count arrives as "12".
		expect(mapEventTotals([{ event: 'page_view', count: '12' }])).toEqual([
			{ event: 'page_view', count: 12 },
		]);
		expect(mapDailyViews([{ day: '2026-03-10', views: '3' }])).toEqual([
			{ day: '2026-03-10', views: 3 },
		]);
		expect(mapTopPages([{ path: '/', views: 2 }])).toEqual([{ path: '/', views: 2 }]);
		expect(mapCtaClicks([{ event: 'contact_click', path: '/', count: '1' }])).toEqual([
			{ event: 'contact_click', path: '/', count: 1 },
		]);
	});

	it('reads a content row as its kind and slug', () => {
		expect(
			mapContentViews([{ kind: 'package', slug: 'untouched-banggai-discovery', views: '9' }]),
		).toEqual([{ kind: 'package', slug: 'untouched-banggai-discovery', views: 9 }]);
	});

	it('refuses a count it cannot read, rather than showing a zero', () => {
		// A zero is a fact; an unreadable value is not, and a dashboard that mixes the two
		// is one nobody can trust.
		expect(() => mapEventTotals([{ event: 'page_view', count: 'many' }])).toThrow(/not a number/);
		expect(() => mapDailyViews([{ day: '2026-03-10', views: null }])).toThrow(/not a number/);
	});

	it('maps an empty result to an empty list', () => {
		expect(mapEventTotals([])).toEqual([]);
		expect(mapDailyViews([])).toEqual([]);
		expect(mapTopPages([])).toEqual([]);
		expect(mapContentViews([])).toEqual([]);
		expect(mapCtaClicks([])).toEqual([]);
	});
});
