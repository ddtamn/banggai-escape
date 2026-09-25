import { error } from '@sveltejs/kit';
import { getPackage } from '$lib/data/packages';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
	const pkg = getPackage(params.slug);

	if (!pkg) {
		error(404, `We could not find a package called “${params.slug}”.`);
	}

	return { pkg };
};
