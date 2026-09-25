# 13 — Contributing

How to make a change and get it merged without surprises.

---

## Workflow

1. **Branch from `main`.** Use a descriptive, hyphenated branch name
   (`feat/paisu-batango-gallery`, `fix/mobile-booking-bar`).
2. **Make the change.** Prefer the smallest diff that fully solves the problem, and
   prefer editing an existing file over adding a new one.
3. **Run the checks** ([below](#definition-of-done)).
4. **Commit** using conventional commits ([below](#commit-conventions)).
5. **Open a pull request** describing the *why*, not just the *what*.

There are no commit hooks and no CI — verification is on you. The two commands that
matter are `pnpm check` and `pnpm check:code`; run them before every commit. Only
`apps/admin` has a test runner.

> **Touched `packages/content-model`?** Run `pnpm --filter content-model check` as
> well. Root scripts target `apps/web` only, so nothing else typechecks it.

> **Two caveats about the checks right now:** `pnpm check` filters to `@banggai/web`,
> so it does not cover the admin app. And `pnpm check:code` runs Biome across the whole
> workspace, which **currently fails on the unformatted admin scaffold** — until that
> is cleaned up, use `npx biome check apps/web` when you only touched the site. See
> [12-troubleshooting](./12-troubleshooting.md#biome-fails-on-the-admin-scaffold).

## Definition of done

A change is done when all of these are true:

```sh
pnpm check        # web: svelte-check "0 errors and 0 warnings" (a11y included)
pnpm check:code   # Biome lint + format + import order: no output
pnpm build        # exits 0 — required for routing, config, or CSS changes
```

For an admin change, also run the admin app's own gates (it is a separate app with
its own scripts and its own database):

```sh
pnpm --filter admin check        # types (needs generated worker types + auth schema)
pnpm --filter admin test         # Vitest — browser + server projects
pnpm --filter admin build
npx biome check apps/admin       # the pre-existing scaffold offences remain; see below
```

Plus:

- **No new `svelte-check` warnings.** The project holds at zero, and warnings include
  accessibility problems. A new warning is a regression.
- **No raw hex colours** in components; use the design tokens
  ([06-styling](./06-styling.md)).
- **Content lives in `lib/data`**, not in markup ([08-content-data-layer](./08-content-data-layer.md)).
- **`DESIGN.md` is updated** if the change alters the design system (a new colour,
  pattern, or frame).
- **The manual smoke test passes** for anything user-visible.

### Manual smoke test

There is no automated test suite, so exercise the changed area by hand. With
`pnpm dev` running:

- `/` — hero, package grid, destinations, testimonials, FAQ, insights, CTA render.
- `/packages` and `/destinations` and `/blog` — filters/search still work, and the
  empty state appears for a nonsense query.
- `/packages/<slug>` — gallery, itinerary accordions, booking card, and (below `lg`)
  the sticky bottom booking bar.
- `/blog/<slug>` — article renders, TOC highlights the current section, and (below
  `lg`) the contents bar appears only while the article is on screen.
- A bogus slug (`/blog/does-not-exist`) and an unmatched URL (`/nope`) both return
  status 404 with the branded error page — header and footer intact, no bare
  “Not Found” copy. See [04-routing-and-pages](./04-routing-and-pages.md#the-error-page).
- `/contact` — submitting swaps in the confirmation panel; `/about` renders.

If you change anything CSS-heavy, also do a final `pnpm build` and `pnpm preview`,
because Tailwind emits at build time.

---

## Commit conventions

This repository uses **Conventional Commits**: `<type>(<scope>): <summary>`, with a
lowercase summary in the imperative mood and no trailing period.

Types in use:

| Type | For |
| --- | --- |
| `feat` | A user-visible feature (new component, page, interaction) |
| `fix` | A bug fix |
| `content` | Copy or data-layer content changes (distinct from code) |
| `docs` | Documentation, `README.md`, `DESIGN.md` |
| `build` | Tooling, dependencies, build config |
| `chore` | Housekeeping with no behavioural change |
| `refactor` | Behaviour-preserving code change |
| `style` | Formatting-only change |

Scopes seen in the history: `web`, `blog`, `packages`, `header`, `design`,
`workspace`, `tooling`.

Examples from the log:

```
feat(packages): swipeable mobile gallery and sticky booking bar
fix(web): load Font Awesome 6.7.2 so the X share icon renders
docs(design): record surfaces, frames, icons and mobile patterns
chore(workspace): move the marketing site into apps/web in a pnpm workspace
```

### Commit message body

Keep the summary line on its own unless the change needs context. When it does, add a
short body explaining **why** — the diff already says what changed.

**No attribution footers.** Do not append tool or agent credit lines (no
`Generated with …`, no `Co-Authored-By: …`, no emoji trailers). Commit messages
contain only the message itself.

### Commit size

Prefer several focused commits over one large one — the history separates code,
content, and docs changes into their own commits, which keeps `git log` and
`git bisect` useful.

---

## Code style

Enforced by Biome, but worth internalising so you write conforming code by default:

- **Tabs** for indentation, **single quotes**, **semicolons**, **100-column** lines.
- **Import order** is sorted by Biome (`pnpm fix` does it) — do not hand-order.
- **Runes mode everywhere**, because `vite.config.ts` forces it. Use `$props()`,
  `$state`, `$derived`, `$effect`. Avoid legacy `export let` and reactive `$:`.
- **Type component props** with a local `type Props` and destructure with
  `$props()`.
- **Derive, don't recompute.** Put computation in `const x = $derived(...)` rather
  than inline in markup.
- **Comment the non-obvious.** The codebase explains *why* where a choice is
  counter-intuitive — the full-bleed `display: contents` trick in the package
  gallery, the measured scroll spy in the article TOC, the substituted hero image on
  `/packages`. Match that standard: a reader should not have to guess.

Full config reference: [10-tooling](./10-tooling.md#biome--lint--format).

---

## Task checklists

### Changing a component

- [ ] Props typed against the `lib/data` models, not re-declared shapes.
- [ ] Shared classes from `layout.css` reused where they fit.
- [ ] Design tokens, no raw hex.
- [ ] Accessible: labels on inputs, `aria-*` on disclosure and current-page state.
- [ ] `pnpm check` clean.

### Adding a route

- [ ] `src/routes/<segment>/+page.svelte` created; `<svelte:head>` sets a
      `Title — Banggai Escape` title and a description.
- [ ] If dynamic, a sibling `+page.ts` resolving the slug or calling `error(404, …)`.
- [ ] Uses `.section` + `.shell` (or the explicit `max-w-7xl px-6` frame).
- [ ] Added to `nav` in `site.ts` **only if** it belongs in the header/footer.
- [ ] `pnpm build` clean (routing changes need a real build).

### Changing content

- [ ] Entry added/changed in the right `lib/data` module with a unique, URL-safe
      `slug`.
- [ ] Media ids exist in `media.ts` (or a full `https://` URL is used).
- [ ] Blog posts: `category` matches a `blogCategories` pill, and every `h` block has
      a unique `id`.
- [ ] Package ordering considered — moving an entry changes the home page, related
      packages, and the article's "Popular Tour".
- [ ] `pnpm check` clean.

### Touching styling

- [ ] Tokens from `@theme`; no new colours without updating `DESIGN.md`.
- [ ] Verified at mobile, `md`, and `lg` widths.
- [ ] `pnpm build` (Tailwind emits at build time) and a `pnpm preview` look.

### Touching build / deployment config

- [ ] `pnpm build` exits 0.
- [ ] `pnpm check` still clean **after** the build (the
      [wrangler trap](./12-troubleshooting.md#the-wrangler-types--svelte-check-trap)
      surfaces here).
- [ ] If you changed bindings, regenerated types with no build output present, and
      verified `worker-configuration.d.ts` has no `GlobalProps` block.
- [ ] If you changed scripts, do **not** re-add `wrangler types --check` to `check`
      or `build`.

### Changing the design system

- [ ] Token or class updated in `src/routes/layout.css`.
- [ ] `DESIGN.md` updated (including §7 if it is an implementation decision).
- [ ] [06-styling](./06-styling.md) updated if a token or class table changed.
- [ ] `pnpm fix` run so the CSS is Biome-formatted.

### Working on the admin app

- [ ] Generated artifacts are present: `worker-configuration.d.ts`
      (`pnpm --filter admin gen`) and the auth schema
      (`pnpm --filter admin auth:schema`).
- [ ] Schema changes go through `pnpm --filter admin db:generate` (a migration file)
      rather than only `db:push`, so they are reviewable and reproducible.
- [ ] Secrets stay out of the repo — use `.env` locally and `wrangler secret put`
      for deployments. Never commit `.env`.
- [ ] Tests added or updated for new server logic, and they run
      (`pnpm --filter admin test`).
- [ ] The brand-theming decision is respected — do not mix shadcn neutral tokens
      with `DESIGN.md` colours without recording the choice.
- [ ] You are not reintroducing demo scaffolding — `src/routes/demo/**` and
      `src/lib/vitest-examples/**` are gone; build on the `(dashboard)` group instead.

---

## What there is *not*

Be aware of these gaps so you do not assume coverage that does not exist:

- **No tests in `apps/web`.** Types, `svelte-check`, Biome, and manual verification
  only. `apps/admin` has a Vitest setup with real server-side tests
  (`src/lib/server/authz.spec.ts`), plus a browser project that needs Playwright's
  Chromium installed.
- **No CI.** `pnpm check:code` and `pnpm check` are the intended steps; a workflow
  is not committed.
- **No commit hooks.** Nothing stops a non-conforming commit — review does.
- **No shared workspace package.** The two apps do not share types; see
  [02-architecture](./02-architecture.md#why-a-monorepo-with-two-apps).
- **No central error reporting.** `+error.svelte` renders errors, but no
  `handleError` hook logs or sanitises them.
- **No Open Graph tags, sitemap, or structured data** — see the roadmap in
  [09-seo-and-metadata](./09-seo-and-metadata.md#missing-seo-pieces-roadmap).

## Where to start

Good first contributions, roughly by size:

On the site (`apps/web`):

1. Replace the placeholder `'#'` social links in `site.ts`.
2. Add Open Graph and Twitter Card tags to the layout.
3. Wrap the mobile animations in a `prefers-reduced-motion` guard.
4. Make `relatedPackages` / `relatedPosts` actually related (shared region or tags)
   instead of "the first N others".
5. Add a `handleError` hook so thrown errors are logged and sanitised.
6. Cover the data-layer helpers (`formatPrice`, `durationLabel`, `tableOfContents`)
   with tests — `apps/web` has no runner yet, so this means adding Vitest.

On the admin (`apps/admin`):

7. Clean the scaffold's remaining formatting (`app.d.ts`, `utils.ts`, `+layout.svelte`,
   `vite.config.ts`, `wrangler.jsonc`, …) so `pnpm check:code` passes again.
8. Rename the package to `@banggai/admin` and add matching root scripts.
9. Build the CMS: CRUD, preview, publish/unpublish, media upload to R2, and analytics —
   phases 2–5 of [15-admin-dashboard-plan](./15-admin-dashboard-plan.md#phased-delivery).
10. Apply the requested shadcn-svelte preset and replace the minimal shell in
    `(dashboard)/+layout.svelte` with the `dashboard-01` block.
11. Delete the one-shot migration scripts (`apps/web/scripts/export-content.ts`,
    `apps/admin/scripts/import-content.ts`) once the public site reads from Neon.

## Related

- [01-getting-started](./01-getting-started.md) — setup and the verification loop.
- [10-tooling](./10-tooling.md) — the tools behind these checks.
- [12-troubleshooting](./12-troubleshooting.md) — when a check fails unexpectedly.
