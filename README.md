# Banggai Escape

Marketing website for **Banggai Escape** — *"Connecting Curious Travelers with Authentic Island Life."* A multi-page site covering tour packages, destinations, a travel blog, and contact details for Luwuk Banggai, Central Sulawesi.

Built with **SvelteKit 2** (Svelte 5, runes mode), **Tailwind CSS v4**, and the **Cloudflare adapter**, written in TypeScript and managed with **pnpm**.

Both workspace apps run the same stable SvelteKit 2 major.

## Documentation

This README is the quick start. The full engineering documentation lives in
[`docs/`](./docs/README.md):

- [Getting started](./docs/01-getting-started.md) · [Architecture](./docs/02-architecture.md) · [Project structure](./docs/03-project-structure.md)
- [Routing & pages](./docs/04-routing-and-pages.md) · [Components](./docs/05-components.md)
- [Styling](./docs/06-styling.md) · [Design system](./docs/07-design-system.md)
- [Content & data layer](./docs/08-content-data-layer.md) · [SEO & accessibility](./docs/09-seo-and-metadata.md)
- [Tooling](./docs/10-tooling.md) · [Deployment](./docs/11-deployment.md)
- [Troubleshooting](./docs/12-troubleshooting.md) · [Contributing](./docs/13-contributing.md)
- [The admin app](./docs/14-admin-app.md) · [Admin dashboard implementation plan](./docs/15-admin-dashboard-plan.md)

## Repository layout

This is a **pnpm workspace** with two apps and one shared package. The public marketing
site is `apps/web` (`@banggai/web`). `apps/admin` (`admin`) is the back-office — sign-in,
a route guard, and the content schema are in place, but there is **no CMS UI yet**, so it
is **not yet production-ready**.

```
apps/
├─ web/                     # @banggai/web — the marketing site (SvelteKit + Cloudflare Workers)
│  ├─ src/                  # app.html, routes/, lib/{components,server,content}
│  ├─ static/               # favicon, logo assets, robots.txt
│  ├─ wrangler.jsonc        # Worker name, compatibility date, Assets binding, MEDIA_PUBLIC_URL
│  └─ worker-configuration.d.ts
└─ admin/                   # @banggai/admin — back-office (SvelteKit + better-auth + Drizzle/Neon)
   ├─ src/lib/server/       # auth.ts, authz.ts, content/, db/ (auth schema is generated)
   ├─ drizzle/              # reviewable migrations + generated snapshots
   ├─ scripts/              # provision-admin, db-roles
   ├─ wrangler.jsonc        # Worker name "admin"
   └─ README.md             # how the app was scaffolded
packages/
└─ content-model/           # @banggai/content-model — the content contracts both apps share
biome.json                  # lint + format config for the whole workspace
DESIGN.md                   # the design system the marketing site follows
```

## Tech stack

| Layer           | Choice                                                     |
| --------------- | ---------------------------------------------------------- |
| Framework       | SvelteKit (Svelte 5 runes mode)                            |
| Styling         | Tailwind CSS v4 via `@tailwindcss/vite`                    |
| Language        | TypeScript (strict)                                        |
| Adapter / host  | `@sveltejs/adapter-cloudflare` (Cloudflare Workers)        |
| Tooling         | Vite, `svelte-check`, `wrangler`                           |
| Lint + format   | Biome                                                      |
| Package manager | pnpm workspaces                                            |

## Prerequisites

- **Node.js 20+** (required by Wrangler v4)
- **pnpm** (`corepack enable` is the easiest way to get it)

## Setup

```sh
pnpm install
```

That's it for the marketing site — no environment variables are required to run
`apps/web`. Runtime configuration lives in [`apps/web/wrangler.jsonc`](./apps/web/wrangler.jsonc);
secrets for production deployments can be added there or with `wrangler secret put`.

The admin app additionally needs a `.env` (copy [`apps/admin/.env.example`](./apps/admin/.env.example))
with `DATABASE_URL`, `ORIGIN`, and `BETTER_AUTH_SECRET`, plus generated Worker and
auth types before its checks pass — see [docs/14-admin-app.md](./docs/14-admin-app.md).

## Scripts

Root scripts delegate to `apps/web`, so the everyday commands are unchanged:

| Command            | What it does                                                                    |
| ------------------ | ------------------------------------------------------------------------------- |
| `pnpm dev`         | Start the Vite dev server with HMR. Add `-- --open` to launch a browser.         |
| `pnpm build`       | Build the production Cloudflare bundle.                                         |
| `pnpm preview`     | Serve the built Worker locally on port `4173` via `wrangler dev`.                |
| `pnpm check`       | Run `svelte-kit sync` + `svelte-check` for type and accessibility errors.        |
| `pnpm gen`         | Regenerate `apps/web/worker-configuration.d.ts` from `wrangler.jsonc`.           |
| `pnpm lint`        | Report Biome lint issues across the workspace.                                   |
| `pnpm format`      | Apply Biome formatting across the workspace.                                     |
| `pnpm format:check`| Check formatting without writing.                                                |
| `pnpm check:code`  | Biome lint + format check in one pass (what CI should run).                       |
| `pnpm fix`         | Apply every safe Biome fix (lint + format + import sorting).                     |

Anything app-specific can be run directly with a filter, for example `pnpm --filter @banggai/web check:watch`.

The root scripts still target `@banggai/web` only, because that is the app CI and the
deploy pipeline gate on. The admin is `@banggai/admin` and has its own scripts, plus a
root shortcut for the common ones (`pnpm admin:dev`, `pnpm admin:check`, `pnpm admin:test`,
`pnpm admin:build`) — for anything else use a filter, for example
`pnpm --filter @banggai/admin db:studio`.

| Command                          | What it does                                                    |
| -------------------------------- | --------------------------------------------------------------- |
| `pnpm --filter @banggai/admin db:generate` | Write a reviewable SQL migration — read it before applying it   |
| `pnpm --filter @banggai/admin db:migrate`  | Apply pending migrations                                        |
| `pnpm --filter @banggai/admin db:roles`    | Create/converge `banggai_admin` and `banggai_web`, then verify them |
| `pnpm --filter @banggai/admin provision`   | Create or reset an administrator and grant them membership       |

## Code quality

**Biome** is the single linter and formatter for the workspace — config in [`biome.json`](./biome.json), with `pnpm check:code` as the entry point.

- **Style:** tabs, single quotes, 100-column lines, semicolons.
- **Svelte:** Biome's Svelte support only parses `<script>` blocks, so it reports bindings that are
  actually used in markup as unused. `noUnusedImports` and `noUnusedVariables` are therefore switched
  off for `**/*.svelte`; `svelte-check` (via `pnpm check`) is the authority for Svelte files.
- **Generated files are excluded** from Biome: `worker-configuration.d.ts` (Wrangler) and
  `src/lib/data/media.ts` (the Stitch image manifest) are rewritten by their generators, so formatting
  them only creates churn. Skill directories (`.agents/`, `.vscode/`) and lockfiles are excluded too.

Run `pnpm check:code` before committing, or `pnpm fix` to let Biome apply its safe fixes.

## Project structure

```
apps/web/
├─ src/
│  ├─ app.html                 # Document shell (fonts, meta, theme-color)
│  ├─ hooks.server.ts          # The five-minute edge-cache policy
│  ├─ routes/
│  │  ├─ +layout.server.ts     # Loads the site's settings once for every route
│  │  ├─ +layout.svelte        # Header + Footer around every page
│  │  ├─ layout.css            # Tailwind entry + @theme design tokens
│  │  ├─ +page.server.ts       # Loaders: published packages, curated destinations, posts
│  │  ├─ +page.svelte          # /                 home
│  │  ├─ about/                # /about
│  │  ├─ contact/              # /contact
│  │  ├─ blog/                 # /blog and /blog/[slug]
│  │  ├─ destinations/         # /destinations and /destinations/[slug]
│  │  └─ packages/             # /packages and /packages/[slug]
│  └─ lib/
│     ├─ components/           # Header, Footer, PageHero, cards, CtaBanner, Faq, … (props in)
│     ├─ content.ts            # Presenters: formatPrice, durationLabel, badgeDays, TOC
│     ├─ data/media.ts         # GENERATED decoration images — the only data left here
│     └─ server/content/       # The read layer: entries, settings, redirects, media
└─ static/                     # favicon, logo assets, robots.txt
```

### Content data layer

Content lives in **Neon** and is edited in `apps/admin`. The public site reads it on the
server, validates every payload against the shared contract, and swaps stored media ids for
URLs before rendering:

- `src/lib/server/content/` — the read layer, and the only code in the app that touches the
  database. `entries.ts` (published content), `settings.ts`, `redirects.ts`, `media.ts`
- `src/routes/+layout.server.ts` — the chrome's settings, inherited by every route
- `src/lib/content.ts` — presenters that take a payload, not a collection
- `src/lib/data/media.ts` — generated, and now only the images the *design* owns

The old typed modules (`site.ts`, `content.ts`, `destinations.ts`, `packages.ts`, `posts.ts`)
and the one-shot migration scripts that read them are **gone** — deleted once the site was
reading from Neon. Neon is the only copy of the content.

A dynamic route resolves its entry in a `+page.server.ts` loader, which 301s a renamed slug
before it 404s. Read [08-content-data-layer](./docs/08-content-data-layer.md) for the whole
picture.

### Design system

The visual language — colour tokens, typography, spacing, components, and the mobile patterns used on
the article and package detail pages — is documented in [`DESIGN.md`](./DESIGN.md). Brand colours are
defined once as Tailwind v4 `@theme` tokens in `src/routes/layout.css` (forest greens, bronze accents,
warm sand surfaces) and derived from the logo artwork; prefer those tokens over hardcoded hex values.
Logo files live in `apps/web/static/` (`logomark.png`, `combination-mark.png`, `favicon.png`,
`apple-touch-icon.png`).

## Deployment

The site deploys to **Cloudflare Workers** through `@sveltejs/adapter-cloudflare`. The adapter output is written to `apps/web/.svelte-kit/cloudflare/`, which that app's `wrangler.jsonc` points at:

- `main` → `.svelte-kit/cloudflare/_worker.js`
- `assets.directory` → `.svelte-kit/cloudflare`

To build and deploy:

```sh
pnpm build
pnpm --filter @banggai/web exec wrangler deploy
```

`workers_dev` and `preview_urls` are enabled in `wrangler.jsonc`, so a `*.workers.dev` URL is available after the first deploy. Non-production branches can be shipped with `pnpm --filter @banggai/web exec wrangler versions upload`.

The admin app deploys to its own Worker (`admin`) separately, and needs
`DATABASE_URL`, `BETTER_AUTH_SECRET`, and `ORIGIN` set as secrets first:

```sh
pnpm --filter @banggai/admin build
pnpm --filter @banggai/admin exec wrangler deploy
```

## Troubleshooting

**`wrangler types` output flips between two shapes.** When the adapter output
(`.svelte-kit/cloudflare/_worker.js`) exists on disk, Wrangler adds a `GlobalProps` block that imports
the built worker; when it does not, that block is omitted. Because `tsconfig.json` lists
`worker-configuration.d.ts` under `compilerOptions.types`, that import pulls the whole build output into
the type program, and `svelte-check` then reports hundreds of errors from generated files.

`pnpm check` and `pnpm build` therefore no longer gate on `wrangler types --check`, and neither do the
admin's — that check flips with the adapter output, so it cannot be a reliable gate. Regenerating types
is explicit (`pnpm gen`). If you do regenerate, run it with no build output present so the committed
file stays in its build-independent shape:

```sh
rm -rf apps/web/.svelte-kit/cloudflare apps/web/.svelte-kit/cloudflare-tmp
pnpm gen
```

If `svelte-check` ever starts reporting a wall of errors from `.svelte-kit/output/**` or
`.svelte-kit/cloudflare/_worker.js`, clear that output and re-check:

```sh
rm -rf apps/web/.svelte-kit/output apps/web/.svelte-kit/cloudflare
pnpm check
```
