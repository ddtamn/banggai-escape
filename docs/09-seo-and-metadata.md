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
| Fonts | Google Fonts, Plus Jakarta Sans 300–800 + 400 italic, with `preconnect` to `fonts.googleapis.com` and `fonts.gstatic.com` |
| Icons | Font Awesome **6.7.2** from cdnjs |
| Injection | `%sveltekit.head%` and `%sveltekit.body%` placeholders |

`<body>` carries `data-sveltekit-preload-data="hover"`, so hovering a link prefetches
its data — the site feels instant at the cost of a few extra requests.

> **Font Awesome must stay ≥ 6.4.2.** The article share row uses `fa-x-twitter`,
> which does not exist in older builds. The version was bumped from 6.4.0 to 6.7.2
> for exactly this reason ([12-troubleshooting](./12-troubleshooting.md#a-font-awesome-icon-renders-as-a-box-or-blank)).

## The layout defaults: `src/routes/+layout.svelte`

Every page inherits these from the single layout:

```svelte
<svelte:head>
	<link rel="icon" href="/favicon.png" type="image/png" />
	<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
	<meta
		name="description"
		content="Banggai Escape designs seamless island journeys across the Banggai Archipelago in Central Sulawesi — mirror lakes, reef sanctuaries, and authentic local hospitality."
	/>
</svelte:head>
```

- **Icons** come from `apps/web/static/`: `favicon.png` and `apple-touch-icon.png`.
- **The default description** is a fallback. A page that sets its own
  `<meta name="description">` overrides it, because SvelteKit merges head content
  and the more specific tag wins.

## Per-page metadata

Every route sets its own `<title>` and `description` in `<svelte:head>`. The two
shapes in use:

**Static pages** — interpolate the brand and a hand-written description:

```svelte
<svelte:head>
	<title>Tour Packages — {site.name}</title>
	<meta name="description" content="Choose from our all-inclusive…" />
</svelte:head>
```

**Detail pages** — derive from the loaded content:

| Route | Title | Description |
| --- | --- | --- |
| `/packages/:slug` | `{pkg.title} — {site.name}` | `{pkg.overview.slice(0, 155)}` |
| `/destinations/:slug` | `{destination.name} — {site.name}` | `{destination.tagline}` |
| `/blog/:slug` | `{post.title} — {site.name}` | `{post.excerpt}` |

The title separator is an em dash with spaces — `X — Banggai Escape` — across every
page. Match it.

### Writing descriptions

- Keep them to roughly **150–160 characters**; the packages page slices `overview`
  at 155 for that reason.
- Lead with the specific thing (the destination, the trip, the topic), not "Welcome
  to…".
- Put the human value in `excerpt` / `tagline` / `overview` — those fields are the
  description, so write them as if they were.

## Content that maps to SEO fields

The data layer already holds the strings SEO needs. Use them rather than
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
  `2000` heroes) — see [08-content-data-layer](./08-content-data-layer.md#add-or-change-an-image).

## Crawling

`apps/web/static/robots.txt` currently allows everything:

```
# allow crawling everything by default
User-agent: *
Disallow:
```

There is no `sitemap.xml` and no `Sitemap:` directive.

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

Not bugs at this stage, but the obvious next steps, roughly in priority order:

1. **Open Graph and Twitter Card tags** — `og:title`, `og:description`, `og:image`,
   `og:type`, `twitter:card`. Every page already has the values; it is a
   `<svelte:head>` addition in the layout plus per-page overrides.
2. **`sitemap.xml`** and a `Sitemap:` line in `robots.txt`.
3. **Canonical URLs** — `<link rel="canonical">` using `page.url` from `$app/state`.
4. **Structured data (JSON-LD)** — `TravelAgency`/`LocalBusiness` for the brand,
   `BlogPosting` for articles, `Product`/`TouristTrip` for packages. The typed data
   in `lib/data` is already the right shape to serialise.
5. **`lang` per locale** once the language switcher does something — `<html lang="en">`
   is hardcoded in `app.html`.

## Related

- [04-routing-and-pages](./04-routing-and-pages.md) — where each page sets its head.
- [08-content-data-layer](./08-content-data-layer.md) — the fields that feed the meta tags.
- [10-tooling](./10-tooling.md) — `svelte-check` and the a11y warnings gate.
