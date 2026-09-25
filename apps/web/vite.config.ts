import adapter from '@sveltejs/adapter-cloudflare';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

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
			typescript: {
				config: (config) => {
					// One-shot migration scripts are not part of the Worker bundle, but they still
					// have to typecheck — SvelteKit's generated tsconfig only includes `src`.
					config.include.push('../scripts/**/*.ts');
				},
			},
		}),
	],
});
