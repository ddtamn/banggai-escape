/**
 * Where a media object lives, and how it is addressed publicly.
 *
 * Object keys are UUID-based and immutable: content references the *row*, so replacing
 * an image means inserting a new row, never overwriting bytes that a live page is
 * already pointing at. That also means an upload can never collide with an existing
 * object, and a cached response can never go stale.
 */

/** New uploads, ready to be used as an R2 object key. */
export function objectKeyFor(extension: string): string {
	return `${crypto.randomUUID()}${normaliseExtension(extension)}`;
}

/** Keeps a key from a stored record safe to interpolate into a URL. */
export function isManagedObjectKey(value: string): boolean {
	return /^[0-9a-f-]{36}\.[a-z0-9]+$/i.test(value);
}

/** The path this app serves a private-bucket object from. */
export function mediaRoutePath(objectKey: string): string {
	return `/media/${objectKey}`;
}

/**
 * The public URL for a media row.
 *
 * Two deliberate behaviours:
 *
 * - A legacy asset keeps its own absolute `externalUrl` untouched. Those bytes live on
 *   someone else's CDN until they are moved into R2, and rewriting the URL now would
 *   break them.
 * - An R2 object is served from `MEDIA_PUBLIC_URL` when it is configured, and from the
 *   Worker's own `/media/<key>` route when it is not. That fallback is what makes local
 *   development work — the local R2 simulation has no public hostname — but it is also
 *   the escape hatch if the bucket is never given a custom domain. The `r2.dev` URL is
 *   never used.
 */
export function publicMediaUrl(
	asset: { objectKey: string | null; externalUrl: string | null },
	mediaPublicUrl?: string | null,
): string | null {
	if (asset.externalUrl) return asset.externalUrl;
	if (!asset.objectKey) return null;

	const base = mediaPublicUrl?.replace(/\/+$/, '');

	return base ? `${base}/${asset.objectKey}` : mediaRoutePath(asset.objectKey);
}

function normaliseExtension(extension: string): string {
	const cleaned = extension.toLowerCase().replace(/[^a-z0-9]/g, '');

	return cleaned.length > 0 ? `.${cleaned}` : '';
}
