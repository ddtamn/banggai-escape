import { describe, expect, it } from 'vitest';
import { isManagedObjectKey, mediaRoutePath, objectKeyFor, publicMediaUrl } from './keys';

describe('objectKeyFor', () => {
	it('builds a uuid key with the normalised extension', () => {
		expect(objectKeyFor('.PNG')).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.png$/,
		);
	});

	it('drops anything that is not alphanumeric from the extension', () => {
		// The extension reaches a URL, so path separators and query characters must not.
		expect(objectKeyFor('../../etc/passwd')).toMatch(/^[0-9a-f-]{36}\.etcpasswd$/);
		expect(objectKeyFor('?x=1')).toMatch(/^[0-9a-f-]{36}\.x1$/);
	});

	it('tolerates a missing extension', () => {
		expect(objectKeyFor('')).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
		);
	});

	it('never repeats itself', () => {
		const keys = new Set(Array.from({ length: 50 }, () => objectKeyFor('.png')));

		expect(keys.size).toBe(50);
	});
});

describe('isManagedObjectKey', () => {
	it('accepts what objectKeyFor produces', () => {
		expect(isManagedObjectKey(objectKeyFor('.webp'))).toBe(true);
	});

	it('refuses anything else', () => {
		for (const value of ['', 'notes.txt', '/etc/passwd', '../secret.png', 'a/b.png']) {
			expect(isManagedObjectKey(value)).toBe(false);
		}
	});
});

describe('publicMediaUrl', () => {
	it('leaves a legacy external URL exactly as it is', () => {
		// Those bytes live on someone else's CDN; rewriting the URL now would break them.
		expect(
			publicMediaUrl(
				{ objectKey: null, externalUrl: 'https://cdn.example/a.jpg' },
				'https://media.example',
			),
		).toBe('https://cdn.example/a.jpg');
	});

	it('serves an uploaded object from the public media host', () => {
		expect(
			publicMediaUrl({ objectKey: 'key.png', externalUrl: null }, 'https://media.example'),
		).toBe('https://media.example/key.png');
	});

	it('tolerates a trailing slash on the configured host', () => {
		expect(
			publicMediaUrl({ objectKey: 'key.png', externalUrl: null }, 'https://media.example/'),
		).toBe('https://media.example/key.png');
	});

	it('falls back to this app when no host is configured, as in local dev', () => {
		// A local upload lives in the local R2 simulation, which no public host can reach.
		expect(publicMediaUrl({ objectKey: 'key.png', externalUrl: null }, '')).toBe('/media/key.png');
		expect(publicMediaUrl({ objectKey: 'key.png', externalUrl: null }, null)).toBe(
			'/media/key.png',
		);
		expect(publicMediaUrl({ objectKey: 'key.png', externalUrl: null })).toBe('/media/key.png');
	});

	it('returns null when a row has neither source', () => {
		expect(
			publicMediaUrl({ objectKey: null, externalUrl: null }, 'https://media.example'),
		).toBeNull();
	});
});

describe('mediaRoutePath', () => {
	it('matches the route the admin Worker serves', () => {
		expect(mediaRoutePath('abc.png')).toBe('/media/abc.png');
	});
});
