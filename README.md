# Banggai Escape

Marketing website for **Banggai Escape** — *"Connecting Curious Travelers with Authentic Island Life."* A multi-page site covering tour packages, destinations, a travel blog, and contact details for Luwuk Banggai, Central Sulawesi.

Built with **SvelteKit 5** (runes), **Tailwind CSS v4**, and the **Cloudflare adapter**, written in TypeScript and managed with **pnpm**.

## Repository layout

This is a **pnpm workspace**. The marketing site lives in `apps/web`; `apps/admin` is a reserved
placeholder for the future back-office app and is intentionally not scaffolded yet.

```
apps/
├─ web/                     # the marketing site (SvelteKit + Cloudflare Workers)
│  ├─ src/                  # app.html, routes/, lib/{components,data}
│  ├─ static/               # favicon, logo assets, robots.txt
│  ├─ wrangler.jsonc        # Worker name, compatibility date, Assets binding
│  └─ worker-configuration.d.ts
└─ admin/                   # placeholder — see apps/admin/README.md
biome.json                  # lint + format config for the whole workspace
DESIGN.md                   # the design system all apps follow
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

That's it — no environment variables are required for local development. Runtime configuration lives in [`apps/web/wrangler.jsonc`](./apps/web/wrangler.jsonc); secrets for production deployments can be added there or with `wrangler secret put`.

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
│  ├─ routes/
│  │  ├─ +layout.svelte        # Header + Footer around every page
│  │  ├─ layout.css            # Tailwind entry + @theme design tokens
│  │  ├─ +page.svelte          # /                 home
│  │  ├─ about/                # /about
│  │  ├─ contact/              # /contact
│  │  ├─ blog/                 # /blog and /blog/[slug]
│  │  ├─ destinations/         # /destinations and /destinations/[slug]
│  │  └─ packages/             # /packages and /packages/[slug]
│  └─ lib/
│     ├─ components/           # Header, Footer, PageHero, cards, CtaBanner, Faq, …
│     └─ data/                 # Typed content: site, content, destinations, packages, posts, media
└─ static/                     # favicon, logo assets, robots.txt
```

### Content data layer

All copy is typed and centralised under `src/lib/data/` so pages stay presentational:

- `site.ts` — brand, nav, languages, socials, footer links
- `content.ts` — features, testimonials, FAQs, stats, contact channels, CTA backgrounds
- `destinations.ts`, `packages.ts`, `posts.ts` — collection content
- `media.ts` — generated image manifest with an `img()` helper

Dynamic routes (`blog/[slug]`, `destinations/[slug]`, `packages/[slug]`) resolve their entry in a `+page.ts` `load` function.

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

## Troubleshooting

**`wrangler types` output flips between two shapes.** When the adapter output
(`.svelte-kit/cloudflare/_worker.js`) exists on disk, Wrangler adds a `GlobalProps` block that imports
the built worker; when it does not, that block is omitted. Because `tsconfig.json` lists
`worker-configuration.d.ts` under `compilerOptions.types`, that import pulls the whole build output into
the type program, and `svelte-check` then reports hundreds of errors from generated files.

`pnpm check` and `pnpm build` therefore no longer gate on `wrangler types --check`; regenerating types
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
