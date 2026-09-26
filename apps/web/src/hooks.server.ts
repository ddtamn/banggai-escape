/**
 * The freshness policy: how long a rendered page may be served from the edge.
 *
 * The mechanism is the platform's, not ours. `@sveltejs/adapter-cloudflare` generates a Worker
 * that looks every request up in the Workers cache and stores the response only when it
 * carries a `Cache-Control` header and a cacheable status — so the whole policy is expressed
 * by setting that one header. Reaching for the Cache API here instead would be a second cache
 * competing with the adapter's, with its own key and its own way of going wrong.
 *
 * What that buys: a page is rendered from Neon on the first request and then held for five
 * minutes, so an editor's publish reaches the public site within that window with no build,
 * no deploy and nothing to purge by hand. `s-maxage` is the edge's expiry and is the value
 * Cloudflare reads; `max-age=0` keeps the browser asking, so a tab can never hold a page
 * longer than the edge does.
 *
 * Three responses are deliberately left without the header, and therefore uncached:
 *
 * - **Anything that is not a document a browser navigated to.** SvelteKit's client-side
 *   navigation fetches the same route as `__data.json` with a `_routes` parameter describing
 *   which layouts the browser already has, so two requests for one path can legitimately
 *   differ. Leaving those alone keeps that machinery out of the cache's way, and has the
 *   useful side effect that clicking around the site always shows the newest content.
 * - **A redirect or an error.** A 301 is never stored, because the admin can repoint one at a
 *   newer slug; an error is never stored, because a transient failure should not be pinned in
 *   front of every visitor for five minutes.
 * - **Nothing at all in `vite dev`**, which has no edge and no patience: a page served from a
 *   five-minute-old cache while a component is being edited looks like a broken build.
 */

import type { Handle, RequestEvent } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { dev } from '$app/environment';

/** How long a rendered page may be served from the edge before Neon is read again. */
const CACHE_SECONDS = 300;

/**
 * How long a page past its freshness may still be handed over while it refreshes in the
 * background. Twice the freshness window: enough to cover a cold Worker start or a slow
 * database, short enough that the site is never two publishes behind.
 */
const STALE_SECONDS = CACHE_SECONDS * 2;

export const handleCaching: Handle = async ({ event, resolve }) => {
	if (dev || !isDocumentRequest(event)) return resolve(event);

	const response = await resolve(event);

	if (response.status !== 200 || response.headers.has('set-cookie')) return response;

	response.headers.set(
		'cache-control',
		`public, max-age=0, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=${STALE_SECONDS}`,
	);

	return response;
};

/**
 * The headers a browser has no reason to guess and no way to protect itself without.
 *
 * `Content-Security-Policy` is deliberately *not* here: SvelteKit emits a ~40 KB inline
 * hydration script, and only the framework can nonce it correctly. It is configured in
 * `vite.config.ts` under `sveltekit({ csp })`, which is the only place that can do it
 * without the policy either breaking the site or being useless.
 */
const handleSecurityHeaders: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);

	// HSTS is only honoured over HTTPS, and sending it on a dev origin would poison the
	// localhost cache in the browser for as long as `max-age` says.
	if (!dev) {
		response.headers.set('strict-transport-security', 'max-age=31536000; includeSubDomains');
	}

	// The site serves images, styles and scripts. It never serves a document of an
	// unexpected type, so nothing should ever be sniffed into one.
	response.headers.set('x-content-type-options', 'nosniff');

	/**
	 * `strict-origin-when-cross-origin` keeps the full path and query on same-origin
	 * navigations — which is what a campaign landing page needs — while sending only the
	 * origin to WhatsApp, so an enquiry link cannot leak the referring page.
	 */
	response.headers.set('referrer-policy', 'strict-origin-when-cross-origin');

	// The site asks for no device capability. Saying so up front means a future embed
	// cannot quietly start using one without this line being revisited.
	response.headers.set(
		'permissions-policy',
		'camera=(), microphone=(), geolocation=(), interest-cohort=()',
	);

	// Cross-Origin-Resource-Policy: the media host is a separate origin, so its own
	// responses need to opt in explicitly for `<img>` to keep working. Same-origin by
	// default is the safe value; this Worker only ever serves its own documents.
	response.headers.set('cross-origin-resource-policy', 'same-origin');

	return response;
};

/**
 * Composed once, so the order is stated rather than implied: security headers wrap the
 * caching decision, which means the cache-control header set on the way out is the one
 * that gets sent.
 */
export const handle = sequence(handleSecurityHeaders, handleCaching);

/**
 * Whether this is a page a browser navigated to, rather than one of SvelteKit's own data
 * fetches or a static asset. A navigation asks for HTML; the router's `fetch()` does not.
 */
function isDocumentRequest(event: RequestEvent): boolean {
	if (event.request.method !== 'GET') return false;

	return (event.request.headers.get('accept') ?? '').includes('text/html');
}
