/**
 * The media library.
 *
 * Every action is reachable only through the `(dashboard)` layout's guard, which redirects
 * an anonymous visitor and 403s a signed-in non-administrator before this file runs. The
 * guards here are about *input*, not identity.
 */
import { fail } from '@sveltejs/kit';
import { publicMediaUrl } from '$lib/server/media/keys';
import {
	countMedia,
	deleteMediaAsset,
	getMediaAsset,
	listMedia,
	type MediaAsset,
	type MediaFilter,
	setAltText,
	setArchived,
} from '$lib/server/media/library';
import { storeUpload } from '$lib/server/media/upload';
import { formatBytes, MAX_UPLOAD_BYTES } from '$lib/server/media/validate';
import type { Actions, PageServerLoad } from './$types';

const FILTERS: MediaFilter[] = ['all', 'owned', 'legacy', 'missing-alt', 'archived'];

export const load: PageServerLoad = async (event) => {
	const filter = FILTERS.includes(event.url.searchParams.get('filter') as MediaFilter)
		? (event.url.searchParams.get('filter') as MediaFilter)
		: 'all';
	const search = event.url.searchParams.get('q')?.trim() ?? '';

	const [assets, counts] = await Promise.all([listMedia({ filter, search }), countMedia()]);

	// Resolved on the server: the public base URL is a Worker variable, and the fallback
	// (`/media/<key>`, served by this app) is only reachable from here.
	const mediaBase = event.platform?.env.MEDIA_PUBLIC_URL ?? null;

	return {
		filter,
		search,
		counts,
		maxBytes: formatBytes(MAX_UPLOAD_BYTES),
		assets: assets.map((asset) => ({ ...asset, url: publicMediaUrl(asset, mediaBase) })),
	};
};

export const actions: Actions = {
	upload: async (event) => {
		const form = await event.request.formData();
		const file = form.get('file');

		if (!(file instanceof File) || file.size === 0) {
			return fail(400, { message: 'Choose an image to upload.' });
		}

		const result = await storeUpload(
			{
				bytes: new Uint8Array(await file.arrayBuffer()),
				fileName: file.name,
				declaredType: file.type,
				altText: form.get('altText')?.toString() ?? null,
				uploadedBy: event.locals.user?.id ?? null,
			},
			event.platform?.env.R2_MEDIA,
		);

		if (!result.ok) return fail(400, { message: result.reason });

		return { message: `Uploaded ${file.name}.` };
	},

	alt: async (event) => {
		const form = await event.request.formData();
		const id = form.get('id')?.toString();

		if (!id) return fail(400, { message: 'Missing asset id.' });

		await setAltText(id, form.get('altText')?.toString() ?? '');

		return { message: 'Alt text saved.' };
	},

	archive: async (event) => {
		const form = await event.request.formData();
		const id = form.get('id')?.toString();

		if (!id) return fail(400, { message: 'Missing asset id.' });

		await setArchived(id, true);

		return { message: 'Hidden from the library. The file was not deleted.' };
	},

	restore: async (event) => {
		const form = await event.request.formData();
		const id = form.get('id')?.toString();

		if (!id) return fail(400, { message: 'Missing asset id.' });

		await setArchived(id, false);

		return { message: 'Back in the library.' };
	},

	delete: async (event) => {
		const form = await event.request.formData();
		const id = form.get('id')?.toString();

		if (!id) return fail(400, { message: 'Missing asset id.' });

		const asset: MediaAsset | null = await getMediaAsset(id);

		if (!asset) return fail(404, { message: 'That asset no longer exists.' });

		const result = await deleteMediaAsset({ id, bucket: event.platform?.env.R2_MEDIA });

		if (!result.ok) {
			if (result.references.length === 0) {
				return fail(404, { message: 'That asset no longer exists.' });
			}

			// Naming where it is used is the difference between a refusal an administrator
			// can act on and one that looks like a bug.
			const where = result.references
				.map((reference) => `${reference.where} (${reference.state})`)
				.join(', ');

			return fail(409, {
				message: `Still used by ${where}. Replace it there first, or hide it instead.`,
			});
		}

		return {
			message: result.removedObject
				? `Deleted ${asset.originalName} and its stored file.`
				: `Removed ${asset.originalName} from the library. Its file lives on the legacy host, so there was nothing to delete here.`,
		};
	},
};
