/**
 * One destination, its photo mosaic, and the packages to cross-sell.
 *
 * The mosaic is built here rather than in the component because it is a set operation over
 * two lists: the destination's own gallery, followed by every destination's card image, with
 * duplicates removed. Now that both sides are resolved to the same kind of image,
 * de-duplication works by `src` — the gallery of a lake page shows other destinations'
 * photographs, and the filter is what stops the same photograph appearing twice in six tiles.
 *
 * It compares URLs rather than the images themselves because the same asset legitimately
 * appears in more than one list, and two references to it are two objects.
 */
import { error, redirect } from '@sveltejs/kit';
import { loadPublishedEntries, resolveSlugRedirect } from '$lib/server/content';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const [destinations, packages] = await Promise.all([
		loadPublishedEntries('destination'),
		loadPublishedEntries('package'),
	]);

	const entry = destinations.find((candidate) => candidate.slug === params.slug);

	if (!entry) {
		const movedTo = await resolveSlugRedirect('destination', params.slug);

		if (movedTo) redirect(301, `/destinations/${movedTo}`);

		error(404, `We could not find a destination called “${params.slug}”.`);
	}

	const seen = new Set<string>();
	const mosaic = [
		entry.payload.image,
		...entry.payload.gallery,
		...destinations.map((item) => item.payload.image),
	]
		.filter((image) => {
			if (seen.has(image.src)) return false;

			seen.add(image.src);

			return true;
		})
		.slice(0, 6);

	return {
		destination: entry.payload,
		mosaic,
		related: packages.slice(0, 3).map((item) => item.payload),
	};
};
