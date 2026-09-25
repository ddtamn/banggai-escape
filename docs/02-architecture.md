# 02 — Architecture

How the pieces fit together: the workspace, the stack, the rendering model, and the
boundaries that keep the codebase predictable.

---

## In one picture

```
┌──────────────────────────────────────────────────────────────────────┐
│                        pnpm workspace (root)                         │
│  package.json (delegates)   pnpm-workspace.yaml   biome.json         │
└───────────────┬──────────────────────────────────┬───────────────────┘
                │                                  │
     ┌──────────▼──────────┐           ┌───────────▼─────────────────┐
     │      apps/web       │           │        apps/admin           │
     │    @banggai/web     │           │          "admin"            │
     │   SvelteKit 2       │           │   SvelteKit 2 + better-auth │
     │   public marketing  │           │   Drizzle/Neon + shadcn     │
     │                     │           │   (scaffold — in progress)  │
     └──────────┬──────────┘           └───────────┬─────────────────┘
                │                                  │
      ┌─────────┼────────────┐                     ▼
      │         │            │            Neon Postgres (HTTP)
┌─────▼───┐ ┌───▼────────┐ ┌─▼──────────┐  + Better Auth sessions
│ routes  │ │ lib/       │ │ static/    │
│ pages   │ │ components/│ │ favicon,   │  ← content: no backend yet
│ + load  │ │ data/ ◄────┼─┤ logo,      │     (typed TS modules)
└─────────┘ └────────────┘ │ robots.txt │
                           └────────────┘
                │
                ▼
        Vite build (Tailwind v4 + SvelteKit + adapter-cloudflare)
                │
                ▼
   apps/*/.svelte-kit/cloudflare/_worker.js   ← one Worker per app
   apps/*/.svelte-kit/cloudflare/             ← static assets
                │
                ▼
        wrangler deploy → Cloudflare Workers + Assets
```

## Tech stack

Versions are pinned in each app's `package.json`; this table explains *why* each is
there. It describes `apps/web` — the admin app's stack is listed separately
[below](#the-admin-apps-stack).

| Layer | Choice | Notes |
| --- | --- | --- |
| Framework | **SvelteKit 2** (stable, `^2.63.0`) | File-based routing, SSR, and the build pipeline. Both apps are on the same major. |
| UI runtime | **Svelte 5** (`^5.56.1`) | Runes mode is forced on for all project files (see [`vite.config.ts`](../apps/web/vite.config.ts)). |
| Styling | **Tailwind CSS v4** (`^4.3.0`) via `@tailwindcss/vite` | Configured in CSS (`@theme`), not a JS config file. |
| Plugins | `@tailwindcss/forms`, `@tailwindcss/typography` | Loaded with `@plugin` in `layout.css`; `forms` styles the contact inputs. |
| Language | **TypeScript 6** (`^6.0.3`), `strict: true` | See `apps/web/tsconfig.json`. |
| Adapter / host | **`@sveltejs/adapter-cloudflare`** (`^7.2.8`) | Emits a Worker plus an assets directory. |
| Bundler | **Vite 8** (`^8.0.16`) | Wraps SvelteKit and Tailwind. |
| Tooling | `svelte-check` (^4.6.0), `wrangler` (^4.97.0) | Types/a11y and the Cloudflare CLI. |
| Lint + format | **Biome** (^2.5.14, root devDependency) | One tool for JS/TS/CSS/JSON. |
| Package manager | **pnpm 12.3.4** workspaces | Pinned via `packageManager`. |

### The admin app's stack

`apps/admin` shares the outer shell (SvelteKit 2, Tailwind v4, the Cloudflare adapter,
Vite, `svelte-check`, Biome) but adds a server-side stack the site does not have:

| Layer | Choice | Version |
| --- | --- | --- |
| Framework | SvelteKit **2** (the same major as the site) | `^2.63.0` |
| Adapter | `@sveltejs/adapter-cloudflare` | `^7.2.8` |
| Auth | better-auth (email + password) | `^1.6.23` |
| Database | Neon Postgres via `@neondatabase/serverless` | `^1.1.0` |
| ORM | Drizzle ORM + drizzle-kit | `^0.45.2` |
| UI kit | shadcn-svelte (`rhea` style) + Lucide + `tailwind-variants` | `^1.7.0` |
| Font | Geist Variable (not Plus Jakarta Sans) | `^5.3.0` |
| Tests | Vitest + Playwright browser provider | `^4.1.8` |

Both apps are on SvelteKit 2, so a shared `packages/*` module **could** import SvelteKit
APIs if it ever needed to. `packages/content-model` deliberately does not — it stays
framework-agnostic so both apps can consume it without dragging the framework along.

### Project configuration worth knowing

There is **no `svelte.config.js`.** SvelteKit 2.63+ accepts its config inline in
`apps/web/vite.config.ts` — options passed to `sveltekit()` are split into SvelteKit
config and Vite-plugin-Svelte options:

```ts
sveltekit({
  compilerOptions: {
    // Force runes mode for the project, except for libraries. Can be removed in svelte 6.
    runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true),
  },
  adapter: adapter(),
})
```

Two consequences:

1. **`$lib` is built in.** SvelteKit maps `$lib` to `src/lib` and writes the same
   alias into the generated TypeScript config, so no manual alias is needed — and
   the codebase imports everything through `$lib/...`. `apps/web/package.json` also
   declares `#lib` subpath imports that resolve to the same folder; they are unused.
2. **Runes are mandatory in project files.** Any `.svelte` or `.svelte.ts` file
   outside `node_modules` is compiled in runes mode even without an explicit
   `<svelte:options runes />`. No experimental flags are enabled: no remote
   functions, no async components, no `+server.ts`, no form actions.

## The workspace

The repository is a **pnpm workspace**, defined by:

```yaml
# pnpm-workspace.yaml
packages:
  - apps/*
  - packages/*
allowBuilds:
  workerd: true
  esbuild: true
```

- `packages: [apps/*, packages/*]` — every directory with a `package.json` in either
  place is a workspace package: `apps/web` (`@banggai/web`), `apps/admin` (`admin`),
  and `packages/content-model` (`@banggai/content-model`).
- `allowBuilds` explicitly permits the post-install build scripts for `workerd`
  (Wrangler's runtime, used by `wrangler dev`) and `esbuild`. pnpm 10+ blocks
  dependency build scripts by default; this is the allowlist that unblocks them.

The packages are `@banggai/web`, `@banggai/admin`, and `@banggai/content-model`. The admin
started as the scaffold's default `admin` and was renamed to the scope convention, so both
apps filter the same way (`pnpm --filter @banggai/admin …`).

### Why a monorepo with two apps

The public site and the back-office share a domain model (packages, destinations,
articles), a deployment target (Cloudflare Workers), and a review process. One
workspace lets the admin grow next to the site without restructuring the repo, and
root scripts delegate into whichever app they target.

What the two apps share is deliberately narrow:

- **`packages/content-model`** holds the content contracts — the Zod schemas and their
  inferred types for packages, destinations, articles, and site settings. `apps/web`
  imports **types only** from it (erased at build time, so the public bundle is
  unchanged); `apps/admin` imports the schemas and validates with them before every
  write. It is framework-agnostic by design: no SvelteKit, no database, no Tailwind.
- Everything else is still separate: the admin has its own Drizzle schema, its own UI
  kit, and its own design tokens. No components, styles, or SvelteKit code are shared.

The content *records* still live in `apps/web/src/lib/data/` — the package holds only
what a record is, never the records themselves.

When the admin needs another shape from the site, the move is the same: put the
framework-agnostic part in `packages/content-model`, never import across apps.

## Module boundaries

Imports flow in one direction. Keep it that way.

```
routes/  ──imports──▶  lib/components/  ──imports──▶  lib/data/
   │                                                        ▲
   └──────────────────────imports───────────────────────────┘
```

Rules the codebase follows:

- **Pages are presentational.** Route files decide layout and compose components;
  they do not invent copy. Every string comes from `lib/data`.
- **Components are props-in.** Shared components (`PackageCard`, `PostCard`,
  `DestinationCard`, `SectionHeader`, `PageHero`, `CtaBanner`, `Faq`) receive
  typed props and render. They do not import collections of content themselves.
- **Data has no UI.** `lib/data/*` imports nothing from `lib/components` or
  `routes`. Its only outward dependency is `media.ts` for image ids.
- **No cross-app imports.** `apps/web` never reaches into `apps/admin`, and vice
  versa. Shared types belong in a `packages/*` workspace package.

`$lib` (and the unused `#lib` subpath import) resolve to `apps/web/src/lib`.
Everything outside `src/lib` is a route.

## Rendering model

This describes `apps/web`. (The admin app additionally runs `hooks.server.ts` on every
request, which resolves a better-auth session before the route renders — see
[14-admin-app](./14-admin-app.md#authentication-better-auth).)

**Every page is server-rendered on demand and then hydrated.** There is no
prerendering and no SSR opt-out anywhere in the web codebase:

- no `export const prerender`, `ssr`, or `csr` appears in `apps/web/src`;
- there is no `+layout.ts`, no `+server.ts`, and no `hooks.server.ts`;
- only three `+page.ts` files exist, all of them local `load` functions for dynamic
  routes (see [04-routing-and-pages](./04-routing-and-pages.md#dynamic-routes)).

What that means in practice:

| Behaviour | Detail |
| --- | --- |
| First paint | The Worker runs the component tree on the server and streams HTML. Data in `lib/data` is bundled into the Worker, so `load` functions are synchronous lookups — no network calls during render. |
| Interactivity | Svelte hydrates on the client; `$state`/`$effect`-driven UI (filters, drawer, scroll spy, sticky bars) boots after hydration. |
| Data loading | `load` runs **both** on the server and in the browser on client-side navigations. Because the dataset is a static array, the result is identical either way. |
| Worker APIs | `platform.env`, `platform.ctx`, and `caches` are only present in the deployed Worker / `wrangler dev`, not in `pnpm dev`. Nothing in `src` uses them today, so development and production behave the same. |
| Caching | No cache headers or `Cache-Control` are set by the app. Cloudflare's defaults for Workers + Assets apply. |

## Request lifecycle

```
Browser request  GET /packages/paisu-pok-lake-day-trip
        │
        ▼
Cloudflare Worker  (_worker.js, built by adapter-cloudflare)
        │
        ├─ SvelteKit router matches  src/routes/packages/[slug]/+page.svelte
        │
        ├─ runs  src/routes/packages/[slug]/+page.ts  → load({ params })
        │        └─ getPackage('paisu-pok-lake-day-trip')  ─┐
        │                                                   │  misses?
        │           error(404, …) ◀─────────────────────────┘
        │
        ├─ renders +page.svelte with data.pkg
        │        └─ reads relatedPackages(pkg.slug) from the same dataset
        │
        ├─ wraps it in src/routes/+layout.svelte (Header · <main> · Footer)
        │
        └─ emits HTML + the JS/CSS bundles, styled by src/routes/layout.css
        │
        ▼
Browser  →  hydrate  →  filters, drawer, scroll spy, sticky bars become live
```

## Content-first architecture and its trade-offs

The defining decision is: **all content is typed TypeScript in `lib/data`, and there
is no backend or CMS.**

Good consequences:

- A single source of truth per collection; the type checker catches missing fields.
- Zero runtime data fetching, no API layer, no database to run.
- Content changes are code changes: they go through review and version control.

Costs, and where they would be addressed:

| Cost | Current state | When it bites |
| --- | --- | --- |
| Non-developers cannot edit content | All copy is in `.ts` files | The moment marketing wants to publish without a PR → introduce a CMS or a git-based content pipeline. |
| Content ships in the JS bundle | Collections are small (8 packages, 9 destinations, 3 posts) | Adding hundreds of entries would inflate the Worker bundle. |
| URL/data shape is hand-maintained | New collection = new hand-written route pair + `+page.ts` | Fine at this size; revisit if routes become formulaic. |
| No persistence | The contact form is a client-side success state only | It already needs a real destination — see below. |
| No tests | Relies on types, svelte-check, and manual smoke tests | Add a test runner before the logic gets more complex. |

### Known functional gaps

These are intentional at the current stage, not oversights:

- **The contact form does not submit anywhere.** `apps/web/src/routes/contact/+page.svelte`
  intercepts `submit` and swaps in a confirmation panel. Wiring it up needs an
  endpoint or a form service.
- **The language switcher is UI only.** `LanguageSwitcher.svelte` changes the chip
  and closes; there is no i18n layer and no translated content.
- **The share buttons on an article do not share.** They render as buttons with
  `aria-label`s; no `navigator.share`/clipboard wiring exists yet.
- **Social links are placeholders.** Every entry in `socials` (`site.ts`) points at
  `'#'`.

## How the pieces would extend

- **Admin app.** Already scaffolded (see [14-admin-app](./14-admin-app.md)) but not
  yet functional. Its next architectural step is a shared content model: lift the
  `lib/data` types into a framework-agnostic `packages/*` package so both apps agree
  on shapes instead of importing across apps.
- **Real content source.** Replace the arrays in `lib/data` with a loader (CMS API,
  or build-time files) while keeping the exported function signatures
  (`getPackage`, `getPost`, …) stable — the routes would not need to change.
- **Contact + booking.** Add a `+server.ts` endpoint or a form action (SvelteKit 2
  supports both). Remote functions would need `experimental.remoteFunctions` enabled
  in `vite.config.ts` first.
- **i18n.** Route-level language segments plus a message catalogue; today's
  `languages` array is the placeholder for it.

## Related

- [03-project-structure](./03-project-structure.md) — the annotated file tree.
- [04-routing-and-pages](./04-routing-and-pages.md) — every route in detail.
- [08-content-data-layer](./08-content-data-layer.md) — the data modules.
- [11-deployment](./11-deployment.md) — the Cloudflare side of the picture.
- [`../DESIGN.md`](../DESIGN.md) — the design system this app implements.
