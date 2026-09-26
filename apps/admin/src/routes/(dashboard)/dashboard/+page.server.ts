/**
 * The overview's loader.
 *
 * The first page an administrator sees after signing in, so it answers three questions in
 * one screen: what is published, what changed recently, and is anyone reading the site.
 *
 * Two decisions worth naming.
 *
 * **One read per kind, reused twice.** The totals and the recent-edits list both come from
 * the same `listEntries` call, because the counts are derived from the rows rather than
 * asked for separately — `countStatuses` is the same rule the list screen's filter tabs
 * use. Asking `countByStatus` as well would read every entry a second time to produce a
 * number already sitting in memory.
 *
 * **Analytics is read here too, and quietly.** Thirty days is the window the plan asks
 * this screen for, and `loadAnalyticsView` is the one place that knows how to read Workers
 * Analytics Engine — so the overview borrows it rather than growing a second, smaller query
 * path that would need its own tests. It costs five read queries per visit against a
 * documented allowance of 10,000 a day, and the unconfigured and error states are rendered
 * as a line of text rather than an alarm: an unconfigured dashboard should not be the first
 * thing that greets a sign-in.
 */
import { kindLabels, kinds } from '$lib/content/forms';
import { loadAnalyticsView } from '$lib/server/analytics/service';
import { countStatuses, listEntries, statusLabels } from '$lib/server/content/service';
import type { PageServerLoad } from './$types';

/** How many entries the recent-edits list shows. */
const RECENT_LIMIT = 6;

export const load: PageServerLoad = async () => {
	const [perKind, analytics] = await Promise.all([
		Promise.all(
			kinds.map(async (kind) => ({
				kind,
				label: kindLabels[kind],
				entries: await listEntries(kind),
			})),
		),
		loadAnalyticsView(30),
	]);

	const totals = perKind.map(({ kind, label, entries }) => ({
		kind,
		label,
		counts: countStatuses(entries),
	}));

	/**
	 * The most recently touched entries across all three kinds.
	 *
	 * `listEntries` already stamps each summary with its kind, so the three lists merge
	 * as they are. Sorted here rather than in SQL because there is no query to sort:
	 * `listEntries` is per-kind, and merging three already-read lists in memory is both
	 * cheaper and clearer than a fourth query that ranks across kinds. Archived entries stay
	 * in — an administrator who archived something yesterday wants to see that they did.
	 */
	const recent = perKind
		.flatMap(({ entries }) => entries)
		.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
		.slice(0, RECENT_LIMIT);

	return {
		totals,
		recent,
		labels: statusLabels(),
		analytics,
	};
};
