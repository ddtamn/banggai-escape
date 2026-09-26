/**
 * Builds `static/og-default.png` — the share card a page falls back to when it has no
 * photograph of its own.
 *
 * ## Why the background is Warm Sand and not forest
 *
 * `combination-mark.png` carries a rounded plate behind the artwork, and that plate is
 * `#F7F3ED` — byte for byte the same value as `--color-white`, the site's only light surface.
 * (Its corners are genuinely transparent; the plate is a rounded rect, not a full-bleed
 * background.) Compositing the mark onto that exact colour hides the plate, but not quite: the
 * plate's rounded edge is anti-aliased, so a sliver of blended pixels survives and reads as a
 * faint box around the logo.
 *
 * So the plate is keyed out instead — see `keyOutPlate`. That leaves a genuinely transparent
 * lockup. The background is still Warm Sand rather than forest, and that is not a matter of
 * taste: the artwork is drawn in forest green with gold accents, so on a forest background the
 * letterforms themselves would vanish. The logo needs the light ground.
 *
 * ## Why this is a script and not a hand-drawn file
 *
 * The card is composed from the same `combination-mark.png` the site header uses and the same
 * colour tokens `layout.css` defines, so it cannot drift from the brand the way a separately
 * designed image would. Re-run this after a logo change:
 *
 * ```sh
 * pnpm --filter @banggai/admin exec tsx scripts/build-og-image.ts
 * ```
 *
 * ## Why there is no text on it
 *
 * The obvious next step is to set a tagline in the brand typeface, and it is deliberately not
 * taken. That face ships as a woff2 — a format no image renderer can read — and the only real
 * TrueType faces on a build machine are whatever the operating system happens to ship.
 * Rendering the name in DejaVu would give a share card that is typographically not this brand,
 * and it would look correct in review and wrong in a feed.
 *
 * `combination-mark.png` is the lockup — mark and wordmark together — so the name is already on
 * the card, in the right typeface, as artwork that is actually the brand. Nothing else is added:
 * the lockup already carries its own gold rule around "FQR GROUP", and a second one beneath it
 * would be a stray line rather than a considered one.
 *
 * ## Why 1200×630
 *
 * The size every major consumer crops to. A card authored at any other size gets centre-cropped
 * by at least one of them, and a wide, short lockup is exactly the artwork that crops worst.
 */
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

const here = dirname(fileURLToPath(import.meta.url));
const webStatic = resolve(here, '../../web/static');

/** The share-card canvas every major consumer agrees on. */
const WIDTH = 1200;
const HEIGHT = 630;

/**
 * From `apps/web/src/routes/layout.css`.
 *
 * Duplicated rather than imported because that file is a Tailwind stylesheet and this is a
 * Node script. `SAND` is load-bearing twice over: it is the card's background, and it is the
 * exact colour being keyed out of the logo.
 */
const SAND = { r: 0xf7, g: 0xf3, b: 0xed } as const;

/**
 * How far a pixel may sit from the plate colour and still count as plate.
 *
 * 26 is comfortably wider than the spread of the flat interior (a handful of levels of
 * compression noise) and far narrower than the distance to any artwork colour, the nearest of
 * which — the deep green of the letterforms — is over 60 away. The gap between those two
 * numbers is what makes the key safe rather than a lucky guess.
 */
const KEY_TOLERANCE = 26;

/**
 * Make the logo's plate transparent, softening the edge rather than cutting it.
 *
 * A pixel's *opacity* is scaled by how far it is from the plate, so the anti-aliased boundary
 * fades out over the same few levels the plate itself varies across. Treating it as a hard
 * in/out test instead would leave a one-pixel halo — the exact artefact this function exists
 * to remove.
 */
async function keyOutPlate(input: Buffer): Promise<Buffer> {
	const { data, info } = await sharp(input)
		.ensureAlpha()
		.raw()
		.toBuffer({ resolveWithObject: true });

	for (let i = 0; i < data.length; i += info.channels) {
		const distance = Math.max(
			Math.abs(data[i] - SAND.r),
			Math.abs(data[i + 1] - SAND.g),
			Math.abs(data[i + 2] - SAND.b),
		);

		// `distance / KEY_TOLERANCE` reaches 1 exactly at the tolerance, so anything at or
		// beyond it keeps its original alpha untouched.
		const strength = Math.min(distance / KEY_TOLERANCE, 1);
		data[i + 3] = Math.round(data[i + 3] * strength);
	}

	return sharp(data, { raw: info }).png().toBuffer();
}

/** The lockup, scaled. Its native 600×274 is already 2.19:1. */
const MARK_WIDTH = 460;
const MARK_HEIGHT = Math.round((MARK_WIDTH * 274) / 600);
const MARK_LEFT = Math.round((WIDTH - MARK_WIDTH) / 2);
const MARK_TOP = Math.round((HEIGHT - MARK_HEIGHT) / 2);

const svg = `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="rgb(${SAND.r},${SAND.g},${SAND.b})" />
</svg>`;

const mark = await keyOutPlate(await readFile(resolve(webStatic, 'combination-mark.png')));

await writeFile(
	resolve(webStatic, 'og-default.png'),
	await sharp(Buffer.from(svg))
		// The mark is composited on top rather than referenced from inside the SVG, because
		// librsvg cannot reliably resolve a file path from a data buffer and a silently missing
		// logo is the worst possible outcome for this image.
		.composite([
			{
				input: await sharp(mark).resize({ width: MARK_WIDTH }).toBuffer(),
				left: MARK_LEFT,
				top: MARK_TOP,
			},
		])
		.png({ compressionLevel: 9 })
		.toBuffer(),
);

console.log(
	`wrote ${resolve(webStatic, 'og-default.png')} (${WIDTH}x${HEIGHT}, mark ${MARK_WIDTH}x${MARK_HEIGHT} at ${MARK_LEFT},${MARK_TOP})`,
);
