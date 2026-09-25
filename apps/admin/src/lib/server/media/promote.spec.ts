import { afterEach, describe, expect, it, vi } from 'vitest';

// `promote` imports the drizzle client at module scope. Nothing below reaches it — every
// test injects its own fake — but stub the module so importing this file cannot build a
// real client or read the environment.
vi.mock('$lib/server/db', () => ({ db: {} }));

const { assertRemoteUrl, isPromotable, promoteLegacyAssets } = await import('./promote');

type PromoteInput = Parameters<typeof promoteLegacyAssets>[0];

afterEach(() => {
	vi.unstubAllGlobals();
});

/**
 * A real PNG header: signature, IHDR length and type, then a 2×3 image. Its dimensions are
 * readable, so a test can prove the row was filled in from the bytes rather than guessed.
 */
const PNG = new Uint8Array([
	0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
	0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00, 0x03,
]);

const LEGACY = {
	id: '11111111-1111-4111-8111-111111111111',
	externalUrl: 'https://legacy.test/a.png',
	objectKey: null,
	originalName: 'a.png',
};

const OWNED = {
	id: '22222222-2222-4222-8222-222222222222',
	externalUrl: null,
	objectKey: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.png',
	originalName: 'b.png',
};

/**
 * A fetch response, duck-typed rather than built with `new Response`.
 *
 * A constructed `Response` has an empty `url`, because its url is set by `fetch` — and this
 * module re-checks the final URL after following redirects. Modelling the response by hand
 * is what makes that check testable, including a redirect that lands somewhere it should not.
 */
function fakeResponse(
	options: { url?: string; body?: Uint8Array | string; status?: number; contentType?: string } = {},
) {
	const body = options.body ?? PNG;
	const bytes = typeof body === 'string' ? new TextEncoder().encode(body) : body;

	return {
		ok: (options.status ?? 200) < 400,
		status: options.status ?? 200,
		url: options.url ?? 'https://legacy.test/a.png',
		headers: new Headers({ 'content-type': options.contentType ?? 'image/png' }),
		arrayBuffer: async () => bytes.buffer,
	};
}

/** A drizzle client that answers the two queries this module makes, and records the writes. */
function fakeDb(rows: unknown[], options: { remaining?: number; failUpdate?: boolean } = {}) {
	const updates: Record<string, unknown>[] = [];

	return {
		updates,
		db: {
			select: (fields: Record<string, unknown>) => ({
				from: () => ({
					// `countLegacy` selects a count and destructures one row; the row query
					// selects columns and is filtered in JavaScript by `isPromotable`.
					where: async () => ('count' in fields ? [{ count: options.remaining ?? 0 }] : rows),
				}),
			}),
			update: () => ({
				set: (values: Record<string, unknown>) => ({
					where: async () => {
						if (options.failUpdate) throw new Error('database is down');

						updates.push(values);
					},
				}),
			}),
		} as unknown as PromoteInput['db'],
	};
}

function fakeBucket() {
	const puts: { key: string; customMetadata: Record<string, string> }[] = [];
	const deleted: string[] = [];

	return {
		puts,
		deleted,
		bucket: {
			put: async (
				key: string,
				_bytes: Uint8Array,
				options: { customMetadata: Record<string, string> },
			) => {
				puts.push({ key, customMetadata: options.customMetadata });
			},
			delete: async (key: string) => {
				deleted.push(key);
			},
		} as unknown as R2Bucket,
	};
}

describe('isPromotable', () => {
	it('accepts only a row that is external and has nothing in the bucket', () => {
		expect(isPromotable(LEGACY)).toBe(true);
		expect(isPromotable(OWNED)).toBe(false);
		expect(isPromotable({ externalUrl: null, objectKey: null })).toBe(false);
		expect(isPromotable({ externalUrl: 'https://x.test/a.png', objectKey: 'a.png' })).toBe(false);
	});
});

describe('assertRemoteUrl', () => {
	it('accepts a public https URL', () => {
		expect(assertRemoteUrl('https://lh3.googleusercontent.com/aida-public/abc=w1200')).toBe(
			'https://lh3.googleusercontent.com/aida-public/abc=w1200',
		);
	});

	it('refuses anything that is not https', () => {
		expect(() => assertRemoteUrl('http://legacy.test/a.png')).toThrow(/only https/);
		expect(() => assertRemoteUrl('file:///etc/passwd')).toThrow(/only https/);
	});

	it('refuses an address rather than a hostname', () => {
		// The server makes this request from a value in the database, which is the shape of
		// an SSRF bug — so loopback, link-local, and private ranges are refused by rule.
		expect(() => assertRemoteUrl('https://127.0.0.1/a.png')).toThrow(/address/);
		expect(() => assertRemoteUrl('https://169.254.169.254/latest/meta-data')).toThrow(/address/);
		expect(() => assertRemoteUrl('https://[::1]/a.png')).toThrow(/address/);
	});

	it('refuses an internal hostname or a non-URL', () => {
		expect(() => assertRemoteUrl('https://localhost/a.png')).toThrow(/internal/);
		expect(() => assertRemoteUrl('https://cache.internal/a.png')).toThrow(/internal/);
		expect(() => assertRemoteUrl('not a url')).toThrow(/not a URL/);
	});
});

describe('promoteLegacyAssets', () => {
	it('copies an eligible row, then points the row at the bucket', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => fakeResponse()),
		);

		const { puts, bucket } = fakeBucket();
		const { db, updates } = fakeDb([LEGACY], { remaining: 27 });

		const report = await promoteLegacyAssets({ bucket, db });

		expect(report.outcomes).toHaveLength(1);
		expect(report.outcomes[0].detail).toMatch(/image\/png/);
		expect(report.outcomes[0].ok).toBe(true);
		expect(report.remaining).toBe(27);

		expect(puts).toHaveLength(1);
		expect(puts[0].key).toMatch(/^[0-9a-f-]{36}\.png$/);
		// Provenance goes on the object, because the row may hold a key or a URL but not both.
		expect(puts[0].customMetadata.promotedFrom).toBe(LEGACY.externalUrl);

		expect(updates).toEqual([
			{
				objectKey: puts[0].key,
				externalUrl: null,
				mimeType: 'image/png',
				byteSize: PNG.byteLength,
				width: 2,
				height: 3,
			},
		]);
	});

	it('skips a row whose bytes are already in the bucket', async () => {
		const fetch_ = vi.fn(async () => fakeResponse());
		vi.stubGlobal('fetch', fetch_);

		const { puts, bucket } = fakeBucket();
		const { db, updates } = fakeDb([LEGACY, OWNED]);

		const report = await promoteLegacyAssets({ bucket, db });

		expect(report.outcomes).toHaveLength(1);
		expect(report.outcomes[0].ok).toBe(true);
		expect(report.outcomes[0].id).toBe(LEGACY.id);
		expect(fetch_).toHaveBeenCalledTimes(1);
		expect(puts).toHaveLength(1);
		expect(updates).toHaveLength(1);
	});

	it('reports one dead host without abandoning the batch', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async (url: string | URL) =>
				String(url).includes('gone') ? fakeResponse({ status: 404 }) : fakeResponse(),
			),
		);

		const { bucket } = fakeBucket();
		const gone = { ...LEGACY, externalUrl: 'https://legacy.test/gone.png' };
		const { db, updates } = fakeDb([gone, LEGACY]);

		const report = await promoteLegacyAssets({ bucket, db });

		expect(report.outcomes.map((outcome) => outcome.ok)).toEqual([false, true]);
		expect(report.outcomes[0].detail).toMatch(/404/);
		expect(updates).toHaveLength(1);
	});

	it('refuses bytes that are not an accepted image, and writes nothing', async () => {
		// What a host returning an HTML error page looks like: the signature check is what
		// keeps that out of the bucket, on a path where nothing is trusted.
		vi.stubGlobal(
			'fetch',
			vi.fn(async () =>
				fakeResponse({ body: '<html>not an image</html>', contentType: 'text/html' }),
			),
		);

		const { puts, bucket } = fakeBucket();
		const { db, updates } = fakeDb([LEGACY]);

		const report = await promoteLegacyAssets({ bucket, db });

		expect(report.outcomes[0].ok).toBe(false);
		expect(report.outcomes[0].detail).toMatch(/Unsupported image format/);
		expect(puts).toHaveLength(0);
		expect(updates).toHaveLength(0);
	});

	it('re-checks a redirect, because what answered is not what was asked for', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => fakeResponse({ url: 'https://169.254.169.254/latest/meta-data' })),
		);

		const { puts, bucket } = fakeBucket();
		const { db, updates } = fakeDb([LEGACY]);

		const report = await promoteLegacyAssets({ bucket, db });

		expect(report.outcomes[0].ok).toBe(false);
		expect(report.outcomes[0].detail).toMatch(/address/);
		expect(puts).toHaveLength(0);
		expect(updates).toHaveLength(0);
	});

	it('removes the object again when the row cannot be updated', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => fakeResponse()),
		);

		const { puts, deleted, bucket } = fakeBucket();
		const { db } = fakeDb([LEGACY], { failUpdate: true });

		const report = await promoteLegacyAssets({ bucket, db });

		expect(report.outcomes[0].ok).toBe(false);
		expect(report.outcomes[0].detail).toMatch(/database is down/);
		expect(deleted).toEqual([puts[0].key]);
	});

	it('reports a missing binding instead of throwing', async () => {
		const { db } = fakeDb([]);

		const report = await promoteLegacyAssets({ bucket: undefined, db });

		expect(report.outcomes[0].ok).toBe(false);
		expect(report.outcomes[0].detail).toMatch(/not bound/);
	});
});
