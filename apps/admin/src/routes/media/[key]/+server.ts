/**
 * Serves an uploaded object from the bound R2 bucket.
 *
 * This exists for two reasons:
 *
 * 1. Local development. `wrangler dev` gets a *simulated* bucket, which no public
 *    hostname can reach, so `/media/<key>` is the only way an image renders locally.
 * 2. A fallback. If the bucket ever loses its custom domain, the app still works — it
 *    just pays to stream the bytes through the Worker.
 *
 * In production the read path is `MEDIA_PUBLIC_URL` (a custom domain straight onto R2),
 * so this route is normally not hit at all. It is deliberately **not** an authorization
 * boundary: an R2 custom domain serves every object in the bucket regardless, so a
 * soft-deleted asset stays reachable by its unguessable key until its bytes are removed.
 * Archiving hides an asset from the library; only deletion removes it.
 */
import { error } from '@sveltejs/kit';
import { isManagedObjectKey } from '$lib/server/media/keys';
import { getMediaAssetByObjectKey } from '$lib/server/media/library';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	const bucket = event.platform?.env.R2_MEDIA;
	const key = event.params.key;

	// Keys are UUID + extension. Anything else is not something this app stored, so it is
	// not something this route should look up.
	if (!isManagedObjectKey(key)) error(404, 'Not found');

	if (!bucket) error(404, 'Not found');

	const asset = await getMediaAssetByObjectKey(key);

	if (!asset || asset.archivedAt) error(404, 'Not found');

	const object = await bucket.get(key, {
		onlyIf: event.request.headers,
		range: event.request.headers,
	});

	if (!object) error(404, 'Not found');

	// A conditional request that R2 answered with a precondition failure still returns an
	// object with no body.
	if (!('body' in object)) {
		return new Response(null, { status: 304, headers: headers(object) });
	}

	return new Response(object.body, { headers: headers(object) });
};

function headers(object: R2Object | R2ObjectBody): Headers {
	const result = new Headers();

	object.writeHttpMetadata(result);
	result.set('etag', object.httpEtag);
	result.set('content-length', String(object.size));
	// Immutable keys, so this can be cached hard. Anonymous responses only: an
	// authenticated response must never land in a shared cache.
	result.set('cache-control', 'public, max-age=3600, immutable');

	return result;
}
