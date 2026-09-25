import { error } from '@sveltejs/kit';
import { getDestination } from '$lib/data/destinations';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
	const destination = getDestination(params.slug);

	if (!destination) {
		error(404, `We could not find a destination called “${params.slug}”.`);
	}

	return { destination };
};
