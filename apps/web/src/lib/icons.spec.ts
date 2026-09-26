/**
 * Every icon a template references must have a glyph.
 *
 * ## Why this test
 *
 * `src/lib/icons.ts` is generated from the Font Awesome package and committed, so it can
 * fall behind the templates. When it does, the failure is an invisible one: with an icon
 * *font* a missing glyph renders as an empty box, which looks like a styling bug and reaches
 * a visitor. `Icon.svelte` reports it loudly in development, but a developer who never opens
 * the page never sees that.
 *
 * So the build refuses instead. Run the generator after adding an icon in the admin:
 *
 * ```sh
 * pnpm --filter @banggai/web exec tsx scripts/generate-icons.ts
 * ```
 *
 * ## What it deliberately does not cover
 *
 * Icons named in the *database* — the `icon` fields on socials, features, visionMission and
 * contactChannels — cannot be seen from the source tree. `generate-icons.ts` keeps an
 * explicit list of those, and the honest limitation is written down there rather than
 * papered over here: a newly added database icon is caught by the development warning, not
 * by this test.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { icons } from './icons';

const STYLES = ['fa-solid', 'fa-regular', 'fa-brands'];

function svelteFiles(dir: string): string[] {
	const found: string[] = [];

	for (const entry of readdirSync(dir)) {
		const path = join(dir, entry);

		if (statSync(path).isDirectory()) found.push(...svelteFiles(path));
		else if (entry.endsWith('.svelte')) found.push(path);
	}

	return found;
}

/** Every `fa-*` name referenced as an icon, ignoring the style prefixes. */
function referencedIcons(): Map<string, string[]> {
	const found = new Map<string, string[]>();

	for (const file of svelteFiles(join(process.cwd(), 'src'))) {
		const relative = file.replace(`${process.cwd()}/`, '');
		const text = readFileSync(file, 'utf8');

		// Two forms are legitimate: the raw class pair the database holds, and the
		// `class="fa-solid fa-star"` prop this component takes.
		for (const match of text.matchAll(/\bfa-(?:solid|regular|brands)\s+fa-([a-z0-9-]+)/g)) {
			const name = `fa-${match[1]}`;
			found.set(name, [...(found.get(name) ?? []), relative]);
		}
	}

	return found;
}

const referenced = referencedIcons();

describe('the generated icon set', () => {
	it('is not empty, so the assertions below are not vacuous', () => {
		expect(Object.keys(icons).length).toBeGreaterThan(20);
	});

	it('has a glyph for every icon a template references', () => {
		const missing = [...referenced.entries()]
			.filter(([name]) => !icons[name])
			.map(([name, files]) => `  ${name}  (${[...new Set(files)].join(', ')})`);

		expect(
			missing,
			missing.length === 0
				? ''
				: `\n${missing.join('\n')}\n\n` +
						'These have no glyph. Run: pnpm --filter @banggai/web exec tsx scripts/generate-icons.ts',
		).toEqual([]);
	});

	it('found the references at all, rather than scanning nothing', () => {
		expect(referenced.size).toBeGreaterThan(20);
	});

	it('stores usable path data, not empty or malformed glyphs', () => {
		for (const [name, glyph] of Object.entries(icons)) {
			// A viewBox is four numbers; a path is a run of commands. A truncated or
			// mis-parsed SVG would otherwise render as nothing at all.
			expect(glyph.viewBox, `${name} viewBox`).toMatch(
				/^-?\d+(\.\d+)?\s+(-?\d+(\.\d+)?\s+){2}\d+(\.\d+)?$/,
			);
			expect(glyph.path.length, `${name} path`).toBeGreaterThan(20);
			expect(glyph.path, `${name} path`).toMatch(/^[Mm]/);
		}
	});

	it('keeps the style prefixes out of the map keys', () => {
		// `fa-brands fa-instagram` must resolve to `fa-instagram`. A key carrying the prefix
		// would silently miss every icon, which the assertions above would catch — but the
		// name says why.
		for (const style of STYLES) {
			expect(Object.keys(icons)).not.toContain(style);
		}
	});
});
