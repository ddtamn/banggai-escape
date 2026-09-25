import { redirect } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import type { RequestHandler } from './$types';

/**
 * A POST endpoint rather than a page action, so the shell's sign-out form works from
 * every route in the group without each page having to define the action.
 *
 * No guard is needed: signing out an already-signed-out visitor is a no-op, and the
 * redirect target is public.
 */
export const POST: RequestHandler = async (event) => {
	await auth.api.signOut({ headers: event.request.headers });

	redirect(303, '/login');
};
