/**
 * Previews the **draft**, which is the version visitors cannot see.
 *
 * This is a structured read-back, not a rendering of the public page. The marketing
 * components live in `apps/web`, and importing them here would cross the app boundary
 * (AGENTS.md rule 7) — so the honest thing is to show exactly what is stored, field by
 * field, with the images resolved. That is what makes a forgotten field visible *before*
 * publishing rather than after.
 */
import { error } from '@sveltejs/kit';
import { describePayload, isContentKind, kindLabels } from '$lib/content/forms';
import { getEntry } from '$lib/server/content/service';
import { mediaPickerOptions } from '$lib/server/media/options';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, platform }) => {
	if (!isContentKind(params.kind)) error(404, 'Unknown content kind.');

	const entry = await getEntry(params.kind, params.slug);

	if (!entry) error(404, 'That content item does not exist.');

	const options = await mediaPickerOptions(platform?.env.MEDIA_PUBLIC_URL);
	const urlById = new Map(options.map((option) => [option.id, option.url]));

	return {
		kind: params.kind,
		kindLabel: kindLabels[params.kind],
		entry,
		rows: describePayload(params.kind, entry.draft).map((row) => ({
			label: row.label,
			text: row.text,
			// An id with no URL is an asset that has been deleted since it was chosen, which
			// is worth seeing here rather than discovering in production.
			urls: row.media.map((id) => urlById.get(id) ?? null),
		})),
	};
};
