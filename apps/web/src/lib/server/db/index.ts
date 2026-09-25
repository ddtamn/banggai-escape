/**
 * The public site's database connection.
 *
 * It connects as `banggai_web`, which the admin's `db:roles` script creates with SELECT on
 * the five content tables and **nothing else** — not `user`, `account`, `session` or
 * `verification`. A read-only role that can read password hashes and live session tokens is
 * not least privilege, and nothing on the public site has any business seeing them.
 *
 * Raw SQL rather than a Drizzle schema. The admin owns the migrations and the table
 * declarations; mirroring them here would be a second definition of the same schema to keep
 * in step, for type safety the payloads do not get from it anyway — every payload is
 * validated against `@banggai/content-model` as it is read, which is the check that actually
 * catches drift.
 *
 * The client is built on first use, not at module scope: `env` is per-request on Cloudflare,
 * and `neon()` validates its connection string, which would otherwise make importing this
 * module throw during `vite build`'s analysis.
 */
import { type NeonQueryFunction, neon } from '@neondatabase/serverless';
import { env } from '$env/dynamic/private';

let client: NeonQueryFunction<false, false> | undefined;

/** The query function. Throws on first use if the connection string is missing. */
export function database(): NeonQueryFunction<false, false> {
	if (!client) {
		if (!env.DATABASE_URL) {
			throw new Error('DATABASE_URL is not set, so the site cannot read its content.');
		}

		client = neon(env.DATABASE_URL);
	}

	return client;
}
