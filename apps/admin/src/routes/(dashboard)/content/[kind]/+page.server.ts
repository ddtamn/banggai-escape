/**
 * The content list for one kind.
 *
 * One route parameterised by kind rather than three near-identical screens: the fields
 * differ, but listing, ordering, promoting and archiving do not, and three copies of this
 * is three places for the publish rules to drift.
 */
import { error, fail } from '@sveltejs/kit';
import { isContentKind, kindLabels } from '$lib/content/forms';
import {
	type ContentStatus,
	countByStatus,
	deleteEntry,
	listEntries,
	listRedirects,
	move,
	setArchived,
	setFeatured,
	statusLabels,
} from '$lib/server/content/service';
import type { Actions, PageServerLoad } from './$types';

const STATUSES: ContentStatus[] = ['draft', 'published', 'changed', 'archived'];

export const load: PageServerLoad = async ({ params, url }) => {
	if (!isContentKind(params.kind)) error(404, 'Unknown content kind.');

	const requested = url.searchParams.get('status');
	// A status filter that is not one of the four is ignored rather than 404'd: it is a
	// query string, and a stale bookmark should show the list, not an error.
	const status = STATUSES.includes(requested as ContentStatus)
		? (requested as ContentStatus)
		: ('all' as const);
	const search = url.searchParams.get('q')?.trim() ?? '';

	const [entries, counts, redirects] = await Promise.all([
		listEntries(params.kind, { status, search }),
		countByStatus(params.kind),
		listRedirects(params.kind),
	]);

	return {
		kind: params.kind,
		kindLabel: kindLabels[params.kind],
		status,
		search,
		entries,
		counts,
		redirects,
		labels: statusLabels(),
	};
};

/** The kind parameter, or a 404 — every action below needs it and none may guess. */
function kindOf(params: { kind: string }) {
	if (!isContentKind(params.kind)) error(404, 'Unknown content kind.');

	return params.kind;
}

/**
 * The submitted slug, required by every action here.
 *
 * Read once per action: `request.formData()` can only be consumed once, so an action that
 * also wanted the slug would have to take it from the body it already read.
 */
function slugOf(form: FormData): string | null {
	const slug = form.get('slug')?.toString();

	return slug && slug !== '' ? slug : null;
}

export const actions: Actions = {
	move: async ({ params, request }) => {
		const form = await request.formData();
		const slug = slugOf(form);

		if (!slug) return fail(400, { message: 'Missing slug.' });

		const direction = form.get('direction')?.toString() === 'up' ? 'up' : 'down';
		const moved = await move({ kind: kindOf(params), slug, direction });

		// The first item cannot move up and the last cannot move down; saying so is better
		// than a silent no-op the administrator will try again.
		return moved
			? { message: 'Order updated.' }
			: fail(409, { message: `Nothing to swap with ${direction === 'up' ? 'above' : 'below'}.` });
	},

	feature: async ({ params, request }) => {
		const form = await request.formData();
		const slug = slugOf(form);

		if (!slug) return fail(400, { message: 'Missing slug.' });

		const featured = form.get('featured')?.toString() === 'true';

		await setFeatured({ kind: kindOf(params), slug, featured });

		return { message: featured ? 'Featured.' : 'No longer featured.' };
	},

	archive: async ({ params, request }) => {
		const form = await request.formData();
		const slug = slugOf(form);

		if (!slug) return fail(400, { message: 'Missing slug.' });

		const archived = form.get('archived')?.toString() === 'true';

		await setArchived({ kind: kindOf(params), slug, archived });

		return {
			message: archived
				? 'Archived. It stays off the public site until it is restored.'
				: 'Restored.',
		};
	},

	delete: async ({ params, request }) => {
		const form = await request.formData();
		const slug = slugOf(form);

		if (!slug) return fail(400, { message: 'Missing slug.' });

		const result = await deleteEntry({ kind: kindOf(params), slug });

		if (!result.ok) return fail(409, { message: result.reason });

		return { message: 'Deleted, along with every revision.' };
	},
};
