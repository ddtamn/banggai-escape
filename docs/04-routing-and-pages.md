# 04 — Routing & Pages

Every URL the site serves, how each page is assembled, and the conventions that keep
pages consistent.

> **Scope:** `apps/web` — the public marketing site. The admin app's routes are its
own; see [14-admin-app](./14-admin-app.md).

---

## Route table

| URL | Route file | Data source | Load? |
| --- | --- | --- | --- |
| `/` | `routes/+page.svelte` | `featuredPackages`, `getDestination()`, `features`, `testimonials`, `faqs`, `posts` | — |
| `/packages` | `routes/packages/+page.svelte` | `packages` | — |
| `/packages/:slug` | `routes/packages/[slug]/+page.svelte` | `getPackage()` + `relatedPackages()` | Yes |
| `/destinations` | `routes/destinations/+page.svelte` | `destinations` | — |
| `/destinations/:slug` | `routes/destinations/[slug]/+page.svelte` | `getDestination()` + `packages` | Yes |
| `/blog` | `routes/blog/+page.svelte` | `posts`, `blogCategories` | — |
| `/blog/:slug` | `routes/blog/[slug]/+page.svelte` | `getPost()` + `relatedPosts()` + `tableOfContents()` | Yes |
| `/about` | `routes/about/+page.svelte` | `features`, `stats`, `visionMission` | — |
| `/contact` | `routes/contact/+page.svelte` | `contactChannels` | — |

Any unmatched URL, and anything a `load` rejects with `error(status, …)`, renders the
project's own error page — `routes/+error.svelte`, described under
[The error page](#the-error-page).

### Current content slugs

Use these when cross-linking or testing.

**Packages** (8) — `packages.ts`
`untouched-banggai-discovery` · `banggai-ultimate-expedition` ·
`island-hopping-coral-sanctuary` · `paisu-pok-lake-day-trip` ·
`peleng-highlands-trek` · `luwuk-cultural-discovery` · `banggai-diving-expedition` ·
`sunset-island-cruise`

**Destinations** (9) — `destinations.ts`
`paisu-pok-lake` · `paisu-batango` · `piala-waterfall` · `poganda-beach` ·
`pulau-dua` · `weer-molino` · `mokokawa-waterfall` · `lalong-harbor` ·
`peleng-highlands`

**Articles** (3) — `posts.ts`
`how-to-get-to-banggai-islands` · `10-must-visit-destinations-in-banggai` ·
`best-time-to-visit-banggai-islands`

## The layout chain

There is exactly one layout, and it wraps every route:

```
src/routes/+layout.svelte
├─ imports './layout.css'        → Tailwind + design tokens are applied globally
├─ <svelte:head>                 → favicon, apple-touch-icon, default description
├─ <Header />                    → sticky forest bar, z-50
├─ <main>{@render children()}</main>
└─ <Footer />                    → forest footer
```

Practical consequences:

- **No route needs to render a header or footer.** Doing so would duplicate them —
  and the same applies to `+error.svelte`, which is why the error page needs neither.
- **The default meta description lives here.** Individual pages override `<title>`
  and `<meta name="description">` in their own `<svelte:head>` — a page-level
  `description` replaces the layout default.
- **The `<main>` element is provided by the layout.** Some pages additionally nest
  their own `<main>` element (e.g. `packages/+page.svelte`), which renders `<main>`
  inside `<main>`. It is harmless in practice but technically invalid HTML — worth
  fixing if you touch those files.

## The error page

`routes/+error.svelte` renders **inside** `+layout.svelte`, so a 404 or 500 keeps the
site's header and footer — that is the whole point of having it. It reads the current
status and message from `$app/state` rather than props:

```svelte
import { page } from '$app/state';

const isNotFound = $derived(page.status === 404);
const detail = $derived(
	page.error && page.error.message !== 'Not Found' ? page.error.message : null,
);
```

- **`page.status`** is the HTTP status (both `error(404, …)` from a `load` and an
  unmatched URL produce it). `page.error` is the error object.
- **The `'Not Found'` guard matters.** The dynamic routes throw descriptive messages
  (“We could not find an article called …”), but SvelteKit's default for an
  **unmatched** URL is the bare string `Not Found`. The page suppresses that and shows
  its own copy instead, so a bare slug never renders the words “Not Found”.
- It shows the status twice (an eyebrow chip and a large numeral), a context-appropriate
  headline, one clear explanation, two CTAs (`Back to home`, `Browse packages`) and a
  “Popular pages” shortcut grid.
- `<svelte:head>` sets `{page.status} — {site.name}` as the title and
  `<meta name="robots" content="noindex" />` so error URLs never get indexed.
- It uses `<section>`/`<div>`, **not** `<main>` — the layout already provides one
  (see [Gaps](#gaps) about the pages that still don't follow this).

To test it: visit `/blog/does-not-exist` (a descriptive 404) and `/nope` (an unmatched
URL, which uses the generic copy). Both should return status 404 with the chrome intact.

## Page-by-page anatomy

### `/` — Home (`routes/+page.svelte`)

The longest page (≈340 lines) and the reference for the whole visual language. Bands,
top to bottom:

1. **Hero** — full-bleed image via inline `heroStyle` (a forest-gradient + photo
   `background-image`), eyebrow chip, `h1`, subtitle, and a **booking bar**.
   The booking bar is a `<form action="/packages">` laid out as `grid-cols-1` →
   `sm:grid-cols-2` → `lg:grid-cols-12`; on `lg` it becomes a single `rounded-full`
   row with divider lines, collapsing to a stacked `rounded-2xl` panel on mobile.
   Its fields are display-only (`heroFacts`), so submitting navigates to `/packages`.
2. **The Banggai Experience** — `SectionHeader` + `featuredPackages` in a 1 / 2 / 4 grid.
3. **Curated Destinations** — `SectionHeader` + four specific destinations resolved
   with `getDestination()` (`paisu-pok-lake`, `pulau-dua`, `piala-waterfall`,
   `mokokawa-waterfall`), in a 1 / 2 grid.
4. **Why travelers choose us** — `features` in a 1 / 2 / 3 grid.
5. **About us** — image + two paragraphs + "Learn More About Us" (`btn-forest`).
6. **Testimonials** — `testimonials` cards with five `text-yellow-400` stars each,
   plus a "See 200+ Reviews" link (`site.reviewCount`).
7. **FAQ** — `Faq items={faqs}` in a 7/5 split beside a tall image.
8. **Travel Insights** — the first three `posts` via `PostCard`.
9. **`<CtaBanner>`** — the closing call to action.

### `/packages` — Package listing (`routes/packages/+page.svelte`)

- `PageHero` with a two-line `title` (the component splits on `\n`) and a
  deliberately substituted hero image — the design's `packages/hero-bg` export is a
  512×279 thumbnail, so the page uses a full-quality island shot from the same asset
  set instead. The comment in the file explains this.
- A **filter bar**: category pills (`filters: ['All', 'Open Trip', 'Private Trip']`)
  plus a rounded search input (`id="package-search"`), matching on
  `title + region + subtitle`.
- Results in a 1 / 2 / 4 grid of `PackageCard`; an empty state message otherwise.
- `CtaBanner` (no `text`/`ctaLabel` props — the component's defaults apply).

**This is the reference implementation** for the filter/search bar. The blog listing
was changed to match it ([06-styling](./06-styling.md#the-filter-bar-pattern)).

### `/packages/:slug` — Package detail (`routes/packages/[slug]/+page.svelte`)

The most interaction-heavy page. Sections:

1. **Photo mosaic** — five images from
   `media['package-details-untouched-banggai-discovery']`. On phones it is a single
   **snap-scrolling strip** (`snap-x snap-mandatory`, no carousel JS, scrollbar
   hidden via `[scrollbar-width:none]` / `[&::-webkit-scrollbar]:hidden`) with a
   "Swipe to see all N photos" hint. From `md` up, the column wrappers switch to
   `display: contents` so the same five images reflow into the designed 4-column
   mosaic. One set of images is ever in the DOM.
2. **Title + spec row** — `durationLabel`, `groupSize`, `tripType`, `accommodation`
   in a 2 / 4 column strip.
3. **Trip Overview**, **Trip Highlights**, **What's Included**, **Itinerary**
   (a `<details>` accordion with the first day open).
4. **Sticky booking card** — `lg:col-span-4`, `sticky top-28`, forest field, price,
   three badges (Flight / Hotels / Tours), a gold "Book Now" linking to
   `/contact?package={pkg.slug}`, and a "No payment today" note.
5. **You Might Also Like** — `relatedPackages(pkg.slug, 2)`.
6. **Mobile booking bar** — see below.

The **mobile booking bar** is a fixed bottom bar (`fixed inset-x-0 bottom-0 z-40
lg:hidden`) with the price and one gold "Book Now". It is driven by an `$effect`
that listens to `scroll`/`resize` (rAF-throttled) and shows the bar only when
`window.scrollY > 160` **and** the booking card's top is below the viewport
(`card.getBoundingClientRect().top > window.innerHeight`) — so there is only ever
one "Book Now" on screen. It uses `transition:fly={{ y: 96 }}` and pads with
`pb-[max(0.75rem,env(safe-area-inset-bottom))]` to clear the home indicator.
The card element is captured with `bind:this={bookingCardEl}`.

### `/destinations` — Destination listing (`routes/destinations/+page.svelte`)

- `PageHero` (default height) using `backgrounds.destinations['hero-bg']`.
- A right-aligned search box (`id="destination-search"`, `focus:ring-2
  focus:ring-forest-mid`) matching on `name + region + tagline`.
- 1 / 2 / 3 grid of `DestinationCard`; empty state otherwise.
- `CtaBanner`.

Note this is the one listing whose search field uses the forest focus ring rather
than the gold one — the packages/blog bars are the canonical pattern.

### `/destinations/:slug` — Destination detail (`routes/destinations/[slug]/+page.svelte`)

- **Custom hero** (not `PageHero`): a `h-[480px] → sm:h-[560px] → lg:h-[640px]`
  full-bleed image with a `bg-forest-deep/60` overlay, a `Home / Destinations`
  breadcrumb, the name, tagline, and a glassy region chip with a gold pin.
- **Overview** — `destination.overview` paragraphs inside `max-w-3xl`.
- **Quick Info** — four cards from `quickInfo` (best time, duration, highlights,
  accessibility).
- **Key Experiences** — bulleted `experiences`.
- **Gallery** — a six-image mosaic built by de-duplicating
  `destination.gallery` against every `media.destinations` asset; the first two
  tiles span two columns at `md`+.
- **Related Packages** — `packages.slice(0, 3)` (a fixed selection, *not* filtered
  by destination — improving this is an obvious future step).
- `CtaBanner`.

### `/blog` — Article listing (`routes/blog/+page.svelte`)

- `PageHero` at `py-28 md:py-36`.
- The **filter bar**, identical in structure to `/packages`: category pills from
  `blogCategories` plus a search input (`id="article-search"`). The category match
  is plural-tolerant: the pill labels are plural where `post.category` is singular,
  so `matchesCategory` compares with the trailing `s` stripped and uses
  `startsWith`.
- Results are split: the first two visible posts render in a 2-up grid, the rest in
  3-up.
- Empty state offers a "Show latest articles" button that resets filter and query.
- `CtaBanner`.

### `/blog/:slug` — Article (`routes/blog/[slug]/+page.svelte`)

The most complex page (≈420 lines). Structure:

1. **Title band** — category chip, `h1`, then a byline row (avatar, author, `updated
   · readTime`) and **share buttons** (X, Facebook, WhatsApp, Copy link — rendered
   as buttons, not wired to share yet).
2. **Hero image** — `max-w-7xl px-6`, rounded, with the excerpt as an italic caption.
3. **Article + aside**, an `lg:grid-cols-12` split: `article` takes 8 columns, the
   `aside` takes 4 and is `lg:sticky lg:top-28`.
4. **Body rendering** — `post.body` is a `Block[]` union, rendered with an `{#if}`
   chain: `p`, `h` (with `id` and `scroll-mt-36 lg:scroll-mt-28`), `steps` (a 3-up
   card grid), and `callout` (a gold left-border panel). See
   [08-content-data-layer](./08-content-data-layer.md#the-block-union).
5. **Tags**, then an **author card** (bio from the shared `author` export).
6. **Aside** — the desktop **Table of Contents** (`lg:block`, scroll-spy
   highlighting), a "Talk to a Specialist" panel, and a "Popular Tour" card
   (`packages[0]`).
7. **Mobile contents bar** — see below.
8. **Related articles** — `relatedPosts(post.slug, 3)` in a 3-up grid.

Two `$effect`s drive it:

- **Scroll spy.** It resolves every TOC heading element once, reads each heading's
  own computed `scroll-margin-top`, and marks the last heading whose
  `getBoundingClientRect().top` has crossed its landing line. Measuring instead of
  hardcoding an offset keeps it correct at every breakpoint. At the very bottom of
  the document it pins the final heading, because a short closing section never
  reaches its anchor line.
- **Visibility.** An `IntersectionObserver` on the `<article>` (`rootMargin: '-80px
  0px -40% 0px'`) sets `articleVisible`, so the mobile contents bar only appears
  while the article body is on screen.

The **mobile contents bar** is `fixed inset-x-0 top-20 z-40 lg:hidden` — pinned
directly under the 80 px header — and only renders when `toc.length` and
(`articleVisible || tocOpen`). Collapsed it shows an eyebrow, the current section
name, and a chevron; expanded it opens *downward* into a `max-h-[55vh]` scrollable
list with a drag handle, a `bg-forest-abyss/40` scrim behind it, and Escape-to-close
(handled by a `<svelte:window onkeydown>`). It slides with
`transition:fly={{ y: -96 }}`.

### `/about` — About (`routes/about/+page.svelte`)

Hero image band → "Our Story" eyebrow + large lead → a `stats` strip (4 columns,
divided) → Vision & Mission cards beside a tall image → "The Reason Travelers
Choose Banggai Escape" (`features` in 1 / 2 / 3) → `CtaBanner`.

### `/contact` — Contact (`routes/contact/+page.svelte`)

- A 6/6 split: a tall rounded image on the left, and on the right the `h1`
  (`id="contact-section"`, `scroll-mt-28`), an inline email link, and the form card.
- **The form is client-only.** `handleSubmit` calls `preventDefault()` and flips
  `submitted`, which swaps the form for a thank-you panel. It posts nowhere — see
  [02-architecture](./02-architecture.md#known-functional-gaps). Fields use the
  `.field` / `.field-label` classes; the phone field has a `+62` prefix and a
  hand-built Indonesian flag made of three `span`s.
- Contact channels (`contactChannels`) in a 3-up grid — each is an `<a>` to email,
  phone, or `/contact`.
- A `CtaBanner` whose `ctaHref` is `#contact-section`, so the CTA scrolls back up to
  the form instead of leaving the page.

## Dynamic routes

All three dynamic routes follow the same two-file pattern: a **server** loader that reads
Neon, and a component that renders what it was handed.

**`+page.server.ts`** — resolves the slug, prefers a redirect to a 404, and computes the
related list from the same rows:

```ts
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { loadPublishedEntries, resolveSlugRedirect } from '$lib/server/content';

export const load: PageServerLoad = async ({ params }) => {
	const packages = await loadPublishedEntries('package');
	const entry = packages.find((candidate) => candidate.slug === params.slug);

	if (!entry) {
		// A page that was published and renamed keeps working.
		const movedTo = await resolveSlugRedirect('package', params.slug);
		if (movedTo) redirect(301, `/packages/${movedTo}`);

		error(404, `We could not find a package called “${params.slug}”.`);
	}

	return {
		pkg: entry.payload,
		related: packages
			.filter((candidate) => candidate.slug !== params.slug)
			.slice(0, 2)
			.map((candidate) => candidate.payload),
	};
};
```

The return value is typed by `PageServerLoad`, and the component reads it as
`let { data } = $props()` followed by `const pkg = $derived(data.pkg)`. The settings the
layout loaded are merged into the same `data`, so a page gets `data.settings` for free —
and because `data` is reactive state, every value taken from it is declared with
`$derived` (a plain destructure would capture the first value and warn).

**`+page.svelte`** — renders from `data` and sets its own `<svelte:head>`. It never
imports content, and it never reaches for a loader.

Conventions to keep:

- Name the loaded thing after its type (`pkg`, `destination`, `post`) so downstream
  references read consistently.
- **Compute related content in the loader**, not in the component: it comes from the same
  rows the page already read, and one query then answers both. The one exception is
  client-side filtering (the listings' search and filter pills), which is presentation and
  stays in the component.
- Keep the 404 message human and quotable; the current messages interpolate the
  slug in curly quotes. A slug miss is only a 404 after `resolveSlugRedirect` has been
  asked — see [08-content-data-layer](./08-content-data-layer.md).

## SEO habits per page

Each page sets its own title and description in `<svelte:head>`. The pattern is:

```svelte
<svelte:head>
	<title>{Page Name} — {site.name}</title>
	<meta name="description" content="…" />
</svelte:head>
```

Detail pages derive it instead: `<title>{pkg.title} — {site.name}</title>` and
`content={pkg.overview.slice(0, 155)}` (packages), `content={destination.tagline}`
(destinations), `content={post.excerpt}` (articles). See
[09-seo-and-metadata](./09-seo-and-metadata.md).

## Gaps

Known missing pieces, in rough priority order:

- **No central error logging.** `+error.svelte` renders errors, but nothing reports
  them: `hooks.server.ts` sets one cache header and does nothing else. Add a `handleError`
  when error visibility matters — and note that a 500 from a bad payload already names the
  item and the offending fields in its message.
- **No `sitemap.xml`.** `static/robots.txt` allows everything but does not point at
  a sitemap. Now that slugs can move, the redirect table would be a natural input to one.
- **No trailing-slash or redirect policy beyond SvelteKit defaults.** Slug renames are
  handled (a 301 from the old URL); anything else is not.
- **The listings filter client-side.** Filtering and search are `$state`; a page reload
  does not preserve them and there are no shareable filtered URLs. The rows themselves
  come from the loader, so a server-side filter would be a small change.
- **`svelte:head` has no Open Graph or Twitter Card tags** on any page.
- **Nested `<main>` elements** on several pages (the layout already provides one).
