# 07 — Design System

A developer's map of **[`DESIGN.md`](../DESIGN.md)** — the source of truth for the
visual language — plus how each rule lands in code.

`DESIGN.md` is authoritative. This file does not restate the values; it points at
the code that implements them, so you can change one and keep the other in step.

> **Scope:** the design system currently governs `apps/web` only. The admin app ships
the shadcn-svelte neutral theme and does **not** yet consume these tokens — that
decision is open; see
> [14-admin-app](./14-admin-app.md#design-system-not-the-banggai-brand-system).

---

## What `DESIGN.md` is

It documents the system behind the site's screens (originally designed in Stitch),
in seven sections plus a token appendix:

| § | Section | Read it when |
| --- | --- | --- |
| 1 | Visual Theme & Atmosphere | You need the intent — why a page feels the way it does |
| 2 | Color Palette & Roles | You are choosing a colour for something new |
| 3 | Typography Rules | You are sizing or spacing type |
| 4 | Component Stylings | You are building or changing a button, card, input, or nav |
| 5 | Layout Principles | You are laying out a page or a grid |
| 6 | Design System Notes for Stitch Generation | You are prompting Stitch for a new screen |
| 7 | Implementation Notes (Current Build) | You need to know what the build actually does |
| App. | Canonical Token Reference | You need a hex value or a shape in one place |

**§7 is the bridge.** It records the calls the implementation made that differ from
the original screens — the collapsed surfaces, the single page frame, Font Awesome
6.7.2, yellow review stars, and the mobile patterns. If `DESIGN.md` §1–6 and §7 seem
to disagree, **§7 wins**, because it describes what ships.

---

## Where each rule lives

| Rule (in `DESIGN.md`) | Implemented in |
| --- | --- |
| Colour tokens (§2, App.) | `src/routes/layout.css` → `@theme` |
| Warm Sand as the only light surface (§2, §7) | `--color-white: #f7f3ed` in `@theme`, applied via `bg-white` |
| Typography scale and weights (§3) | `--font-sans` in `@theme`; utility classes per component |
| Font Awesome iconography (§3) | `src/app.html` — CDN `font-awesome/6.7.2` |
| Button / card / input styling (§4) | `.btn-*`, `.card*`, `.badge`, `.chip`, `.field*`, `.scrim` in `@layer components` |
| Layout frame and grids (§5) | `.shell` + `px-6`; per-page grid classes |
| Section rhythm 64/80/96/112 px (§5) | `.section` (`py-16 md:py-20`) and `.section-wide` (`py-20 md:py-28`) |
| Header bar and drawer (§4) | `src/lib/components/Header.svelte` |
| Footer (§4) | `src/lib/components/Footer.svelte` |
| Recurring patterns (§4) | `SectionHeader.svelte`, `CtaBanner.svelte`, `Faq.svelte`, the card trio |
| Mobile patterns (§7) | `routes/blog/[slug]/+page.svelte` and `routes/packages/[slug]/+page.svelte` |
| Review stars are yellow (§7) | `text-yellow-400` in `routes/+page.svelte` |

---

## The non-negotiables

These are the rules a reviewer will actually hold you to. They are worth
internalising because they are what makes the site look like one site.

1. **One light surface.** Warm Sand, via `bg-white`. No secondary cream, no
   `slate`/`gray` grounds.
2. **Gold is rationed.** Actions, wayfinding, prices, pins. Not body copy, not large
   fills. The only sanctioned departure is review stars (`text-yellow-400`).
3. **One page frame.** `mx-auto max-w-7xl px-6` on every route, expressed as
   `.shell` inside `.section` (or written out for hero bands). Reading columns sit
   *inside* the frame as `max-w-2xl`/`max-w-3xl`.
4. **Dense cards, airy chapters.** Small internal padding (16–20 px), large
   inter-section spacing.
5. **Hairlines, not fills.** `border-hairline` separates; the fill does not change.
6. **Small type, big headlines.** Body 12–14 px with relaxed leading; all-caps
   10–11 px micro-labels with wide tracking; headlines 24–60 px extrabold tight.
7. **Motion signals interaction.** Hover lifts and slow image zooms (300–500 ms);
   resting shadows stay subtle.
8. **Two dark surfaces, one field.** Header, footer, the sticky booking card, and
   the article's "Talk to a Specialist" panel all use `forest-deep`.

Two implementation notes that are easy to miss and worth stating plainly:

- **`text-white` is warm sand**, because `--color-white` is remapped
  ([06-styling](./06-styling.md#the-warm-sand-remap-read-this)). On dark surfaces
  that is the intended look; there is no pure white in the palette.
- **The palette's `sea-emerald` and `info-slate` entries are unused** and
  `warm-gray`/`alert` tokens exist but are not referenced by any component. The
  build prefers the warm `stone` family for secondary copy.

---

## Mobile patterns

`DESIGN.md` §7 specifies two interaction patterns, both implemented with CSS
transitions and a small `$effect`, both pinned below the 80 px header (`z-40` vs
`z-50`), and both ~250 ms.

### Article contents bar

- Lives in `routes/blog/[slug]/+page.svelte`.
- Desktop keeps a sticky TOC in the aside; **phones get a fixed bar directly under
  the header** (`top-20`, `lg:hidden`).
- Collapsed it shows the current section; it expands *downward* into a scrollable
  list and rotates the chevron.
- Dismissal: tap-to-dismiss scrim, Escape, and a handle at the panel's lower edge.
- It appears only while the article body is on screen (an `IntersectionObserver`),
  so it never fights the footer.
- **Active-section highlighting measures each heading's own `scroll-margin-top`**
  rather than hardcoding an offset. The corresponding headings use `scroll-mt-36` on
  phones (clearing header + bar) and `lg:scroll-mt-28` once the bar is gone. Keep
  those two numbers consistent if you change either.

### Package gallery + booking bar

- Live in `routes/packages/[slug]/+page.svelte`.
- **Gallery:** on phones the mosaic collapses into a single **CSS scroll-snap
  strip** (no carousel JS) with a peek of the next photo as the affordance, plus a
  numbered hint. From `md` up the column wrappers switch to `display: contents` so
  the same five images reflow into the 4-column mosaic — **one set of images in the
  DOM, never double-fetched.** If you add a sixth image, update the `slice` calls
  and the hint count.
- **Booking bar:** a compact bottom bar with the price and one gold "Book Now",
  sliding up once `scrollY > 160` and only while the full booking card is below the
  fold — one CTA visible at a time. It pads with
  `env(safe-area-inset-bottom)` to clear the home indicator.

Both patterns are worth preserving when refactoring: they are the reason the long
article and the package detail page work on a phone, and the details (the
`display: contents` trick, the measured scroll spy) are deliberate.

---

## Using `DESIGN.md` to generate new screens

`DESIGN.md` §6 is written to be pasted into Stitch as prompting context. The rules
that matter when you do:

- Name colours **descriptively with their hex** ("Deep Forest Green (#18342A)",
  "Warm Sand (#F7F3ED)"), not as raw tokens.
- Use the system's vocabulary: "pill-shaped", "gilded champagne gradient pill with a
  warm gold glow", "hairline border, near-flat at rest", "dense card interiors,
  airy chapter spacing".
- Change **one component at a time** and be numeric ("increase card interior padding
  from 16px to 20px").
- Pull colour names and shadow language from §2 and §4 rather than inventing them.

## Keeping docs and code in step

When a change alters the system (a new colour, a new component pattern, a change to
the frame or rhythm), update, in order:

1. `src/routes/layout.css` — the token or class.
2. `DESIGN.md` — the rule, and §7 if it is an implementation decision.
3. `docs/06-styling.md` — the token/class table in this documentation set.

If a change only adds a screen or a component within the existing rules, `DESIGN.md`
usually needs no edit.

## Related

- [`../DESIGN.md`](../DESIGN.md) — the source of truth.
- [06-styling](./06-styling.md) — the token and class reference.
- [05-components](./05-components.md) — component-by-component props and behaviour.
- [04-routing-and-pages](./04-routing-and-pages.md) — where the mobile patterns live.
