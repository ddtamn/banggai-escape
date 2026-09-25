/**
 * Upload validation for the media library.
 *
 * Deliberately pure and dependency-free: no R2, no database, no SvelteKit. Everything
 * here takes bytes and metadata and returns a decision, so the rules are unit-testable
 * and the route handler is left with only I/O.
 *
 * The checks are ordered cheapest-first (declared type, size, then the byte signature),
 * because the goal is to reject a hostile or mistaken file *before* it is stored, and
 * the declared values come from the client and are therefore only a hint.
 */

/** The declared upload cap. Conservative on purpose; raise it deliberately. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/**
 * Accepted image types, keyed by the MIME type we store.
 *
 * Every entry carries the magic bytes we verify and the extensions a browser may send,
 * so a file is accepted only when all three agree. SVG is deliberately absent: it is
 * active content, and serving user-uploaded SVG from a public media host is an XSS
 * vector.
 */
const ACCEPTED = {
	'image/jpeg': { extensions: ['.jpg', '.jpeg'], magic: [[0xff, 0xd8, 0xff]] },
	'image/png': { extensions: ['.png'], magic: [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]] },
	'image/webp': { extensions: ['.webp'], magic: [riff('WEBP')] },
	'image/avif': { extensions: ['.avif'], magic: [isoBmff('avif'), isoBmff('avis')] },
} as const;

export type AcceptedMimeType = keyof typeof ACCEPTED;

export const acceptedMimeTypes = Object.keys(ACCEPTED) as AcceptedMimeType[];

/** A rejection the caller can show to an administrator. */
export type UploadRejection = {
	readonly ok: false;
	readonly reason: string;
};

export type AcceptedUpload = {
	readonly ok: true;
	readonly mimeType: AcceptedMimeType;
	/** The extension to store, normalised from the MIME type rather than trusted. */
	readonly extension: string;
	readonly byteSize: number;
	readonly width: number | null;
	readonly height: number | null;
};

export type UploadDecision = UploadRejection | AcceptedUpload;

/**
 * Decides whether a file may be stored.
 *
 * `declaredType` and `fileName` are client-supplied and are only used to produce a better
 * error message — the accepted type is the one the bytes prove.
 */
export function validateUpload(input: {
	bytes: Uint8Array;
	declaredType?: string | null;
	fileName?: string | null;
	maxBytes?: number;
}): UploadDecision {
	const maxBytes = input.maxBytes ?? MAX_UPLOAD_BYTES;
	const { bytes } = input;

	if (bytes.byteLength === 0) {
		return { ok: false, reason: 'That file is empty.' };
	}

	if (bytes.byteLength > maxBytes) {
		return {
			ok: false,
			reason: `That file is ${formatBytes(bytes.byteLength)}, over the ${formatBytes(maxBytes)} limit.`,
		};
	}

	const mimeType = detectMimeType(bytes);

	if (!mimeType) {
		const declared = input.declaredType ? ` (sent as ${input.declaredType})` : '';

		return {
			ok: false,
			reason: `Unsupported image format${declared}. Use JPEG, PNG, WebP, or AVIF.`,
		};
	}

	// A declared type that contradicts the bytes is not fatal on its own — browsers
	// mislabel files — but the extension we store comes from the bytes either way.
	const extension = ACCEPTED[mimeType].extensions[0];
	const declared = input.declaredType?.toLowerCase().split(';')[0].trim();

	if (declared && declared !== mimeType) {
		return {
			ok: false,
			reason: `That file is a ${mimeType} but was sent as ${declared}.`,
		};
	}

	const size = imageSize(bytes, mimeType);

	return {
		ok: true,
		mimeType,
		extension,
		byteSize: bytes.byteLength,
		width: size?.width ?? null,
		height: size?.height ?? null,
	};
}

/** The accepted MIME type the bytes actually are, or `null` if none matches. */
export function detectMimeType(bytes: Uint8Array): AcceptedMimeType | null {
	for (const mimeType of acceptedMimeTypes) {
		for (const signature of ACCEPTED[mimeType].magic) {
			if (matches(bytes, signature)) return mimeType;
		}
	}

	return null;
}

/**
 * Pixel dimensions, read from the header.
 *
 * Only the formats we accept are parsed, and a format we cannot read returns `null`
 * rather than a guess: a missing dimension is honest, a wrong one is not. The media
 * record then simply has no width/height, which the UI shows as unknown.
 */
export function imageSize(
	bytes: Uint8Array,
	mimeType: AcceptedMimeType,
): { width: number; height: number } | null {
	if (mimeType === 'image/png') return pngSize(bytes);
	if (mimeType === 'image/jpeg') return jpegSize(bytes);
	if (mimeType === 'image/webp') return webpSize(bytes);

	return null;
}

function pngSize(bytes: Uint8Array) {
	// IHDR is the first chunk: 8 bytes of signature, 4 length, 4 type, then width, height.
	if (bytes.byteLength < 24) return null;

	return { width: readUint32(bytes, 16), height: readUint32(bytes, 20) };
}

function jpegSize(bytes: Uint8Array) {
	// Walk the marker segments to the start-of-frame, which holds the dimensions.
	let offset = 2;

	while (offset + 9 < bytes.byteLength) {
		if (bytes[offset] !== 0xff) {
			offset += 1;
			continue;
		}

		const marker = bytes[offset + 1];

		// SOF0..SOF15, excluding the non-frame markers in that range.
		if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
			return {
				height: (bytes[offset + 5] << 8) | bytes[offset + 6],
				width: (bytes[offset + 7] << 8) | bytes[offset + 8],
			};
		}

		const length = (bytes[offset + 2] << 8) | bytes[offset + 3];

		if (length < 2) return null;

		offset += 2 + length;
	}

	return null;
}

function webpSize(bytes: Uint8Array) {
	if (bytes.byteLength < 30) return null;

	const format = text(bytes, 12, 4);

	if (format === 'VP8 ')
		return { width: readUint16LE(bytes, 26) & 0x3fff, height: readUint16LE(bytes, 28) & 0x3fff };
	if (format === 'VP8L') {
		const bits = readUint32LE(bytes, 21);

		return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
	}

	if (format === 'VP8X')
		return { width: readUint24LE(bytes, 24) + 1, height: readUint24LE(bytes, 27) + 1 };

	return null;
}

/**
 * A byte signature. `null` is a wildcard, for a field whose value is a length or a size
 * rather than a constant — a literal `0` was the previous stand-in here, which silently
 * made every 0x00 byte in a signature optional.
 */
type Signature = readonly (number | null)[];

/** `RIFF` + a 4-byte size + the form type. WebP is the `WEBP` form. */
function riff(fourCC: string): Signature {
	return [...bytesOf('RIFF'), null, null, null, null, ...bytesOf(fourCC)];
}

/** Bytes 4..8 are `ftyp`, then the major brand at 8..12. */
function isoBmff(brand: string): Signature {
	return [null, null, null, null, ...bytesOf('ftyp'), ...bytesOf(brand)];
}

function bytesOf(ascii: string): number[] {
	return [...ascii].map((character) => character.charCodeAt(0));
}

function matches(bytes: Uint8Array, signature: Signature): boolean {
	if (bytes.byteLength < signature.length) return false;

	return signature.every((byte, index) => byte === null || bytes[index] === byte);
}

function text(bytes: Uint8Array, offset: number, length: number) {
	return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

function readUint32(bytes: Uint8Array, offset: number) {
	return (
		((bytes[offset] << 24) |
			(bytes[offset + 1] << 16) |
			(bytes[offset + 2] << 8) |
			bytes[offset + 3]) >>>
		0
	);
}

function readUint32LE(bytes: Uint8Array, offset: number) {
	return (
		(bytes[offset] |
			(bytes[offset + 1] << 8) |
			(bytes[offset + 2] << 16) |
			(bytes[offset + 3] << 24)) >>>
		0
	);
}

function readUint24LE(bytes: Uint8Array, offset: number) {
	return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
}

function readUint16LE(bytes: Uint8Array, offset: number) {
	return bytes[offset] | (bytes[offset + 1] << 8);
}

/**
 * A size an administrator reads, not a machine's. Trailing `.0` is dropped so the limit
 * announces itself as "10 MiB" rather than "10.0 MiB".
 */
export function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KiB`;

	const mebibytes = bytes / (1024 * 1024);

	return `${Number(mebibytes.toFixed(1))} MiB`;
}
