import { loadPublishedEntries } from '$lib/server/content';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const destinations = await loadPublishedEntries('destination');

	return { destinations: destinations.map((entry) => entry.payload) };
};
