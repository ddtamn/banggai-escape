# 08 — Content & Data Layer

Content lives in **Neon**. It is authored and published through `apps/admin`, and the
public site reads it on the server through a small read layer. No page hardcodes copy,
and the typed TypeScript modules that used to hold it are deleted — there is no bundled
copy of the content any more.

---

## The rule

```
Neon: content_entries · content_revisions · site_settings · media_assets · slug_redirects
        │                                    (written only by apps/admin)
        │  rows validated against @banggai/content-model
        ▼
apps/web/src/lib/server/content/     loaders → parsed payloads, media ids already URLs
        │
        ▼
+layout.server.ts · +page.server.ts  pick the items the page needs
        │
        ▼
routes/**/+page.svelte · lib/components/**   render props; no content imports
```

- **Content changes are admin changes.** Adding a package, fixing a typo or changing
  the phone number goes through the back-office, not a pull request.
- **Pages stay presentational.** If you find a string in a `.svelte` file that is
  content (not UI chrome like "View Details"), it belongs in the database.
- **Types are the schema, and there is one of them.** `packages/content-model` holds
  the Zod contracts. The admin validates against them before every write; the site
  validates against them again as it reads. A page therefore cannot render a payload
  that does not satisfy its contract — see [validation](#validation-runs-before-media-does).

---

## The read layer

`apps/web/src/lib/server/content/` is the only place that touches the database.
Everything there is server-only, reached through a `+page.server.ts` /
`+layout.server.ts` load.

### `../db/index.ts` — the connection

A lazily built `neon()` client reading `DATABASE_URL` from `$env/dynamic/private`.
Raw SQL, deliberately: the admin owns the migrations and table declarations, and
mirroring them here would be a second definition of the same schema to keep in step —
for type safety the payloads do not get from it anyway, because they are validated
against the contract as they are read.

### `entries.ts` — published content

| Export | Returns |
| --- | --- |
| `loadPublishedEntries(kind)` | Every published, unarchived entry of that kind, ordered by `sort_order` then `slug` |
| `loadPublishedEntry(kind, slug)` | One, or `null` |

Each entry is `{ slug, sortOrder, featured, payload }`. Three properties matter:

- **Only `content_entries.published_revision_id` is read.** A published page stays
  live while its next edit is still a draft, and a revision that is not the pointer's
  target is history. Selecting "the newest revision" would leak drafts onto the site.
- **The public URL is `content_entries.slug`.** Renaming a published entry moves the
  entry's slug immediately and records a redirect (see `redirects.ts`), so a renamed
  page is live at its new URL before the next publish.
- **Archived entries are invisible.** They keep their slug reserved but do not appear
  in a list and 404 on their own URL.

### `settings.ts` — the site's own content

`loadSiteSettings()` reads all thirteen `site_settings` rows and returns them keyed by
`SiteSettingKey`, each validated against its own contract. The mapped return type is
what makes a new key in the contract a type error here until it is read.

Unlike content, a setting has **no draft and no revision**: the admin validates on save
and the site reads the row, so a change is live as soon as the edge cache expires. Every
key must have a row — the settings screen writes all thirteen, and a missing one would
render chrome with holes in it (an empty nav, a footer with no address), which looks
like a CSS bug rather than a data problem.

### `redirects.ts` — old URLs

`resolveSlugRedirect(kind, slug)` returns the slug a recorded redirect leads to, walking
chains so a page renamed twice lands on its current URL in a single 301. It returns
`null` when nothing redirects away from the slug, when the row points at the slug
already in use, or when the chain loops. Something that 404s for a *slug reason* is a
404 only after this has been asked.

### `media.ts` — ids to URLs

A payload stores a `media_assets` id; a page renders a URL.

| Export | Purpose |
| --- | --- |
| `loadMedia(ids)` | One query for every image on the page; returns a lookup whose `url(id)` throws if it was not asked for |

Ids are de-duplicated and fetched at once, because a page's payloads share images
heavily. A reference with **no row is an error, not a missing image**: the admin refuses
to delete an asset anything points at, so a dangling id means the database is
inconsistent, and saying so beats an `<img>` that silently fails.

If an asset has an `object_key` (everything uploaded through the admin, and everything
copied from the legacy host) its URL is `${MEDIA_PUBLIC_URL}/${object_key}` — the R2
custom domain. An asset with an `external_url` is still served from wherever it always
was, and wins over the object key.

#### Validation runs before media does

The stored payload is validated **first**, then its media ids are swapped for URLs. The
order is not cosmetic: a stored media field is a `media_assets` id and is validated as a
UUID, while a rendered one is a URL. Resolving first would hand `z.uuid()` a URL and fail
every page on the site.

A payload that fails validation throws, naming the item and the offending fields, and
the request 500s. That is intentional. `publish` is the gate — the admin refuses to write
a revision that does not satisfy the contract — so a stored payload that fails to parse
means the contract moved underneath existing data, which is a bug to surface, not a page
to render half of.

---

## Freshness: the five-minute edge cache

`apps/web/src/hooks.server.ts` sets
`Cache-Control: public, max-age=0, s-maxage=300, stale-while-revalidate=600` on rendered
documents. The Cloudflare adapter's own Worker does the rest: it looks every request up
in the Workers cache and stores a response only when it carries that header, so the
policy is one header rather than a second cache implementation.

Consequences worth knowing:

- A publish reaches the public site **within five minutes**, with no build, no deploy
  and nothing to purge by hand. That is the Phase 4 exit criterion.
- Browser requests are not held (`max-age=0`); the edge is.
- Only a document a browser navigated to is cached. SvelteKit fetches the same route as
  `__data.json` during client-side navigation, with a `_routes` parameter that varies
  with which layouts the browser already has, so those are left alone — which also means
  clicking around the site always shows the newest content.
- Redirects and errors carry no cache header and are never stored.
- `vite dev` sets nothing: development has no edge, and a five-minute-old page while
  editing a component looks like a broken build. To exercise the cache locally you need
  the built Worker (`pnpm build && pnpm preview`).

---

## The payload contracts

The authority is `packages/content-model/src/{content,settings}.ts`. The shapes below
are a summary; the Zod schemas are strict, so an unknown key is a failure.

`mediaFieldsByKind` (`package: ['image']`, `destination: ['image', 'gallery']`,
`article: ['image', 'hero']`) and the settings' `avatar` / `ctaBackground` are declared
in the contract because three callers have to agree exactly on which fields are media:
the one-shot import, the admin's delete guard, and the public site's swap back to URLs.

### `package`

```ts
type Package = {
	slug: string;
	title: string;
	subtitle: string;      // '3D2N'
	region: string;
	days: number;
	nights: number;        // 0 for a single-day trip
	tripType: 'Open Trip' | 'Private Trip';
	price: number;         // per person, in IDR
	image: string;         // media_assets id (a URL once rendered)
	groupSize: string;     // 'Min 8, Max 25'
	accommodation: string;
	overview: string;
	highlights: { title: string; text: string }[];   // at least one
	included: string[];                              // at least one
	itinerary: { label: string; title: string; text: string }[];  // at least one
	featured?: boolean;
};
```

### `destination`

```ts
type Destination = {
	slug: string;
	name: string;
	region: string;
	tagline: string;
	image: string;
	overview: string[];    // one string per paragraph
	quickInfo: { bestTime: string; duration: string; highlights: string; accessibility: string };
	experiences: { title: string; text: string }[];  // at least one
	gallery: string[];                               // at least one
	featured?: boolean;
};
```

### `article`

```ts
type Block =
	| { kind: 'p'; text: string }
	| { kind: 'h'; id: string; text: string }
	| { kind: 'steps'; items: { title: string; text: string }[] }
	| { kind: 'callout'; title: string; text: string };

type Article = {
	slug: string;
	category: string;      // matched against a blogCategories pill (see gotcha 5)
	tags: string[];
	title: string;
	excerpt: string;
	image: string;
	date: string;          // display strings as published, not ISO dates
	updated: string;
	readTime: string;
	author: string;        // the published byline, not the admin who pressed publish
	authorRole: string;
	hero: string;
	body: Block[];         // at least one
};
```

`content_revisions.author_email` records the administrator who pressed publish. It is
audit data and is a different person from the byline; both are kept.

#### The Block union

`body` is an array of discriminated blocks, rendered by an `{#if}` chain in
`routes/blog/[slug]/+page.svelte`:

| `kind` | Renders as |
| --- | --- |
| `p` | A paragraph (`mb-6 leading-relaxed text-stone-600`) |
| `h` | An `h2` with the given `id`, and `scroll-mt-36 lg:scroll-mt-28` |
| `steps` | A 3-up grid of small titled cards |
| `callout` | A gold left-border panel with a bold lead-in |

Because `h` blocks drive both the anchoring and `tableOfContents()`, **the `id` must be
unique and URL-safe**. The scroll spy depends on those ids existing in the DOM.

### The settings keys

| Key | Shape | Rendered by |
| --- | --- | --- |
| `site` | `{ name, tagline, locale, phone, phoneHref, email, address[], reviewCount }` | Every page's `<title>`, the footer, the home reviews link |
| `nav` | `{ label, href }[]` | Header, mobile drawer, footer menu |
| `languages` | `{ code, label, flag }[]` | Header switcher (UI only — no translation is wired up) |
| `socials` | `{ label, icon, href }[]` | Footer icon circles |
| `footerDestinations` | `{ label, href }[]` | Footer "Destinations" column |
| `features` | `{ icon, title, text }[]` | Home "Why travelers choose us", About |
| `testimonials` | `{ quote, name, country, avatar }[]` | Home |
| `faqs` | `{ question, answer }[]` | Home accordion |
| `stats` | `{ value, label }[]` | About stats strip |
| `visionMission` | `{ icon, title, text }[]` | About Vision & Mission |
| `contactChannels` | `{ icon, title, text, value, extra?, href }[]` | Contact |
| `blogCategories` | `string[]` | Blog filter pills |
| `ctaBackground` | media id | The image used by **every** `CtaBanner` |

`icon` is a full Font Awesome class string (e.g. `'fa-regular fa-compass'`).

---

## Presenters: `apps/web/src/lib/content.ts`

The pieces of the old modules that were never data — they take a payload and return a
string or a list, so a card can format whatever it is handed.

| Export | Behaviour |
| --- | --- |
| `formatPrice(price)` | `2850000` → `'IDR 2.850.000'` (id-ID grouping) |
| `durationLabel(pkg)` | `'3 Days 2 Nights'`, or `'1 Day'` when `days === 1` |
| `badgeDays(pkg)` | Zero-padded card badge: `'03 days'` / `'01 day'` |
| `tableOfContents(post)` | Every `kind: 'h'` block, as `{ id, text }[]` |
| `authorBio` | The author-card biography — the one piece of copy with no content-model field |

Nothing in it touches media. A component renders the URL it was given; the width
arguments the CDN used to take are gone, because an object in R2 has one size.

---

## `apps/web/src/lib/data/media.ts` — page decoration only

> **Generated file. Do not edit by hand.** Regenerate with
> `node .stitch/gen-media.mjs` after re-exporting designs from Stitch.

This is what is left of the static data layer, and it keeps only the images the *design*
owns rather than the editors: full-bleed hero backgrounds, the About photographs, the
package-detail mosaic, the decorative arc clips. All of it is still on the AIDA CDN.

```ts
const AIDA = 'https://lh3.googleusercontent.com/aida-public/';

/** Full URL for an asset id, resized to `width`. */
export const img = (id: string, width = 1200): string =>
	/^https?:/.test(id) ? id : `${AIDA}${id}=w${width}`;

export const media = { /* page-scoped, `as const` */ } as const;
export const backgrounds = { /* page-scoped CSS background URLs */ } as const;
```

- `media` is keyed **by page**, then by a slugified description of the image's alt text.
- `backgrounds` holds full URLs (mostly Unsplash) for CSS `background-image` use.
- **`img()` is idempotent**: an id that already starts with `http(s)` is returned
  untouched.
- Keys are `as const`, so `media.home['banggai-escape-team-at-sea']` is compile-time
  checked — a typo fails `pnpm check`.

**Why widths still appear on some calls.** A *content* image comes from the read layer
already resolved, so `img()` around it would be a no-op — pages pass those straight
through. A *decoration* image is still an AIDA asset id, so it goes through `img(id,
width)` and the CDN does the resizing. When a slot needs another size, that is the call
to change.

---

## The retired modules are gone

The typed static content — `src/lib/data/{site,content,destinations,packages,posts}.ts` —
was deleted in Phase 6, along with the one-shot migration pair that read it
(`apps/web/scripts/export-content.ts` and `apps/admin/scripts/import-content.ts`, and
their `migrate:export` / `migrate:import` scripts).

What that means in practice:

- **There is no rollback to a static site**, and no second copy of the content to
  drift from Neon. The database is the only source of truth, so make sure the backup
  you trust is a Neon one.
- **A `.migration/` directory may still sit in the repo root** on a machine that ran the
  export. It is git-ignored and nothing reads it any more; it is kept only as a
  human-readable snapshot of what was migrated. Deleting it is safe.
- **`node_modules` may still hold `tsx`** for `apps/admin`, which uses it for
  `provision` and `db:roles` — `apps/web` no longer needs it at all.

If you ever need to see what the site looked like before the switch, use git — the
modules are in the history, not the working tree.

---

## Ordering matters

Order comes from `content_entries.sort_order`, which the admin's list screen controls
with move up / move down, and it is load-bearing in three places:

| Consumer | Uses |
| --- | --- |
| Home "The Banggai Experience" | The first four published packages |
| Package detail "You Might Also Like" | The first two published packages that are not the current one |
| Article aside "Popular Tour" | The first published package (the card is omitted when there are none) |

So moving a package to the top of the list promotes it to the home page **and** to the
article sidebar. Neither list computes real similarity — they are "the first N others".
If you want genuine relatedness (same region, shared tags), that is the loader to change.

The home page's **four curated destinations** are different: they are named in
`routes/+page.server.ts` and looked up by slug, so one that is archived or unpublished
drops out of the row instead of leaving a hole. Their order there is the mosaic's
left-to-right pairing, not `sort_order`.

---

## Recipes

### Change content

Use the admin: open the item, edit, **Save draft**, then **Publish**. The site shows it
within five minutes. Nothing is rebuilt and nothing is deployed.

### Add a package, destination or article

1. **New** in the matching admin section. A new item goes to the end of its list, so
   inserting one never reshuffles the public order.
2. Fill every field. Publish refuses — naming the fields — while anything required is
   missing, which is the point: a draft may be incomplete, a published revision may not.
3. For an image, upload it in the media library or pick an existing asset. Add alt text.
4. **Publish**, then check the public page.

### Add a new field to a collection

1. Add it to the Zod schema in `packages/content-model/src/content.ts`. Because the
   schemas are `strictObject`, every stored payload must then carry it — which is what
   makes the admin refuse to publish without it.
2. Add it to the admin's form spec, or `svelte-check` will not let `settingSpecs` /
   the content forms compile.
3. Use it on the page. The loader's type follows the schema, so nothing else changes.
4. If it is a media field, add its name to `mediaFieldsByKind` — that is what makes the
   walker, the delete guard and the site all agree it is media.

### Change brand chrome

Everything in the settings table is edited in **Settings** in the admin: phone, email,
address, review count, the menu, social links, the footer destination column, the FAQ,
the testimonials, the categories, the shared CTA background. The contact page's
channels are stored values, not derived from `site`, so change them in the same screen.

The footer's copyright year is still a hardcoded `const year = 2026` in `Footer.svelte`.

### Add an image to a page's decoration

Re-export the designs in Stitch, then run `node .stitch/gen-media.mjs` from the repo
root. `.stitch/` is git-ignored, so this needs the local folder.

---

## Invariants and gotchas

1. **Slugs are the URL and the key.** They are unique per kind and lowercased and
   hyphenated by the contract. Renaming a published item writes a `slug_redirects` row,
   so old links keep working — do not delete those rows by hand.
2. **A media field holds an id, never a URL.** The contract validates it as a UUID. A
   URL in a stored payload fails the read and 500s the page rather than rendering a
   broken image; the admin's import and media screens are what put ids there.
3. **Drafts are never visible.** The site reads `published_revision_id` and nothing else.
   "Published with unpublished changes" serves the published revision.
4. **Archived entries are invisible.** They 404 and drop out of every list, and they
   keep their slug reserved.
5. **Blog categories are matched by prefix.** The filter pills are plural
   (`'Destination Guides'`) while `post.category` is singular (`'Destination Guide'`),
   and `routes/blog/+page.svelte` compares with the trailing `s` stripped and
   `startsWith`. A new category needs the pill **and** the singular/plural pairing.
6. **`heading` ids must be unique across an article**, because they are DOM ids.
7. **`quickInfo.highlights` is a single string**, not an array
   (`'Canoeing, Swimming, Photography'`) — it renders as one line.
8. **`itinerary[].label`** is a display string (`'Day 1'`), and the day accordion opens
   the first item by index.
9. **`media` keys are compile-time checked.** A typo is a build error, which is the
   point — do not reach for `// @ts-ignore`.
10. **The page you are looking at may be up to five minutes old.** If a publish seems
    not to have landed, that is the cache, not the admin.

## Known gaps

- **Nothing renders the media library's alt text.** Images use content text as their
  `alt` (`alt={pkg.title}`, `alt={destination.name}`), and every legacy row has a null
  `alt_text`. The detail pages' images are therefore described by the item's title, not
  by a description of the photograph.
- **`post.date` is unused in the UI**; the byline shows `updated`. It stays populated for
  future sort/display work.
- **The stage and production Workers share one database.** There is no separate staging
  branch wired up yet; see [11-deployment](./11-deployment.md).

## Related

- [04-routing-and-pages](./04-routing-and-pages.md) — how each collection is rendered.
- [05-components](./05-components.md) — the cards that consume these types.
- [09-seo-and-metadata](./09-seo-and-metadata.md) — where `excerpt`, `tagline`, and
  `overview` become meta descriptions.
- [14-admin-app](./14-admin-app.md) — the screens that write this content.
- [15-admin-dashboard-plan](./15-admin-dashboard-plan.md) — the phase this landed in.
