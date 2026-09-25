/**
 * Turning stored media references into URLs the browser can load.
 *
 * A payload stores a `media_assets` id; a page renders a URL. That swap is the whole job of
 * this module, and it is the reason the site cannot simply render what the admin published.
 *
 * The two shapes a row can have are both real: rows imported from the old site may carry an
 * `external_url`, and everything uploaded through the admin carries an `object_key`. Unlike
 * the admin, which falls back to its own `/media/<key>` route, this app has no such route —
 * if the public media host is not configured, a stored object has **no** URL, and saying so
 * is better than rendering a broken image or a link into a 404.
 *
 * `loadMedia` returns a lookup rather than a `Map` so the "every reference was loaded"
 * invariant has exactly one home: the site's own walker collects the ids and rewrites the
 * fields, so a miss here can only mean the two have drifted apart, and rendering
 * `<img src="6f3609ec-…">` is the failure that must never reach a visitor.
 */
import { env } from '$env/dynamic/private';
import { database } from '$lib/server/db';

export type MediaRow = {
	id: string;
	objectKey: string | null;
	externalUrl: string | null;
};

/** The public base URL for stored objects, or null when the environment does not set one. */
function mediaBaseUrl(): string | null {
	const base = env.MEDIA_PUBLIC_URL?.replace(/\/+$/, '');

	return base ? base : null;
}

/**
 * The URL for one asset.
 *
 * `externalUrl` wins when it is set: those bytes are on someone else's host and rewriting
 * the URL would break them.
 */
function mediaUrl(asset: MediaRow): string {
	if (asset.externalUrl) return asset.externalUrl;

	if (!asset.objectKey) {
		throw new Error(`media asset ${asset.id} has neither an object key nor an external URL`);
	}

	const base = mediaBaseUrl();

	if (!base) {
		throw new Error(
			`MEDIA_PUBLIC_URL is not set, so media asset ${asset.id} has no public URL to render.`,
		);
	}

	return `${base}/${asset.objectKey}`;
}

/** The URLs for one page's worth of references. */
export type MediaLookup = {
	/** The URL for one of the ids this lookup was asked for. Throws if it was not one. */
	url(id: string): string;
};

/**
 * Loads the assets a set of references points at, ready to be substituted into payloads.
 *
 * Ids are de-duplicated and fetched in one query, because a page's payloads share images
 * heavily (every package card, a gallery, a shared CTA background) and one round trip per
 * reference would be dozens.
 *
 * A reference with no row is **not** silently skipped. The admin refuses to delete an asset
 * any content points at, so a dangling id means the database is inconsistent — which is a
 * loud failure here rather than a missing image nobody notices.
 */
export async function loadMedia(ids: readonly string[]): Promise<MediaLookup> {
	const unique = [...new Set(ids.filter((id) => id.length > 0))];
	const urls = new Map<string, string>();

	if (unique.length > 0) {
		const rows = await database()`
			select id, object_key, external_url
			from media_assets
			where id = any(${unique}::uuid[])
		`;

		for (const row of rows) {
			urls.set(
				String(row.id),
				mediaUrl({
					id: String(row.id),
					objectKey: row.object_key === null ? null : String(row.object_key),
					externalUrl: row.external_url === null ? null : String(row.external_url),
				}),
			);
		}

		const missing = unique.filter((id) => !urls.has(id));

		if (missing.length > 0) {
			throw new Error(
				`${missing.length} media reference(s) point at no asset row: ${missing.join(', ')}. ` +
					'The database is inconsistent with the content that references it.',
			);
		}
	}

	return {
		url(id) {
			const url = urls.get(id);

			if (url === undefined) {
				throw new Error(
					`media asset ${id} was not part of this lookup, so nothing resolved it to a URL.`,
				);
			}

			return url;
		},
	};
}
