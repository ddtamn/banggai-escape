/**
 * One dashboard load, assembled.
 *
 * Everything the analytics page renders comes from here, so the page stays a rendering
 * problem: it is handed a summary or a reason there is none.
 *
 * Two decisions worth knowing about.
 *
 * **The queries run together, once per navigation.** Five `Promise.all`ed aggregates on
 * mount or on a range change — never one query per chart point, never a polled refresh.
 * The free allowance is 10,000 read queries a day, so the cost of a page load is not the
 * concern; the concern is a dashboard that hammers the API while someone reads it, and
 * that is what "no polling" prevents.
 *
 * **A failure is a state, not an exception to the page.** The page is given
 * `{ state: 'error' }` with a message instead of a 500, because an analytics screen that
 * disappears when the token expires tells an administrator nothing — and the rest of the
 * admin has to keep working either way.
 *
 * The headline numbers are resolved here rather than in the page, because this module
 * reaches `$env/dynamic/private`: a component must never import `$lib/server/**`, so
 * anything the page renders has to arrive as loader data.
 */
import { type AnalyticsRange, analyticsRetentionDays } from '@banggai/content-model';
import {
	type AnalyticsAvailability,
	AnalyticsQueryError,
	analyticsAvailability,
	runAnalyticsQuery,
} from './client';
import {
	analyticsQueries,
	type ContentViews,
	type CtaClick,
	type DailyViews,
	type EventTotal,
	fillMissingDays,
	mapContentViews,
	mapCtaClicks,
	mapDailyViews,
	mapEventTotals,
	mapTopPages,
	type TopPage,
} from './queries';

export type AnalyticsSummary = {
	range: AnalyticsRange;
	/** The headline numbers, ready to render. */
	totals: { pageViews: number; bookingCtaClicks: number; contactClicks: number };
	/** Every event in the window, so the total and each action come from one query. */
	eventTotals: EventTotal[];
	/** Page views, one per day, with quiet days filled in as zero. */
	dailyViews: DailyViews[];
	topPages: TopPage[];
	contentViews: ContentViews[];
	ctaClicks: CtaClick[];
	/** When this summary was read, so a reader knows how fresh it is. */
	readAt: string;
};

export type AnalyticsView =
	| { state: 'ready'; summary: AnalyticsSummary }
	| { state: 'unconfigured'; missing: string[] }
	| { state: 'error'; message: string };

/** The total for one event, or zero when the window holds none. */
export function eventTotal(summary: Pick<AnalyticsSummary, 'eventTotals'>, event: string): number {
	return summary.eventTotals.find((row) => row.event === event)?.count ?? 0;
}

export async function loadAnalyticsView(
	range: AnalyticsRange,
	availability: AnalyticsAvailability = analyticsAvailability(),
): Promise<AnalyticsView> {
	if (availability.state === 'unconfigured') {
		return { state: 'unconfigured', missing: availability.missing };
	}

	const queries = analyticsQueries(range);

	try {
		const [events, daily, pages, content, clicks] = await Promise.all([
			runAnalyticsQuery(queries.eventTotals, availability),
			runAnalyticsQuery(queries.dailyViews, availability),
			runAnalyticsQuery(queries.topPages, availability),
			runAnalyticsQuery(queries.contentViews, availability),
			runAnalyticsQuery(queries.ctaClicks, availability),
		]);

		const eventTotals = mapEventTotals(events);

		return {
			state: 'ready',
			summary: {
				range,
				totals: {
					pageViews: eventTotal({ eventTotals }, 'page_view'),
					bookingCtaClicks: eventTotal({ eventTotals }, 'booking_cta_click'),
					contactClicks: eventTotal({ eventTotals }, 'contact_click'),
				},
				eventTotals,
				dailyViews: fillMissingDays(mapDailyViews(daily), range),
				topPages: mapTopPages(pages),
				contentViews: mapContentViews(content),
				ctaClicks: mapCtaClicks(clicks),
				readAt: new Date().toISOString(),
			},
		};
	} catch (error) {
		// A rejected credential and a query that will not parse are both worth a log line:
		// the page shows a message, but only the log says which query failed and why.
		console.error('Analytics query failed.', error);

		return {
			state: 'error',
			message:
				error instanceof AnalyticsQueryError
					? error.message
					: 'The analytics query failed for an unexpected reason. See the Worker log for the detail.',
		};
	}
}

/** Re-exported so the page can name the retention window without importing the contract. */
export { analyticsRetentionDays };
