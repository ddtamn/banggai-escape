/**
 * Specs for the SQL API client and the dashboard assembly.
 *
 * The real thing cannot be exercised from here — that needs a Cloudflare token and a
 * deployed Worker — so what is pinned instead is everything a broken deployment would get
 * wrong: which endpoint and which credential a query uses, how the API's answers are read,
 * and the fact that **no credential is a described state rather than a crash**, because
 * that is what the operator of an undeployed admin actually sees.
 *
 * `$env/dynamic/private` is replaced with a mutable object: the module reads the
 * environment per call, so the same fake can be empty in one test and configured in the
 * next.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { fakeEnv } = vi.hoisted(() => ({ fakeEnv: {} as Record<string, string | undefined> }));

vi.mock('$env/dynamic/private', () => ({ env: fakeEnv }));

const { AnalyticsQueryError, analyticsAvailability, runAnalyticsQuery } = await import('./client');
const { eventTotal, loadAnalyticsView } = await import('./service');

const ACCOUNT = 'acct_1234';
const TOKEN = 'secret-analytics-token';

/** The endpoint, spelled out, so a change to it fails here rather than in production. */
const sqlEndpoint = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/analytics_engine/sql`;

/** Just enough of `Response` for the client: a status, and a body that arrives as text. */
const reply = (body: string, status = 200): Response =>
	({ status, ok: status >= 200 && status < 300, text: async () => body }) as Response;

/** The API's default format: `{ meta, data, rows }`. */
const rows = (data: unknown[]) => reply(JSON.stringify({ meta: [], data, rows: data.length }));

const configured = { state: 'configured', accountId: ACCOUNT, token: TOKEN } as const;

/** A UTC day, `offset` days before today — the buckets the chart fills are UTC as well. */
const utcDay = (offset: number) =>
	new Date(Date.now() - offset * 86_400_000).toISOString().slice(0, 10);

beforeEach(() => {
	fakeEnv.CLOUDFLARE_ACCOUNT_ID = ACCOUNT;
	fakeEnv.CLOUDFLARE_ANALYTICS_TOKEN = TOKEN;
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('analyticsAvailability', () => {
	it('reports configured once both variables are set', () => {
		expect(analyticsAvailability()).toEqual({
			state: 'configured',
			accountId: ACCOUNT,
			token: TOKEN,
		});
	});

	it('names every missing variable rather than just counting them', () => {
		delete fakeEnv.CLOUDFLARE_ACCOUNT_ID;
		delete fakeEnv.CLOUDFLARE_ANALYTICS_TOKEN;

		expect(analyticsAvailability()).toEqual({
			state: 'unconfigured',
			missing: ['CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_ANALYTICS_TOKEN'],
		});
	});

	it('names only the half that is missing, because a half-set Worker is the likelier slip', () => {
		delete fakeEnv.CLOUDFLARE_ANALYTICS_TOKEN;
		expect(analyticsAvailability()).toEqual({
			state: 'unconfigured',
			missing: ['CLOUDFLARE_ANALYTICS_TOKEN'],
		});

		delete fakeEnv.CLOUDFLARE_ACCOUNT_ID;
		fakeEnv.CLOUDFLARE_ANALYTICS_TOKEN = TOKEN;
		expect(analyticsAvailability()).toEqual({
			state: 'unconfigured',
			missing: ['CLOUDFLARE_ACCOUNT_ID'],
		});
	});

	it('treats an empty variable as unset', () => {
		fakeEnv.CLOUDFLARE_ANALYTICS_TOKEN = '';

		expect(analyticsAvailability()).toEqual({
			state: 'unconfigured',
			missing: ['CLOUDFLARE_ANALYTICS_TOKEN'],
		});
	});
});

describe('runAnalyticsQuery', () => {
	it('posts the statement to the account endpoint, with the token as a bearer', async () => {
		const fetchMock = vi.fn(async () => rows([{ event: 'page_view', count: '12' }]));
		vi.stubGlobal('fetch', fetchMock);

		await runAnalyticsQuery('SELECT blob1 AS event FROM BANGGAI_SITE_EVENTS', configured);

		expect(fetchMock).toHaveBeenCalledWith(sqlEndpoint, {
			method: 'POST',
			headers: { authorization: `Bearer ${TOKEN}` },
			body: 'SELECT blob1 AS event FROM BANGGAI_SITE_EVENTS',
		});
	});

	it('returns the `data` array, one object per row', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () =>
				rows([
					{ day: '2026-03-10', views: '3' },
					{ day: '2026-03-11', views: '4' },
				]),
			),
		);

		const result = await runAnalyticsQuery('SELECT 1', configured);

		expect(result).toEqual([
			{ day: '2026-03-10', views: '3' },
			{ day: '2026-03-11', views: '4' },
		]);
	});

	it('calls out a rejected credential, and never echoes the token back', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => reply('Unauthorized', 403)),
		);

		const error = await runAnalyticsQuery('SELECT 1', configured).catch((thrown) => thrown);

		expect(error).toBeInstanceOf(AnalyticsQueryError);
		expect(error.status).toBe(403);
		expect(error.message).toContain('Account Analytics');
		// The message is rendered on a page, so the credential must not be in it.
		expect(error.message).not.toContain(TOKEN);
	});

	it('reports a server failure with its status and an excerpt of the body', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => reply('dataset not found', 500)),
		);

		const error = await runAnalyticsQuery('SELECT 1', configured).catch((thrown) => thrown);

		expect(error.status).toBe(500);
		expect(error.message).toContain('500');
		expect(error.message).toContain('dataset not found');
	});

	it('refuses a body that is not JSON', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => reply('<html>bad gateway</html>')),
		);

		await expect(runAnalyticsQuery('SELECT 1', configured)).rejects.toThrow(/not JSON/);
	});

	it('refuses a JSON body with no `data` array', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => reply(JSON.stringify({ meta: [], rows: 0 }))),
		);

		await expect(runAnalyticsQuery('SELECT 1', configured)).rejects.toThrow(/no `data` array/);
	});
});

describe('eventTotal', () => {
	it('reads one event out of the totals', () => {
		const summary = { eventTotals: [{ event: 'page_view', count: 41 }] };

		expect(eventTotal(summary, 'page_view')).toBe(41);
	});

	it('is zero for an event the window holds none of', () => {
		// A missing row is a real zero — nothing was recorded — unlike a row that cannot be
		// read, which `queries.ts` throws on.
		expect(eventTotal({ eventTotals: [] }, 'booking_cta_click')).toBe(0);
	});
});

describe('loadAnalyticsView', () => {
	/** Answers each of the five queries with a row that suits it. */
	const stubSqlApi = () =>
		vi.stubGlobal(
			'fetch',
			vi.fn(async (_url: string, init: { body: string }) => {
				const sql = init.body;

				if (sql.includes('AS day')) {
					// Today and yesterday: a fixed date would fall outside every window as the clock
					// moves on, and `fillMissingDays` would rightly drop it.
					return rows([
						{ day: utcDay(0), views: '41' },
						{ day: utcDay(1), views: '9' },
					]);
				}
				if (sql.includes('blob3 AS kind')) {
					return rows([{ kind: 'package', slug: 'untouched-banggai-discovery', views: '7' }]);
				}
				if (sql.includes("blob1 != 'page_view'")) {
					return rows([{ event: 'contact_click', path: '/contact', count: '2' }]);
				}
				if (sql.includes('blob2 AS path')) {
					return rows([{ path: '/packages', views: '12' }]);
				}

				return rows([
					{ event: 'page_view', count: '41' },
					{ event: 'contact_click', count: '2' },
				]);
			}),
		);

	it('describes the unconfigured state instead of failing, and makes no request', async () => {
		delete fakeEnv.CLOUDFLARE_ACCOUNT_ID;
		delete fakeEnv.CLOUDFLARE_ANALYTICS_TOKEN;

		const fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);

		const view = await loadAnalyticsView(30);

		expect(view).toEqual({
			state: 'unconfigured',
			missing: ['CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_ANALYTICS_TOKEN'],
		});
		// Nothing to send, so nothing is sent: no half-authenticated request is attempted.
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('assembles the summary from the five queries, run together', async () => {
		stubSqlApi();

		const view = await loadAnalyticsView(30, configured);

		expect(view.state).toBe('ready');
		if (view.state !== 'ready') return;

		const { summary } = view;
		expect(fetch).toHaveBeenCalledTimes(5);
		expect(summary.range).toBe(30);
		expect(summary.totals).toEqual({ pageViews: 41, bookingCtaClicks: 0, contactClicks: 2 });
		expect(summary.topPages).toEqual([{ path: '/packages', views: 12 }]);
		expect(summary.contentViews).toEqual([
			{ kind: 'package', slug: 'untouched-banggai-discovery', views: 7 },
		]);
		expect(summary.ctaClicks).toEqual([{ event: 'contact_click', path: '/contact', count: 2 }]);
		expect(Number.isNaN(Date.parse(summary.readAt))).toBe(false);
	});

	it('charts a continuous window, with the quiet days filled in', async () => {
		stubSqlApi();

		const view = await loadAnalyticsView(7, configured);
		if (view.state !== 'ready') throw new Error(`expected a summary, got ${view.state}`);

		const { dailyViews } = view.summary;
		expect(dailyViews).toHaveLength(7);
		// The two days the API returned, and five days of nothing — a chart that dropped the
		// empty days would draw two bars a week apart as if they were adjacent.
		expect(dailyViews.filter((day) => day.views > 0)).toHaveLength(2);
		expect(
			dailyViews.every((day, index) => index === 0 || day.day > dailyViews[index - 1].day),
		).toBe(true);
	});

	it('turns a refused credential into a message on the page', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => reply('Unauthorized', 401)),
		);

		const view = await loadAnalyticsView(30, configured);

		expect(view.state).toBe('error');
		if (view.state !== 'error') return;
		expect(view.message).toContain('Account Analytics');
	});

	it('does not leak an unexpected failure into the page', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => {
				throw new Error('socket hang up: internal-thing');
			}),
		);

		const view = await loadAnalyticsView(30, configured);

		expect(view.state).toBe('error');
		if (view.state !== 'error') return;
		expect(view.message).not.toContain('internal-thing');
		expect(view.message).toContain('Worker log');
	});
});
