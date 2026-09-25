/**
 * Storing an upload.
 *
 * Order of operations is deliberate: the bytes are validated *before* anything is
 * written, the object is written *before* the row, and a failure to write the row cleans
 * the object up. The alternative — a row pointing at bytes that were never stored — is a
 * broken image that looks like a database problem.
 */
import { randomUUID } from 'node:crypto';
import { db as defaultDb } from '$lib/server/db';
import { mediaAssets } from '$lib/server/db/schema';
import { objectKeyFor } from './keys';
import { validateUpload } from './validate';

export type UploadInput = {
	bytes: Uint8Array;
	fileName: string;
	declaredType?: string | null;
	altText?: string | null;
	/** The administrator's `user.id`, recorded so the library can show who added it. */
	uploadedBy?: string | null;
};

export type UploadResult =
	| { ok: true; id: string; objectKey: string }
	| { ok: false; reason: string };

export async function storeUpload(
	input: UploadInput,
	bucket: R2Bucket | undefined,
	db = defaultDb,
): Promise<UploadResult> {
	if (!bucket) {
		return { ok: false, reason: 'The media bucket is not bound in this environment.' };
	}

	const decision = validateUpload({
		bytes: input.bytes,
		declaredType: input.declaredType,
		fileName: input.fileName,
	});

	if (!decision.ok) return decision;

	const objectKey = objectKeyFor(decision.extension);
	const id = randomUUID();

	await bucket.put(objectKey, input.bytes, {
		httpMetadata: { contentType: decision.mimeType },
		// Immutable: the key is a fresh UUID, so this response can never go stale.
		customMetadata: { mediaAssetId: id },
	});

	try {
		await db.insert(mediaAssets).values({
			id,
			objectKey,
			originalName: input.fileName,
			mimeType: decision.mimeType,
			byteSize: decision.byteSize,
			width: decision.width,
			height: decision.height,
			altText: input.altText?.trim() ? input.altText.trim() : null,
			uploadedBy: input.uploadedBy ?? null,
		});
	} catch (error) {
		// Leaving the object behind would be an orphan nothing can list or delete.
		await bucket.delete(objectKey);
		throw error;
	}

	return { ok: true, id, objectKey };
}
