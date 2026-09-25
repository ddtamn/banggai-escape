import { neon } from '@neondatabase/serverless';
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { env } from '$env/dynamic/private';
import * as schema from './schema';

type Database = NeonHttpDatabase<typeof schema>;

let database: Database | undefined;

/**
 * Build the client on first use rather than at module scope.
 *
 * Two reasons. `env` comes from `$env/dynamic/private`, which on Cloudflare is
 * filled in per request, so a module-scope read sees nothing. And `neon()`
 * validates the connection string, which would make importing this module throw
 * during `vite build`'s post-build analysis.
 */
function createDatabase(): Database {
	if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

	return drizzle(neon(env.DATABASE_URL), { schema });
}

/**
 * Lazy stand-in for the Drizzle client: every property access forwards to the
 * real instance, creating it on first touch.
 */
export const db: Database = new Proxy({} as Database, {
	get(_target, property) {
		const instance = database ?? createDatabase();
		database = instance;

		const value = Reflect.get(instance, property);

		return typeof value === 'function' ? value.bind(instance) : value;
	},
});
