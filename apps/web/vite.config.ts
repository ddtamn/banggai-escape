import adapter from '@sveltejs/adapter-cloudflare';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
// The extension is deliberate: Vite's future default config loader requires it, and
// omitting it warns on every single command run from this file.
import { cspDirectives } from './src/lib/csp.ts';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true,
			},
			adapter: adapter(),
			csp: {
				/**
				 * SvelteKit's own hydration payload is a ~40 KB inline `<script>`, so a
				 * hand-rolled `script-src 'self'` would break the site rather than protect it.
				 * `auto` makes SvelteKit stamp a nonce on the scripts and styles it generates
				 * itself, which is what keeps the policy strict without breaking anything.
				 *
				 * The directives live in `src/lib/csp.ts` so `csp.spec.ts` can assert the
				 * policy still allows every origin this site loads.
				 */
				mode: 'auto',
				directives: cspDirectives,
			},
			typescript: {
				config: (config) => {
					// One-shot migration scripts are not part of the Worker bundle, but they still
					// have to typecheck — SvelteKit's generated tsconfig only includes `src`.
					config.include.push('../scripts/**/*.ts');
				},
			},
		}),
	],
	test: {
		/**
		 * One project, on Node, and only for the parts of this app that are pure.
		 *
		 * The read layer under `src/lib/server/content/` is where a mistake reaches a
		 * visitor, and the parts of it that can be tested without a database are the ones
		 * with the most interesting rules: the presenters that put a price and a duration on
		 * the page, and the slug-redirect chain that decides a 301. A module that opens a
		 * Neon connection is tested with the connection stubbed, the way `authz.spec.ts`
		 * does it in the admin — importing it must not be able to reach the network.
		 *
		 * There is no browser project here. The admin has one because it renders forms with
		 * a dozen field types; this app's components are presentational and its logic lives
		 * in loaders, and a component test here would be testing the browser.
		 */
		environment: 'node',
		include: ['src/**/*.{test,spec}.{js,ts}'],
		exclude: ['src/**/*.svelte.{test,spec}.{js,ts}'],
		expect: { requireAssertions: true },
	},
});
