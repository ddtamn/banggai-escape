# 09 — SEO, Metadata & Accessibility

How the site describes itself to crawlers and assistive technology, and where each
piece is set.

> **Scope:** `apps/web`. The admin app is not indexed and has no equivalent metadata
> setup; it does have its own `static/robots.txt`.

---

## The document shell: `src/app.html`

Set once for the whole app:

| Thing | Value |
| --- | --- |
| `<meta charset>` | `utf-8` |
| `<meta name="viewport">` | `width=device-width, initial-scale=1` |
| `<meta name="text-scale">` | `scale` |
| `<meta name="theme-color">` | `#18342a` (forest deep — tints mobile browser chrome) |
| Fonts | **Self-hosted** Plus Jakarta Sans as a variable font (200–800 plus italic), imported in `+layout.svelte` from `@fontsource-variable/plus-jakarta-sans`. No `preconnect` is needed: the `@font-face` lives in this app's own stylesheet, so the font is discovered with the render-blocking CSS. |
| Icons | **Inline SVG**, generated into `src/lib/icons.ts` from the `@fortawesome/fontawesome-free` package. No stylesheet and no webfont. |
| Injection | `%sveltekit.head%` and `%sveltekit.body%` placeholders |

`<body>` carries `data-sveltekit-preload-data="hover"`, so hovering a link prefetches
its data — the site feels instant at the cost of a few extra requests.

> **Font Awesome must stay ≥ 6.4.2.** The article share row uses `fa-x-twitter`,
> which does not exist in older builds. The version was bumped from 6.4.0 to 6.7.2
> for exactly this reason ([12-troubleshooting](./12-troubleshooting.md#a-font-awesome-icon-renders-as-a-box-or-blank)).

## The layout defaults: `src/routes/+layout.svelte`

The layout carries **icons only**:

```svelte
<svelte:head>
	<link rel="icon" href="/favicon.png" type="image/png" />
	<link rel="apple-touch-icon" href="/apple-touch-icon.png" type="image/png" />
</svelte:head>
```

- **Icons** come from `apps/web/static/`: `favicon.png` and `apple-touch-icon.png`.
- **Nothing else, deliberately.** No default `description`, no `og:image`.

Both used to be here and both were removed. A layout `description` meant every page carried two
unless it remembered to override one. A layout `og:image` was worse: a page with its own
photograph would emit a *second* `og:image`, and a consumer choosing between two candidates
chooses non-deterministically — so the page's own picture would sometimes lose to the logo, with
nothing on the page to show why. `Seo` is now the only thing that writes either.

## Per-page metadata

Every route renders a `<Seo>` component instead of a hand-written `<svelte:head>`. It emits the
`<title>`, the description, the canonical link, the Open Graph and Twitter tags, and any JSON-LD.

**Static pages** — interpolate the brand and a hand-written description:

```svelte
<Seo
	title="Tour Packages — {site.name}"
	description="Choose from our all-inclusive…"
	canonical={canonicalUrl}
	siteName={site.name}
	locale={site.locale}
	image={{ url: heroImage, alt: 'A tropical island coastline in the Banggai Archipelago' }}
	structuredData={structuredData}
/>
```

**Detail pages** — same component, with the values derived from the loaded content:

| Route | Title | Description | JSON-LD |
| --- | --- | --- | --- |
| `/packages/:slug` | `{pkg.title} — {site.name}` | `{pkg.overview.slice(0, 155)}` | `TouristTrip`+`Product`, `BreadcrumbList` |
| `/destinations/:slug` | `{destination.name} — {site.name}` | `{destination.tagline}` | `TouristAttraction`, `BreadcrumbList` |
| `/blog/:slug` | `{post.title} — {site.name}` | `{post.excerpt}` | `BlogPosting`, `BreadcrumbList` |

The title separator is an em dash with spaces — `X — Banggai Escape` — across every
page. Match it.

`canonical` is always built from `page.url`, never a hardcoded domain:

```ts
const canonicalUrl = $derived(new URL(page.url.pathname, page.url.origin).href);
```

Query and fragment are dropped, because `?utm_source=…` is how a link arrives rather than where
it points, and a canonical URL that varies per campaign is not canonical.

### Writing descriptions

- Keep them to roughly **150–160 characters**; the packages page slices `overview`
  at 155 for that reason.
- Lead with the specific thing (the destination, the trip, the topic), not "Welcome
  to…".
- Put the human value in `excerpt` / `tagline` / `overview` — those fields are the
  description, so write them as if they were.
- **Write it once.** `Seo` derives `description`, `og:description` and
  `twitter:description` from the one string you pass, so they cannot disagree. That is the
  whole reason a page no longer writes a `<svelte:head>`.

## Content that maps to SEO fields

The payload contract already holds the strings SEO needs. Use them rather than
duplicating:

| Field | Becomes |
| --- | --- |
| `site.tagline` | Footer copy, brand voice |
| `post.excerpt` | Card blurb **and** the article meta description |
| `destination.tagline` | The hero subtitle **and** the detail meta description |
| `package.overview` | The detail meta description (first 155 chars) |
| `package.region`, `destination.region` | On-page context for place queries |

## Images

Conventions the codebase follows, worth keeping:

- **Always set `width` and `height`** on `<img>` (or a fixed-height wrapper) so the
  layout does not shift as images load. Every card and hero does this.
- **`loading="lazy"`** on below-the-fold imagery (cards, gallery tiles, avatars used
  in lists). Hero images and the article's main image load eagerly.
- **Descriptive `alt`** for content images; `alt=""` for purely decorative images
  such as flags (the adjacent visible text carries the meaning) and images inside an
  element that already has an `aria-label`.
- **Resolve through `img(id, width)`** so the CDN serves an appropriately sized
  asset. Pick a width near the rendered size (`120`–`200` avatars, `900` cards,
  `2000` heroes) — see [08-content-data-layer](./08-content-data-layer.md#add-an-image-to-a-pages-decoration).

## Crawling

`apps/web/static/robots.txt` allows everything and points at the sitemap:

```
User-agent: *
Disallow:
Sitemap: https://banggaiescape.com/sitemap.xml
```

`Disallow:` with an empty value is the explicit form of "nothing is off-limits", which is clearer
than an absent line in the one file a crawler looks for permission in. The `Sitemap:` line is the
only place a domain is written down — `robots.txt` is a static file, so it has no request to
derive an origin from. It has to be edited if the domain ever changes.

`sitemap.xml` is a **route**, not a file: `routes/sitemap.xml/+server.ts`. Every URL it lists
lives in the database, so a static file goes stale the moment an editor publishes something — and
a sitemap that lies about what exists is worse than none, because a crawler follows it, finds a
404, and spends crawl budget on a URL the site already told it not to expect. It emits the six
fixed routes plus every published package, destination and article, with `lastmod` only where
there is a real edit or publish time to state.

**Error pages are marked `noindex`.** `routes/+error.svelte` sets
`<meta name="robots" content="noindex" />` and titles itself with the HTTP status
(`404 — Banggai Escape`), so broken or removed URLs drop out of the index instead of
competing with real pages.

## Accessibility

The project runs **`svelte-check`**, which reports accessibility warnings alongside
type errors (`pnpm check`). It currently reports **0 warnings**, so a new warning is
a regression. Patterns the code uses:

| Concern | Implementation |
| --- | --- |
| Current page | `aria-current="page"` on the header nav link; the active page is also colour-coded gold |
| Current section | `aria-current="location"` on the active TOC link (desktop and mobile) |
| Disclosures | `aria-expanded` on the mobile menu trigger and the contents-bar toggle |
| Mobile menu | `aria-label` on the trigger, scrim, and close button; closes on Escape; body scroll locked while open |
| Search / filters | `role="group"` + `aria-label` on the pill row; `aria-pressed` on each pill; an `sr-only` `<label for="…">` on every search input |
| Language switcher | `aria-haspopup="listbox"`, `aria-expanded`, `role="listbox"` / `role="option"`, `aria-selected` |
| Accordions | Native `<details>`/`<summary>` — keyboard-operable for free |
| Mobile contents bar | `role="region"` with `aria-label="Table of contents"` |
| Decorative icons | `aria-hidden="true"` where the icon adds no meaning (e.g. the destination card's arrow) |
| Focus | 2 px gold rings on nav controls; the gold box-shadow on `.field:focus`; `focus:outline-none` only where a ring replaces it |
| Anchor targets | Headings use `scroll-mt-*` so a fixed header never covers the target |

### Gaps worth knowing

- **No `prefers-reduced-motion` handling.** The mobile bars, hover zooms, and the
  `scroll-behavior: smooth` on `<html>` all animate unconditionally. Wrapping them
  in a reduced-motion media query is a good first accessibility improvement.
- **Nested `<main>` elements** on several pages (the layout already provides one).
- **No skip-to-content link.** Keyboard users tab through the whole header on every
  page.
- **Share buttons are inert** — they have `aria-label`s but perform no action.

## Missing SEO pieces (roadmap)

**Items 1–4 shipped on 2026-09-26.** See [16-web-polish-plan.md](./16-web-polish-plan.md#phase-5--discoverability--done)
for what was built and why, and `docs/09` below for how it hangs together. In short: one
component (`src/lib/components/Seo.svelte`) driven by pure builders in `src/lib/seo.ts`, a
generated `sitemap.xml` route, and JSON-LD per page type.

What is left:

1. ~~**Open Graph and Twitter Card tags**~~ — done. `Seo` is the only writer of `og:*`,
   `twitter:*`, the canonical link and the description, so the document title and `og:title`
   are the same string by construction. A page no longer hand-writes a `<svelte:head>`.
2. ~~**`sitemap.xml`**~~ — done. A route rather than a file, because every URL it lists lives in
   the database and a static list goes stale the moment an editor publishes.
3. ~~**Canonical URLs**~~ — done. Built from `page.url`, so nothing hardcodes a domain.
4. ~~**Structured data (JSON-LD)**~~ — done. `TravelAgency` on home/about/contact,
   `TouristTrip`+`Product` on packages, `TouristAttraction` on destinations, `BlogPosting` on
   articles, `BreadcrumbList` on every page.
5. **`lang` per locale** — still open, and blocked on the language switcher doing something.
   `<html lang="en">` is hardcoded in `app.html`. The i18n work was explicitly deferred; see
   the decisions table in the polish plan.
6. **Titles and descriptions in the CMS** — still open, and now the only thing making them
   fixed strings. `Seo` takes them as props, so this is a change to what a page passes in. That
   is Phase 6 of the polish plan.

Two things that are deliberately *not* on this list, recorded so their absence reads as a
decision rather than an oversight:

- **`keywords` meta and per-page `robots` meta.** Both stopped being ranking signals years ago.
  `robots.txt` and the sitemap express crawl policy better than a per-page tag.
- **`sameAs` in the organisation JSON-LD.** Every social link in the CMS is currently `href="#"`.
  Emitting a placeholder would assert an identity the business has not claimed, in a field a
  consumer cannot check but will publish. `src/lib/site-seo.ts` filters to real `http(s)` URLs,
  so the field appears by itself once real profiles are configured.

## Related

- [04-routing-and-pages](./04-routing-and-pages.md) — where each page sets its head.
- [08-content-data-layer](./08-content-data-layer.md) — the fields that feed the meta tags.
- [10-tooling](./10-tooling.md) — `svelte-check` and the a11y warnings gate.
