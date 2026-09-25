# 01 — Getting Started

Get the site running locally and learn the commands you will use every day.

---

## Prerequisites

| Requirement | Why | How to check |
| --- | --- | --- |
| **Node.js ≥ 20** | Wrangler v4 (the Cloudflare CLI) requires it; `package.json` declares `engines.node: ">=20"`. | `node -v` |
| **pnpm 12.3.4** | The workspace is a pnpm workspace and `packageManager` is pinned. | `pnpm -v` |
| A code editor with Svelte + Tailwind support | Svelte 5 syntax and Tailwind v4 class completion are both recent enough that old tooling misbehaves. | See [Editor setup](#editor-setup) |
| **Cloudflare account** | Only needed to deploy or preview against Cloudflare. Not needed to develop locally. | — |

The easiest way to get the correct pnpm version is Corepack:

```sh
corepack enable
corepack prepare pnpm@12.3.4 --activate
```

## Install

```sh
git clone https://github.com/ddtamn/banggai-escape.git
cd banggai-escape
pnpm install
```

`pnpm install` installs the workspace root and every package matched by
`pnpm-workspace.yaml` (`apps/*`) — today that is `apps/web` (`@banggai/web`) and
`apps/admin` (`admin`). See [02-architecture](./02-architecture.md#the-workspace).

`apps/admin` has its own database and auth setup. It needs a `.env`
(copy `apps/admin/.env.example`) and generated auth/Worker types before its `check` and
`build` scripts will pass — see
[14-admin-app](./14-admin-app.md#gaps-and-next-steps). You do **not** need any of
that to work on the public site.

**No environment variables are required for local development.** Runtime
configuration lives in `apps/web/wrangler.jsonc`; see
[11-deployment](./11-deployment.md#environment-and-secrets) for adding secrets.

## Run it

```sh
pnpm dev
```

Vite starts the dev server (defaults to `http://localhost:5173`) with hot module
replacement. Open the printed URL and you should see the home page.

```sh
pnpm dev -- --open   # same, but opens a browser window
```

The dev server runs on Node, **not** in the workerd runtime, so you get a normal
Vite experience. Worker-specific APIs (bindings, `ctx`, `caches`) are therefore not
available in `pnpm dev` — see [02-architecture](./02-architecture.md#rendering-model)
for what that means in practice.

## Everyday commands

Root scripts delegate into `apps/web` through pnpm filters, so you rarely need to
`cd` anywhere.

| Command | What it does | Use it when |
| --- | --- | --- |
| `pnpm dev` | Start the Vite dev server with HMR. | Developing. |
| `pnpm build` | Produce the production Cloudflare bundle in `apps/web/.svelte-kit/cloudflare/`. | Before deploying or testing the real build. |
| `pnpm preview` | Serve the built Worker locally on port `4173` via `wrangler dev`. Requires a build first. | Verifying the built output, or testing worker behaviour. |
| `pnpm check` | `svelte-kit sync` + `svelte-check` — types and accessibility errors across the app. | Before every commit. |
| `pnpm gen` | Regenerate `apps/web/worker-configuration.d.ts` from `wrangler.jsonc`. | Only when bindings change. Read [12-troubleshooting](./12-troubleshooting.md#the-wrangler-types--svelte-check-trap) first. |
| `pnpm lint` | Report Biome lint issues across the workspace. | Quick lint pass. |
| `pnpm format` | Apply Biome formatting across the workspace (writes files). | Tidy up after editing. |
| `pnpm format:check` | Check formatting without writing. | CI / dry run. |
| `pnpm check:code` | Biome lint **and** format check in one pass. | The pre-commit gate; what CI should run. |
| `pnpm fix` | Apply every safe Biome fix (lint + format + import sorting). | Fastest way to clear mechanical issues. |

### App-level scripts

Anything app-specific can be run directly with a filter. These are the scripts
defined in `apps/web/package.json` (the admin app has its own set — see
[14-admin-app](./14-admin-app.md#scripts)):

| Command | What it does |
| --- | --- |
| `pnpm --filter @banggai/web dev` | Vite dev server. |
| `pnpm --filter @banggai/web build` | Vite production build. |
| `pnpm --filter @banggai/web preview` | `wrangler dev .svelte-kit/cloudflare/_worker.js --port 4173`. |
| `pnpm --filter @banggai/web check` | `svelte-kit sync && svelte-check --tsconfig ./tsconfig.json`. |
| `pnpm --filter @banggai/web check:watch` | The same, watching for changes — handy in a second terminal. |
| `pnpm --filter @banggai/web gen` | `wrangler types`. |

## The verification loop

There is **no automated test suite** in this repository. Correctness is enforced by
four mechanical checks plus a manual smoke test:

```sh
pnpm check        # 1. types + a11y: expect "0 errors and 0 warnings"
pnpm check:code   # 2. lint + format: expect no output
pnpm build        # 3. the real production build must exit 0
pnpm preview      # 4. optional: exercise the built Worker on :4173
```

Run `pnpm check` and `pnpm check:code` before every commit, and `pnpm build` before
anything that touches routing, the adapter, or `wrangler.jsonc`. The manual
prerender-free smoke list is in [13-contributing](./13-contributing.md#manual-smoke-test).

## Editor setup

`.vscode/extensions.json` recommends two extensions:

- `svelte.svelte-vscode` — Svelte language support (syntax, types, formatting
  inside components).
- `bradlc.vscode-tailwindcss` — Tailwind CSS IntelliSense (class completion and
  hover previews).

`.vscode/settings.json` maps `*.css` to the `tailwindcss` language so the token file
gets proper completion:

```jsonc
{ "files.associations": { "*.css": "tailwindcss" } }
```

**Formatting is owned by Biome, not by the editor.** The workspace ships
`@biomejs/biome` and a `biome.json`; run `pnpm fix` (or `pnpm format`) rather than
relying on an editor formatter, so results match CI. If you install the Biome VS
Code extension, point it at the repo `biome.json` and disable any other
formatter-on-save.

## Your first change (a five-minute tour)

A quick end-to-end loop that touches the data layer, the design tokens, and the
checks.

1. **Start the dev server.**

   ```sh
   pnpm dev
   ```

2. **Edit content.** Open `apps/web/src/lib/data/packages.ts`, find the package
   with `slug: 'untouched-banggai-discovery'`, and change its `price`. Save. The
   home page and `/packages` update instantly — all copy is typed data, not markup
   ([08-content-data-layer](./08-content-data-layer.md)).

3. **Edit a token.** Open `apps/web/src/routes/layout.css` and change
   `--color-gold` to a different bronze. Every gold pill, price, and active nav
   item follows, because nothing hardcodes hex values
   ([06-styling](./06-styling.md)).

4. **Verify.**

   ```sh
   pnpm check
   pnpm check:code
   ```

   Both should be clean. Now you know the loop: edit data or a component, watch it
   hot-reload, then run the two checks.

5. **Revert** your scratch edits (`git checkout -- .`) before you do real work.

## Where to go next

- Building a feature? → [02-architecture](./02-architecture.md), then
  [04-routing-and-pages](./04-routing-and-pages.md).
- Adding content? → [08-content-data-layer](./08-content-data-layer.md).
- Shipping? → [11-deployment](./11-deployment.md).
- Stuck? → [12-troubleshooting](./12-troubleshooting.md).
