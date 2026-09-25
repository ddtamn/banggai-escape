import { afterEach, describe, expect, it, vi } from 'vitest';

// The lookup is injected in every test below, so the real client is never constructed —
// stub the module so importing this file cannot touch the environment or Neon.
vi.mock('$lib/server/db', () => ({ db: {} }));

const { isAdministrator, safeRedirectTo } = await import('./authz');

afterEach(() => {
	vi.restoreAllMocks();
});

describe('isAdministrator', () => {
	it('denies a missing or blank user id without querying', async () => {
		const lookup = vi.fn(async () => true);

		expect(await isAdministrator(undefined, lookup)).toBe(false);
		expect(await isAdministrator(null, lookup)).toBe(false);
		expect(await isAdministrator('', lookup)).toBe(false);
		expect(lookup).not.toHaveBeenCalled();
	});

	it('grants a user the table lists', async () => {
		const lookup = vi.fn(async () => true);

		expect(await isAdministrator('user-1', lookup)).toBe(true);
		expect(lookup).toHaveBeenCalledWith('user-1');
	});

	it('denies a signed-in user who is not listed', async () => {
		expect(await isAdministrator('user-2', async () => false)).toBe(false);
	});

	it('fails closed when the lookup throws', async () => {
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

		expect(
			await isAdministrator('user-1', async () => {
				throw new Error('connection refused');
			}),
		).toBe(false);
		// The log line is the only signal that distinguishes an outage from a revoked account.
		expect(consoleError).toHaveBeenCalledWith(
			'Administrator lookup failed; denying access.',
			expect.any(Error),
		);
	});
});

describe('safeRedirectTo', () => {
	it('keeps a same-origin absolute path', () => {
		expect(safeRedirectTo('/packages?page=2')).toBe('/packages?page=2');
	});

	it('falls back for anything that could leave the origin', () => {
		expect(safeRedirectTo('https://evil.example')).toBe('/dashboard');
		expect(safeRedirectTo('//evil.example')).toBe('/dashboard');
		expect(safeRedirectTo('/\\evil.example')).toBe('/dashboard');
		expect(safeRedirectTo('packages')).toBe('/dashboard');
	});

	it('falls back for an absent value', () => {
		expect(safeRedirectTo(null)).toBe('/dashboard');
		expect(safeRedirectTo(undefined)).toBe('/dashboard');
		expect(safeRedirectTo('')).toBe('/dashboard');
	});

	it('honours a custom fallback', () => {
		expect(safeRedirectTo(null, '/login')).toBe('/login');
	});
});
