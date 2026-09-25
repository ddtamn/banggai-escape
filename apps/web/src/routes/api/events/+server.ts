/**
 * The public analytics endpoint: the only way a data point can enter the dataset.
 *
 * It is public by necessity — the browser calls it — so it is built narrow rather than
 * guarded by a secret:
 *
 * - **POST only.** SvelteKit answers every other method with a 405, and because this route
 *   implements no `OPTIONS` it answers no preflight. That is the real access control: a
 *   cross-origin POST carrying `application/json` cannot be sent without a preflight, so a
 *   foreign page cannot reach this handler at all.
 * - **Two fields, allowlisted.** `event` must be one of the vocabulary's names and `path`
 *   must look like a URL path; an unknown key is a failure rather than an extra dimension.
 *   Everything the dashboard groups by — the content kind, the slug — is derived on the
 *   server from the path, so a caller has no dimension to lie about.
 * - **Nothing but counts.** No IP address, no user agent, no cookie, no referrer, no query
 *   string, no identifiers of any kind are read or stored. There is no session and no
 *   visitor id, which is why the dashboard counts page views and not people.
 * - **Small.** A page view is two short strings; anything larger is not one.
 *
 * Every refusal is a status code and nothing else — no echo of the input, no explanation —
 * and the client ignores the response either way, so analytics can never surface as an
 * error to a visitor.
 */

import { parseAnalyticsEvent } from '@banggai/content-model';
import type { RequestHandler } from '@sveltejs/kit';
import { recordEvent } from '$lib/server/analytics';

/** Room for the two fields with generous slack, and for nothing else. */
const MAX_BODY_BYTES = 1024;

export const POST: RequestHandler = async ({ request, url, platform }) => {
	if (!(request.headers.get('content-type') ?? '').startsWith('application/json')) {
		return new Response(null, { status: 415 });
	}

	if (!isSameOrigin(request, url)) {
		return new Response(null, { status: 403 });
	}

	const body = await readBody(request);

	if (body === undefined) {
		return new Response(null, { status: 400 });
	}

	const event = parseAnalyticsEvent(body);

	if (!event.success) {
		return new Response(null, { status: 400 });
	}

	recordEvent(platform, event.data);

	return new Response(null, { status: 204 });
};

/**
 * Whether this request came from our own pages.
 *
 * `Sec-Fetch-Site` is the signal to prefer: every current browser sends it, it is set by
 * the browser rather than by script, and a page on another origin cannot claim otherwise.
 * `Origin` is the fallback for a client that sends that and nothing else.
 *
 * A request with neither header is not a browser following a link — it is a script or a
 * command-line client, which could post here directly whatever this function decided. Such
 * a caller is allowed through, because refusing it would buy nothing; the allowlist and the
 * one-kilobyte body limit are what bound the damage it can do.
 */
function isSameOrigin(request: Request, url: URL): boolean {
	const site = request.headers.get('sec-fetch-site');

	if (site) return site === 'same-origin';

	const origin = request.headers.get('origin');

	return !origin || origin === url.origin;
}

/** The parsed body, or `undefined` when it is too large or not JSON. */
async function readBody(request: Request): Promise<unknown> {
	const declared = Number(request.headers.get('content-length'));

	if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return undefined;

	const raw = await request.text();

	if (raw.length > MAX_BODY_BYTES) return undefined;

	try {
		return JSON.parse(raw);
	} catch {
		return undefined;
	}
}
