// Generates src/lib/data/media.ts from the Stitch design exports in .stitch/designs.
// Run: node .stitch/gen-media.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Anchored to this file, not to the working directory. The inputs live beside the script and
// the output lives in another package, so no single cwd satisfies both — and a generator that
// only works from one directory is a generator someone eventually runs from the wrong one.
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..");
const SRC = path.join(HERE, "designs");
const OUT = path.join(REPO, "apps/web/src/lib/data/media.ts");
const SUBSTITUTIONS_PATH = path.join(HERE, "media-substitutions.json");
const AIDA = "https://lh3.googleusercontent.com/aida-public/";

/**
 * Assets that now live in the media library rather than on the design tool's demo host.
 *
 * The designs still export `aida-public` URLs — that is where the pictures came from, and
 * they remain the only record of *which* picture each key means. This map says where a
 * picture lives now, so regenerating `media.ts` cannot quietly re-introduce a third-party
 * dependency on the hero imagery of a live site.
 *
 * Written by `apps/admin/scripts/replace-placeholder-media.ts`, which is also what downloaded
 * the bytes and created the `media_assets` rows. A placeholder with no entry is one no
 * template reaches; it keeps its bare id, which is inert because nothing renders it.
 *
 * See `apps/web/src/lib/images.ts` for why this is more than tidiness: Cloudflare's image
 * transformer gets a 403 from the `aida-public` host, so a placeholder can carry no `srcset`
 * and is never resized.
 */
const SUBSTITUTIONS = fs.existsSync(SUBSTITUTIONS_PATH)
	? JSON.parse(fs.readFileSync(SUBSTITUTIONS_PATH, "utf8"))
	: {};

const AIDA_RE =
	/https:\/\/lh3\.googleusercontent\.com\/aida-public\/([A-Za-z0-9_-]+)/g;

const slugify = (s) =>
	s
		.toLowerCase()
		.replace(/&amp;/g, "and")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "") || "image";

/** Collect aida-public asset ids from a string, in order, optionally prefixed. */
const aidaIds = (text) => [...text.matchAll(AIDA_RE)].map((m) => m[1]);

/**
 * The value to emit for one asset: the media-library URL once migrated, the bare id before.
 *
 * A migrated value is a full URL, and `img()` returns anything absolute verbatim — the
 * `=w<width>` suffix belongs to the `aida-public` resize parameter alone. Appending it to an
 * R2 key would 404, so the distinction is made here, once, rather than at every use site.
 */
const valueFor = (id) => SUBSTITUTIONS[id]?.url ?? id;

const keyFor = (used, base) => {
	let key = base;
	let n = 2;
	while (used.has(key)) key = `${base}-${n++}`;
	used.add(key);
	return key;
};

const pages = {};
const backgrounds = {};

for (const file of fs.readdirSync(SRC).filter((f) => f.endsWith(".html"))) {
	const slug = file.replace(/\.html$/, "");
	const html = fs.readFileSync(path.join(SRC, file), "utf8");

	// <img> tags → key from alt text
	const used = new Set();
	const images = {};
	for (const tag of html.matchAll(/<img\b[^>]*>/g)) {
		const src = tag[0].match(/\bsrc="([^"]+)"/)?.[1];
		if (!src) continue;
		const id = aidaIds(src)[0];
		if (!id) continue;
		const alt = tag[0].match(/\balt="([^"]*)"/)?.[1] ?? "";
		images[keyFor(used, slugify(alt))] = valueFor(id);
	}
	pages[slug] = images;

	// CSS background images → key from the class name that declares them
	const bgs = {};
	for (const block of html.matchAll(/\.([\w-]+)\s*\{([^}]*)\}/g)) {
		const url = block[2].match(/url\(\s*(['"]?)([^'")]+)\1\s*\)/)?.[2];
		if (!url) continue;
		const id = aidaIds(url)[0];
		bgs[keyFor(new Set(), slugify(block[1]))] = id ? valueFor(id) : url;
	}
	if (Object.keys(bgs).length) backgrounds[slug] = bgs;
}

// Bare keys only where the slug is a valid identifier — `about-us` must stay quoted.
const emit = (obj) =>
	JSON.stringify(obj, null, "\t")
		.replace(/"([A-Za-z_$][\w$]*)":/g, "$1:")
		.replace(/"/g, "'")
		.replace(/\n/g, "\n\t");

const out = `/**
 * Image manifest — AUTO-GENERATED from .stitch/designs by .stitch/gen-media.mjs.
 * Do not edit by hand; re-run \`node .stitch/gen-media.mjs\` after re-exporting the designs.
 *
 * Keys are slugs of the design's alt text (page-scoped). Values are either a full media-library
 * URL, for an asset that has been migrated out of the design tool, or a bare \`aida-public\`
 * id for one that has not. \`img()\` accepts both.
 */
const AIDA = '${AIDA}';

/** An asset's URL at \`width\`. Already-absolute values (owned media) are passed through. */
export const img = (id: string, width = 1200): string =>
	/^https?:/.test(id) ? id : \`\${AIDA}\${id}=w\${width}\`;

/** Page-scoped \`<img>\` assets, keyed by slugified alt text. */
export const media = ${emit(pages)} as const;

/** Page-scoped CSS background assets, keyed by the declaring class name. */
export const backgrounds = ${emit(backgrounds)} as const;
`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, out);
console.log(`wrote ${OUT}`);
