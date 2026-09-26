/**
 * The Content Security Policy must allow every origin this site loads, and forbid the
 * things it has no business loading.
 *
 * ## Why this test exists
 *
 * A CSP is enforced by the browser, not by us, and it fails *silently*. The first version
 * of this policy allowed `fonts.googleapis.com` and forgot `cdnjs.cloudflare.com`, so in
 * production the Font Awesome stylesheet would have been refused — and every icon on the
 * site would have disappeared without a single console error pointing at the cause. The
 * type checker is happy, the build is happy, the tests that existed were happy.
 *
 * Nothing but a test that reads both sides can catch that class of mistake, so this reads
 * the origins out of the source and the directives out of `csp.ts` and compares them.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { cspDirectives, navigationOnlyOrigins } from './csp';

/** Every file whose contents can end up naming an external origin in the document. */
function sourceFiles(dir: string): string[] {
	const found: string[] = [];

	for (const entry of readdirSync(dir)) {
		const path = join(dir, entry);

		// A test file is never rendered, so a URL in one cannot cause a fetch the browser would
		// then refuse. Without this, a fixture like `https://media.example.com/a.jpg` fails a
		// test about production, and the tempting fix — widening the policy — is a real
		// regression made to satisfy a string in a test.
		if (/\.spec\.ts$/.test(entry)) continue;

		if (statSync(path).isDirectory()) {
			found.push(...sourceFiles(path));
		} else if (/\.(svelte|ts|js|html|css)$/.test(entry)) {
			found.push(path);
		}
	}

	return found;
}

/**
 * Origins this codebase names but never loads.
 *
 * `schema.org` appears as the `@context` of every JSON-LD block. That is a *vocabulary
 * identifier* — a string inside a `<script type="application/ld+json">` data block — and
 * nothing ever requests it. A browser applying `img-src` has no opinion about a string inside a
 * data block, and listing schema.org as an allowed image source would widen the policy to
 * accommodate a vocabulary name.
 *
 * Listed here rather than special-cased in the regex so that it is reviewable: this is the one
 * place a named-but-unfetched origin can be excused, and a reader deciding whether the policy
 * is too loose starts by reading this.
 */
const NEVER_FETCHED = new Set(['schema.org']);

/**
 * Comments name documentation URLs (`see https://svelte.dev`) that the document never
 * loads, and counting those would demand a policy entry for every reference link anyone
 * ever writes.
 *
 * Block comments go wholesale. Line comments are removed only where `//` is *not* preceded
 * by a colon, because every URL in this codebase contains `//` and blanking those would
 * delete the very origins this test exists to find.
 */
function withoutComments(text: string): string {
	return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/** Absolute `https://host` prefixes, which is what a CSP source expression looks like. */
function externalOriginsIn(dir: string): Map<string, Set<string>> {
	const origins = new Map<string, Set<string>>();

	for (const file of sourceFiles(dir)) {
		const text = withoutComments(readFileSync(file, 'utf8'));
		const found = text.match(/https:\/\/[a-z0-9.-]+\.[a-z]{2,}/gi) ?? [];

		for (const match of found) {
			// Reduce to the origin, and never treat our own domain as a third party.
			const origin = match
				.replace(/^https:\/\//i, '')
				.split('/')[0]
				.toLowerCase();
			if (origin === 'banggaiescape.com') continue;
			if (NEVER_FETCHED.has(origin)) continue;

			const files = origins.get(origin) ?? new Set<string>();
			files.add(file);
			origins.set(origin, files);
		}
	}

	return origins;
}

/** The value list for one directive, or `undefined` when the policy does not set it. */
function sourcesFor(directive: string): string[] | undefined {
	const value = (cspDirectives as Record<string, unknown>)[directive];
	return Array.isArray(value) ? (value as string[]) : undefined;
}

const origins = externalOriginsIn(join(process.cwd(), 'src'));

/**
 * Which directive governs a given origin, mirroring how a browser resolves one:
 * a stylesheet is `style-src`, a script is `script-src`, and the font files a
 * stylesheet pulls down are `font-src`. Image hosts fall back to `img-src`.
 */
function directivesFor(origin: string): string[] {
	if (origin === 'static.cloudflareinsights.com') return ['script-src'];
	if (origin === 'cloudflareinsights.com') return ['connect-src'];
	return ['img-src'];
}

describe('the content security policy', () => {
	it('finds the external origins in the source, so the rest of this file is not vacuous', () => {
		// If this ever returns an empty set the assertions below would pass for the wrong
		// reason, which is the failure mode a test like this is most vulnerable to.
		expect(origins.size).toBeGreaterThan(0);
	});

	it('excludes only what cannot cause a fetch, so the exclusions cannot become a loophole', () => {
		// Every excuse above is a way for a real, un-allowed origin to stop being reported, so
		// each is asserted to be narrow. The first two are the scanner's own blind spots; the
		// third is the list of named-but-never-loaded origins.
		expect(sourceFiles(join(process.cwd(), 'src')).some((f) => f.includes('.spec.'))).toBe(false);
		expect(origins.has('schema.org')).toBe(false);
		// And the origins that genuinely are loaded must still be found, or the file has been
		// neutered rather than corrected.
		expect(origins.has('media.banggaiescape.com')).toBe(true);
		expect(origins.has('static.cloudflareinsights.com')).toBe(true);
	});

	it.each([...origins.keys()].sort())('allows the origin %s', (origin) => {
		// A navigation target is not a subresource, so no fetch directive governs it.
		if (navigationOnlyOrigins.includes(origin)) {
			expect(
				cspDirectives['form-action'],
				`${origin} is navigated to, not submitted to, so form-action must not need it`,
			).toBeDefined();
			return;
		}

		for (const directive of directivesFor(origin)) {
			const sources = sourcesFor(directive);

			expect(sources, `${directive} is not set at all`).toBeDefined();
			expect(
				sources,
				`${directive} must allow ${origin}, or the browser silently refuses it. ` +
					`Referenced by: ${[...(origins.get(origin) ?? [])].join(', ')}`,
			).toContain(`https://${origin}`);
		}
	});

	it('locks script execution down to this origin and the analytics beacon', () => {
		expect(sourcesFor('script-src')).toEqual(['self', 'https://static.cloudflareinsights.com']);
		// The one thing that would defeat the point: script-src must never be opened up.
		expect(sourcesFor('script-src')).not.toContain('unsafe-inline');
		expect(sourcesFor('script-src')).not.toContain('unsafe-eval');
	});

	it('forbids the directives that make a policy decorative', () => {
		expect(sourcesFor('object-src')).toEqual(['none']);
		expect(sourcesFor('frame-ancestors')).toEqual(['none']);
		expect(sourcesFor('base-uri')).toEqual(['self']);
		expect(cspDirectives['upgrade-insecure-requests']).toBe(true);
	});

	it('scopes the inline-style exception to attributes rather than whole stylesheets', () => {
		// The `fly` transitions genuinely need `unsafe-inline` for <style> elements, so the
		// permission cannot be removed — but it should not be the only thing standing between
		// the policy and a wide open script-src, and it should be a deliberate, separate line.
		expect(sourcesFor('style-src-attr')).toEqual(['unsafe-inline']);
	});
});
