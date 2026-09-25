import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { betterAuth } from 'better-auth/minimal';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';

export const auth = betterAuth({
	baseURL: env.ORIGIN,
	secret: env.BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, { provider: 'pg' }),
	emailAndPassword: {
		enabled: true,
		// The single administrator is provisioned out of band:
		//   pnpm --filter admin provision -- <email> <password>
		// There is no route, form, or endpoint that can create an account.
		disableSignUp: true,
	},
	plugins: [
		sveltekitCookies(getRequestEvent), // make sure this is the last plugin in the array
	],
});
