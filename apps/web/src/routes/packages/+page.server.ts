import { loadPublishedEntries } from '$lib/server/content';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const packages = await loadPublishedEntries('package');

	return { packages: packages.map((entry) => entry.payload) };
};
