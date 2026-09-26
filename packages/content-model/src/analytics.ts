/**
 * The analytics vocabulary: what the public site may record, and what the admin may
 * query.
 *
 * Both apps need to agree on this and neither may import the other, so the names, the
 * date ranges, and the dataset live here — in the same package as the content contracts,
 * for the same reason. Two app-local copies of a word list is how a dashboard ends up
 * querying an event nothing writes.
 *
 * ## One data point
 *
 * Analytics Engine columns are positional, so the field order is part of the contract:
 *
 * | Column | Holds |
 * | --- | --- |
 * | `index1` | the event name — the sampling key |
 * | `blob1` | the event name |
 * | `blob2` | the path, with no query string |
 * | `blob3` | the content kind (`package` \| `destination` \| `article`), or `''` |
 * | `blob4` | the content slug, or `''` |
 *
 * `index1` is the event name on purpose. Analytics Engine samples per index *value*, so
 * giving the highest-volume event its own index means `page_view` absorbs the sampling and
 * the rare events — `booking_cta_click`, `contact_click` — stay exact for far longer.
 *
 * ## Why there is no `package_view`
 *
 * A package page view **is** a page view: it has a path, and the path is what says it is a
 * package. Emitting a second event called `package_view` for the same navigation would put
 * the same visit in two places, and then "page views" and "package views" would each be
 * right about a different total. So the kind is a dimension of the one event rather than a
 * separate name — the admin's "top package views" query is `page_view` filtered by `blob3`.
 * The plan in `docs/15` lists the kind-specific names; this is the deliberate departure,
 * and it exists to prevent double counting.
 */
import { z } from 'zod';
import { type ContentKind, slugSchema } from './content';

/**
 * Every event the public site may record. Anything not in this list is refused by the
 * event endpoint, which is the only way a data point can enter the dataset.
 */
export const analyticsEvents = [
	'page_view',
	'booking_cta_click',
	'contact_click',
	/**
	 * A visitor opened WhatsApp with an enquiry from the booking bar or the contact form.
	 * Worth its own event: it is the only signal on the site that an enquiry actually left
	 * it, as opposed to a CTA being tapped on the way somewhere else.
	 */
	'whatsapp_enquiry',
] as const;

export type AnalyticsEvent = (typeof analyticsEvents)[number];

/** The event every navigation records, once, after the route has actually changed. */
export const pageViewEvent: AnalyticsEvent = 'page_view';

/**
 * The dataset the public Worker writes and the admin SQL API reads.
 *
 * Analytics Engine creates it on first write, so this string is a promise rather than a
 * setting: changing it silently starts a second, empty table.
 */
export const analyticsDataset = 'BANGGAI_SITE_EVENTS';

/** The ranges the dashboard offers, in days. */
export const analyticsRanges = [7, 30, 90] as const;

export type AnalyticsRange = (typeof analyticsRanges)[number];

export const defaultAnalyticsRange: AnalyticsRange = 30;

/**
 * Analytics Engine retains data for three months. The longest range is that boundary, so
 * a wider one would only draw empty days and read as an outage.
 */
export const analyticsRetentionDays = 90;

/** Coerces a `?range=` value to one of the offered ranges, falling back to the default. */
export function parseAnalyticsRange(value: unknown): AnalyticsRange {
	const days = typeof value === 'string' && value !== '' ? Number(value) : value;

	return (analyticsRanges as readonly unknown[]).includes(days)
		? (days as AnalyticsRange)
		: defaultAnalyticsRange;
}

/**
 * A path this system is willing to store, after the client has stripped the query string
 * and hash.
 *
 * This is the endpoint's real input filter, and it is deliberately narrow. The path is a
 * free-text dimension written by an unauthenticated request, so it must not be able to
 * carry an email address, a token, or free prose: `@`, `:`, `?`, `#`, spaces, quotes and
 * percent-encoded separators are all refused. What survives is a URL path made of ordinary
 * path characters.
 *
 * The two alternatives are `/` on its own — the home page, which is a page view like any
 * other — and a path with at least one real segment. The second cannot be relaxed to allow
 * an empty first segment: that would accept `//evil.example`, which a browser reads as
 * another host. `safeRedirectTo()` in the admin refuses the same shape for the same reason.
 */
const pathPattern = /^\/$|^\/[A-Za-z0-9._~-]+(\/[A-Za-z0-9._~-]*)*$/;

export const maxAnalyticsPathLength = 200;

/** The route segment that names a collection, mapped to the kind stored in `content_entries`. */
const collectionKinds: Record<string, ContentKind> = {
	packages: 'package',
	destinations: 'destination',
	blog: 'article',
};

/**
 * The content a path points at, if it points at any.
 *
 * Derived **on the server** from the path rather than sent by the client, so there is no
 * second dimension a caller could lie about. `/packages/banggai-discovery` is a package
 * view; `/packages` is a page view with no kind.
 */
export function contentRefForPath(path: string): { kind: ContentKind; slug: string } | undefined {
	const match = /^\/([a-z-]+)\/([^/]+)$/.exec(path);
	if (!match) return undefined;

	const kind = collectionKinds[match[1]];
	if (!kind) return undefined;

	const slug = slugSchema.safeParse(match[2]);

	return slug.success ? { kind, slug: slug.data } : undefined;
}

/**
 * What the browser is allowed to send: an event name from the list above, and the path it
 * happened on. Nothing else — an unknown key is a failure, not an extra dimension.
 */
export const analyticsEventSchema = z.strictObject({
	event: z.enum(analyticsEvents),
	path: z.string().min(1).max(maxAnalyticsPathLength).regex(pathPattern),
});

export type AnalyticsEventInput = z.infer<typeof analyticsEventSchema>;

/** Validates one posted event. Refusals name the field, so a bad caller can be told why. */
export function parseAnalyticsEvent(value: unknown) {
	return analyticsEventSchema.safeParse(value);
}

/**
 * One `writeDataPoint()` argument, built from a validated event.
 *
 * Analytics Engine records at most **one** index; a second one makes the whole data point
 * silently vanish, so this returns an array with one element and the endpoint never
 * builds one by hand. `doubles: [1]` is the count, which is what makes
 * `SUM(_sample_interval * double1)` a total rather than an average.
 */
export function analyticsDataPoint(event: AnalyticsEventInput): {
	blobs: string[];
	doubles: number[];
	indexes: string[];
} {
	const ref = contentRefForPath(event.path);

	return {
		blobs: [event.event, event.path, ref?.kind ?? '', ref?.slug ?? ''],
		doubles: [1],
		indexes: [event.event],
	};
}
