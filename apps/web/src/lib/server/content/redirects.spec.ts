/**
 * Slug redirects.
 *
 * A page renamed twice leaves a chain, and the chain is what a 301 has to answer. These
 * cases were verified by hand in Phase 4 — a probe redirect 301s, a two-row chain collapses
 * to one hop, and a loop 404s — and a hand check is a check that stops being run.
 *
 * The database is stubbed rather than reached: `resolveSlugRedirect` opens the Neon client
 * when it is called, and importing this module must not be able to touch the network. The
 * same pattern as `authz.spec.ts` in the admin.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * The stub stands in for the Neon client.
 *
 * `database()` returns a tagged-template query function, so the mock has that shape: the
 * inner function takes the template and its interpolations and reads the kind out of them.
 * Reading the kind is what lets one test hold two kinds' rows at once and prove they stay
 * apart — a stub that returned the same rows whatever it was asked for could not check that,
 * and would be testing itself.
 */
vi.mock('$lib/server/db', () => ({
	database:
		() =>
		(_strings: TemplateStringsArray, ...values: unknown[]) =>
			Promise.resolve(query(String(values[0]))),
}));

/** Every row the stub will hand back, keyed by kind and then by the old slug. */
let rows: Record<string, Record<string, string>> = {};

function query(kind: string): { from_slug: unknown; to_slug: unknown }[] {
	return Object.entries(rows[kind] ?? {}).map(([from, to]) => ({ from_slug: from, to_slug: to }));
}

const { resolveSlugRedirect } = await import('./redirects');

afterEach(() => {
	rows = {};
});

/** Shorthand for one kind's redirect table, the shape the query returns. */
function redirects(kind: string, table: Record<string, string>) {
	rows = { ...rows, [kind]: table };
}

describe('resolveSlugRedirect', () => {
	it('reports nothing for a slug that was never renamed', async () => {
		redirects('package', {});

		expect(await resolveSlugRedirect('package', 'paisu-pok-lake')).toBeNull();
	});

	it('reports the new slug for a page that moved once', async () => {
		redirects('package', { 'banggai-discovery': 'untouched-banggai-discovery' });

		expect(await resolveSlugRedirect('package', 'banggai-discovery')).toBe(
			'untouched-banggai-discovery',
		);
	});

	it('follows a chain to where the page actually lives now', async () => {
		// A visitor holding the oldest URL gets one 301 to the current one, not a sequence
		// of hops the browser has to walk.
		redirects('package', { first: 'second', second: 'third' });

		expect(await resolveSlugRedirect('package', 'first')).toBe('third');
	});

	it('refuses to follow a loop back to the slug it was given', async () => {
		// Renaming a page and then renaming it *back* leaves exactly this: two rows pointing
		// at each other. The alternative is a request that spins until it gives up.
		redirects('package', { first: 'second', second: 'first' });

		expect(await resolveSlugRedirect('package', 'first')).toBeNull();
	});

	it('treats a row pointing at itself as no redirect at all', async () => {
		// Unreachable from the publish path — a redirect is only ever written towards a
		// different slug — so this is a guard against a corrupted table rather than a case
		// that happens. It must not report a redirect, and it must not spin.
		redirects('package', { stuck: 'stuck' });

		expect(await resolveSlugRedirect('package', 'stuck')).toBeNull();
	});

	it('gives up rather than following a chain longer than it should exist', async () => {
		// Only a slug renamed ten times produces this, so it stands in for a cycle that does
		// not include the starting slug.
		const chain = Object.fromEntries(
			Array.from({ length: 40 }, (_, index) => [`hop-${index}`, `hop-${index + 1}`]),
		);

		redirects('package', chain);

		expect(await resolveSlugRedirect('package', 'hop-0')).toBeNull();
	});

	it('keeps the kinds apart', async () => {
		// A package and a destination may hold the same slug, so the kind is part of the
		// lookup — a redirect recorded for one must not answer for the other.
		redirects('package', { shared: 'renamed' });
		redirects('destination', { shared: 'moved-elsewhere' });

		expect(await resolveSlugRedirect('package', 'shared')).toBe('renamed');
		expect(await resolveSlugRedirect('destination', 'shared')).toBe('moved-elsewhere');
		expect(await resolveSlugRedirect('article', 'shared')).toBeNull();
	});
});
