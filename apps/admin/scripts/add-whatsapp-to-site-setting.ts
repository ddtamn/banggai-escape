/**
 * One-shot data migration: add `site.whatsapp`.
 *
 * ## Why this exists
 *
 * `siteProfileSchema` gained a required `whatsapp` field, because the booking bar and the
 * contact form hand enquiries to WhatsApp and the number belongs in content an editor can
 * see — not hardcoded in a component. The stored `site` row predates the field, and the
 * read layer refuses a payload that does not satisfy its contract, so without this the
 * public site returns 500 on every page. That refusal is the read layer working correctly;
 * this is the data catching up.
 *
 * ## Why it is seeded from `phoneHref`
 *
 * The two are the same number today. Deriving one from the other means they cannot start
 * out disagreeing, and an editor can still change `whatsapp` on its own afterwards if the
 * business ever gets a separate line. The value is validated against the shared contract
 * before anything is written, so a bad migration fails here rather than at the next page
 * render.
 *
 * ## Running it
 *
 * ```sh
 * pnpm --filter @banggai/admin exec tsx scripts/add-whatsapp-to-site-setting.ts
 * ```
 *
 * **Run it against every branch, production included, before the schema change is deployed.**
 * This script exists *because* a required field in `siteProfileSchema` takes the whole site
 * down until the data catches up, so the ordering is the whole risk:
 *
 * ```sh
 * DATABASE_URL=<dev branch>       pnpm exec tsx scripts/add-whatsapp-to-site-setting.ts
 * DATABASE_URL=<production branch> pnpm exec tsx scripts/add-whatsapp-to-site-setting.ts
 * ```
 *
 * That second command is the one that gets skipped, because `dev` is where you are and it
 * works there. It was skipped here, the change then sat unpushed for a session, and the first
 * deploy of it took `banggaiescape.com` down: every page 500'd while `sitemap.xml` — which
 * reads no settings — answered 200 throughout. That asymmetry is the signature of this
 * failure and not of a broken deploy.
 *
 * Idempotent: a row that already has a `whatsapp` is left alone. Delete this file once it
 * has run against both branches — see `docs/08-content-data-layer.md`.
 */

import { siteSettingSchemas } from '@banggai/content-model';
import { neon } from '@neondatabase/serverless';

/** `tel:+6281354911647` -> `6281354911647`. */
function digitsFromTelHref(href: string): string | null {
	const digits = href.replace(/^tel:/i, '').replace(/\D/g, '');
	return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

async function main() {
	const url = process.env.DATABASE_URL;

	if (!url) {
		throw new Error('DATABASE_URL is not set. Run this through the admin package.');
	}

	const sql = neon(url);
	const rows = await sql`select value from site_settings where key = 'site'`;

	if (rows.length === 0) {
		throw new Error('No `site` row found. Is this the right database?');
	}

	const current = rows[0].value as Record<string, unknown>;

	if (typeof current.whatsapp === 'string' && current.whatsapp.trim() !== '') {
		console.log(`Already set to ${current.whatsapp} — nothing to do.`);
		return;
	}

	const phoneHref = typeof current.phoneHref === 'string' ? current.phoneHref : '';
	const whatsapp = digitsFromTelHref(phoneHref);

	if (!whatsapp) {
		throw new Error(
			`Could not derive a WhatsApp number from phoneHref ${JSON.stringify(phoneHref)}. ` +
				'Set the field by hand in the admin instead.',
		);
	}

	const next = { ...current, whatsapp };

	// Validate through the shared contract *before* writing, so a rejected migration is a
	// failed script rather than a broken site.
	const parsed = siteSettingSchemas.site.safeParse(next);

	if (!parsed.success) {
		throw new Error(`The migrated value does not satisfy the contract:\n${parsed.error.message}`);
	}

	// `::jsonb` rather than a driver helper: the neon-http tag has no `sql.json`, and
	// `updated_at` is set the way every admin write sets it, so the row does not look
	// untouched in the settings list.
	await sql`
		update site_settings
		set value = ${JSON.stringify(next)}::jsonb, updated_at = now()
		where key = 'site'
	`;

	console.log(`Set site.whatsapp to ${whatsapp} (from ${phoneHref}).`);
}

await main();
