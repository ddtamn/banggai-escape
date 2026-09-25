import { error, redirect } from '@sveltejs/kit';
import { isAdministrator } from '$lib/server/authz';
import type { LayoutServerLoad } from './$types';

/**
 * Every route in this group is private. Hiding navigation is not access control, so
 * the guard lives here and runs on the server for every request in the group.
 *
 * Two distinct answers, deliberately: no session at all is a redirect to sign-in, while
 * a signed-in user who is not an administrator is a 403. Sending the second case to the
 * login form would invite them to try again with credentials that will never work.
 */
export const load: LayoutServerLoad = async (event) => {
	const { user } = event.locals;

	if (!user) {
		const redirectTo = event.url.pathname + event.url.search;

		redirect(302, `/login?redirectTo=${encodeURIComponent(redirectTo)}`);
	}

	if (!(await isAdministrator(user.id))) {
		error(403, 'That account is not an authorised administrator.');
	}

	return { user };
};
