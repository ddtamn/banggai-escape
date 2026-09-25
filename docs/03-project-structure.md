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
├─ .migration/                      # one-shot content export/import snapshot — GIT-IGNORED
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
  and nothing else — no SvelteKit, no database, no Tailwind. `apps/web` imports **types
  only** from it (erased at build time); `apps/admin` imports the schemas and validates
  with them. This is how the two apps agree on what a content item contains without
  importing each other, which rule 7 forbids. See
  [14-admin-app](./14-admin-app.md#content-contracts-packagescontent-model).

- **`.stitch/` is ignored** (`/.stitch` in `.gitignore`). It holds the original
  design exports and the `gen-media.mjs` script that produced
  `src/lib/data/media.ts`. If it is missing on your machine, the generated manifest
  is still committed and everything builds — you only need `.stitch/` to
  *regenerate* images.
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
│  ├─ routes/
│  │  ├─ +layout.svelte             # global chrome: Header · <main> · Footer + default meta
│  │  ├─ +page.svelte               # /                       home
│  │  ├─ layout.css                 # Tailwind entry + @theme tokens + component classes
│  │  ├─ about/+page.svelte         # /about
│  │  ├─ contact/+page.svelte       # /contact
│  │  ├─ blog/
│  │  │  ├─ +page.svelte            # /blog                   listing + filters
│  │  │  └─ [slug]/
│  │  │     ├─ +page.svelte         # /blog/:slug             article
│  │  │     └─ +page.ts             # load(): getPost() or 404
│  │  ├─ destinations/
│  │  │  ├─ +page.svelte            # /destinations           listing + search
│  │  │  └─ [slug]/
│  │  │     ├─ +page.svelte         # /destinations/:slug     detail
│  │  │     └─ +page.ts             # load(): getDestination() or 404
│  │  ├─ packages/
│  │  │  ├─ +page.svelte            # /packages               listing + filters
│  │  │  └─ [slug]/
│  │  │     ├─ +page.svelte         # /packages/:slug         detail + gallery + booking
│  │  │     └─ +page.ts             # load(): getPackage() or 404
│  │  └─ +error.svelte              # branded 404 / 500; renders inside the layout
│  ├─ lib/
│  │  ├─ index.ts                   # placeholder re-export barrel (currently empty)
│  │  ├─ components/                # shared UI (see 05-components.md)
│  │  └─ data/                      # typed content (see 08-content-data-layer.md)
│  └─ …                             # (no +layout.ts, hooks.server.ts, or +server.ts yet)
├─ static/
│  ├─ favicon.png                   # browser tab icon
│  ├─ apple-touch-icon.png          # iOS home-screen icon
│  ├─ logomark.png                  # header mark
│  ├─ combination-mark.png          # footer lockup
│  └─ robots.txt                    # allow-all crawl rules
├─ package.json                     # name @banggai/web, scripts, deps
├─ tsconfig.json                    # extends ./.svelte-kit/tsconfig.json; strict; types include worker types
├─ vite.config.ts                   # THE SvelteKit config (no svelte.config.js)
├─ wrangler.jsonc                   # Worker name, compat date, Assets binding, dev URLs
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

Six modules. The full API is in [08-content-data-layer](./08-content-data-layer.md).

| File | Contents | Editable by hand? |
| --- | --- | --- |
| `site.ts` | Brand, nav, languages, socials, footer destination links | Yes |
| `content.ts` | Features, testimonials, FAQs, stats, vision/mission, contact channels, blog categories, shared CTA background | Yes |
| `destinations.ts` | 9 destinations + `getDestination`, `destinationImage` | Yes |
| `packages.ts` | 8 packages + price/duration/badge formatters, `getPackage`, `featuredPackages`, `relatedPackages`, `packageImage` | Yes |
| `posts.ts` | 3 posts + `author`, `getPost`, `relatedPosts`, `postImage`, `tableOfContents` | Yes |
| `media.ts` | Image manifest: `img()`, `media`, `backgrounds` | **No — generated.** See below. |

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
│  │  ├─ components/               # shell (sidebar/header/toggle), login form, content/
│  │  ├─ content/forms.ts          # field specs for content kinds *and* settings
│  │  └─ server/
│  │     ├─ authz.ts · authz.spec.ts
│  │     ├─ content/               # service.ts (entries/revisions), validate.ts
│  │     ├─ media/                 # upload, keys, references, promote, options
│  │     ├─ settings/service.ts    # listSettings / getSetting / saveSetting
│  │     └─ db/                    # schema.ts, auth.schema.ts (generated), lazy client
│  └─ routes/
│     ├─ +layout.svelte · +page.server.ts · layout.css  # shadcn neutral theme, Geist
│     ├─ (auth)/login/             # public sign-in form + action
│     ├─ media/[key]/+server.ts    # serves an object from R2
│     └─ (dashboard)/              # guard layout, shell, content/, media/, settings/, logout
├─ e2e/ · playwright.config.ts     # browser checks (pnpm --filter @banggai/admin test:e2e)
├─ components.json                 # shadcn-svelte config (iconLibrary: lucide)
├─ drizzle.config.ts               # needs DATABASE_URL
├─ drizzle/                        # reviewable migrations + generated snapshots
├─ scripts/                        # provision-admin, import-content, db-roles (one-shot tools)
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
| A page (`web`) | `apps/web/src/routes/<segment>/+page.svelte` | Add it to `nav` in `lib/data/site.ts` if it belongs in the header/footer |
| A dynamic page (`web`) | `apps/web/src/routes/<segment>/[slug]/+page.svelte` + `+page.ts` | Export a `get<Thing>(slug)` lookup from `lib/data` |
| Reusable UI (`web`) | `apps/web/src/lib/components/<Name>.svelte` | Type its props with a local `type Props` and `$props()` |
| A shadcn component (`admin`) | added by the shadcn-svelte CLI into `apps/admin/src/lib/components/ui/` | Import from `$lib/components/ui/…` |
| A design token or shared class (`web`) | `apps/web/src/routes/layout.css` (`@theme` / `@layer components`) | Update `DESIGN.md` if it changes the system |
| A theme token (`admin`) | `apps/admin/src/routes/layout.css` (shadcn tokens) | Decide the brand-theming question first — see [14-admin-app](./14-admin-app.md#design-system-not-the-banggai-brand-system) |
| Content for an existing collection (`web`) | The matching `apps/web/src/lib/data/*.ts` file | Run `pnpm --filter @banggai/web check` |
| A database table (`admin`) | `apps/admin/src/lib/server/db/schema.ts` | `pnpm --filter @banggai/admin db:generate`, review the SQL, then `db:migrate` |
| A content field both apps need | `packages/content-model/src/` | Types in `apps/web` and validation in `apps/admin` follow automatically |
| A new image (`web`) | `.stitch/gen-media.mjs` (if regenerating) or add the URL by hand to `media.ts` | Prefer `img()` over pasting raw URLs in components |
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
| `apps/web/worker-configuration.d.ts` | `pnpm gen` (`wrangler types`) | **Yes** — commit the build-independent shape |
| `apps/web/src/lib/data/media.ts` | `.stitch/gen-media.mjs` | **Yes** — commit it |
| `apps/admin/worker-configuration.d.ts` | `pnpm --filter @banggai/admin gen` (`wrangler types --env-file .env.types`) | **Yes** — commit the build-independent shape |
| `apps/admin/src/lib/server/db/auth.schema.ts` | `pnpm --filter @banggai/admin auth:schema` | **Yes** — generated from `auth.ts` |
| `apps/web/.svelte-kit/` | `svelte-kit sync` / `vite build` | No |
| `apps/admin/.svelte-kit/` | `svelte-kit sync` / `vite build` | No (admin has its own `.gitignore`) |
| `apps/*/.wrangler/` | `wrangler dev` / `deploy` | No |
| `node_modules/`, `build/`, `.output/` | tooling | No |
| `.stitch/` | design exports | No |
| `.env`, `.env.*` (except `.env.example`, `.env.test`, `.env.types`) | you | No — `apps/admin/.env` exists locally. `.dev.vars*` is git-ignored too |
| `apps/admin/drizzle/**` | `pnpm --filter @banggai/admin db:generate` | **Yes** — review the SQL before applying it |
| `.migration/` | `pnpm --filter web migrate:export` | No — a one-shot snapshot, per developer |

Biome additionally excludes `worker-configuration.d.ts`, `src/lib/data/media.ts`,
`.agents/`, `.vscode/`, lockfiles, and build directories, because formatting
generated or vendored files only creates churn (see [10-tooling](./10-tooling.md)).

## Related

- [02-architecture](./02-architecture.md) — why the boundaries look like this.
- [04-routing-and-pages](./04-routing-and-pages.md) — the routes in detail.
- [05-components](./05-components.md) / [08-content-data-layer](./08-content-data-layer.md) — the two `lib/` trees.
