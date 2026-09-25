/**
 * Writing one analytics data point, and never letting that failure matter.
 *
 * The write happens in the Worker rather than in a browser beacon: the event endpoint is
 * called by our own client code, and the data point is written from the request that
 * arrives, so a page view cannot be lost to an ad blocker that never loads our script and
 * cannot be forged by a caller sending something other than the two fields below.
 *
 * **Fail open, always.** Analytics is the least important thing this site does. A missing
 * binding, an exhausted daily write allowance, or a runtime that rejects the write must
 * leave the page and the navigation untouched — so the binding is optional here, the
 * promise is not awaited, and a throw is logged and swallowed. The failure mode is a flat
 * chart, never a broken page.
 */
import { type AnalyticsEventInput, analyticsDataPoint } from '@banggai/content-model';

/**
 * Records one event. Returns nothing: `writeDataPoint()` hands the write to the runtime and
 * resolves immediately, so there is no result to report and nothing to wait for.
 *
 * `platform` is `undefined` under `vite dev` (the app runs in Node, where there are no
 * Worker bindings) and the `ANALYTICS` binding is absent in a `wrangler dev` run that has
 * not read `wrangler.jsonc`. Both are silent no-ops rather than errors, which is what makes
 * local development behave exactly like a production outage of the analytics service.
 */
export function recordEvent(platform: App.Platform | undefined, event: AnalyticsEventInput): void {
	const dataset = platform?.env.ANALYTICS;

	if (!dataset) return;

	try {
		dataset.writeDataPoint(analyticsDataPoint(event));
	} catch (error) {
		console.error('Analytics write failed; the page is unaffected.', error);
	}
}
