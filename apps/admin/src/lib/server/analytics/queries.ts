/**
 * The analytics SQL this app sends, and why it is safe to send it.
 *
 * The SQL API takes a query as raw text — there are no bind parameters — so the rule is
 * that **no request value ever reaches a query string**. The only thing that varies is the
 * date range, and it varies as a *number* that has already been forced onto one of three
 * allowed values by `parseAnalyticsRange()`, so it cannot carry SQL. Everything else here
 * is a literal: the dataset name comes from the shared contract, and the column names come
 * from the layout the public Worker writes.
 *
 * The queries are fixed rather than composed from a request, which is also why there is no
 * "run this SQL" surface anywhere in the admin. If a future screen needs a new number, it
 * gets a new function in this file.
 *
 * ## Sampling
 *
 * Analytics Engine may downsample a high-volume index, and every count therefore uses
 * `SUM(_sample_interval)` rather than `COUNT()`: the sample interval is how many original
 * rows a stored row stands for, so summing it estimates the true count. See
 * docs/14-admin-app.md. `double1` is written as `1` per event by the public site, so
 * `SUM(_sample_interval * double1)` and `SUM(_sample_interval)` agree — the shorter form is
 * used, and `double1` stays in the data as the marker of which shape a future event uses.
 */
import { type AnalyticsRange, analyticsDataset } from '@banggai/content-model';

/** The five results a dashboard load needs. One query each, all aggregates. */
export type AnalyticsQueries = {
	/** Total events per event name — the page-view total and the click totals. */
	eventTotals: string;
	/** Page views per UTC day, for the chart. */
	dailyViews: string;
	/** The most-read paths. */
	topPages: string;
	/** The most-read content, by kind and slug. */
	contentViews: string;
	/** Where the tracked calls to action were clicked. */
	ctaClicks: string;
};

/**
 * Builds every query for one date range.
 *
 * `days` is typed as `AnalyticsRange`, which is what makes the interpolation below safe:
 * the type is a union of `7 | 30 | 90`, and the only way to produce one is
 * `parseAnalyticsRange()`.
 */
export function analyticsQueries(days: AnalyticsRange): AnalyticsQueries {
	/** The window every query shares. `NOW()` is UTC, like the stored timestamps. */
	const since = `FROM ${analyticsDataset} WHERE timestamp > NOW() - INTERVAL '${days}' DAY`;

	/** Page views only: the chart and the page rankings are about pages, not clicks. */
	const pageViews = `${since} AND blob1 = 'page_view'`;

	return {
		eventTotals: [
			'SELECT blob1 AS event, SUM(_sample_interval) AS count',
			since,
			'GROUP BY event',
			'ORDER BY count DESC',
		].join(' '),

		// `formatDateTime` rather than the raw `DateTime`: the API renders a timestamp as
		// `YYYY-MM-DD hh:mm:ss`, and a chart axis is clearer with just the date. The bucket
		// is UTC, as are the stored timestamps.
		dailyViews: [
			"SELECT formatDateTime(toStartOfInterval(timestamp, INTERVAL '1' DAY), '%Y-%m-%d') AS day,",
			'SUM(_sample_interval) AS views',
			pageViews,
			'GROUP BY day',
			'ORDER BY day ASC',
		].join(' '),

		topPages: [
			'SELECT blob2 AS path, SUM(_sample_interval) AS views',
			pageViews,
			'GROUP BY path',
			'ORDER BY views DESC',
			'LIMIT 10',
		].join(' '),

		// `blob3 != ''` is what makes this a list of content rather than a list of pages:
		// only a detail route records a kind, and the listing pages leave it empty.
		contentViews: [
			'SELECT blob3 AS kind, blob4 AS slug, SUM(_sample_interval) AS views',
			pageViews,
			"AND blob3 != ''",
			'GROUP BY kind, slug',
			'ORDER BY views DESC',
			'LIMIT 10',
		].join(' '),

		ctaClicks: [
			'SELECT blob1 AS event, blob2 AS path, SUM(_sample_interval) AS count',
			since,
			"AND blob1 != 'page_view'",
			'GROUP BY event, path',
			'ORDER BY count DESC',
			'LIMIT 10',
		].join(' '),
	};
}

/** One row as the SQL API returns it: every value is a string. */
export type AnalyticsRow = Record<string, unknown>;

export type EventTotal = { event: string; count: number };
export type DailyViews = { day: string; views: number };
export type TopPage = { path: string; views: number };
export type ContentViews = { kind: string; slug: string; views: number };
export type CtaClick = { event: string; path: string; count: number };

/**
 * A count, or an error.
 *
 * Deliberately not `Number(value) || 0`: a dashboard that silently renders a zero where the
 * query returned something unparseable is worse than one that says it cannot read its own
 * data, because a zero looks like a fact.
 */
function toCount(value: unknown): number {
	// The null check has to come first: `Number(null)` and `Number('')` are both `0`, so the
	// API's "no value" would otherwise be rendered as a real zero — the exact confusion this
	// function exists to prevent.
	const count = value === null || value === undefined || value === '' ? Number.NaN : Number(value);

	if (!Number.isFinite(count)) {
		throw new Error(`Analytics returned a count that is not a number: ${String(value)}`);
	}

	return count;
}

function toText(value: unknown): string {
	return typeof value === 'string' ? value : String(value ?? '');
}

export function mapEventTotals(rows: readonly AnalyticsRow[]): EventTotal[] {
	return rows.map((row) => ({ event: toText(row.event), count: toCount(row.count) }));
}

export function mapDailyViews(rows: readonly AnalyticsRow[]): DailyViews[] {
	return rows.map((row) => ({ day: toText(row.day), views: toCount(row.views) }));
}

export function mapTopPages(rows: readonly AnalyticsRow[]): TopPage[] {
	return rows.map((row) => ({ path: toText(row.path), views: toCount(row.views) }));
}

export function mapContentViews(rows: readonly AnalyticsRow[]): ContentViews[] {
	return rows.map((row) => ({
		kind: toText(row.kind),
		slug: toText(row.slug),
		views: toCount(row.views),
	}));
}

export function mapCtaClicks(rows: readonly AnalyticsRow[]): CtaClick[] {
	return rows.map((row) => ({
		event: toText(row.event),
		path: toText(row.path),
		count: toCount(row.count),
	}));
}

/**
 * Fills the days with no events with an explicit zero.
 *
 * Analytics Engine returns only the buckets that exist, so a quiet Tuesday is simply
 * absent. Charting those rows directly would compress the timeline — three bars for three
 * days of traffic a week apart, evenly spaced — which reads as steady activity. The axis
 * has to be continuous for the chart to mean anything, so the missing days are added here
 * and the series is always exactly `days` long.
 *
 * `today` is a parameter so this is testable without freezing the clock. Days are UTC, as
 * the buckets are.
 */
export function fillMissingDays(
	rows: readonly DailyViews[],
	days: number,
	today: Date = new Date(),
): DailyViews[] {
	const counts = new Map(rows.map((row) => [row.day, row.views]));
	const filled: DailyViews[] = [];

	for (let offset = days - 1; offset >= 0; offset -= 1) {
		const day = new Date(today.getTime() - offset * 86_400_000).toISOString().slice(0, 10);

		filled.push({ day, views: counts.get(day) ?? 0 });
	}

	return filled;
}
