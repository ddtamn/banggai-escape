/**
 * `sitemap.xml`, generated from published content.
 *
 * ## Why it is a route and not a file in `static/`
 *
 * Every page it should list lives in the database, in three collections plus six fixed routes.
 * A static file would go stale the moment an editor published something, and a sitemap that
 * lies about what exists is worse than none: a crawler that follows it finds a 404 and spends
 * crawl budget on a URL the site already told it not to expect.
 *
 * ## The origin
 *
 * Taken from the request, not from a setting. Behind Cloudflare the request already knows the
 * public host, so this needs no configuration and cannot disagree with the canonical URLs the
 * pages themselves emit.
 */

import { loadPublishedEntries } from '$lib/server/content';
import type { RequestHandler } from './$types';

/**
 * The fixed routes, with the crawl priority and change frequency each deserves.
 *
 * Priorities are relative to each other and only meaningful as such — a sitemap consumer reads
 * them as "which of these two should I look at first". They are not a claim about search
 * ranking, and the values stay inside the documented 0.0–1.0 range.
 */
const STATIC_ROUTES = [
	{ path: '/', priority: '1.0', changefreq: 'daily' },
	{ path: '/packages', priority: '0.9', changefreq: 'weekly' },
	{ path: '/destinations', priority: '0.8', changefreq: 'weekly' },
	{ path: '/blog', priority: '0.8', changefreq: 'daily' },
	{ path: '/about', priority: '0.5', changefreq: 'monthly' },
	{ path: '/contact', priority: '0.5', changefreq: 'monthly' },
] as const;

/** Where each collection's pages live, and how much of the site each represents. */
const COLLECTIONS = [
	{ kind: 'package', prefix: '/packages', priority: '0.8', changefreq: 'weekly' },
	{ kind: 'destination', prefix: '/destinations', priority: '0.7', changefreq: 'weekly' },
	{ kind: 'article', prefix: '/blog', priority: '0.7', changefreq: 'monthly' },
] as const satisfies readonly {
	kind: 'package' | 'destination' | 'article';
	prefix: string;
	priority: string;
	changefreq: string;
}[];

/**
 * Escape text for an XML text node or attribute value.
 *
 * The five entities are the complete set: `&` first, because escaping it last would
 * double-escape the ampersands the other four introduce.
 */
function xml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

/** One `<url>`. Omitted entirely when there is no date to state, rather than invented. */
function urlEntry(options: {
	loc: string;
	lastmod?: string | null;
	changefreq: string;
	priority: string;
}): string {
	const parts = [`    <loc>${xml(options.loc)}</loc>`];

	// A `lastmod` the consumer cannot verify is noise. The entry's own `updated_at` is a real
	// edit time when there is one, and the revision's `published_at` is always real, so a page
	// edited but never republished still reports a truthful date rather than a stale one.
	if (options.lastmod) parts.push(`    <lastmod>${xml(options.lastmod)}</lastmod>`);

	parts.push(`    <changefreq>${options.changefreq}</changefreq>`);
	parts.push(`    <priority>${options.priority}</priority>`);

	return `  <url>\n${parts.join('\n')}\n  </url>`;
}

export const GET: RequestHandler = async ({ url }) => {
	const origin = url.origin;

	// The three collections are read in parallel rather than in sequence: they are three
	// independent queries against the same connection pool, and nothing here needs one
	// collection's result to decide the next query.
	const collections = await Promise.all(
		COLLECTIONS.map(async (collection) => ({
			...collection,
			entries: await loadPublishedEntries(collection.kind),
		})),
	);

	const entries = [
		...STATIC_ROUTES.map((route) => urlEntry({ loc: `${origin}${route.path}`, ...route })),
		...collections.flatMap((collection) =>
			collection.entries.map((entry) =>
				urlEntry({
					loc: `${origin}${collection.prefix}/${entry.slug}`,
					lastmod: entry.updatedAt ?? entry.publishedAt,
					changefreq: collection.changefreq,
					priority: collection.priority,
				}),
			),
		),
	];

	const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>
`;

	return new Response(body, {
		headers: {
			'content-type': 'application/xml; charset=utf-8',
			// A shorter window than the pages themselves, because this is the one URL a crawler
			// fetches to discover what changed. Leaving it stale for the full five minutes
			// would mean a publish took that long to become discoverable, and the pages already
			// revalidate on their own.
			'cache-control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=600',
		},
	});
};
