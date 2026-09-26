/**
 * The transform URL is the highest-risk string on the site: a malformed one does not throw,
 * it returns a broken image to a visitor. These are the rules that would otherwise only be
 * discoverable in production.
 */

import { describe, expect, it } from 'vitest';
import { IMAGE_WIDTHS, imageSrcset, transformConfig, transformUrl } from './images';

const BASE = 'https://banggaiescape.com/cdn-cgi/image';
const MEDIA = 'https://media.banggaiescape.com';
const CFG = transformConfig(BASE, MEDIA);
const SRC = 'https://media.banggaiescape.com/d38c4179-64e0-42e2-8575-ae3039b85382.jpg';

describe('transformUrl', () => {
	it('puts the options before the source, in the order the endpoint expects', () => {
		const url = transformUrl(BASE, SRC, 900);

		expect(url.startsWith(`${BASE}/width=900,`)).toBe(true);
		expect(url.endsWith(encodeURIComponent(SRC))).toBe(true);
	});

	it('encodes the source, so its own query string cannot be read as options', () => {
		// An unencoded `?` and `&` in the source would be parsed as parameters to *this*
		// request, which is a silent misconfiguration rather than an error.
		const withQuery = 'https://media.banggaiescape.com/a.jpg?w=10&format=original';
		const url = transformUrl(BASE, withQuery, 400);

		expect(url).toContain(encodeURIComponent(withQuery));
		// Zero raw `?`: the source's own query string is fully encoded, so it cannot be
		// parsed as options to this request.
		expect(url.split('?').length - 1).toBe(0);
		expect(url).toContain('%3F');
	});

	it('asks for scale-down so a small source is never enlarged', () => {
		// Without it, a 600px source fills a 1600px request by inventing pixels.
		expect(transformUrl(BASE, SRC, 1600)).toContain('fit=scale-down');
	});

	it('negotiates the format rather than pinning one', () => {
		expect(transformUrl(BASE, SRC, 400)).toContain('format=auto');
	});

	it('carries a fallback to the original', () => {
		// The safety net that removed the need for a `variants` column.
		expect(transformUrl(BASE, SRC, 400)).toContain('onerror=redirect');
	});

	it('sets a quality, because the default of 85 is larger than these need', () => {
		expect(transformUrl(BASE, SRC, 400)).toContain('quality=75');
	});
});

describe('imageSrcset', () => {
	it('offers every width with its descriptor', () => {
		const srcset = imageSrcset(SRC, CFG);

		expect(srcset).not.toBeNull();
		for (const width of IMAGE_WIDTHS) {
			expect(srcset).toContain(`${width}w`);
		}
	});

	it('lists candidates smallest first', () => {
		const widths = imageSrcset(SRC, CFG)
			?.split(', ')
			.map((candidate) => Number(/width=(\d+)/.exec(candidate)?.[1]));

		expect(widths).toEqual([...IMAGE_WIDTHS].sort((a, b) => a - b));
	});

	it('returns null when no transform endpoint is configured', () => {
		// Development, and any deployment that has not set it. A `srcset` of broken URLs
		// would be worse than no `srcset`.
		expect(imageSrcset(SRC, transformConfig(null, MEDIA))).toBeNull();
	});

	it('returns null for a non-http source, rather than building nonsense', () => {
		expect(imageSrcset('/local/thing.jpg', CFG)).toBeNull();
		expect(imageSrcset('data:image/gif;base64,AAAA', CFG)).toBeNull();
	});

	it('refuses to transform a URL on another origin', () => {
		// Verified against the live edge: the design-tool placeholder host answers a browser
		// with 200 and Cloudflare's fetcher with 403, so a `srcset` built from it is a row of
		// broken images.
		const placeholder = 'https://lh3.googleusercontent.com/aida-public/AB6AXu=w1200';

		expect(imageSrcset(placeholder, CFG)).toBeNull();
	});

	it('transforms any object in the media library, not just this one', () => {
		const other = `${MEDIA}/another-uuid.jpg`;

		expect(imageSrcset(other, CFG)).toContain('width=400');
	});

	it('returns null when the media base is unknown, even for a plausible URL', () => {
		// With no media base there is no way to tell an owned image from a foreign one, and
		// guessing wrong means a grid of 403s.
		expect(imageSrcset(SRC, transformConfig(BASE, null))).toBeNull();
	});

	it('honours an explicit width set', () => {
		const srcset = imageSrcset(SRC, CFG, [320]);

		expect(srcset?.split(', ')).toHaveLength(1);
		expect(srcset).toContain('width=320');
	});

	it('keeps the widths a fixed distance apart, so a retina screen has a candidate', () => {
		// Adjacent candidates 1px apart would give a 2x display nothing better to fetch.
		const sorted = [...IMAGE_WIDTHS].sort((a, b) => a - b);

		for (let i = 1; i < sorted.length; i += 1) {
			expect(sorted[i] / sorted[i - 1]).toBeGreaterThanOrEqual(1.8);
		}
	});
});

describe('transformConfig', () => {
	it('treats an absent, empty or whitespace value as absent', () => {
		// Every caller then takes the same "no transform" path instead of re-checking.
		for (const value of [undefined, '', '   ']) {
			expect(transformConfig(value, MEDIA).base).toBeNull();
			expect(transformConfig(BASE, value).mediaBase).toBeNull();
		}
	});

	it('strips a trailing slash from both, which are concatenated', () => {
		// A doubled separator is a subtly wrong URL rather than an obvious failure.
		const config = transformConfig(`${BASE}/`, `${MEDIA}/`);

		expect(config.base).toBe(BASE);
		expect(config.mediaBase).toBe(MEDIA);

		// Read through a guard rather than `!`, so a future change that makes either value
		// nullable fails here as a real reason instead of being silenced.
		const { base, mediaBase } = config;

		expect(base && mediaBase).toBeTruthy();

		if (!base || !mediaBase) return;

		expect(transformUrl(base, `${mediaBase}/a.jpg`, 400)).not.toContain('//a.jpg');
	});
});
