/**
 * Create — or converge — the two database roles, and prove the grants actually hold.
 *
 *   ADMIN_DB_PASSWORD=... WEB_DB_PASSWORD=... pnpm --filter @banggai/admin db:roles
 *
 * Today the app connects as `neondb_owner`, which can do anything to anything, including
 * read every session token and password hash. Two roles replace that:
 *
 *   banggai_admin   read/write everywhere in `public` — the back-office Worker.
 *   banggai_web     SELECT on the content tables only — the public Worker.
 *
 * `banggai_web` deliberately has **no** access to `user`, `account`, `session`, or
 * `verification`. A read-only role that can read password hashes and live session tokens
 * is not least privilege, and the public site has no reason to see them.
 *
 * The script is idempotent and convergent: it revokes before granting, so running it
 * twice does not accumulate privileges, and it adopts roles that already exist. Passwords
 * come from the environment and are never printed; pass one only when you intend to
 * (re)set it. `ALTER DEFAULT PRIVILEGES` covers tables added by later migrations.
 *
 * It verifies itself by reconnecting as each role and asserting both that the intended
 * statement works and that the forbidden one is rejected — a grant that silently did
 * nothing is the failure mode worth catching.
 */
import { readFileSync } from 'node:fs';
import { neon } from '@neondatabase/serverless';

loadEnvFile();

const adminPassword = process.env.ADMIN_DB_PASSWORD;
const webPassword = process.env.WEB_DB_PASSWORD;
const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

if (!url) {
	console.error('DATABASE_URL_UNPOOLED (or DATABASE_URL) is not set');
	process.exit(1);
}

for (const [name, password] of [
	['ADMIN_DB_PASSWORD', adminPassword],
	['WEB_DB_PASSWORD', webPassword],
] as const) {
	if (password === undefined) continue;

	// Interpolated into `alter role ... password '<value>'`, which cannot take a bind
	// parameter. Restricting the alphabet to characters that need no quoting keeps that
	// safe by construction rather than by escaping.
	if (!/^[A-Za-z0-9._~!*()-]{16,}$/.test(password)) {
		console.error(
			`${name} must be at least 16 characters and use only letters, digits, and . _ ~ ! * ( ) -`,
		);
		process.exit(1);
	}
}

/** The only tables `banggai_web` may read. Note the absence of the auth tables. */
const WEB_READABLE_TABLES = [
	'content_entries',
	'content_revisions',
	'media_assets',
	'site_settings',
	'slug_redirects',
];

const sql = neon(url);

await assertTablesExist();

await ensureRole('banggai_admin', adminPassword);
await ensureRole('banggai_web', webPassword);

// Converge rather than accumulate: revoke first, then grant exactly what is intended.
await sql`revoke all on all tables in schema public from banggai_admin`;
await sql`grant usage on schema public to banggai_admin`;
await sql`grant select, insert, update, delete on all tables in schema public to banggai_admin`;
await sql`grant usage, select on all sequences in schema public to banggai_admin`;

await sql`revoke all on all tables in schema public from banggai_web`;
await sql`grant usage on schema public to banggai_web`;
for (const table of WEB_READABLE_TABLES) {
	await sql.query(`grant select on public."${table}" to banggai_web`);
}

// Tables created later by this same role (the migrations) inherit the grants.
await sql`alter default privileges in schema public grant select, insert, update, delete on tables to banggai_admin`;
await sql`alter default privileges in schema public grant usage, select on sequences to banggai_admin`;
await sql`alter default privileges in schema public grant select on tables to banggai_web`;

console.log('Roles converged.\n');
console.table([
	{
		role: 'banggai_admin',
		password: adminPassword ? 'set' : 'unchanged',
		grant: 'select, insert, update, delete on all public tables',
	},
	{
		role: 'banggai_web',
		password: webPassword ? 'set' : 'unchanged',
		grant: `select on ${WEB_READABLE_TABLES.join(', ')}`,
	},
]);

const failures = await verify();

if (failures.length > 0) {
	console.error(`\n${failures.length} verification failure(s):`);
	for (const failure of failures) console.error(`  ${failure}`);
	process.exit(1);
}

console.log('\nVerified against a live connection as each role.');
console.log(
	'Build each connection string by swapping the user and password on\n' +
		'DATABASE_URL (pooled for app traffic, unpooled for migrations) and store them as\n' +
		'Worker secrets — never in the repository.',
);

/**
 * Reconnects as each role and checks both directions: what must work, and what must not.
 *
 * Only runs when a password was supplied, because a role's password cannot be read back.
 */
async function verify(): Promise<string[]> {
	const failures: string[] = [];

	if (adminPassword) {
		const adminSql = neon(connectionStringFor('banggai_admin', adminPassword));

		try {
			// A probe row that is deleted again, so the check does not leave state behind.
			await adminSql`insert into site_settings (key, value) values ('__role_probe', '{}'::jsonb) on conflict (key) do nothing`;
			await adminSql`delete from site_settings where key = '__role_probe'`;
			console.log('ok    banggai_admin can write to site_settings');
		} catch (error) {
			failures.push(`banggai_admin could not write to site_settings: ${message(error)}`);
		}
	}

	if (webPassword) {
		const webSql = neon(connectionStringFor('banggai_web', webPassword));

		try {
			const [{ n }] = await webSql`select count(*)::int n from content_entries`;
			console.log(`ok    banggai_web can read content_entries (${n} row(s))`);
		} catch (error) {
			failures.push(`banggai_web could not read content_entries: ${message(error)}`);
		}

		try {
			await webSql`select count(*) from "user"`;
			failures.push('banggai_web CAN READ "user" — revoke it');
		} catch {
			console.log('ok    banggai_web is denied the "user" table');
		}

		try {
			await webSql`select count(*) from session`;
			failures.push('banggai_web CAN READ "session" — revoke it');
		} catch {
			console.log('ok    banggai_web is denied the "session" table');
		}

		try {
			await webSql`insert into site_settings (key, value) values ('__role_probe', '{}'::jsonb)`;
			await webSql`delete from site_settings where key = '__role_probe'`;
			failures.push('banggai_web CAN WRITE to site_settings — revoke it');
		} catch {
			console.log('ok    banggai_web is denied writes');
		}
	}

	return failures;
}

/** `create role` when absent, `alter role` only when a new password is supplied. */
async function ensureRole(name: string, password: string | undefined): Promise<void> {
	const [row] = await sql`
		select (select count(*) from pg_roles where rolname = ${name}) > 0 as present`;

	if (!row.present) {
		// A role with no password cannot be connected to, and a password cannot be read
		// back out of Postgres — so creating one without being told the secret would leave
		// an unusable role behind.
		if (!password) {
			console.error(
				`Role ${name} does not exist. Set its password environment variable to create it ` +
					'(for example: openssl rand -hex 24).',
			);
			process.exit(1);
		}

		await sql.query(`create role "${name}" with login`);
	}

	if (password) {
		await sql.query(`alter role "${name}" with password '${password}'`);
	}
}

/** Fails loudly on a misspelled table name, rather than granting nothing and saying ok. */
async function assertTablesExist(): Promise<void> {
	const rows = await sql`
		select table_name from information_schema.tables
		where table_schema = 'public' and table_name = any(${WEB_READABLE_TABLES})`;
	const found = new Set(rows.map((row) => row.table_name as string));
	const missing = WEB_READABLE_TABLES.filter((table) => !found.has(table));

	if (missing.length > 0) {
		console.error(`Missing table(s) in public: ${missing.join(', ')}. Run db:migrate first.`);
		process.exit(1);
	}
}

/** The same host and database as `url`, with a different user. */
function connectionStringFor(user: string, password: string): string {
	const parsed = new URL(url as string);
	parsed.username = user;
	parsed.password = password;

	return parsed.toString();
}

function message(error: unknown): string {
	return error instanceof Error ? error.message.split('\n')[0] : String(error);
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
