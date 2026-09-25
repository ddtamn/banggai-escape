/**
 * One package, plus the two journeys the page cross-sells.
 *
 * The whole kind is read and the entry picked out of it even though the lookup could ask for
 * one row, because the related list needs the same rows: one query answers both, and the
 * siblings are already ordered by the admin.
 */
import { error, redirect } from '@sveltejs/kit';
import { loadPublishedEntries, resolveSlugRedirect } from '$lib/server/content';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const packages = await loadPublishedEntries('package');
	const entry = packages.find((candidate) => candidate.slug === params.slug);

	if (!entry) {
		// A slug that was published and renamed keeps working. Only once that is ruled out
		// is this genuinely a page that does not exist.
		const movedTo = await resolveSlugRedirect('package', params.slug);

		if (movedTo) redirect(301, `/packages/${movedTo}`);

		error(404, `We could not find a package called “${params.slug}”.`);
	}

	return {
		pkg: entry.payload,
		related: packages
			.filter((candidate) => candidate.slug !== params.slug)
			.slice(0, 2)
			.map((candidate) => candidate.payload),
	};
};
