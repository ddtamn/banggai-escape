import { error } from '@sveltejs/kit';
import { getPost } from '$lib/data/posts';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
	const post = getPost(params.slug);

	if (!post) {
		error(404, `We could not find an article called “${params.slug}”.`);
	}

	return { post };
};
