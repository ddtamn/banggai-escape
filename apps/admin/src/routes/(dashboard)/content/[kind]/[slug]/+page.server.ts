/**
 * Editing one entry, and the publish workflow.
 *
 * The whole point of this screen: **save is not publish.** Saving writes the working copy
 * and nothing else, so an administrator can leave a half-finished edit overnight without
 * touching what visitors see. Publishing validates the draft and appends an immutable
 * revision; unpublishing takes it off the site while keeping every version.
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
import {
	displayTitle,
	getEntry,
	listRedirects,
	listRevisions,
	NotPublishableError,
	publish,
	restoreRevision,
	SlugTakenError,
	saveDraft,
	setArchived,
	statusLabels,
	unpublish,
} from '$lib/server/content/service';
import { mediaPickerOptions } from '$lib/server/media/options';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, platform }) => {
	if (!isContentKind(params.kind)) error(404, 'Unknown content kind.');

	const entry = await getEntry(params.kind, params.slug);

	if (!entry) error(404, 'That content item does not exist.');

	const [revisions, redirects, media] = await Promise.all([
		listRevisions(entry.id, entry.published?.id ?? null),
		listRedirects(params.kind),
		mediaPickerOptions(platform?.env.MEDIA_PUBLIC_URL),
	]);

	return {
		kind: params.kind,
		kindLabel: kindLabels[params.kind],
		entry,
		// Resolved here so the page does not re-derive it, and so this screen and the list
		// agree on what an entry with no title is called. See `displayTitle`.
		title: displayTitle(params.kind, entry.draft) ?? entry.slug,
		revisions,
		redirects,
		media,
		// Structural state the form needs before its first render.
		counts: initialCounts(params.kind, entry.draft),
		blockKinds: initialBlockKinds(params.kind, entry.draft),
		labels: statusLabels(),
	};
};

export const actions: Actions = {
	save: async ({ params, request, locals }) => {
		if (!isContentKind(params.kind)) error(404, 'Unknown content kind.');

		const form = await request.formData();
		const payload = parseContentForm(params.kind, form);
		const slug = String(payload.slug ?? '');

		if (!slugSchema.safeParse(slug).success) {
			return fail(400, {
				issues: [
					'slug → must be lowercase words separated by single hyphens (for example island-hopping)',
				],
			});
		}

		let result: Awaited<ReturnType<typeof saveDraft>>;

		try {
			result = await saveDraft({
				kind: params.kind,
				slug: params.slug,
				payload,
				userId: locals.user?.id ?? null,
			});
		} catch (error_) {
			if (error_ instanceof SlugTakenError) return fail(409, { issues: [error_.message] });

			throw error_;
		}

		// A renamed entry has a new address, so the page has to move with it or the next save
		// would look for the old slug.
		if (slug !== params.slug) redirect(303, `/content/${params.kind}/${slug}`);

		return {
			message: 'Draft saved. The public site still shows the last published version.',
			redirectedFrom: result.redirectedFrom,
		};
	},

	publish: async ({ params, locals }) => {
		if (!isContentKind(params.kind)) error(404, 'Unknown content kind.');

		try {
			const result = await publish({
				kind: params.kind,
				slug: params.slug,
				authorId: locals.user?.id ?? null,
				authorEmail: locals.user?.email ?? 'unknown',
			});

			return {
				message: result.redirectFrom
					? `Published as revision ${result.revisionNumber}. /${result.redirectFrom} now redirects here.`
					: `Published as revision ${result.revisionNumber}.`,
			};
		} catch (error_) {
			if (error_ instanceof NotPublishableError) {
				return fail(400, { issues: error_.issues, message: 'Cannot publish yet.' });
			}

			throw error_;
		}
	},

	unpublish: async ({ params }) => {
		if (!isContentKind(params.kind)) error(404, 'Unknown content kind.');

		const done = await unpublish(params.kind, params.slug);

		if (!done) return fail(404, { message: 'That content item does not exist.' });

		return {
			message:
				'Unpublished. Every revision is kept, and publishing again puts the same version back.',
		};
	},

	archive: async ({ params }) => {
		if (!isContentKind(params.kind)) error(404, 'Unknown content kind.');

		await setArchived({ kind: params.kind, slug: params.slug, archived: true });

		return { message: 'Archived.' };
	},

	restore: async ({ params }) => {
		if (!isContentKind(params.kind)) error(404, 'Unknown content kind.');

		await setArchived({ kind: params.kind, slug: params.slug, archived: false });

		return { message: 'Restored.' };
	},

	restoreRevision: async ({ params, request }) => {
		if (!isContentKind(params.kind)) error(404, 'Unknown content kind.');

		const form = await request.formData();
		const revisionId = form.get('revisionId')?.toString();

		if (!revisionId) return fail(400, { message: 'Missing revision.' });

		const done = await restoreRevision({
			kind: params.kind,
			slug: params.slug,
			revisionId,
		});

		if (!done) return fail(404, { message: 'That revision is not part of this item.' });

		return {
			message:
				'That revision is now the draft. Nothing has changed on the public site — publish when you are ready.',
		};
	},
};
