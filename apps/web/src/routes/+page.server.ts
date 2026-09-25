/**
 * The home page's content.
 *
 * Selection happens here rather than in the component, because *which* items appear is a
 * content decision: the four packages are the first four the admin ordered, and the four
 * destinations are named. The component renders what it is handed.
 *
 * The featured destinations are looked up by slug, so one that has been archived or
 * unpublished drops out of the row instead of leaving a hole. They are also kept in the order
 * named here rather than in `sort_order` — the home page's mosaic pairs them left-to-right,
 * and that pairing is the reason the list is written out.
 */

import { loadPublishedEntries } from '$lib/server/content';
import type { PageServerLoad } from './$types';

const curatedSlugs = ['paisu-pok-lake', 'pulau-dua', 'piala-waterfall', 'mokokawa-waterfall'];

export const load: PageServerLoad = async () => {
	const [packages, destinations, posts] = await Promise.all([
		loadPublishedEntries('package'),
		loadPublishedEntries('destination'),
		loadPublishedEntries('article'),
	]);

	const bySlug = new Map(destinations.map((entry) => [entry.slug, entry.payload]));

	return {
		packages: packages.slice(0, 4).map((entry) => entry.payload),
		destinations: curatedSlugs.flatMap((slug) => bySlug.get(slug) ?? []),
		posts: posts.slice(0, 3).map((entry) => entry.payload),
	};
};
