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
     │                     │           │   (phases 0–5 built)        │
     └──────────┬──────────┘           └───────────┬─────────────────┘
                │                                  │
      ┌─────────┼────────────┐                     ▼
      │         │            │            Neon Postgres (HTTP)
┌─────▼───┐ ┌───▼────────┐ ┌─▼──────────┐  + Better Auth sessions
│ routes  │ │ lib/       │ │ static/    │  + Analytics Engine (SQL API)
│ pages   │ │ components/│ │ favicon,   │  ← content read from Neon in
│ + load  │ │ data/ ◄────┼─┤ logo,      │     .server loaders; events
└─────────┘ └────────────┘ │ robots.txt │     written to Analytics Engine
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
   functions, no async components, no form actions, and exactly one `+server.ts` —
   `/api/events`, the analytics endpoint.

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
  inferred types for packages, destinations, articles, and site settings. Both apps
  validate with them: `apps/admin` before every write, and `apps/web` again as each
  payload comes back out of the database. It is framework-agnostic by design: no
  SvelteKit, no database, no Tailwind.
- Everything else is still separate: the admin has its own Drizzle schema, its own UI
  kit, and its own design tokens. No components, styles, or SvelteKit code are shared.

The content *records* live in **Neon**, written by the admin and read by the public
site. The package holds only what a record is, never the records themselves.

When the admin needs another shape from the site, the move is the same: put the
framework-agnostic part in `packages/content-model`, never import across apps.

## Module boundaries

Imports flow in one direction. Keep it that way.

```
routes/+*.server.ts  ──imports──▶  lib/server/content/  ──imports──▶  Neon
        │                                  │
        └──imports──▶  lib/components/  ◀──┘   (payloads, as props)
                            │
                            └──imports──▶  lib/data/media.ts   (decoration only)

routes/api/events/+server.ts ──imports──▶ lib/server/analytics.ts ──▶ Analytics Engine
        ▲
        └──POST── lib/analytics.ts (browser) ◀── data-track, afterNavigate
```

Rules the codebase follows:

- **Pages are presentational.** Route files decide layout and compose components from
  what their loaders hand them. They do not invent copy and they do not query the
  database; every string arrives as data or from a settings row.
- **Components are props-in.** Shared components (`PackageCard`, `PostCard`,
  `DestinationCard`, `SectionHeader`, `PageHero`, `CtaBanner`, `Faq`) receive
  typed props and render. They do not import content, and they do not reach for a
  loader.
- **Data has no UI.** `lib/server/content/*` imports nothing from `lib/components` or
  `routes`, and is server-only. `lib/data/media.ts` is the one module left holding
  data, and only the decoration images the design owns.
- **No cross-app imports.** `apps/web` never reaches into `apps/admin`, and vice
  versa. Shared types belong in a `packages/*` workspace package.
- **Analytics is a one-way edge.** The public site writes data points through
  `/api/events`; the admin reads aggregates over Cloudflare's SQL API with its own
  read-only token. The vocabulary and the column layout that connects them live in
  `packages/content-model/src/analytics.ts`, because neither app may import the other.
  Only the Worker writes: the browser posts `{ event, path }` and the server derives the
  content kind from the path, so a caller has no dimension to lie about. It fails open
  everywhere — a missing binding or a refused query never reaches a visitor.

`$lib` (and the unused `#lib` subpath import) resolve to `apps/web/src/lib`.
Everything outside `src/lib` is a route.

## Rendering model

This describes `apps/web`. (The admin app additionally runs `hooks.server.ts` on every
request, which resolves a better-auth session before the route renders — see
[14-admin-app](./14-admin-app.md#authentication-better-auth).)

**Every page is server-rendered on demand and then hydrated.** There is no
prerendering and no SSR opt-out anywhere in the web codebase:

- no `export const prerender`, `ssr`, or `csr` appears in `apps/web/src`;
- there is no `+layout.ts`, and the only `+server.ts` is the POST-only analytics endpoint
  at `/api/events`;
- content is read in `.server` loaders only — `+layout.server.ts` for the site's settings
  and `+page.server.ts` for each page — so a page can never render from content that
  reached the browser in a bundle;
- `hooks.server.ts` exists for exactly one reason: it sets the edge cache's
  `Cache-Control` header (see [08-content-data-layer](./08-content-data-layer.md#freshness-the-five-minute-edge-cache)).

What that means in practice:

| Behaviour | Detail |
| --- | --- |
| First paint | The Worker runs the loaders, then the component tree, and streams HTML. Media ids are already swapped for URLs, so components render synchronously from props. |
| Interactivity | Svelte hydrates on the client; `$state`/`$effect`-driven UI (filters, drawer, scroll spy, sticky bars) boots after hydration. |
| Data loading | Server loads run on the Worker against Neon. A client-side navigation re-fetches only `__data.json`, which carries no cache header and is therefore always fresh. |
| Worker APIs | `platform.env`, `platform.ctx`, and `caches` are only present in the deployed Worker and under `wrangler dev`, not in `pnpm dev` — which is exactly why the edge cache is expressed as a response header the adapter understands rather than as a call to the Cache API. |
| Caching | Five minutes at the edge, off in development. `Cache-Control: public, max-age=0, s-maxage=300, stale-while-revalidate=600`. |

## Request lifecycle

```
Browser request  GET /packages/paisu-pok-lake-day-trip
        │
        ▼
Cloudflare Worker  (_worker.js, built by adapter-cloudflare)
        │
        ├─ Workers cache: a stored response for this URL and a document request?
        │        └─ hit, and under five minutes old → served, Neon never read
        │
        ├─ runs  src/routes/+layout.server.ts   ─┐
        │        └─ loadSiteSettings()            │  one query for site_settings,
        │           (nav · footer · brand · CTA)  │  whichever page asked
        │        ─                                │
        ├─ runs  src/routes/packages/[slug]/+page.server.ts
        │        └─ loadPublishedEntries('package')  →  Neon, joined to its published revision
        │             ├─ nothing at that slug?
        │             │     └─ resolveSlugRedirect()  →  redirect(301, /packages/<new>)
        │             │           └─ nothing recorded?  →  error(404, …)
        │             ├─ parsePayload() each row         (the contract, before media)
        │             └─ loadMedia(ids) → the R2 custom domain
        │
        ├─ renders +page.svelte with data.pkg · data.related · data.settings
        │
        ├─ wraps it in src/routes/+layout.svelte (Header · <main> · Footer)
        │
        └─ hooks.server.ts stamps Cache-Control → adapter stores it in the Workers cache
        │
        ▼
Browser  →  hydrate  →  filters, drawer, scroll spy, sticky bars become live
```

## Where content lives, and its trade-offs

The defining decision is: **all content lives in Neon, is authored in a separate admin
app, and is read by the public site at request time.**

Good consequences:

- Editors publish without a developer, a pull request or a deploy.
- One source of truth for both apps, and the contract is enforced twice — on the way in
  by `publish`, and again on the way out as the site reads each payload.
- A payload that cannot be rendered cannot be published, so the site never needs a
  fallback for one.
- The public bundle no longer carries the content.

Costs, and where they would be addressed:

| Cost | Current state | When it bites |
| --- | --- | --- |
| The site cannot render without the database | A Neon outage is a 500, with no static fallback | Accepted deliberately: the alternative is two sources of truth, and a page quietly serving month-old copy is worse than an error that names the problem. |
| Freshness is bounded | Five minutes at the edge | An urgent correction is visible "within five minutes", not instantly → shorten the TTL, or purge the URL from the admin on publish. |
| Decoration images are still in code | Hero bands and mosaics live in `lib/data/media.ts` | The design changes; regenerate from Stitch, or move them into the media library. |
| A new field is added in two places | The content-model schema and the admin's form spec | The compiler catches the second one, so this is a nuisance rather than a trap. |
| No persistence | The contact form is a client-side success state only | It already needs a real destination — see below. |
| No public-site tests | Relies on types, svelte-check, `pnpm build`, and manual smoke tests | Add a browser suite for the web app, as the admin has. |

### Known functional gaps

These are intentional at the current stage, not oversights:

- **The contact form does not submit anywhere.** `apps/web/src/routes/contact/+page.svelte`
  intercepts `submit` and swaps in a confirmation panel. Wiring it up needs an
  endpoint or a form service.
- **The language switcher is UI only.** `LanguageSwitcher.svelte` changes the chip
  and closes; there is no i18n layer and no translated content.
- **The share buttons on an article do not share.** They render as buttons with
  `aria-label`s; no `navigator.share`/clipboard wiring exists yet.
- **Social links are placeholders.** Every entry in the `socials` setting points at
  `'#'`.

## How the pieces would extend

- **Admin app.** Functional (see [14-admin-app](./14-admin-app.md)); not deployed yet.
  Its next steps are analytics (Phase 5) and a staging branch with its own bindings
  (Phase 6), not more architecture.
- **Purging on publish.** The five-minute window is a ceiling, not a target. The next
  refinement is for `publish` to call Cloudflare's cache-purge API for the URLs that
  changed, which would make a correction visible immediately while keeping the TTL as a
  safety net.
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
