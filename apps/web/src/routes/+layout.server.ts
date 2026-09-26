/**
 * The site's chrome, loaded once for every route.
 *
 * The header, the language switcher, the footer, and the CTA banner background that six pages
 * share are all `site_settings` rows, and the footer appears on every page — so reading them
 * here is one query per navigation instead of one per component, and it means a page that only
 * renders content does not have to think about the brand at all.
 *
 * It is also why the settings are read from a **layout** loader rather than in each page: the
 * values are inherited by every child route, so `data.settings` is available to a page, and to
 * the header and footer wrapped around it, without being passed down by hand.
 *
 * If this throws — no `DATABASE_URL`, no media host, a settings row missing or malformed — the
 * whole site fails, deliberately. There is no fallback to the old static modules: two sources
 * of truth for the content is the thing this switch exists to end, and a page quietly serving
 * month-old copy is worse than an error that says which setting is wrong.
 */

import { env } from '$env/dynamic/private';
import { type TransformConfig, transformConfig } from '$lib/images';
import { loadSiteSettings } from '$lib/server/content';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async () => {
	return {
		settings: await loadSiteSettings(),
		/**
		 * Handed down rather than read in the component, because `IMAGE_TRANSFORM_BASE` is a
		 * private env var and only a server module can see one. The hero photograph is the
		 * one image on the site that is not a media-library reference, so it cannot pick up a
		 * `srcset` from the read layer the way every other image does.
		 */
		imageTransforms: transformConfig(env.IMAGE_TRANSFORM_BASE, env.MEDIA_PUBLIC_URL),
	} satisfies {
		settings: Awaited<ReturnType<typeof loadSiteSettings>>;
		imageTransforms: TransformConfig;
	};
};
