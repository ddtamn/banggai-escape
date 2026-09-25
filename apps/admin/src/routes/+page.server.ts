import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/** The admin has no public landing page: `/` belongs to the dashboard. */
export const load: PageServerLoad = () => {
	redirect(302, '/dashboard');
};
