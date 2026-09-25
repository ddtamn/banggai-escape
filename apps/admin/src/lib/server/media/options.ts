/**
 * The media list a content form offers, as `MediaOption`s.
 *
 * Archived assets are excluded: the library hides them so they stop being reused, and a
 * picker that still offered them would undo that.
 */
import type { MediaOption } from '$lib/content/forms';
import { publicMediaUrl } from './keys';
import { listMedia } from './library';

/**
 * Bounded on purpose. A `<select>` is usable at this size and needs no client-side search;
 * if the library outgrows it the picker has to become a dialog, which is a change worth
 * making deliberately rather than by silently truncating a longer list.
 */
export const PICKER_LIMIT = 300;

export async function mediaPickerOptions(
	mediaPublicUrl: string | null | undefined,
): Promise<MediaOption[]> {
	const assets = await listMedia({ limit: PICKER_LIMIT });

	return assets.map((asset) => {
		const dimensions = asset.width && asset.height ? ` · ${asset.width}×${asset.height}` : '';

		return {
			id: asset.id,
			label: `${asset.originalName}${dimensions}`,
			url: publicMediaUrl(asset, mediaPublicUrl),
		};
	});
}
