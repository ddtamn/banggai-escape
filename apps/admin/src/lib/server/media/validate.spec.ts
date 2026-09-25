import { deflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import {
	detectMimeType,
	formatBytes,
	imageSize,
	MAX_UPLOAD_BYTES,
	validateUpload,
} from './validate';

/**
 * Fixtures are built rather than committed: a binary blob in the repo cannot be reviewed,
 * and these need to be small and exact. Every one is a *real* header, so the byte
 * signatures and the dimension readers are exercised for real.
 */
function png(width: number, height: number): Uint8Array {
	const raw = Buffer.alloc((width * 3 + 1) * height);

	for (let y = 0; y < height; y += 1) {
		for (let x = 0; x < width; x += 1) {
			const offset = y * (width * 3 + 1) + 1 + x * 3;
			raw[offset] = 200;
		}
	}

	const chunk = (type: string, data: Buffer) => {
		const length = Buffer.alloc(4);
		length.writeUInt32BE(data.length);

		const body = Buffer.concat([Buffer.from(type), data]);
		const crc = Buffer.alloc(4);
		crc.writeUInt32BE(crc32(body));

		return Buffer.concat([length, body, crc]);
	};

	const ihdr = Buffer.alloc(13);
	ihdr.writeUInt32BE(width, 0);
	ihdr.writeUInt32BE(height, 4);
	ihdr[8] = 8;
	ihdr[9] = 2;

	return new Uint8Array(
		Buffer.concat([
			Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
			chunk('IHDR', ihdr),
			chunk('IDAT', deflateSync(raw)),
			chunk('IEND', Buffer.alloc(0)),
		]),
	);
}

/** A JPEG trimmed to SOI plus one SOF0 frame header — enough for the marker walk. */
function jpeg(width: number, height: number): Uint8Array {
	const sof0 = Buffer.alloc(14);

	sof0[0] = 0xff;
	sof0[1] = 0xc0;
	sof0.writeUInt16BE(0x0011, 2); // segment length
	sof0[4] = 0x08; // precision
	sof0.writeUInt16BE(height, 5);
	sof0.writeUInt16BE(width, 7);

	return new Uint8Array(Buffer.concat([Buffer.from([0xff, 0xd8]), sof0]));
}

/** RIFF/WEBP with the lossy `VP8 ` frame header that carries the dimensions. */
function webp(width: number, height: number): Uint8Array {
	const bytes = Buffer.alloc(40);

	bytes.write('RIFF', 0, 'ascii');
	bytes.writeUInt32LE(32, 4);
	bytes.write('WEBP', 8, 'ascii');
	bytes.write('VP8 ', 12, 'ascii');
	bytes[26] = width & 0xff;
	bytes[27] = (width >> 8) & 0x3f;
	bytes[28] = height & 0xff;
	bytes[29] = (height >> 8) & 0x3f;

	return new Uint8Array(bytes);
}

/** ISO-BMFF with the `avif` major brand. */
function avif(): Uint8Array {
	const bytes = Buffer.alloc(32);

	bytes.writeUInt32BE(24, 0);
	bytes.write('ftyp', 4, 'ascii');
	bytes.write('avif', 8, 'ascii');

	return new Uint8Array(bytes);
}

/** CRC-32, so the PNG fixture is a file a decoder would actually accept. */
function crc32(buffer: Buffer): number {
	let crc = 0xffffffff;

	for (const byte of buffer) {
		crc ^= byte;

		for (let bit = 0; bit < 8; bit += 1) {
			crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
		}
	}

	return (crc ^ 0xffffffff) >>> 0;
}

describe('validateUpload', () => {
	it('accepts a PNG and reads its dimensions', () => {
		const decision = validateUpload({ bytes: png(4, 3), declaredType: 'image/png' });

		expect(decision.ok).toBe(true);
		if (!decision.ok) return;

		expect(decision.mimeType).toBe('image/png');
		expect(decision.extension).toBe('.png');
		expect(decision.width).toBe(4);
		expect(decision.height).toBe(3);
		expect(decision.byteSize).toBe(png(4, 3).byteLength);
	});

	it('accepts a JPEG and reads its dimensions from the frame header', () => {
		const decision = validateUpload({ bytes: jpeg(640, 480), declaredType: 'image/jpeg' });

		expect(decision.ok).toBe(true);
		if (!decision.ok) return;

		expect(decision.mimeType).toBe('image/jpeg');
		expect(decision.extension).toBe('.jpg');
		expect(decision.width).toBe(640);
		expect(decision.height).toBe(480);
	});

	it('accepts a WebP and reads its dimensions', () => {
		const decision = validateUpload({ bytes: webp(800, 600) });

		expect(decision.ok).toBe(true);
		if (!decision.ok) return;

		expect(decision.mimeType).toBe('image/webp');
		expect(decision.extension).toBe('.webp');
		expect(decision.width).toBe(800);
		expect(decision.height).toBe(600);
	});

	it('accepts AVIF but reports no dimensions rather than guessing', () => {
		const decision = validateUpload({ bytes: avif(), declaredType: 'image/avif' });

		expect(decision.ok).toBe(true);
		if (!decision.ok) return;

		expect(decision.mimeType).toBe('image/avif');
		// Honest: a missing dimension is displayed as unknown, a wrong one would mislead.
		expect(decision.width).toBeNull();
		expect(decision.height).toBeNull();
	});

	it('rejects an empty file', () => {
		const decision = validateUpload({ bytes: new Uint8Array(0) });

		expect(decision).toEqual({ ok: false, reason: 'That file is empty.' });
	});

	it('rejects a file whose bytes are not an image, whatever it claims to be', () => {
		const decision = validateUpload({
			bytes: new Uint8Array(Buffer.from('#!/bin/sh\nrm -rf /')),
			declaredType: 'image/png',
			fileName: 'totally.png',
		});

		expect(decision.ok).toBe(false);
		if (decision.ok) return;

		expect(decision.reason).toContain('Unsupported image format');
		expect(decision.reason).toContain('sent as image/png');
	});

	it('rejects a file whose declared type contradicts its bytes', () => {
		const decision = validateUpload({ bytes: png(2, 2), declaredType: 'image/jpeg' });

		expect(decision.ok).toBe(false);
		if (decision.ok) return;

		expect(decision.reason).toBe('That file is a image/png but was sent as image/jpeg.');
	});

	it('rejects SVG, which is active content', () => {
		const svg = new Uint8Array(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'));

		expect(validateUpload({ bytes: svg, declaredType: 'image/svg+xml' }).ok).toBe(false);
	});

	it('accepts a file exactly at the limit and rejects one byte over', () => {
		const padded = (size: number) => {
			const bytes = new Uint8Array(size);
			bytes.set(png(1, 1).subarray(0, 8));

			return bytes;
		};

		expect(MAX_UPLOAD_BYTES).toBe(10 * 1024 * 1024);
		expect(validateUpload({ bytes: padded(MAX_UPLOAD_BYTES) }).ok).toBe(true);

		const decision = validateUpload({ bytes: padded(MAX_UPLOAD_BYTES + 1) });

		expect(decision.ok).toBe(false);
		if (decision.ok) return;

		// Size is checked before the type, so an oversized file is never even inspected.
		expect(decision.reason).toContain('over the 10 MiB limit');
	});

	it('honours a raised ceiling when one is supplied', () => {
		const bytes = png(1, 1);

		expect(validateUpload({ bytes, maxBytes: bytes.byteLength }).ok).toBe(true);
		expect(validateUpload({ bytes, maxBytes: bytes.byteLength - 1 }).ok).toBe(false);
	});
});

describe('detectMimeType', () => {
	it('identifies each accepted format from its leading bytes', () => {
		expect(detectMimeType(png(1, 1))).toBe('image/png');
		expect(detectMimeType(jpeg(1, 1))).toBe('image/jpeg');
		expect(detectMimeType(webp(1, 1))).toBe('image/webp');
		expect(detectMimeType(avif())).toBe('image/avif');
		expect(detectMimeType(new Uint8Array(Buffer.from('GIF89a')))).toBeNull();
	});

	it('does not match on a truncated signature', () => {
		expect(detectMimeType(png(1, 1).subarray(0, 4))).toBeNull();
	});
});

describe('imageSize', () => {
	it('returns null for a format it cannot parse', () => {
		expect(imageSize(avif(), 'image/avif')).toBeNull();
	});

	it('returns null for a corrupt header instead of a wrong number', () => {
		expect(imageSize(new Uint8Array(Buffer.from([0xff, 0xd8])), 'image/jpeg')).toBeNull();
		expect(imageSize(png(1, 1).subarray(0, 10), 'image/png')).toBeNull();
	});
});

describe('formatBytes', () => {
	it('reads the way an administrator would say it', () => {
		expect(formatBytes(512)).toBe('512 B');
		expect(formatBytes(2048)).toBe('2 KiB');
		expect(formatBytes(MAX_UPLOAD_BYTES)).toBe('10 MiB');
		expect(formatBytes(MAX_UPLOAD_BYTES + 8)).toBe('10 MiB');
		expect(formatBytes(15 * 1024 * 1024)).toBe('15 MiB');
	});
});
