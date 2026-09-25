/**
 * One article, the three to read next, and the package the sidebar promotes.
 *
 * The popular package is the first one the admin ordered. It can legitimately be absent — a
 * site with nothing published under Packages is a valid state — so it is returned as null and
 * the sidebar simply omits the card, rather than the article failing to render.
 */
import { error, redirect } from '@sveltejs/kit';
import { loadPublishedEntries, resolveSlugRedirect } from '$lib/server/content';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const [posts, packages] = await Promise.all([
		loadPublishedEntries('article'),
		loadPublishedEntries('package'),
	]);

	const entry = posts.find((candidate) => candidate.slug === params.slug);

	if (!entry) {
		const movedTo = await resolveSlugRedirect('article', params.slug);

		if (movedTo) redirect(301, `/blog/${movedTo}`);

		error(404, `We could not find an article called “${params.slug}”.`);
	}

	return {
		post: entry.payload,
		related: posts
			.filter((candidate) => candidate.slug !== params.slug)
			.slice(0, 3)
			.map((candidate) => candidate.payload),
		popular: packages[0]?.payload ?? null,
	};
};
