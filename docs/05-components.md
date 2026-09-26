# 05 — Components

The shared UI in `apps/web/src/lib/components/`, with props, behaviour, and the
conventions that keep new components consistent.

---

## Component conventions

Every component in this folder follows the same shape:

1. A local `type Props = { … }` declared at the top of `<script lang="ts">`.
2. `let { … }: Props = $props();` — runes-mode props, with defaults inline in the
   destructuring.
3. Derived values via `const x = $derived(...)` rather than recomputation in markup.
4. **CSS custom classes, not prop-driven styling.** Variants are usually a boolean
   (e.g. `dark`) or a class string (e.g. `height`) rather than a whole variant API.
5. **No slots.** Parent content is passed as props (`title`, `text`, `items`,
   typed content objects). None of these components use `{@render children()}` —
   only `+layout.svelte` does.
6. Icons are `<Icon icon="fa-solid fa-star" size={12} class="…" />`, tinted with a
   design token.

---

## Chrome

### `Header.svelte`

The sticky forest bar. Props: `site: SiteProfile`, `nav: NavItem[]`,
`languages: Language[]` — the chrome's settings, handed down by `+layout.svelte` from
`+layout.server.ts`. It reaches for no content of its own.

| Aspect | Detail |
| --- | --- |
| Position | `sticky top-0 z-50`, `h-20` (80 px), `bg-forest-deep`, `border-b border-forest-line/40` |
| Frame | `mx-auto flex h-20 max-w-7xl items-center justify-between px-6` |
| Logo | `/logomark.png` at `size-12`, linking home |
| Nav | `hidden … lg:flex`, from the `nav` prop (the `nav` site setting); active state is `text-gold`, idle `text-stone-300 hover:text-white` |
| Active detection | `isActive()` reads `page.url.pathname` from `$app/state`: exact match for `/`, `startsWith` for everything else |
| Utility cluster | `<LanguageSwitcher />`, a gold "Contact us" pill (`hidden lg:inline-flex`), and a `lg:hidden` menu trigger |
| Mobile drawer | Full-screen `bg-black/60 backdrop-blur-sm` scrim over a forest panel that slides in; closes on backdrop click, link click, or **Escape**; `aria-expanded` on the trigger |
| Scroll lock | An `$effect` sets `document.body.style.overflow = 'hidden'` while open and restores it on cleanup |

The drawer is a **full-width** panel (`w-full`), not the `w-4/5 max-w-sm` off-canvas
described in `DESIGN.md` §4 — the design doc describes the original screen; the build
made the drawer full-bleed.

`isActive` uses `startsWith`, so `/blog` is also marked active on `/blog/:slug`
(intentional) but `/` must be special-cased to avoid matching every path (it is).

### `Footer.svelte`

Brand + link columns. Props: `site`, `nav`, `socials`, `footerDestinations` — again the
layout's settings, not a loader of its own.

- Forest field: `bg-forest-deep pt-16 pb-8`, `border-t border-forest-line/40`.
- 12-column grid at `lg` collapsing to 2 columns: brand block (5 cols, with the
  `/combination-mark.png` lockup, tagline, and `socials` icon circles), Destinations
  (3 cols, from `footerDestinations`), Menu (2 cols, from `nav`), Contact (2 cols,
  from `site`).
- Copyright line uses a **hardcoded `const year = 2026`** — bump it, or replace it
  with a runtime `new Date().getFullYear()` if you want it automatic.

> Note: `footerDestinations` lists seven entries, including
> `/destinations/mokokawa-waterfall`, while `destinations.ts` now contains nine —
> keep the footer list in step when you add destinations.

### `LanguageSwitcher.svelte`

The EN/ID chip. Prop: `languages: Language[]`, passed through by `Header` from the
`languages` site setting.

- Local `$state` for the open flag and the selected language; selecting a language
  updates the chip and closes the menu. **There is no i18n layer** — the selection
  changes nothing but the chip ([02-architecture](./02-architecture.md#known-functional-gaps)).
- The dropdown is a `role="listbox"` with `role="option"` buttons and
  `aria-selected`.
- Dismissal: a `closest('[data-language-switcher]')` check on window clicks and
  Escape via `<svelte:window onclick onkeydown>`.
- Flags come from `languages` (`flagcdn.com` URLs), rendered as `<img alt="">` so
  screen readers read the label, not the flag.

---

## Layout & band components

### `PageHero.svelte`

Reusable photographic hero band for inner-page listings.

```ts
type Crumb = { label: string; href?: string };

type Props = {
	title: string;
	subtitle?: string;
	crumbs?: Crumb[];              // optional breadcrumb trail
	image: string;                 // full URL — build with img(...)
	imageSrcset?: string | null;   // resized variants, or null; see below
	height?: string;               // default 'py-24 md:py-32'
	align?: 'center' | 'left';     // default 'center'
};
```

The photograph is an `<img>`, not a CSS `background-image`. That is the whole point of the
component: a browser cannot preload a background, cannot give it a `fetchpriority` hint, and
cannot offer it a resized candidate, so three page heroes were the Largest Contentful Paint
element *by construction*. The scrim is a sibling layer rather than a gradient baked into a
`style` attribute, which is also what keeps this component free of `style={...}`.

`imageSrcset` is **passed in, not derived here**, because a component cannot read the layout's
`data`. The page already holds `data.imageTransforms`, so it computes the value with
`imageSrcset()` from `$lib/images` and hands it over — which keeps this component free of the
read layer, as every other component is. Omit it for a page whose hero is not owned media
(the blog and destinations heroes are Unsplash URLs, so there is nothing for the edge to
resize).

- Builds a green-tinted veil inline: `linear-gradient(rgba(12,37,28,.45),
  rgba(12,37,28,.55))` over the image, `background-size: cover`.
- `title` may contain `\n`; it renders inside a single `h1`, so a newline is a soft
  wrap opportunity in the source — but the component does **not** split it (unlike
  `SectionHeader` and `CtaBanner`).
- When `align="center"` the inner block is `mx-auto max-w-3xl text-center`.
- Breadcrumbs render only when `crumbs.length`.

### `SectionHeader.svelte`

The repeated title/subtitle/action row above content grids.

```ts
type Props = {
	title: string;
	subtitle?: string;
	action?: { label: string; href: string };
	dark?: boolean;                // default false
};
```

- Splits `title` on `\n` and joins the lines with `<br />`.
- Renders `flex items-end`-style layout: title block left, action pill right.
- The action pill is `btn-forest` on light surfaces and a `bg-white/10` glass pill
  when `dark`.
- Always appends a `fa-arrow-right` at `text-[10px]`.

### `CtaBanner.svelte`

The full-bleed closing call to action. Used on **every** page.

```ts
type Props = {
	title: string;
	text?: string;                 // default 'Let Banggai Escape design your perfect journey today.'
	ctaLabel?: string;             // default 'Book your trip'
	ctaHref?: string;              // default '/contact'
	image: string;                 // required
};
```

- Splits `title` on `\n` into separate lines.
- Veil is heavier than `PageHero`:
  `linear-gradient(rgba(10,50,48,.65), rgba(8,38,37,.75))`.
- Centered inside `max-w-2xl`; the CTA is `btn-gold px-8 py-3.5`.
- `title` is an `h2` here, so a banner directly after a page `h1` keeps heading
  order sane.

### `Faq.svelte`

Accordion built on native `<details>`.

```ts
type Props = { items: FaqItem[]; openIndex?: number /* default 0 */ };
```

- `divide-y divide-stone-200` rows; the item at `openIndex` starts open.
- Chevron rotates with `group-open:rotate-180`; the default marker is hidden with
  `[&::-webkit-details-marker]:hidden`.
- Because it is `<details>`, it is accessible and keyboard-operable for free — no
  JS state.

---

## Cards

All three cards are presentational: they take one typed content object and render
themselves, including their own link to a detail route.

Each takes a **rendered** payload (`RenderedPackage` / `RenderedArticle` /
`RenderedDestination`), not the stored one, so its image field is a `RenderedMedia` rather
than a `media_assets` id. The `alt` is the media library's description when the asset has
one and the content text otherwise — `alt={pkg.image.alt ?? pkg.title}` — because an
undescribed asset must not lose the description the page already had. See
[08-content-data-layer](./08-content-data-layer.md#mediats--ids-to-images).

### `PackageCard.svelte`

```ts
type Props = { pkg: RenderedPackage };
```

- Uses the `.card card-interactive` classes (hairline border, near-flat at rest,
  `hover:shadow-md`) with a `.card-img` that scales to 105 % on hover.
- Two `.badge` glass pills over the image: duration (`badgeDays(pkg)`, zero-padded)
  top-left, and group size top-right derived from `pkg.groupSize` by stripping
  `"Min "` and replacing `", Max "` with `" - "`.
- Three-tier price block: "Start from" (`text-[11px]`), `formatPrice(pkg.price)`,
  and a smaller `/Person` suffix.
- Meta row: trip type with a gold leaf icon, and `durationLabel(pkg)` with a clock.
- Footer row is a hairline-divided "View Details →" link to `/packages/{pkg.slug}`.

### `PostCard.svelte`

```ts
type Props = { post: RenderedArticle };
```

- Its **own** markup rather than the `.card` classes: `rounded-2xl border
  border-stone-200/80 bg-white shadow-xs`.
- Image link (`h-44`) scales on hover; body shows a category `.chip`, the first tag
  as a second `.chip`, the title, and a 3-line-clamped excerpt.
- Footer is a `.btn-ghost` "Read More" link to `/blog/{post.slug}`.

### `DestinationCard.svelte`

```ts
type Props = {
	destination: RenderedDestination;
	href?: string;                 // default `/destinations/${destination.slug}`
};
```

- An `<a>` with an image-led `h-64 sm:h-72` frame, `rounded-3xl`, `overflow-hidden`.
- A `.scrim` gradient sits over the image so white type and the gold pin stay legible.
- Contains a gold `fa-location-dot` + destination name, the first comma-separated
  part of `region`, and a decorative `.btn-on-image` circle with
  `fa-arrow-up-right-from-square` (marked `aria-hidden`, since the whole card is the
  link).
- `href` is overridable so the card can link somewhere other than its detail page.

---

## Adding a component

1. Create `src/lib/components/YourThing.svelte` with a local `type Props` and
   `$props()`.
2. Type every content prop against a `@banggai/content-model` payload type, never a
   re-declared shape
   (`Package`, `Post`, `Destination`, `FaqItem`, …) instead of re-declaring shapes.
3. Prefer the shared classes in `layout.css` (`.card`, `.btn-gold`, `.badge`,
   `.field`, …) over re-typing long utility strings.
4. Compose with the design tokens (`text-gold`, `bg-forest-deep`, `border-hairline`)
   — never a raw hex.
5. Run `pnpm check` (Svelte types + a11y) and `pnpm check:code` (Biome). Biome's
   Svelte support only parses `<script>`, so it will not catch markup issues —
   `svelte-check` is the authority for `.svelte` files.

## Related

- [06-styling](./06-styling.md) — the classes and tokens these components consume.
- [07-design-system](./07-design-system.md) — the rules behind the visual choices.
- [08-content-data-layer](./08-content-data-layer.md) — the types the cards accept.
