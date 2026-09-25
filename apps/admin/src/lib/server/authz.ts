/**
 * Administrator authorization.
 *
 * Membership is a row in the `administrators` table, tied to the provisioned
 * better-auth user. Phase 0 answered the same question with an `ADMIN_EMAILS` runtime
 * variable, which could not be revoked per person and could not be changed without a
 * redeploy; the table has no such problem and is the single source of truth.
 *
 * There is no role hierarchy yet: you are an administrator or you are not, and this
 * module is the one place that decides.
 */
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { administrators } from '$lib/server/db/schema';

/**
 * Answers "is this user an administrator?". A parameter rather than a hard-coded call
 * so the decision — including the fail-closed branch — can be tested without a
 * database.
 */
export type AdministratorLookup = (userId: string) => Promise<boolean>;

/**
 * Fails closed. A missing user, a revoked administrator, and a database that cannot be
 * reached all answer `false`, so an outage degrades to "nobody gets in" rather than to
 * "everybody does".
 */
export async function isAdministrator(
	userId: string | null | undefined,
	lookup: AdministratorLookup = isListedAdministrator,
): Promise<boolean> {
	if (!userId) return false;

	try {
		return await lookup(userId);
	} catch (error) {
		// Worth a log line: silently returning 403 to every administrator while the
		// database is down is indistinguishable from a revoked account otherwise.
		console.error('Administrator lookup failed; denying access.', error);

		return false;
	}
}

async function isListedAdministrator(userId: string): Promise<boolean> {
	const [row] = await db
		.select({ userId: administrators.userId })
		.from(administrators)
		.where(eq(administrators.userId, userId))
		.limit(1);

	return Boolean(row);
}

/**
 * Guard a post-login destination. Only same-origin absolute paths are allowed, so a
 * crafted link cannot bounce a freshly signed-in administrator to another host.
 */
export function safeRedirectTo(value: string | null | undefined, fallback = '/dashboard'): string {
	if (!value) return fallback;
	if (!value.startsWith('/')) return fallback;
	if (value.startsWith('//')) return fallback;
	if (value.includes('\\')) return fallback;

	return value;
}
