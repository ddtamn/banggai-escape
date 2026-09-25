/**
 * Editing one setting.
 *
 * The screen is the same renderer, parser and path helpers the content editors use, with
 * one root field instead of a payload: a setting's stored value *is* its root field's value,
 * so which key names which shape is declared once in `$lib/content/forms` and nothing here
 * is per-key code.
 *
 * Two things are specific to settings:
 *
 * - **Saving validates**, because there is no draft: `saveSetting` refuses an invalid value
 *   rather than storing it, and this route turns that refusal into the same issue list the
 *   rest of the admin shows.
 * - **A failed save keeps the submission.** `fail` returns the parsed value, so the form
 *   re-renders what was typed. Re-rendering from the *stored* value instead would silently
 *   discard an edit that was refused, which is the worst case for a screen whose whole job
 *   is editing one long-lived value.
 */

import { error, fail } from '@sveltejs/kit';
import {
	initialSettingCounts,
	isSiteSettingKey,
	parseSettingForm,
	settingFormValues,
	settingNotes,
	settingSpecs,
} from '$lib/content/forms';
import { ContentValidationError } from '$lib/server/content/validate';
import { mediaPickerOptions } from '$lib/server/media/options';
import { getSetting, isSettingValid, saveSetting } from '$lib/server/settings/service';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, platform }) => {
	if (!isSiteSettingKey(params.key)) error(404, 'Unknown setting.');

	const [setting, media] = await Promise.all([
		getSetting(params.key),
		// Only the two keys that hold an image need the picker, and it carries up to 300
		// options — not worth shipping to a form for a phone number.
		specUsesMedia(settingSpecs[params.key])
			? mediaPickerOptions(platform?.env.MEDIA_PUBLIC_URL)
			: Promise.resolve([]),
	]);

	const value = setting?.value ?? null;

	return {
		key: params.key,
		note: settingNotes[params.key],
		values: settingFormValues(params.key, value),
		counts: initialSettingCounts(params.key, value),
		media,
		updatedAt: setting?.updatedAt ?? null,
		updatedBy: setting?.updatedBy ?? null,
		/**
		 * Null when the key has no row yet, so "never set" and "set, but no longer valid"
		 * can be told apart — they need different words on screen.
		 */
		valid: setting ? isSettingValid(params.key, value) : null,
	};
};

export const actions: Actions = {
	save: async ({ params, request, locals }) => {
		if (!isSiteSettingKey(params.key)) error(404, 'Unknown setting.');

		const form = await request.formData();
		const value = parseSettingForm(params.key, form);

		try {
			await saveSetting({ key: params.key, value, userId: locals.user?.id ?? null });
		} catch (error_) {
			if (error_ instanceof ContentValidationError) {
				return fail(400, {
					issues: error_.issues,
					// Hand the submission back so the form can show it rather than the old value.
					values: settingFormValues(params.key, value),
				});
			}

			throw error_;
		}

		return { message: 'Saved. The public site reads this on its next request.' };
	},
};

/** Whether a setting's spec contains an image field anywhere inside it. */
function specUsesMedia(spec: (typeof settingSpecs)[keyof typeof settingSpecs]): boolean {
	switch (spec.type) {
		case 'media':
			return true;
		case 'object':
		case 'rows':
			return spec.fields.some(specUsesMedia);
		case 'list':
			return spec.item === 'media';
		default:
			return false;
	}
}
