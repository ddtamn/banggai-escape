/**
 * Resizing images at the edge, through Cloudflare Image Resizing.
 *
 * ## The problem this solves
 *
 * Images were ~95% of the page's weight: 4.28 MB across the 22 content images on the home
 * page, delivered as full-resolution JPEG because nothing ever asked for anything smaller.
 * A card in a four-up grid renders at roughly 384 CSS pixels and was being sent a 1200px
 * original.
 *
 * ## Why the edge and not stored variants
 *
 * The alternative was to pre-generate width variants into R2 with `sharp`. That needs a
 * column on `media_assets` recording which widths exist, because a `srcset` candidate that
 * 404s does not fall back to `src` — the browser picks one candidate, and a miss is simply
 * a broken image. It also needs a step run after every upload, because a Worker cannot
 * execute `sharp`.
 *
 * Transforming at the edge needs neither. There is no stored state to fall out of sync, and
 * `onerror=redirect` covers the failure case that made the database column necessary.
 *
 * ## The measured result
 *
 * Against a 217 KB, 1200px JPEG original:
 *
 * | Requested | Served | Bytes | Saving |
 * | --- | --- | --- | --- |
 * | `width=400` | AVIF | 16 KB | 93% |
 * | `width=800` | AVIF | 42 KB | 81% |
 * | `width=1200` | AVIF | 108 KB | 50% |
 *
 * `format=auto` is deliberate: the response carries `Vary: Accept`, so the AVIF and WebP
 * variants are cached side by side rather than evicting each other.
 *
 * ## Cost
 *
 * Cloudflare bills *unique* transformations, and a repeat of the same one in the same month
 * is not billed again. The widths here are a fixed set, so the count is bounded by
 * images × widths — roughly 90 for this library — against a 5,000/month free allowance. It
 * does not grow with traffic.
 *
 * ## Why this module takes its configuration as an argument
 *
 * Server env in SvelteKit is only reachable through `$env/dynamic/private`, which a
 * component cannot import. So the values are passed in by the read layer, which can see
 * them, and this module stays pure — no `process.env`, no import of `$env`, and therefore
 * testable in a plain Node environment and callable from a component.
 */

/**
 * The widths offered to the browser.
 *
 * A fixed set is the point: it is what bounds the number of billable transformations, and it
 * is what lets the edge cache each variant indefinitely. The steps are exactly 2x, so a
 * high-DPI screen always has a candidate worth fetching rather than being handed the 1x file,
 * and no step sits close enough to another to be redundant.
 *
 * Chosen against the layouts rather than picked round: 400 covers a card in the widest grid
 * at 1x, 800 is that card at 2x, and 1600 covers a full-bleed hero on a large screen.
 */
export const IMAGE_WIDTHS = [400, 800, 1600] as const;

/** Where the transform endpoint is, and which images this site owns. */
export type TransformConfig = {
	/** The `IMAGE_TRANSFORM_BASE` value: where `/cdn-cgi/image/` is mounted. */
	base: string | null;
	/** The `MEDIA_PUBLIC_URL` value: the media library's own host. */
	mediaBase: string | null;
};

/**
 * Build the config from two environment values, normalising both.
 *
 * An absent, empty or whitespace-only value becomes `null` rather than `""`, so every caller
 * takes the same "no transform" path instead of re-checking for emptiness. A trailing slash
 * is stripped from both, because both are concatenated and a doubled separator would be a
 * subtly wrong URL rather than an obvious failure.
 *
 * `null` is accepted as well as `undefined` because that is what an unset SvelteKit env var
 * and a hand-written config both produce, and treating them differently would be a distinction
 * without a difference.
 */
export function transformConfig(
	transformBase: string | null | undefined,
	mediaBase: string | null | undefined,
): TransformConfig {
	const clean = (value: string | null | undefined): string | null => {
		const trimmed = value?.trim();

		return trimmed ? trimmed.replace(/\/+$/, '') : null;
	};

	return { base: clean(transformBase), mediaBase: clean(mediaBase) };
}

/**
 * One image's `srcset`, or `null` when the image cannot be transformed.
 *
 * Three cases return null, and each is a case where a `srcset` would be worse than nothing:
 *
 * - **No transform endpoint configured.** Development, where there is no Cloudflare edge in
 *   front of the dev server, and any deployment that has not set it.
 * - **No media base.** With no way to tell an owned image from a foreign one, guessing wrong
 *   means a grid of broken images.
 * - **A source outside the media library.** The design-tool placeholders on
 *   `lh3.googleusercontent.com` answer a browser with 200 and Cloudflare's fetcher with 403,
 *   verified against the live edge. A `srcset` of URLs that all 403 is worse than no `srcset`
 *   at all, so those keep their single URL until they are re-hosted.
 *
 * The third case is why this takes the media base rather than trusting any absolute URL: the
 * only images the edge can be relied on to fetch are the ones this site owns.
 */
export function imageSrcset(
	src: string,
	config: TransformConfig,
	widths: readonly number[] = IMAGE_WIDTHS,
): string | null {
	const { base, mediaBase } = config;

	if (!base || !mediaBase) return null;
	if (!src.startsWith(`${mediaBase}/`)) return null;

	const candidates = widths.map((width) => `${transformUrl(base, src, width)} ${width}w`);

	return candidates.length > 0 ? candidates.join(', ') : null;
}

/**
 * One transformed URL.
 *
 * `onerror=redirect` sends the visitor to the untouched original if the transformation fails
 * for any reason — a format the edge cannot produce, an oversized source, a transient error.
 * It only works because the source is in the same zone, which is why the media host and the
 * site share one.
 */
export function transformUrl(base: string, src: string, width: number): string {
	const options = [
		`width=${width}`,
		// `scale-down` is the default and is stated anyway: it is what stops the edge
		// enlarging a 600px source to fill a 1600px request, which would invent pixels and
		// make the file bigger.
		'fit=scale-down',
		'format=auto',
		'quality=75',
		'onerror=redirect',
	].join(',');

	// The source is percent-encoded because it is an absolute URL being placed into a path
	// segment. Its own `?` and `&` would otherwise be read as options to *this* request.
	return `${base}/${options}/${encodeURIComponent(src)}`;
}
