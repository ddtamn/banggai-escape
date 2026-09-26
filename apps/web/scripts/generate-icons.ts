/**
 * Generate `src/lib/icons.ts` from the Font Awesome SVG set.
 *
 * ## Why not just link the CDN stylesheet
 *
 * The full stylesheet plus its three icon fonts cost 310 KB to deliver 35 icons — 154 KB of
 * that is `fa-solid-900.woff2` and 115 KB is `fa-brands-400.woff2`, for six brand glyphs.
 * It was also the site's last render-blocking third-party origin.
 *
 * ## Why not replace the icon vocabulary
 *
 * The `icon` fields in the database hold `fa-*` class strings, and an editor picks them in
 * the admin. Swapping to a different icon system would mean migrating every stored string
 * and building an icon picker, for a cosmetic win. So the *data contract is unchanged*:
 * the database still says `fa-star`, and this still renders a star.
 *
 * What changes is that the glyph is inlined SVG rather than a font glyph, so only the
 * icons actually in use ship.
 *
 * ## The failure mode this is careful about
 *
 * A hardcoded icon set can be outgrown: an editor adds a social profile, picks an icon the
 * admin offers, and the glyph is missing. With an icon *font* that renders as an empty box
 * nobody notices until a visitor sees it. So `Icon.svelte` reports an unmapped name loudly
 * in development, and `icons.spec.ts` fails the build if the source references an icon this
 * map does not have.
 *
 * ## Running it
 *
 * ```sh
 * pnpm --filter @banggai/web exec tsx scripts/generate-icons.ts
 * ```
 *
 * Re-run it after adding an icon in the admin. It is idempotent and the output is committed,
 * so a build never depends on the Font Awesome package being resolvable.
 */

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(here, '..');
const svgRoot = join(appRoot, 'node_modules/@fortawesome/fontawesome-free/svgs');

/** The styles the free set ships, in the order they are searched. */
const STYLES = ['solid', 'regular', 'brands'] as const;

function sourceFiles(dir: string): string[] {
	const found: string[] = [];

	for (const entry of readdirSync(dir)) {
		const path = join(dir, entry);

		if (statSync(path).isDirectory()) found.push(...sourceFiles(path));
		else if (/\.svelte$/.test(entry)) found.push(path);
	}

	return found;
}

/** Every `fa-*` name the templates reference, from the `fa-<style> fa-<name>` form. */
function iconNamesInUse(): string[] {
	const names = new Set<string>();

	for (const file of sourceFiles(join(appRoot, 'src'))) {
		const text = readFileSync(file, 'utf8');

		for (const match of text.matchAll(/\bfa-(?:solid|regular|brands)\s+fa-([a-z0-9-]+)/g)) {
			names.add(`fa-${match[1]}`);
		}
	}

	return [...names].sort();
}

type Resolved = { name: string; style: string; viewBox: string; path: string };

/** The `<path>` markup and viewBox, with the licence comment stripped. */
function readGlyph(name: string): Resolved | null {
	for (const style of STYLES) {
		const file = join(svgRoot, style, `${name.replace(/^fa-/, '')}.svg`);
		if (!existsSync(file)) continue;

		const svg = readFileSync(file, 'utf8');
		const viewBox = /viewBox="([^"]+)"/.exec(svg)?.[1];
		const paths = [...svg.matchAll(/<path[^>]*\sd="([^"]+)"[^>]*\/?>/g)].map((m) => m[1]);

		if (!viewBox || paths.length === 0) return null;

		return { name, style, viewBox, path: paths.join(' ') };
	}

	return null;
}

/**
 * Icons the templates cannot reveal, because they are named in the database.
 *
 * The `icon` field on `socials`, `features`, `visionMission` and `contactChannels` is a free
 * string an editor fills in, so a source scan finds none of them — the current site ships 10
 * such icons and would render 10 empty boxes without this list.
 *
 * It has to be maintained by hand, which is the honest cost of letting the CMS hold the icon
 * vocabulary instead of a fixed enum. The two things that make that safe:
 *
 * - `Icon.svelte` reports an unmapped name loudly in development, so a newly added setting
 *   icon is noticed while someone is looking at the page, not by a visitor.
 * - `icons.spec.ts` fails the build when a *template* references something unmapped.
 *
 * Re-run the generator after editing icons in the admin. Current contents, by setting:
 *
 *   socials         fa-instagram fa-tiktok fa-youtube   (fa-facebook-f is in a template too)
 *   features        fa-compass fa-sliders fa-user fa-shield fa-headset fa-heart
 *   visionMission   fa-layer-group                    (fa-compass is in features too)
 *   contactChannels — all three also appear in templates
 */
const DATABASE_ICON_NAMES: readonly string[] = [
	'fa-compass',
	'fa-headset',
	'fa-heart',
	'fa-instagram',
	'fa-layer-group',
	'fa-shield',
	'fa-sliders',
	'fa-tiktok',
	'fa-user',
	'fa-youtube',
];

const inUse = [...new Set([...iconNamesInUse(), ...DATABASE_ICON_NAMES])].sort();
const resolved: Resolved[] = [];
const missing: string[] = [];

for (const name of inUse) {
	const glyph = readGlyph(name);

	if (glyph) resolved.push(glyph);
	else missing.push(name);
}

if (missing.length > 0) {
	console.error(
		`Could not resolve ${missing.length} icon(s) in the Font Awesome package:\n` +
			missing.map((n) => `  ${n}`).join('\n') +
			'\n\nEither the name is wrong, or it needs a paid icon. The build will fail until ' +
			'each of these is renamed or removed.',
	);
	process.exit(1);
}

const body = resolved
	.map((g) => `\t'${g.name}': { viewBox: '${g.viewBox}', path: '${g.path}' },`)
	.join('\n');

const bytes = resolved.reduce((total, g) => total + g.path.length, 0);

const output = `/**
 * The icons this site uses, as inline SVG paths. Generated — do not edit.
 *
 * Regenerate with:
 *
 * \`\`\`sh
 * pnpm --filter @banggai/web exec tsx scripts/generate-icons.ts
 *\`\`\`
 *
 * Run it after adding an icon in the admin. \`icons.spec.ts\` fails if a template
 * references an icon that is not in here, so the gap is caught at build time rather than
 * reaching a visitor as an empty box.
 *
 * Font Awesome Free — icons CC BY 4.0, fonts SIL OFL 1.1, code MIT.
 * See https://fontawesome.com/license/free.
 *
 * GENERATED FILE. ${resolved.length} icons, ${Math.round(bytes / 1024)} KB of path data.
 */

export type IconGlyph = { viewBox: string; path: string };

export const icons: Record<string, IconGlyph> = {
${body}
};

/** Every icon name this build can render. */
export const iconNames: readonly string[] = Object.keys(icons);
`;

const target = join(appRoot, 'src/lib/icons.ts');
writeFileSync(target, output);

console.log(
	`Wrote ${resolved.length} icons to src/lib/icons.ts ` +
		`(${Math.round(bytes / 1024)} KB of path data, against 310 KB for the icon fonts).`,
);
