/**
 * Creating an entry.
 *
 * There is no skeleton row: the form opens empty, and submitting it is what creates the
 * entry. That keeps the list free of half-created placeholders, and it means the slug — the
 * entry's address and its identity in the URL — is chosen by the administrator rather than
 * generated and then renamed.
 */

import { slugSchema } from '@banggai/content-model';
import { error, fail, redirect } from '@sveltejs/kit';
import {
	initialBlockKinds,
	initialCounts,
	isContentKind,
	kindLabels,
	parseContentForm,
} from '$lib/content/forms';
import { SlugTakenError, saveDraft } from '$lib/server/content/service';
import { mediaPickerOptions } from '$lib/server/media/options';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, platform }) => {
	if (!isContentKind(params.kind)) error(404, 'Unknown content kind.');

	const media = await mediaPickerOptions(platform?.env.MEDIA_PUBLIC_URL);

	return {
		kind: params.kind,
		kindLabel: kindLabels[params.kind],
		values: { slug: '' } as Record<string, unknown>,
		counts: initialCounts(params.kind, {}),
		blockKinds: initialBlockKinds(params.kind, {}),
		media,
	};
};

export const actions: Actions = {
	save: async ({ params, request, locals }) => {
		if (!isContentKind(params.kind)) error(404, 'Unknown content kind.');

		const form = await request.formData();
		const payload = parseContentForm(params.kind, form);
		const slug = String(payload.slug ?? '');

		// The one field a draft *must* get right. Everything else can be filled in over
		// several sittings; the slug is the entry's address, and an entry whose address is
		// invalid has nowhere to live.
		if (!slugSchema.safeParse(slug).success) {
			return fail(400, {
				issues: [
					'slug → must be lowercase words separated by single hyphens (for example island-hopping)',
				],
			});
		}

		try {
			await saveDraft({
				kind: params.kind,
				slug,
				payload,
				userId: locals.user?.id ?? null,
			});
		} catch (error_) {
			if (error_ instanceof SlugTakenError) return fail(409, { issues: [error_.message] });

			throw error_;
		}

		// Straight to the editor: a new entry is almost always incomplete, and the next
		// thing the administrator wants is to keep going, not to find it in a list.
		redirect(303, `/content/${params.kind}/${slug}`);
	},
};
