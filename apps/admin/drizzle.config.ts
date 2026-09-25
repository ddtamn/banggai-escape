import { defineConfig } from 'drizzle-kit';

// Prefer the direct connection: migrations and `drizzle-kit studio` run DDL and
// long-lived sessions, while application traffic uses the pooled URL. drizzle-kit
// selects Neon's WebSocket driver whenever `@neondatabase/serverless` is installed,
// and that driver fails silently on a quoted or pooled URL — keep this unquoted.
const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

if (!url) throw new Error('DATABASE_URL is not set');

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	dialect: 'postgresql',
	dbCredentials: { url },
	verbose: true,
	strict: true,
});
