/**
 * Resolving the redirects an editor's slug change left behind.
 *
 * A published page that is renamed keeps working: `saveDraft` records a `slug_redirects` row
 * from the slug that was published to the one it moved to, and `publish` records one when the
 * revision it writes carries a different slug from the last. Those rows are how an old URL a
 * visitor bookmarked, or that Google indexed, still lands somewhere real.
 *
 * Two things this function deliberately does not do:
 *
 * - **It does not check that the target is still published.** A redirect is only ever written
 *   towards a slug the entry owns, so a target that has since been unpublished or deleted
 *   means the content is genuinely gone, and a 404 two hops later is the right answer. Asking
 *   the content tables here would cost a second query on the path that is already the slow
 *   one, to replace an honest 404 with the same 404.
 * - **It does not report a redirect to the same slug it was given.** Renaming *back* to an
 *   old slug leaves the earlier row pointing at the slug now in use; treating that as a
 *   redirect would send a visitor to the page they are already on.
 */
import type { ContentKind } from '@banggai/content-model';
import { database } from '$lib/server/db';

/**
 * How far a chain is followed before it is treated as a loop. Only a slug renamed twice
 * produces a chain at all, so this is far beyond any real history and exists purely so a
 * corrupted table cannot make a request spin.
 */
const MAX_HOPS = 10;

/**
 * The slug a recorded redirect leads to, or null when nothing redirects away from this one.
 *
 * Chains are followed rather than taken one hop at a time, so a page renamed twice lands on
 * its current URL in a single 301 instead of a sequence the browser has to walk.
 */
export async function resolveSlugRedirect(kind: ContentKind, slug: string): Promise<string | null> {
	const rows = await database()`
		select from_slug, to_slug from slug_redirects where kind = ${kind}
	`;

	const next = new Map(rows.map((row) => [String(row.from_slug), String(row.to_slug)]));

	let current = slug;

	for (let hop = 0; hop < MAX_HOPS; hop++) {
		const target = next.get(current);

		// The end of the chain. Nothing moved, so there is no redirect to report.
		if (target === undefined) return current === slug ? null : current;

		// A row pointing at the slug in use, or a cycle back to where we started.
		if (target === slug || target === current) return null;

		current = target;
	}

	return null;
}
