/**
 * Provision — or reset the password of — the administrator, out of band.
 *
 * This also grants administrator membership, which is a row in `administrators` and the
 * only thing that lets an account into the dashboard (see `src/lib/server/authz.ts`).
 * Creating the user and granting membership are separate facts: an account can exist
 * without being an administrator.
 *
 * Public sign-up is disabled in `src/lib/server/auth.ts`, and better-auth's `api`
 * helpers cannot be used from here anyway: the `sveltekitCookies` plugin calls
 * `getRequestEvent()` in an after-hook, so every one of them throws outside a SvelteKit
 * request context. This writes the same rows sign-up would write, hashed with
 * better-auth's own password hasher, in a single `db.batch()` transaction.
 *
 *   pnpm --filter @banggai/admin provision -- <email> <password> ['Display Name']
 *
 * The password is never echoed back.
 */
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { neon } from '@neondatabase/serverless';
import { hashPassword } from 'better-auth/crypto';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';
import { account, administrators, user } from '../src/lib/server/db/schema';

loadEnvFile();

// `pnpm run script -- a b` forwards the `--` itself, so drop a lone separator if present.
const [email, password, name] = process.argv
	.slice(2)
	.filter((arg, index) => !(index === 0 && arg === '--'));

if (!email || !password) {
	console.error("usage: pnpm --filter @banggai/admin provision -- <email> <password> ['Display Name']");
	process.exit(1);
}

const url = process.env.DATABASE_URL;

if (!url) {
	console.error('DATABASE_URL is not set (checked the environment and apps/admin/.env)');
	process.exit(1);
}

const db = drizzle(neon(url));
const hashed = await hashPassword(password);
const now = new Date();
const [existing] = await db.select().from(user).where(eq(user.email, email)).limit(1);

if (existing) {
	const credentials = await db
		.select()
		.from(account)
		.where(and(eq(account.userId, existing.id), eq(account.providerId, 'credential')));

	if (credentials.length > 0) {
		await db
			.update(account)
			.set({ password: hashed, updatedAt: now })
			.where(and(eq(account.userId, existing.id), eq(account.providerId, 'credential')));
	} else {
		await db.insert(account).values({
			id: randomUUID(),
			accountId: existing.id,
			providerId: 'credential',
			userId: existing.id,
			password: hashed,
			updatedAt: now,
		});
	}

	const granted = await grant(existing.id);

	console.log(
		`Password reset for ${email} (user ${existing.id})${granted ? ', administrator membership granted' : ''}.`,
	);
} else {
	const userId = randomUUID();

	await db.batch([
		db.insert(user).values({
			id: userId,
			name: name || email.split('@')[0],
			email,
			emailVerified: true,
		}),
		db.insert(account).values({
			id: randomUUID(),
			accountId: userId,
			providerId: 'credential',
			userId,
			password: hashed,
			updatedAt: now,
		}),
		db.insert(administrators).values({ userId, createdAt: now }),
	]);

	console.log(`Provisioned administrator ${email} (user ${userId}).`);
}

console.log('Membership lives in the `administrators` table; remove that row to revoke access.');

/** Adds the `administrators` row if it is missing. Returns true when it was added. */
async function grant(userId: string): Promise<boolean> {
	const inserted = await db
		.insert(administrators)
		.values({ userId, createdAt: now })
		.onConflictDoNothing({ target: administrators.userId })
		.returning({ userId: administrators.userId });

	return inserted.length > 0;
}

/** Read `apps/admin/.env` without adding a dependency; real environment values win. */
function loadEnvFile() {
	let contents: string;

	try {
		contents = readFileSync(new URL('../.env', import.meta.url), 'utf8');
	} catch {
		return;
	}

	for (const line of contents.split('\n')) {
		const match = line.match(/^([A-Z_]+)=(.*)$/);
		if (match) process.env[match[1]] ??= match[2].replace(/^"|"$/g, '');
	}
}
