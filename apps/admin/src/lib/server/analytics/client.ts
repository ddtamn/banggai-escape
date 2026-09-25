/**
 * The Cloudflare Analytics Engine SQL API client, server-only.
 *
 * The admin cannot read the dataset the way it reads everything else. Analytics Engine is
 * not in Neon and has no Drizzle adapter: it is queried over Cloudflare's SQL API, with a
 * bearer token that must never reach a browser. So this module lives under `$lib/server/`,
 * is imported only by a `+page.server.ts`, and the credential stays in the Worker's
 * environment.
 *
 * **A missing credential is a described state, not an error.** The site is not deployed
 * yet, so the token does not exist in every environment — and a page that says exactly
 * which variable to set is more useful than a stack trace, and much more useful than an
 * empty chart that looks like no one is visiting.
 *
 * With no bind parameters in this API, `runAnalyticsQuery()` will only ever be handed a
 * statement built by `queries.ts`. It takes no request input.
 */
import { env } from '$env/dynamic/private';

const sqlApiBase = 'https://api.cloudflare.com/client/v4/accounts';

/** Where the account id and token come from, for the message and the docs. */
const accountIdVariable = 'CLOUDFLARE_ACCOUNT_ID';
const tokenVariable = 'CLOUDFLARE_ANALYTICS_TOKEN';

export type AnalyticsAvailability =
	| { state: 'configured'; accountId: string; token: string }
	| { state: 'unconfigured'; missing: string[] };

/**
 * Whether this environment can query Analytics Engine at all.
 *
 * Read per call rather than at module scope: `$env/dynamic/private` is filled in per
 * request on Cloudflare, so a module-scope read would see nothing.
 */
export function analyticsAvailability(): AnalyticsAvailability {
	const accountId = env[accountIdVariable];
	const token = env[tokenVariable];

	if (!accountId || !token) {
		return {
			state: 'unconfigured',
			// Named individually rather than counted: "set these two" is actionable, and a
			// half-configured Worker is the likelier mistake than an empty one.
			missing: [...(accountId ? [] : [accountIdVariable]), ...(token ? [] : [tokenVariable])],
		};
	}

	return { state: 'configured', accountId, token };
}

/** An upstream failure, carrying enough to tell an operator what to fix. */
export class AnalyticsQueryError extends Error {
	readonly status: number;

	constructor(message: string, status: number) {
		super(message);
		this.name = 'AnalyticsQueryError';
		this.status = status;
	}
}

/**
 * Runs one query and returns its rows.
 *
 * The response format is the API's default (`FORMAT JSON`), an object of
 * `{ meta, data, rows }` where `data` is one object per row and **every value is a
 * string** — which is why `queries.ts` coerces rather than trusting a number to arrive as
 * one. `meta` is ignored: the column names are already known, because we wrote the query.
 *
 * Failures throw. There is no retry: the caller is a page load, and a refresh is the
 * retry. A rejected token is called out separately, because "the credential is wrong" and
 * "Cloudflare is having a bad day" are different conversations.
 */
export async function runAnalyticsQuery(
	sql: string,
	config: Extract<AnalyticsAvailability, { state: 'configured' }>,
): Promise<Record<string, unknown>[]> {
	const response = await fetch(`${sqlApiBase}/${config.accountId}/analytics_engine/sql`, {
		method: 'POST',
		headers: { authorization: `Bearer ${config.token}` },
		body: sql,
	});

	const body = await response.text();

	if (response.status === 401 || response.status === 403) {
		throw new AnalyticsQueryError(
			`Cloudflare refused the analytics token (${response.status}). It needs Account → Account Analytics → Read.`,
			response.status,
		);
	}

	if (!response.ok) {
		throw new AnalyticsQueryError(
			`The analytics query failed with ${response.status}: ${body.slice(0, 300)}`,
			response.status,
		);
	}

	let parsed: { data?: unknown };

	try {
		parsed = JSON.parse(body);
	} catch {
		throw new AnalyticsQueryError('The analytics API returned a body that is not JSON.', 200);
	}

	if (!Array.isArray(parsed.data)) {
		throw new AnalyticsQueryError('The analytics API returned no `data` array.', 200);
	}

	return parsed.data as Record<string, unknown>[];
}
