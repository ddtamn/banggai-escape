# 06 — Styling

How Tailwind v4, the design tokens, and the class layer are wired — and the
conventions that keep styling consistent.

> **Scope:** `apps/web`. The admin app also uses Tailwind v4, but with the shadcn-svelte
> neutral theme and the Geist font instead of these brand tokens — see
> [14-admin-app](./14-admin-app.md#design-system-not-the-banggai-brand-system).

---

## One entry file

All styling flows through **`apps/web/src/routes/layout.css`**, imported once by
`src/routes/+layout.svelte`. Tailwind v4 configures itself **in CSS** — there is no
`tailwind.config.js` and no `postcss.config.js`. The Vite plugin
(`@tailwindcss/vite`) does the work.

```css
@import 'tailwindcss';
@plugin '@tailwindcss/forms';
@plugin '@tailwindcss/typography';

@theme { /* design tokens → CSS variables + utility classes */ }

@layer base       { /* html, body, ::selection */ }
@layer components { /* buttons, card, badge, chip, field, scrim */ }
@layer utilities  { /* .section, .section-wide, .shell */ }
```

Order matters: `@import 'tailwindcss'` must come first, and `@plugin` directives
follow.

### Tailwind v4 specifics that bite

- **Content detection is automatic.** There is no `content`/`safelist` array.
  Tailwind scans source files for class names. Consequently, **class names built at
  runtime are invisible to it** — `class="text-{color}-500"` produces nothing. Use
  complete class names in literals, or map a value to a whole class string
  (e.g. `isActive ? 'text-gold' : 'text-stone-300'`, as `Header.svelte` does).
- **Custom utilities live in `@layer utilities`** and are therefore emitted
  alongside Tailwind's own, which lets them be overridden by later utilities in the
  cascade.
- **`@apply` is fine here** and used pervasively in the component layer — the
  classes are compiled at build time, not at runtime.

---

## Design tokens (`@theme`)

Tokens are declared in `@theme` and become both CSS variables (`var(--color-gold)`)
and Tailwind utilities (`text-gold`, `bg-forest-deep`, `border-hairline`, …).

### Colour

| Token | Hex | Generates | Used for |
| --- | --- | --- | --- |
| `--color-white` | `#F7F3ED` | `bg-white`, `text-white`, … | **Warm Sand — the only light surface.** Remapped from pure white (see below) |
| `--color-hairline` | `#E9E2D6` | `border-hairline` | Soft borders, dividers, card outlines |
| `--color-granite` | `#E3DACB` | `border-granite` | Form field borders, neutral chips |
| `--color-forest-deep` | `#18342A` | `bg-forest-deep`, `text-forest-deep` | Header, footer, dark cards, primary dark |
| `--color-forest-abyss` | `#0F231C` | `bg-forest-abyss`, `text-forest-abyss` | Deepest ground, scrims |
| `--color-forest-mid` | `#214538` | `bg-forest-mid` | Secondary dark surfaces, `btn-forest`, focus ring |
| `--color-forest-line` | `#2C5346` | `border-forest-line` | Hairlines on dark surfaces |
| `--color-gold` | `#B48A5A` | `bg-gold`, `text-gold` | **The accent.** CTAs, active nav, prices, pins |
| `--color-gold-pressed` | `#966F41` | — | (CTA hover uses `brightness-95`; the token is available) |
| `--color-gold-light` | `#C9A67C` | `text-gold-light` | Gradient stop, eyebrow text on dark |
| `--color-gold-deep` | `#9E7748` | `hover:bg-gold-deep`, `focus:border-gold-deep` | CTA/field hover, links on light |
| `--color-ink` | `#1F1F1F` | `text-ink` | Default body text (applied on `<body>`) |
| `--color-warm-gray` | `#6B625A` | `text-warm-gray` | **Currently unused** — secondary copy uses the `stone` family |
| `--color-accent` | `#B48A5A` | `text-accent` | Link/icon hover colour (same bronze as gold) |
| `--color-alert` | `#BD3D44` | `text-alert` | **Currently unused** — reserved for errors |

`--shadow-gold` (`0 2px 10px rgb(180 138 90 / 0.35)`) generates the `shadow-gold`
utility used by `.btn-gold`.

### The Warm Sand remap: read this

```css
--color-white: #f7f3ed;
```

Warm Sand is remapped onto `white`, so **every `bg-white` is warm sand and every
`text-white` is warm sand, not `#FFFFFF`.** That is intentional: it is how the
codebase guarantees "one light surface" without writing `bg-sand` everywhere.

Two consequences to keep in mind:

1. On a dark forest surface, `text-white` renders as warm sand (`#F7F3ED`) — which
   is the desired look, but it means there is **no way to get pure white text** via
   `text-white`. Use an explicit arbitrary value (`text-[#fff]`) if you ever truly
   need it, and expect reviewers to ask why.
2. `bg-white` is not "white at all". If you need a genuine white overlay (as the
   cards on photography do), the codebase uses `bg-white/10`, which resolves to
   warm sand at 10 % — still warm.

### Typography

| Token | Value |
| --- | --- |
| `--font-sans` | `'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif` |

The font is loaded in `src/app.html` from Google Fonts (weights 300–800, plus
400 italic) with `preconnect` hints. `body` applies `font-sans`, so it is the
default everywhere; no other family ships.

### Base layer

```css
html { scroll-behavior: smooth; }
body { @apply bg-white font-sans text-ink antialiased; }
::selection { @apply bg-gold text-white; }
```

---

## The class layer (`@layer components`)

These are the reusable classes. **Prefer them over re-typing long utility strings.**

### Buttons

| Class | What it is | Notes |
| --- | --- | --- |
| `.btn-gold` | The signature CTA — champagne gradient pill with a warm gold glow | Inline gradient (`gold-light → gold → gold-deep`), `text-stone-900`, `shadow-gold`, uppercase `tracking-wider`. Hover is `brightness-95` |
| `.btn-forest` | Secondary action — forest pill | `bg-forest-mid`, white text, `hover:bg-stone-800`. Pair with a trailing `fa-arrow-right` |
| `.btn-ghost` | Tertiary text link | `text-xs font-bold`, `hover:text-accent` |
| `.btn-on-image` | Circular glass action over photography | `size-10`, `bg-black/60`, blurred, inverts to `bg-white` + dark glyph on hover |

> `.btn-gold` uses `bg-`-less inline `background`, so Tailwind's `bg-*` utilities
> **will not override it**. If you need a flat gold button, use `bg-gold` directly
> rather than layering on `.btn-gold`.

### Surfaces

| Class | What it is |
| --- | --- |
| `.card` | `flex flex-col overflow-hidden rounded-2xl border border-hairline bg-white` |
| `.card-interactive` | Adds `hover:shadow-md`; pair with `.card` |
| `.card-img` | `relative h-44 overflow-hidden`; its `img` is `object-cover` with a 300 ms transform |
| `.badge` | Floating glass pill for image corners: `absolute rounded-full bg-black/60 px-2 py-0.5 text-[10px]` |
| `.chip` | Small uppercase category tag: `rounded bg-stone-100 px-2 py-0.5 text-[10px]` |
| `.scrim` | Bottom-up gradient so white type and gold pins clear photography |

`.card-interactive:hover .card-img img { scale: 105% }` is defined in plain CSS so
the zoom is scoped to interactive cards.

### Forms

| Class | What it is |
| --- | --- |
| `.field` | Full-width input: `rounded-xl border border-granite bg-white px-4 py-3 text-sm`, gold focus |
| `.field-label` | Micro-label above a field: `text-[11px] font-bold uppercase tracking-wider text-stone-700` |

The gold focus treatment is deliberately a box-shadow, not a Tailwind ring:

```css
.field:focus { box-shadow: 0 0 0 3px rgb(180 138 90 / 0.2); }
```

`.field` also sets `focus:ring-0 focus:outline-none`, because `@tailwindcss/forms`
would otherwise add its own ring and the two would fight.

---

## The utility layer (`@layer utilities`)

| Class | What it is | Use |
| --- | --- | --- |
| `.section` | `px-6 py-16 md:py-20` | Standard content band |
| `.section-wide` | `px-6 py-20 md:py-28` | Airier band for listing pages and heroes |
| `.shell` | `mx-auto max-w-7xl` | The 1280 px frame; nest it **inside** `.section` |

The canonical page frame is therefore:

```svelte
<section class="section">
	<div class="shell">
		<!-- content -->
	</div>
</section>
```

`.section` supplies the gutters and vertical rhythm; `.shell` supplies the centered
max-width. Neither implies the other — use them together. Detail-page heroes and
asides instead write `mx-auto max-w-7xl px-6` explicitly.

The vertical rhythm (64 / 80 / 96 / 112 px) comes from `DESIGN.md` §5; changing
`.section` / `.section-wide` changes it site-wide.

---

## The filter-bar pattern

The packages/blog listing bars are the design reference for filter + search UI.
Copy this rather than inventing a new one:

```svelte
<div class="mb-8 flex flex-col items-center justify-between gap-4 md:flex-row">
	<div
		class="flex w-full items-center gap-2.5 overflow-x-auto pb-2 md:w-auto md:pb-0"
		role="group"
		aria-label="Filter packages by trip type"
	>
		{#each filters as option (option)}
			<button
				type="button"
				aria-pressed={filter === option}
				class="rounded-full border px-5 py-2 text-xs whitespace-nowrap transition-colors {filter === option
					? 'border-gold bg-gold font-semibold text-white shadow-sm'
					: 'border-stone-200 bg-white font-medium text-stone-700 hover:bg-stone-50'}"
				onclick={() => (filter = option)}
			>
				{option}
			</button>
		{/each}
	</div>
	<!-- rounded-full search input, md:w-80, sr-only <label>, gold focus -->
</div>
```

Key details: `rounded-full` pills, `px-5 py-2` at `text-xs`, the **active pill is
`border-gold bg-gold text-white`**, `role="group"` with an `aria-label`, an
`aria-pressed` flag, a horizontally scrollable row on mobile, and an `sr-only`
`<label>` wired to the input's `id`.

`/destinations` uses an older variant of the search input (forest focus ring,
`max-w-xs`) — treat the packages/blog bars as canonical when touching it.

---

## Styling conventions

1. **Tokens, not hex.** No raw hex in markup or components; use
   `text-gold`, `bg-forest-deep`, `border-hairline`.
2. **One light surface.** Use `bg-white` for every light ground. Do not introduce
   `bg-slate-*`, `bg-gray-*`, or a second cream tone.
3. **`stone`, not `slate`/`gray`.** Secondary text on light surfaces uses
   `stone-400 … stone-700`; on dark surfaces `stone-300` / `stone-400`.
4. **Gold is rationed.** Actions, active nav, prices, location pins, eyebrow dots.
   Never body text or large fills. Review stars are the one deliberate exception
   (`text-yellow-400`).
5. **Delineate with hairlines, not fills.** Cards are separated by
   `border-hairline`, not a different background.
6. **Motion over depth.** Cards lift with `hover:shadow-md` and images zoom over
   300–500 ms; shadows stay subtle at rest.
7. **Micro-labels are uppercase and tracked** (`text-[10px]`/`text-[11px]`,
   `font-bold`, `tracking-wider`); headlines are `font-extrabold tracking-tight`.
8. **Complete class names only** (see Tailwind v4 specifics above).
9. **Formatting is Biome's job.** `css.formatter.quoteStyle: 'single'` and the
   `css.parser.tailwindDirectives: true` flag in `biome.json` are what let Biome
   parse `@theme`/`@apply` at all. Run `pnpm fix`; do not hand-format the CSS.

## Adding a token or class

1. Add colours to `@theme` in `layout.css` using the `--color-*` naming so the
   utility (`bg-*`, `text-*`, `border-*`) is generated automatically.
2. Add shared, multi-property components to `@layer components`; add single-purpose
   layout helpers to `@layer utilities`.
3. If the token or class changes the system, update **`DESIGN.md`** — it is the
   source of truth, and this file is the implementation map
   ([07-design-system](./07-design-system.md)).
4. Run `pnpm check:code` and `pnpm build` (Tailwind emits at build time, so a build
   is the real verification).

## Related

- [07-design-system](./07-design-system.md) — the design rules (and `DESIGN.md`).
- [05-components](./05-components.md) — where these classes are consumed.
- [10-tooling](./10-tooling.md) — Biome's CSS handling.
