# 03 — Project Structure

An annotated map of every file that matters, and what belongs where.

---

## Top level

```
banggai-escape/
├─ apps/
│  ├─ web/                          # @banggai/web — the public marketing site (SvelteKit 2)
│  └─ admin/                        # "admin" — the back-office (SvelteKit 2 + better-auth + Drizzle)
├─ packages/
│  └─ content-model/                # @banggai/content-model — shared Zod content contracts
├─ docs/                            # this documentation
├─ .agents/                         # agent config (installed skills) — git-tracked
├─ .stitch/                         # Stitch design exports — GIT-IGNORED
├─ .vscode/                         # editor recommendations, settings and mcp.json
├─ AGENTS.md                        # instructions for AI coding agents
├─ DESIGN.md                        # design system — source of truth
├─ README.md                        # quick start / scripts / deploy TL;DR
├─ .migration/                      # leftover of the pre-Neon content export — GIT-IGNORED, unread
├─ biome.json                       # lint + format config for the whole workspace
├─ package.json                     # root scripts, Biome dev dep, engines, packageManager
├─ pnpm-workspace.yaml              # workspace packages + allowed build scripts
├─ pnpm-lock.yaml                   # lockfile (excluded from Biome)
├─ skills-lock.json                 # pinned versions of installed agent skills
├─ .gitignore  .npmrc               # ignore rules; pnpm settings
└─ .env                             # local secrets — GIT-IGNORED
```

Three directories are worth calling out:

- **`packages/content-model` is the only shared workspace package.** It holds the Zod
  schemas and inferred types for packages, destinations, articles, and site settings,
  plus the media-reference walker both apps need, and nothing else — no SvelteKit, no
  database, no Tailwind. The admin validates with it before every write and the public
  site validates with it again as each payload is read, which is how the two apps agree
  on what a content item contains without importing each other (rule 7). See
  [14-admin-app](./14-admin-app.md#content-contracts-packagescontent-model).

- **`.stitch/` is mostly ignored** (`/.stitch/*` in `.gitignore`) — the design exports are
  50 MB of vendor HTML. Two files in it *are* tracked, and they have to be, because
  `src/lib/data/media.ts` is a committed artefact that depends on both:
  - `gen-media.mjs` — the generator. Anchored to its own location, so it runs from any
    working directory.
  - `media-substitutions.json` — which asset id became which media-library URL. Seven images
    were migrated out of the design tool's demo host, and this is the record of that. Without
    it the generator reproduces `media.ts` pointing back at `lh3.googleusercontent.com`, and
    the site silently returns to 4.28 MB with nothing failing.

  The remaining inputs — `designs/`, `outline.mjs`, `metadata.json`, `fetch-screens.sh` — are
  for *authoring* new designs, not for regenerating this one, so they stay local.
- **`.agents/` is tracked.** It holds `skills/` — the installed agent skills, each pinned
  to a source and hash in `skills-lock.json` — and is excluded from Biome. The MCP servers
  are declared next door in `.vscode/mcp.json` (Neon, over HTTP); neither file holds a
  credential, and there is no `.agents/mcp.json` any more.

## `apps/web/`

```
apps/web/
├─ src/
│  ├─ app.html                      # document shell: fonts, FA CDN, theme-color, viewport
│  ├─ app.d.ts                      # App.Platform (env / ctx / caches / cf) + Cloudflare types
│  ├─ hooks.server.ts               # the edge freshness policy: one Cache-Control header
│  ├─ routes/
│  │  ├─ +layout.server.ts          # loadSiteSettings() — the chrome every route inherits
│  │  ├─ +layout.svelte             # Header · <main> · Footer + default meta
│  │  ├─ +page.server.ts            # /  featured packages · curated destinations · latest posts
│  │  ├─ +page.svelte               # /
│  │  ├─ layout.css                 # Tailwind entry + @theme tokens + component classes
│  │  ├─ about/+page.svelte         # /about                  (settings only — no loader)
│  │  ├─ contact/+page.svelte       # /contact                (settings only — no loader)
│  │  ├─ blog/
│  │  │  ├─ +page.server.ts         # /blog                   published articles, in order
│  │  │  ├─ +page.svelte            # /blog                   listing + filters
│  │  │  └─ [slug]/
│  │  │     ├─ +page.server.ts      # /blog/:slug             article · related · popular · 301 or 404
│  │  │     └─ +page.svelte         # /blog/:slug
│  │  ├─ destinations/
│  │  │  ├─ +page.server.ts         # /destinations           published destinations
│  │  │  ├─ +page.svelte            # /destinations           listing + search
│  │  │  └─ [slug]/
│  │  │     ├─ +page.server.ts      # /destinations/:slug     detail · mosaic · related · 301 or 404
│  │  │     └─ +page.svelte
│  │  ├─ packages/
│  │  │  ├─ +page.server.ts         # /packages               published packages
│  │  │  ├─ +page.svelte            # /packages               listing + filters
│  │  │  └─ [slug]/
│  │  │     ├─ +page.server.ts      # /packages/:slug         detail · related · 301 or 404
│  │  │     └─ +page.svelte         # /packages/:slug         detail + gallery + booking
│  │  ├─ api/events/+server.ts      # POST-only analytics endpoint → Analytics Engine
│  │  └─ +error.svelte              # branded 404 / 500; renders inside the layout
│  ├─ lib/
│  │  ├─ index.ts                   # placeholder re-export barrel (currently empty)
│  │  ├─ content.ts                 # presenters: formatPrice, durationLabel, badgeDays, TOC, authorBio
│  │  ├─ analytics.ts               # browser tracking: afterNavigate + data-track clicks
│  │  ├─ components/                # shared UI, props in (see 05-components.md)
│  │  ├─ data/
│  │  │  └─ media.ts                # GENERATED decoration manifest — the only data left here
│  │  └─ server/
│  │     ├─ db/index.ts             # lazy neon() client over $env/dynamic/private
│  │     ├─ analytics.ts            # the fail-open Analytics Engine writer
│  │     └─ content/                # the read layer (see 08-content-data-layer.md)
│  │        ├─ index.ts             # the barrel pages import
│  │        ├─ entries.ts           # published content, validated, media resolved
│  │        ├─ settings.ts          # all thirteen site_settings rows
│  │        ├─ redirects.ts         # slug_redirects, chains followed
│  │        ├─ media.ts             # media_assets ids → URLs
│  │        └─ issues.ts            # Zod issues → readable lines
│  └─ …                             # (no +layout.ts; the only +server.ts is /api/events)
├─ static/
│  ├─ favicon.png                   # browser tab icon
│  ├─ apple-touch-icon.png          # iOS home-screen icon
│  ├─ logomark.png                  # header mark
│  ├─ combination-mark.png          # footer lockup
│  └─ robots.txt                    # allow-all crawl rules
├─ package.json                     # name @banggai/web, scripts, deps
├─ tsconfig.json                    # extends ./.svelte-kit/tsconfig.json; strict; types include worker types
├─ vite.config.ts                   # THE SvelteKit config (no svelte.config.js)
├─ wrangler.jsonc                   # Worker name, compat date, bindings, vars, dev URLs
└─ worker-configuration.d.ts        # GENERATED by `pnpm gen` — commit the build-independent shape
```

### `src/lib/components/`

Ten shared components. Each one and its props is documented in
[05-components](./05-components.md).

| File | Role |
| --- | --- |
| `Header.svelte` | Fixed forest bar, desktop nav, language switcher, mobile drawer |
| `Footer.svelte` | Forest footer: brand, destinations, menu, contact, socials |
| `LanguageSwitcher.svelte` | EN/ID chip with a dropdown (UI only) |
| `PageHero.svelte` | Reusable photographic hero band with optional breadcrumbs |
| `SectionHeader.svelte` | Section title + subtitle + optional "View all" pill |
| `CtaBanner.svelte` | Full-bleed closing call-to-action band |
| `Faq.svelte` | `<details>` accordion |
| `PackageCard.svelte` | Package listing card |
| `PostCard.svelte` | Article listing card |
| `DestinationCard.svelte` | Image-led showcase card with scrim |

### `src/lib/data/`

The folder now holds exactly one module. Content comes from Neon; the full picture is in
[08-content-data-layer](./08-content-data-layer.md).

| File | Contents |
| --- | --- |
| `media.ts` | Decoration manifest: `img()`, `media`, `backgrounds` — generated, see below |

The five typed modules that used to hold the content (`site.ts`, `content.ts`,
`packages.ts`, `destinations.ts`, `posts.ts`) were deleted in Phase 6, along with the
export that read them. Do not recreate them: two sources of truth for the content is the
thing that switch existed to end.

### `src/lib/server/`

Server-only, and the only code in the app that reaches the database or a Worker binding.
`db/index.ts` owns the connection and `content/` is the read layer every page goes through;
`analytics.ts` writes one data point through the `ANALYTICS` binding and is called only by
`/api/events`. None of it may be imported from a component, and none holds presentation
logic beyond turning a media id into a URL.

## `apps/admin/`

A second SvelteKit app — the back-office. It signs in, guards every route behind the
`administrators` table, and owns the content: packages, destinations and articles with a
publish workflow and revision history, the site's shared settings, and the media library.
It is **not deployed yet**. Full detail in [14-admin-app](./14-admin-app.md); the shape is:

```
apps/admin/
├─ src/
│  ├─ app.html · app.d.ts          # shell; Platform + Locals (user/session)
│  ├─ hooks.server.ts              # better-auth session → event.locals
│  ├─ lib/
│  │  ├─ utils.ts                  # cn() re-export + shadcn type helpers
│  │  ├─ assets/favicon.svg
│  │  ├─ navigation.ts             # the one list of sections (sidebar + header)
│  │  ├─ components/               # shell, login form, content/ forms, ui/ (shadcn + chart/)
│  │  ├─ content/forms.ts          # field specs for content kinds *and* settings
│  │  └─ server/
│  │     ├─ authz.ts · authz.spec.ts
│  │     ├─ content/               # service.ts (entries/revisions), validate.ts
│  │     ├─ media/                 # upload, keys, references, promote, options
│  │     ├─ analytics/             # SQL API client, the five aggregate queries, assembly
│  │     ├─ settings/service.ts    # listSettings / getSetting / saveSetting
│  │     └─ db/                    # schema.ts, auth.schema.ts (generated), lazy client
│  └─ routes/
│     ├─ +layout.svelte · +page.server.ts · layout.css  # shadcn neutral theme, Geist
│     ├─ (auth)/login/             # public sign-in form + action
│     ├─ media/[key]/+server.ts    # serves an object from R2
│     └─ (dashboard)/              # guard layout, shell, content/, media/, settings/, analytics/, logout
├─ e2e/ · playwright.config.ts     # browser checks (pnpm --filter @banggai/admin test:e2e)
├─ components.json                 # shadcn-svelte config (iconLibrary: lucide)
├─ drizzle.config.ts               # needs DATABASE_URL
├─ drizzle/                        # reviewable migrations + generated snapshots
├─ scripts/                        # provision-admin, db-roles (one-shot tools)
├─ package.json · tsconfig.json · vite.config.ts (also Vitest config) · wrangler.jsonc
└─ .env.example · .env.types · .gitignore · .vscode/
```

Its two generated files — `src/lib/server/db/auth.schema.ts`
(`pnpm --filter @banggai/admin auth:schema`) and `worker-configuration.d.ts`
(`pnpm --filter @banggai/admin gen`) — are both present and committed, as are the
`drizzle/*.sql` migrations and their `drizzle/meta/**` snapshots.

## Where new code goes

Paths in this table are relative to the app you are working in.

| You are adding… | Put it in… | Then |
| --- | --- | --- |
| A page (`web`) | `apps/web/src/routes/<segment>/+page.svelte` | Add it to the `nav` setting in the admin if it belongs in the header/footer |
| A dynamic page (`web`) | `apps/web/src/routes/<segment>/[slug]/+page.svelte` + `+page.server.ts` | Load it with `loadPublishedEntry`, and check `resolveSlugRedirect` before 404ing |
| Reusable UI (`web`) | `apps/web/src/lib/components/<Name>.svelte` | Type its props with a local `type Props` and `$props()` |
| A new read (`web`) | `apps/web/src/lib/server/content/` | Export it from that folder's `index.ts`; only a `.server.ts` load may import it |
| A shadcn component (`admin`) | added by the shadcn-svelte CLI into `apps/admin/src/lib/components/ui/` | Import from `$lib/components/ui/…` |
| A design token or shared class (`web`) | `apps/web/src/routes/layout.css` (`@theme` / `@layer components`) | Update `DESIGN.md` if it changes the system |
| A theme token (`admin`) | `apps/admin/src/routes/layout.css` (shadcn tokens) | Decide the brand-theming question first — see [14-admin-app](./14-admin-app.md#design-system-not-the-banggai-brand-system) |
| Content (`web`) | The admin's Packages / Destinations / Blog / Settings screens | Publish; the site shows it within five minutes |
| A database table (`admin`) | `apps/admin/src/lib/server/db/schema.ts` | `pnpm --filter @banggai/admin db:generate`, review the SQL, then `db:migrate` |
| A content field both apps need | `packages/content-model/src/` | Types in `apps/web` and validation in `apps/admin` follow automatically |
| A content image (`web`) | The admin's media library (upload, then copy to R2) | Content stores the asset id; the read layer turns it into a URL |
| A decoration image (`web`) | `.stitch/gen-media.mjs` — never hand-edited | Keep `img()` calls to these; content images already arrive as URLs. If a placeholder needs to become owned media, run `apps/admin/scripts/replace-placeholder-media.ts` rather than pasting a URL |
| A tracked public event (`web`) | The name in `packages/content-model/src/analytics.ts`, the control carries `data-track` | Built into the query set and the dashboard automatically; an unknown name is dropped client-side and refused server-side |
| Tests | `apps/admin/src/**/*.{test,spec}.ts` (admin only) | `pnpm --filter @banggai/admin test` — see [14-admin-app](./14-admin-app.md#testing) |

## `worker-configuration.d.ts` — handle with care

This file is generated by `wrangler types` (exposed as `pnpm gen`) from
`wrangler.jsonc`. Its committed form declares the `ASSETS` binding and a block of
Cloudflare runtime types, and it is listed in `tsconfig.json` under
`compilerOptions.types`.

Wrangler emits a **different shape** depending on whether the adapter output
exists on disk. The bad shape adds a `Cloudflare.GlobalProps` block that imports
the built worker, which drags build artifacts into the type program and makes
`svelte-check` report hundreds of bogus errors. This is why `pnpm gen` is *not*
part of `pnpm check` or `pnpm build`.

**Before regenerating, read [12-troubleshooting](./12-troubleshooting.md#the-wrangler-types--svelte-check-trap).**
The short version:

```sh
rm -rf apps/web/.svelte-kit/cloudflare apps/web/.svelte-kit/cloudflare-tmp
pnpm gen
```

## Generated and ignored paths

| Path | Generated by | Tracked? |
| --- | --- | --- |
| `apps/web/worker-configuration.d.ts` | `pnpm gen` (`wrangler types --env-file .env.types`) | **Yes** — commit the build-independent shape |
| `apps/web/src/lib/data/media.ts` | `node .stitch/gen-media.mjs` | **Yes** — commit it, and commit `.stitch/gen-media.mjs` and `.stitch/media-substitutions.json` with it, or the file cannot be reproduced |
| `apps/admin/worker-configuration.d.ts` | `pnpm --filter @banggai/admin gen` (`wrangler types --env-file .env.types`) | **Yes** — commit the build-independent shape |
| `apps/admin/src/lib/server/db/auth.schema.ts` | `pnpm --filter @banggai/admin auth:schema` | **Yes** — generated from `auth.ts` |
| `apps/web/.svelte-kit/` | `svelte-kit sync` / `vite build` | No |
| `apps/admin/.svelte-kit/` | `svelte-kit sync` / `vite build` | No (admin has its own `.gitignore`) |
| `apps/*/.wrangler/` | `wrangler dev` / `deploy` | No |
| `node_modules/`, `build/`, `.output/` | tooling | No |
| `.stitch/` | design exports | Only `gen-media.mjs` and `media-substitutions.json`; the 50 MB of vendor HTML stays out |
| `.env`, `.env.*` (except `.env.example`, `.env.test`, `.env.types`) | you | No — `apps/admin/.env` and `apps/web/.env` exist locally, each holding a `DATABASE_URL`. `.dev.vars*` is git-ignored too, and is what `wrangler dev` reads |
| `apps/admin/drizzle/**` | `pnpm --filter @banggai/admin db:generate` | **Yes** — review the SQL before applying it |
| `.migration/` | nothing, any more — a leftover of the pre-Neon export | No. May still exist on a machine that ran the migration; safe to delete |

Biome additionally excludes `worker-configuration.d.ts`, `src/lib/data/media.ts`,
`.agents/`, `.vscode/`, lockfiles, and build directories, because formatting
generated or vendored files only creates churn (see [10-tooling](./10-tooling.md)).

## Related

- [02-architecture](./02-architecture.md) — why the boundaries look like this.
- [04-routing-and-pages](./04-routing-and-pages.md) — the routes in detail.
- [05-components](./05-components.md) / [08-content-data-layer](./08-content-data-layer.md) — the two `lib/` trees.
