# 08 — Content & Data Layer

All copy lives in typed modules under `apps/web/src/lib/data/`. Pages read from
them; they never hardcode content. This document is the reference for those modules
and the recipes for changing content.

---

## The rule

```
lib/data/*.ts  →  exports typed values and lookup helpers
routes/*.svelte  →  imports them and renders
```

- **Content changes are code changes.** They go through review and version control.
- **Pages stay presentational.** If you find a string in a `.svelte` file that is
  content (not UI chrome like "View Details"), it belongs in `lib/data`.
- **Types are the schema.** `svelte-check` enforces that every entry has the right
  shape, so a malformed entry fails `pnpm check`, not production.

---

## Module reference

### `site.ts` — brand and chrome

| Export | Type | Purpose |
| --- | --- | --- |
| `site` | object | Name, tagline, locale, phone + `phoneHref`, email, `address: string[]`, `reviewCount` |
| `nav` | `NavItem[]` | Header and footer menu. `{ label, href }` |
| `languages` | `Language[]` | Language switcher options. `{ code, label, flag }` — UI only |
| `socials` | `{ label, icon, href }[]` | Footer icon circles. `href` values are `'#'` placeholders |
| `footerDestinations` | `NavItem[]` | Footer "Destinations" column (hand-maintained — keep it in step with `destinations.ts`) |

### `content.ts` — shared editorial copy

| Export | Type | Used by |
| --- | --- | --- |
| `ctaBackground` | `string` | The image used by **every** `CtaBanner` |
| `features` | `Feature[]` | Home "Why travelers choose us", About "Reason Travelers Choose…" |
| `testimonials` | `Testimonial[]` | Home testimonials |
| `faqs` | `FaqItem[]` | Home FAQ accordion |
| `stats` | `Stat[]` | About stats strip |
| `visionMission` | `Feature[]` | About Vision & Mission cards |
| `contactChannels` | `ContactChannel[]` | Contact "We'd Love to Hear From You" |
| `blogCategories` | `string[]` | Blog filter pills |

`Feature` is `{ icon, title, text }`, where `icon` is a full Font Awesome class
string (e.g. `'fa-regular fa-compass'`). `ContactChannel` is
`{ icon, title, text, value, extra?, href }` — `extra` is the second address line
and `href` is where the card links.

### `packages.ts` — tour packages

```ts
type TripType = 'Open Trip' | 'Private Trip';

type ItineraryDay = { label: string; title: string; text: string };

type Package = {
	slug: string;
	title: string;
	subtitle: string;      // e.g. '3D2N'
	region: string;
	days: number;
	nights: number;
	tripType: TripType;
	price: number;         // per person, in IDR
	image: string;         // media asset id
	groupSize: string;     // e.g. 'Min 8, Max 25'
	accommodation: string;
	overview: string;
	highlights: { title: string; text: string }[];
	included: string[];
	itinerary: ItineraryDay[];
	featured?: boolean;    // currently unused by any page
};
```

Formatters and selectors:

| Export | Behaviour |
| --- | --- |
| `formatPrice(price)` | `2850000` → `'IDR 2.850.000'` (id-ID grouping) |
| `durationLabel(pkg)` | `'3 Days 2 Nights'`, or `'1 Day'` when `days === 1` |
| `badgeDays(pkg)` | Zero-padded card badge: `'03 days'` / `'01 day'` |
| `getPackage(slug)` | Lookup, `undefined` if absent |
| `featuredPackages` | **`packages.slice(0, 4)`** — order matters (see below) |
| `relatedPackages(slug, count = 2)` | Every package **except** `slug`, first `count` |
| `packageImage(pkg, width = 900)` | Resolves `pkg.image` through `img()` |

### `destinations.ts` — destinations

```ts
type QuickInfo = { bestTime: string; duration: string; highlights: string; accessibility: string };
type Experience = { title: string; text: string };

type Destination = {
	slug: string;
	name: string;
	region: string;
	tagline: string;
	image: string;         // media asset id
	overview: string[];    // one string per paragraph
	quickInfo: QuickInfo;
	experiences: Experience[];
	gallery: string[];     // media asset ids
	featured?: boolean;    // currently unused by any page
};
```

| Export | Behaviour |
| --- | --- |
| `getDestination(slug)` | Lookup, `undefined` if absent |
| `destinationImage(destination, width = 900)` | Resolves `destination.image` through `img()` |

The listing page searches `name + region + tagline`; the detail page renders
`overview` paragraphs inside a `max-w-3xl` column.

### `posts.ts` — blog articles

```ts
type Block =
	| { kind: 'p'; text: string }
	| { kind: 'h'; id: string; text: string }
	| { kind: 'steps'; items: { title: string; text: string }[] }
	| { kind: 'callout'; title: string; text: string };

type Post = {
	slug: string;
	category: string;      // must match a blogCategories pill (see gotcha below)
	tags: string[];
	title: string;
	excerpt: string;
	image: string;         // card image, media asset id
	date: string;
	updated: string;       // display string, e.g. 'Updated 2 hours ago'
	readTime: string;      // e.g. '14 min read'
	author: string;
	authorRole: string;
	hero: string;          // hero image, media asset id
	body: Block[];
};
```

| Export | Behaviour |
| --- | --- |
| `author` | Shared byline object: `{ name, role, bio }` — the bio renders in the author card on every article |
| `posts` | The collection |
| `getPost(slug)` | Lookup, `undefined` if absent |
| `relatedPosts(slug, count = 3)` | Every post **except** `slug`, first `count` |
| `postImage(post, width = 900)` | Resolves `post.image` through `img()` |
| `tableOfContents(post)` | Every `kind: 'h'` block, as `{ id, text }[]` |

#### The Block union

`body` is an array of discriminated blocks, rendered by an `{#if}` chain in
`routes/blog/[slug]/+page.svelte`. Each maps to a distinct layout:

| `kind` | Renders as |
| --- | --- |
| `p` | A paragraph (`mb-6 leading-relaxed text-stone-600`) |
| `h` | An `h2` with the given `id`, and `scroll-mt-36 lg:scroll-mt-28` |
| `steps` | A 3-up grid of small titled cards |
| `callout` | A gold left-border panel with a bold lead-in |

Because `h` blocks drive both the anchoring and `tableOfContents()`, **the `id`
must be unique and URL-safe** (lowercase, hyphenated). The scroll spy depends on
those ids existing in the DOM.

### `media.ts` — the image manifest

> **Generated file. Do not edit by hand.** Regenerate with
> `node .stitch/gen-media.mjs` after re-exporting designs from Stitch.

```ts
const AIDA = 'https://lh3.googleusercontent.com/aida-public/';

/** Full URL for an asset id, resized to `width`. */
export const img = (id: string, width = 1200): string =>
	/^https?:/.test(id) ? id : `${AIDA}${id}=w${width}`;

export const media = { /* page-scoped, `as const` */ } as const;
export const backgrounds = { /* page-scoped CSS background URLs */ } as const;
```

- `media` is keyed **by page**, then by a slugified description of the image's alt
  text. Page keys today: `home`, `about-us`, `contact`, `blog`,
  `blog-details-how-to-get-to-banggai-islands`, `packages`,
  `package-details-untouched-banggai-discovery`,
  `destination-details-paisu-pok-lake`, `destinations`.
- `backgrounds` holds full URLs (mostly Unsplash) for CSS `background-image` use.
- **`img()` is idempotent**: it returns the id untouched if it already starts with
  `http(s)`, so an entry can hold either an AIDA asset id or a full URL.
- Keys are `as const`, so `media.home['banggai-escape-team-at-sea']` is
  compile-time checked — a typo fails `pnpm check`.

Two things to know about the current image strategy:

1. Assets are served from Google's **AIDA CDN**, not from the project. To self-host,
   swap the `AIDA` constant for a local path (e.g. `/images/`) and place the files in
   `apps/web/static/` — no component changes needed, because everything goes through
   `img()`.
2. There is only **one** `blog-details-*` and one `destination-details-*` bucket, and
   the article page's `CtaBanner` image is hardcoded to the
   `blog-details-how-to-get-to-banggai-islands` bucket for every post. New detail
   pages reuse these buckets rather than getting their own.

---

## Ordering matters: the package array

The order of `packages` is load-bearing in three places:

| Consumer | Uses |
| --- | --- |
| Home "The Banggai Experience" | `featuredPackages` = `packages.slice(0, 4)` |
| Package detail "You Might Also Like" | `relatedPackages(slug, 2)` = the first two entries that are not the current one |
| Article aside "Popular Tour" | `packages[0]` |

So moving a package to the top of the array promotes it to the home page **and** to
the article sidebar. `relatedPackages` / `relatedPosts` do **not** compute real
similarity — they are "the first N others". If you want genuine relatedness
(same region, shared tags), that is the function to change.

---

## Recipes

### Add a package

1. Append an entry to `packages` in `packages.ts`, copying an existing one as a
   template and filling **every** field. Pick a unique, URL-safe `slug` — it becomes
   `/packages/<slug>`.
2. Ensure the `image` id exists in `media.packages` (or pass a full `https://` URL,
   which `img()` passes through).
3. Place the entry where you want it in the array (see ordering above).
4. Run `pnpm check`. Then visit `/packages` and `/packages/<slug>`.

```ts
{
	slug: 'new-island-escape',
	title: 'New Island Escape',
	subtitle: '2D1N',
	region: 'Banggai Kepulauan',
	days: 2,
	nights: 1,
	tripType: 'Open Trip',
	price: 1950000,
	image: media.packages['banggai-lagoon-with-boats'],
	groupSize: 'Min 6, Max 16',
	accommodation: 'Beachfront Lodge (1 Night)',
	overview: 'A short, bright introduction…',
	highlights: [{ title: 'Somewhere', text: 'What you do there.' }],
	included: ['Accommodation', 'All transfers', 'Meals'],
	itinerary: [
		{ label: 'Day 1', title: 'Arrival', text: 'What happens on day one.' },
		{ label: 'Day 2', title: 'Departure', text: 'What happens on day two.' },
	],
},
```

### Add a destination

1. Append to `destinations` in `destinations.ts` with a unique `slug`.
2. `overview` is an **array of paragraphs**; `gallery` is an array of media ids —
   the detail page de-duplicates them and tops the mosaic up from
   `media.destinations`, so a short gallery still fills the grid.
3. Optionally add it to `footerDestinations` in `site.ts` so it appears in the
   footer.
4. Run `pnpm check`; visit `/destinations` and `/destinations/<slug>`.

### Add a blog post

1. Append to `posts` in `posts.ts`. Set `category` to match one of the
   `blogCategories` pills (see the gotcha below), and give `body` an array of
   `Block`s.
2. Every `kind: 'h'` block needs a unique, lowercased, hyphenated `id` — it becomes
   the anchor and the TOC entry.
3. Set `readTime`/`updated` as display strings (they are not computed).
4. Run `pnpm check`; visit `/blog` and `/blog/<slug>`.

```ts
{
	slug: 'packing-for-the-islands',
	category: 'Travel Tips',
	tags: ['Packing', 'Banggai'],
	title: 'Packing for the Islands',
	excerpt: 'One-paragraph summary used on cards and as the meta description.',
	image: media.blog['how-to-get-to-banggai-islands'],
	date: 'May 4, 2026',
	updated: 'Updated 1 day ago',
	readTime: '6 min read',
	author: author.name,
	authorRole: author.role,
	hero: media['blog-details-how-to-get-to-banggai-islands'][
		'lush-cascades-and-untouched-karst-valleys-across-banggai-kepulauan-central-sulawesi'
	],
	body: [
		{ kind: 'p', text: 'Opening paragraph.' },
		{ kind: 'h', id: 'what-to-bring', text: 'What to Bring' },
		{ kind: 'steps', items: [{ title: 'Reef-safe sunscreen', text: 'Why it matters.' }] },
		{ kind: 'callout', title: 'Bring cash', text: 'ATMs are only in Luwuk and Salakan.' },
	],
},
```

### Change brand chrome

- **Phone, email, address, review count** → `site` in `site.ts`. `contactChannels`
  in `content.ts` reads `site.email` / `site.phone` / `site.address`, so those
  update in both places automatically.
- **Menu items** → `nav` in `site.ts` (drives the header, mobile drawer, and footer).
- **Social links** → `socials`; replace the `'#'` placeholders with real URLs.
- The **footer copyright year** is a hardcoded `const year = 2026` in
  `Footer.svelte`, not derived from the system clock.

### Add or change an image

- **By hand (common):** add the asset id (or a full URL) to the right bucket in
  `media.ts`. `img()` accepts both.
- **Regenerate (rare):** re-export designs in Stitch, then run
  `node .stitch/gen-media.mjs` from the repo root. `.stitch/` is git-ignored, so this
  requires the local folder.
- **Full-size vs. thumbnail:** `img(id, width)` controls the requested width.
  Prefer passing a width that matches the slot (e.g. avatars at `120`–`200`, heroes
  at `2000`, cards at the `900` default). Avoid upscaling a small export — the
  packages hero comment in `routes/packages/+page.svelte` documents a case where a
  512 px export was replaced with a larger shot for exactly this reason.

---

## Invariants and gotchas

1. **Slugs are the URL and the key.** They must be unique within their collection,
   lowercased, and hyphenated. Duplicate slugs silently shadow each other in
   `find()`.
2. **Blog categories are matched by prefix.** The filter pills are plural
   (`'Destination Guides'`) while `post.category` is singular
   (`'Destination Guide'`), and `routes/blog/+page.svelte` compares with the
   trailing `s` stripped and `startsWith`. If you invent a new category, add the
   pill to `blogCategories` **and** keep the singular/plural pairing consistent.
3. **`heading` ids must be unique across a post**, because they are DOM ids.
4. **`quickInfo.highlights` is a single string**, not an array
   (`'Canoeing, Swimming, Photography'`) — it renders as one line in the Quick Info
   card.
5. **`itinerary[].label`** is a display string (`'Day 1'`), and the day accordion
   opens the first item by index (`open={index === 0}`).
6. **`media` keys are compile-time checked.** A typo is a build error, which is the
   point — do not reach for `// @ts-ignore`.
7. **`post.date` is unused in the UI** today; the byline shows `updated`. Keep it
   populated anyway for future sort/display work.

## Related

- [04-routing-and-pages](./04-routing-and-pages.md) — how each collection is rendered.
- [05-components](./05-components.md) — the cards that consume these types.
- [09-seo-and-metadata](./09-seo-and-metadata.md) — where `excerpt`, `tagline`, and
  `overview` become meta descriptions.
