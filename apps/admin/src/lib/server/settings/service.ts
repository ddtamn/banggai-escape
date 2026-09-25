/**
 * The site-settings service: read them all, read one, save one.
 *
 * ## How this differs from the content service, and why
 *
 * Content keeps editing and publishing apart, so `saveDraft` accepts an incomplete payload
 * and `publish` is the gate. A setting has no such split: `site_settings` is one row per
 * key, the public site reads it directly, and there is no revision to publish. So
 * **saving is the gate**.
 *
 * `saveSetting` therefore validates against the contract *before* it writes, and refuses
 * with the offending paths named. That check is the only thing between a malformed JSONB
 * value and the marketing site, which is why there is no "save anyway" and why this is not
 * a general key/value editor — unknown keys cannot reach the table at all.
 *
 * The values are media references in two of the thirteen keys (`testimonials[].avatar` and
 * `ctaBackground`), which is why the media library's delete guard walks settings as well
 * as content: see `$lib/server/media/references`.
 */
import { parseSiteSetting, type SiteSettingKey } from '@banggai/content-model';
import { eq } from 'drizzle-orm';
import { settingKeys, settingNotes, settingSpecs } from '$lib/content/forms';
import { db as defaultDb } from '$lib/server/db';
import { siteSettings } from '$lib/server/db/schema';
import { assertValidSiteSetting } from '../content/validate';

type Database = typeof defaultDb;

export type SettingRow = {
	key: SiteSettingKey;
	value: unknown;
	updatedAt: Date;
	updatedBy: string | null;
};

/** What the index needs to list a setting without shipping its value to the client. */
export type SettingOverview = {
	key: SiteSettingKey;
	label: string;
	note: string;
	/** Null when no row has ever been written for this key. */
	updatedAt: Date | null;
	/**
	 * `unset` is not the same as `invalid`, and the difference is worth showing: an
	 * untouched key is work not yet done, while `invalid` means the stored value no longer
	 * satisfies a contract that has since changed.
	 */
	state: 'unset' | 'ok' | 'invalid';
	/** A one-line description of the value, for the index. */
	summary: string;
};

/** Whether a stored value still satisfies the contract for its key. */
export function isSettingValid(key: SiteSettingKey, value: unknown): boolean {
	return parseSiteSetting(key, value).success;
}

/**
 * Every setting, in the order the index presents them.
 *
 * Driven by the spec rather than by the table, because a key with no row has to appear:
 * "never set" is a state an administrator needs to see and act on, and a list built from
 * `select * from site_settings` would silently omit exactly those.
 */
export async function listSettings(db: Database = defaultDb): Promise<SettingOverview[]> {
	const rows = await db
		.select({
			key: siteSettings.key,
			value: siteSettings.value,
			updatedAt: siteSettings.updatedAt,
			updatedBy: siteSettings.updatedBy,
		})
		.from(siteSettings);

	const byKey = new Map(rows.map((row) => [row.key, row]));

	return settingKeys.map((key) => {
		const row = byKey.get(key);
		const spec = settingSpecs[key];

		return {
			key,
			label: spec.label,
			note: settingNotes[key],
			updatedAt: row?.updatedAt ?? null,
			state: !row ? 'unset' : isSettingValid(key, row.value) ? 'ok' : 'invalid',
			summary: summarise(row?.value),
		};
	});
}

/** One setting, or null when no row exists for it yet. */
export async function getSetting(
	key: SiteSettingKey,
	db: Database = defaultDb,
): Promise<SettingRow | null> {
	const [row] = await db
		.select({
			value: siteSettings.value,
			updatedAt: siteSettings.updatedAt,
			updatedBy: siteSettings.updatedBy,
		})
		.from(siteSettings)
		.where(eq(siteSettings.key, key));

	return row ? { key, value: row.value, updatedAt: row.updatedAt, updatedBy: row.updatedBy } : null;
}

/**
 * Writes one setting, or refuses.
 *
 * Throws `ContentValidationError` (with `.issues` ready to show) rather than returning a
 * result, so a caller that forgets to check cannot store an invalid value by accident.
 */
export async function saveSetting(
	input: { key: SiteSettingKey; value: unknown; userId: string | null },
	db: Database = defaultDb,
): Promise<void> {
	assertValidSiteSetting(input.key, input.value);

	const now = new Date();

	// Upsert rather than update-then-insert: `key` is the primary key, so `onConflict` has
	// a target and this is a single statement. `updatedAt` is passed explicitly because
	// drizzle's `$onUpdate` covers the `.update()` builder, not this conflict path.
	await db
		.insert(siteSettings)
		.values({ key: input.key, value: input.value, updatedAt: now, updatedBy: input.userId })
		.onConflictDoUpdate({
			target: siteSettings.key,
			set: { value: input.value, updatedAt: now, updatedBy: input.userId },
		});
}

/** A short description of a stored value, for a list that cannot show all of it. */
function summarise(value: unknown): string {
	if (value === undefined || value === null) return 'Not set yet';

	if (Array.isArray(value)) {
		return value.length === 1 ? '1 item' : `${value.length} items`;
	}

	if (typeof value === 'string') return value;

	if (typeof value === 'object') {
		const fields = Object.keys(value).length;

		return fields === 1 ? '1 field' : `${fields} fields`;
	}

	return String(value);
}
