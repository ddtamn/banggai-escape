/**
 * The Content Security Policy, declared once and in a place a test can read.
 *
 * ## Why this is a module and not inline in `vite.config.ts`
 *
 * SvelteKit hashes or nonces the inline scripts and styles it generates itself, which is
 * the only way to write a `script-src` strict enough to be worth having — the hydration
 * payload alone is a ~40 KB inline `<script>`. That configuration lives in
 * `vite.config.ts`, which is not importable from a test without dragging in the whole Vite
 * plugin chain.
 *
 * So the *directives* live here, `vite.config.ts` imports them, and
 * `csp.spec.ts` asserts that this site does not reference an origin the policy forbids.
 * That assertion is not ceremony: the first version of this policy allowed
 * `fonts.googleapis.com` and forgot `cdnjs.cloudflare.com`, which would have blocked the
 * Font Awesome stylesheet in production and made every icon on the site disappear without
 * a single error. A missing origin fails silently and looks like a styling bug.
 *
 * The values are **unquoted** — SvelteKit adds the quotes when it serialises the header.
 */

import type { Config } from '@sveltejs/kit';

/**
 * SvelteKit declares `CspDirectives` but does not export it, so the shape is derived from
 * the public `Config` type instead. That is better than hand-writing it: if the library
 * changes the directive names or the value type, this stops compiling rather than quietly
 * accepting a policy the library will reject.
 */
type CspDirectives = NonNullable<NonNullable<NonNullable<Config['kit']>['csp']>['directives']>;

/**
 * Origins this policy names, and why each one is here.
 *
 * Google Fonts and cdnjs are both third-party and both removable: Phase 4 of
 * `docs/16-web-polish-plan.md` self-hosts the typeface and subsets Font Awesome, at which
 * point those two entries get deleted and `csp.spec.ts` keeps the policy honest about it.
 * The two image placeholders are design-tool leftovers on the same schedule.
 */
export const cspDirectives: CspDirectives = {
	'default-src': ['self'],
	'base-uri': ['self'],
	'object-src': ['none'],
	// Nothing frames this site, and a framed sign-in form is a clickjacking target.
	'frame-ancestors': ['none'],
	'form-action': ['self'],

	// Cloudflare's Web Analytics beacon, injected at the edge rather than by our code.
	'script-src': ['self', 'https://static.cloudflareinsights.com'],

	/**
	 * `unsafe-inline` is required, not sloppily granted: the three `fly` transitions inject a
	 * `<style>` element at runtime, which a nonce cannot cover. `style-src-attr` is
	 * separated out so that permission is scoped to the one hero `style={...}` attribute
	 * that needs it rather than to every stylesheet on the page.
	 */
	'style-src': [
		'self',
		'unsafe-inline',
		'https://fonts.googleapis.com',
		'https://cdnjs.cloudflare.com',
	],
	'style-src-attr': ['unsafe-inline'],

	'font-src': ['self', 'https://fonts.gstatic.com', 'data:'],

	'img-src': [
		'self',
		'data:',
		// The media library's own host.
		'https://media.banggaiescape.com',
		// Flag images in the language switcher.
		'https://flagcdn.com',
		// Design-tool placeholders, pending Phase 4.
		'https://lh3.googleusercontent.com',
		'https://images.unsplash.com',
	],

	'connect-src': ['self', 'https://cloudflareinsights.com'],
	'manifest-src': ['self'],
	'upgrade-insecure-requests': true,
};
