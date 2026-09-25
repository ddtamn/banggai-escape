import adapter from '@sveltejs/adapter-cloudflare';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			// `$lib` was removed in SvelteKit 3 in favour of the `#lib` subpath import;
			// keep the familiar alias so existing imports keep resolving.
			alias: { $lib: 'src/lib' },
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true,
				experimental: { async: true },
			},
			adapter: adapter(),
			experimental: { remoteFunctions: true },
		}),
	],
});
