import { fail, redirect } from '@sveltejs/kit';
import { APIError } from 'better-auth/api';
import { eq } from 'drizzle-orm';
import { auth } from '$lib/server/auth';
import { isAdministrator, safeRedirectTo } from '$lib/server/authz';
import { db } from '$lib/server/db';
import { session } from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const redirectTo = safeRedirectTo(event.url.searchParams.get('redirectTo'));

	// Already signed in as an administrator? Do not show the form again.
	if (event.locals.user && (await isAdministrator(event.locals.user.id))) {
		redirect(302, redirectTo);
	}

	return { redirectTo };
};

export const actions: Actions = {
	default: async (event) => {
		const formData = await event.request.formData();
		const email = String(formData.get('email') ?? '').trim();
		const password = String(formData.get('password') ?? '');
		const redirectTo = safeRedirectTo(String(formData.get('redirectTo') ?? ''));

		if (!email || !password) {
			return fail(400, { email, message: 'Enter both your email and your password.' });
		}

		let userId: string;

		try {
			const result = await auth.api.signInEmail({ body: { email, password } });
			userId = result.user.id;
		} catch (error) {
			if (error instanceof APIError) {
				// Deliberately vague: do not confirm whether the account exists.
				return fail(400, { email, message: 'Those credentials were not accepted.' });
			}

			throw error;
		}

		// Authentication succeeded, but authorization is a separate question and a valid
		// session is not authority. Refuse the account here rather than letting it reach
		// the dashboard guard, so the reason is shown against the form the user just used.
		if (!(await isAdministrator(userId))) {
			// The cookie that better-auth just set is on the *response*, so it is not in
			// `event.request.headers` and `signOut` cannot see it. Delete the session row
			// instead: the cookie left in the browser then points at nothing, which does
			// not depend on the cookie's name or prefix.
			await db.delete(session).where(eq(session.userId, userId));

			return fail(403, { email, message: 'That account is not an authorised administrator.' });
		}

		redirect(303, redirectTo);
	},
};
