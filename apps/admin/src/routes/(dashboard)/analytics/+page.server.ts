/**
 * The analytics page's loader.
 *
 * The guard is the group's `+layout.server.ts`; by the time this runs the caller is a
 * signed-in administrator, which is the only caller who may see this data or use the
 * account token behind it.
 *
 * The date range is the page's whole state: it comes from `?range=`, it is coerced to one
 * of the three offered values (so a hand-edited URL cannot ask for a wider window or reach
 * a query), and the queries are built from that number.
 */
import { parseAnalyticsRange } from '@banggai/content-model';
import { loadAnalyticsView } from '$lib/server/analytics/service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const range = parseAnalyticsRange(url.searchParams.get('range'));

	return { range, view: await loadAnalyticsView(range) };
};
