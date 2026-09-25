import { loadPublishedEntries } from '$lib/server/content';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const posts = await loadPublishedEntries('article');

	return { posts: posts.map((entry) => entry.payload) };
};
