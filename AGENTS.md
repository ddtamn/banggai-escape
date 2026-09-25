# AGENTS.md

Instructions for AI coding agents working in the **Banggai Escape** repository.

**Read this file, then [`docs/README.md`](./docs/README.md) before editing.** The
`docs/` folder is the comprehensive engineering documentation; this file is the
short, operational contract.

---

## Project Configuration

- **Language**: TypeScript (strict), Svelte 5 in **runes mode**
- **Framework**: **SvelteKit 2** (stable) in both apps — see [Hard rules](#hard-rules)
- **Package Manager**: pnpm workspaces (pnpm `12.3.4`, Node `>=20`)
- **Styling**: Tailwind CSS v4 (config in CSS, not JS)
- **Lint / format**: Biome
- **Hosting**: Cloudflare Workers (`@sveltejs/adapter-cloudflare`)
- **Add-ons**: ai-tools, experimental, tailwindcss, sveltekit-adapter

## Repository at a glance

```
apps/
├─ web/     # @banggai/web — public marketing site (SvelteKit 2 + Tailwind v4)
└─ admin/   # "admin"      — back-office (SvelteKit 2 + better-auth + Drizzle/Neon + shadcn-svelte)
packages/
└─ content-model/  # @banggai/content-model — shared Zod content contracts

docs/       # comprehensive engineering documentation — start at docs/README.md
DESIGN.md   # design system, source of truth for apps/web
biome.json  # workspace lint + format config
```

| App | Purpose | Status |
| --- | --- | --- |
| `apps/web` | The public site: packages, destinations, blog, about, contact | Working; reads from typed modules; no tests |
| `apps/admin` | Content management + analytics back-office | Sign-in, the route guard, the migrated content schema, and the **media library** work; **no content CRUD UI yet** |

## Commands

Root scripts delegate to **`@banggai/web` only**:

```sh
pnpm dev          # Vite dev server for apps/web (add `-- --open`)
pnpm check        # svelte-kit sync + svelte-check (types + a11y) — apps/web
pnpm build        # production Cloudflare bundle — apps/web
pnpm preview      # serve the built Worker on :4173 (needs build first)
pnpm check:code   # Biome lint + format across the workspace (the CI gate)
pnpm fix          # apply every safe Biome fix
```

The admin app is **not** wired into root scripts, and its package is named `admin`
(not `@banggai/admin`):

```sh
pnpm --filter admin dev
pnpm --filter admin check      # svelte-check; needs the committed generated types
pnpm --filter admin test       # Vitest (browser + server projects)
pnpm --filter admin gen        # regenerate worker-configuration.d.ts (see rule 4)
pnpm --filter admin auth:schema
pnpm --filter admin provision  # create/reset the administrator: -- <email> <password>

# shared contracts
pnpm --filter content-model check   # tsc --noEmit
```

`R2_MEDIA` (bucket `banggaiescape-media`) and `MEDIA_PUBLIC_URL` are declared in
`apps/admin/wrangler.jsonc`. Uploaded media is read from the custom domain
`media.banggaiescape.com`; `r2.dev` public access stays disabled. Local development leaves
`MEDIA_PUBLIC_URL` empty in `apps/admin/.dev.vars` so uploads resolve through the admin
Worker's own `/media/<key>` route instead — the production hostname cannot serve a local
R2 simulation. See [docs/14](./docs/14-admin-app.md#media-r2-and-the-media-library).

Migration and database scripts (one-shot tools, deleted after the public site reads
from Neon — see [docs/14](./docs/14-admin-app.md#migrating-the-static-content)):

```sh
pnpm --filter admin db:generate    # write a reviewable migration — read the SQL first
pnpm --filter admin db:migrate
pnpm --filter admin db:roles       # converge banggai_admin / banggai_web and verify them
pnpm --filter web migrate:export   # static modules -> .migration/ (git-ignored)
pnpm --filter admin migrate:import # validate + seed; `-- --replace` re-seeds
```

## Definition of done

Before you claim a change is complete:

```sh
pnpm check        # expect: "svelte-check found 0 errors and 0 warnings"
npx biome check apps/web   # expect: clean (see the admin caveat below)
pnpm build        # expect: exit 0 — required for routing/config/CSS changes
```

- **Do not add new `svelte-check` warnings.** Warnings include accessibility errors,
  and the project holds at zero.
- **Never report success without running the checks.** "It should work" is not a
  result.
- **`pnpm check:code` currently fails on the unformatted `apps/admin` scaffold**
  (spaces/double-quotes vs. tabs/single-quotes). This is pre-existing and unrelated
  to your change. Until it is cleaned up, gate the site with
  `npx biome check apps/web`. Do not reformat unrelated admin files as a drive-by.

## Hard rules

These are non-negotiable; they exist because each one has already caused a real bug.

1. **Stay on SvelteKit 2 (stable).** Both apps pin `@sveltejs/kit@^2.63.0` and
   `@sveltejs/adapter-cloudflare@^7.2.8`. **Do not** switch either app to `next`,
   and do not "upgrade" to a pre-release. `$lib` and `sveltekit({...})`-inline config
   both work on SvelteKit 2.
2. **Runes mode is mandatory.** Use `$props()`, `$state`, `$derived`, `$effect`.
   Do not use `export let` or `$:`.
3. **`skipLibCheck: true` is required in every tsconfig.** The Cloudflare runtime
   types in `worker-configuration.d.ts` collide with `lib.dom.d.ts` without it.
   Removing it produces hundreds of bogus library errors. See
   [docs/10-tooling.md](./docs/10-tooling.md#typechecking-svelte-check--typescript).
4. **The wrangler trap.** `wrangler types` emits two different shapes for
   `worker-configuration.d.ts` depending on whether the adapter output exists, and
   the build-coupled shape makes `svelte-check` explode. Therefore:
   - Never add `wrangler types --check` back into either app's `check` or `build` —
     it flips with the adapter output and so cannot be a reliable gate.
   - To regenerate, clear the output first:
     `rm -rf apps/web/.svelte-kit/cloudflare apps/web/.svelte-kit/cloudflare-tmp && pnpm gen`
     (same for admin: clear `apps/admin/.svelte-kit/cloudflare*` first).
   - See [docs/12-troubleshooting.md](./docs/12-troubleshooting.md#the-wrangler-types--svelte-check-trap).
5. **Do not edit generated files by hand:**
   - `apps/web/worker-configuration.d.ts` — regenerate with `pnpm gen`
   - `apps/web/src/lib/data/media.ts` — regenerate with `.stitch/gen-media.mjs`
  - `apps/admin/src/lib/server/db/auth.schema.ts` — regenerate with
    `pnpm --filter admin auth:schema`
  - `apps/admin/drizzle/*.sql` and `apps/admin/drizzle/meta/**` — regenerate with
    `pnpm --filter admin db:generate`, then review the SQL before applying it
6. **Biome owns formatting.** Tabs, single quotes, 100-column lines, sorted imports.
   Run `pnpm fix`, never hand-format, and never add a second formatter config.
7. **No cross-app imports.** `apps/web` must never import from `apps/admin` or vice
   versa. Shared code goes in `packages/*`, and `packages/content-model` is the only one
   today: framework-agnostic Zod schemas and their inferred types. `apps/web` imports
   **types only** from it, `apps/admin` imports the schemas as values. Do not put
   SvelteKit, database, or Tailwind code in there.
8. **Do not commit secrets.** `.env` files are git-ignored; use `wrangler secret put`
   for deployments.
9. **Do not run destructive git commands** (`push`, `reset --hard`, `rebase`) or
   deploy, unless the user explicitly asks.

## Where things live (code conventions)

### `apps/web`

- **Content lives in `apps/web/src/lib/data/`** — pages are presentational and must
  not hardcode copy. See [docs/08-content-data-layer.md](./docs/08-content-data-layer.md).
  - `site.ts` (brand/nav/contact), `content.ts` (features, FAQs, testimonials, stats),
    `destinations.ts`, `packages.ts`, `posts.ts`, `media.ts` (generated).
  - **The shape of each record is not declared here.** It comes from
    `@banggai/content-model` and is re-exported under the existing names
    (`export type Package = PackagePayload`), so adding a field means editing the
    schema in `packages/content-model`, not the module.
- **Shared UI lives in `apps/web/src/lib/components/`** — typed props, no content
  imports. See [docs/05-components.md](./docs/05-components.md).
- **Design tokens live in `apps/web/src/routes/layout.css`** (`@theme`). Use tokens
  (`text-gold`, `bg-forest-deep`, `border-hairline`) — **never raw hex** in markup.
- **Page frame is `.shell` inside `.section`** (`mx-auto max-w-7xl px-6`).

### Styling rules (summary — full detail in DESIGN.md and docs/06-styling.md)

- Warm Sand `#F7F3ED` is the **only** light surface; it is remapped onto
  `--color-white`, so **`bg-white` is warm sand and `text-white` is warm sand**.
- **Gold is rationed**: actions, active nav, prices, pins. Not body text or large
  fills. Review stars are the one deliberate exception (`text-yellow-400`).
- Secondary text uses the warm `stone` family — no `slate`/`gray`.
- Only use complete Tailwind class names in literals; dynamically built class strings
  are invisible to Tailwind v4's scanner.

### `apps/admin`

- Uses the **shadcn-svelte neutral theme + Geist font**, *not* the Banggai brand
  tokens. Do not mix the two systems without recording the decision.
- Server code lives in `src/lib/server/`; `hooks.server.ts` resolves the better-auth
  session into `event.locals`.
- **Access is a row, not a variable.** `isAdministrator()` in `src/lib/server/authz.ts`
  checks the `administrators` table and fails closed. Granting is
  `pnpm --filter admin provision`; revoking is deleting that row.
- **Validate before every content write.** `assertValidPayload()` /
  `assertValidSiteSetting()` in `src/lib/server/content/validate.ts` wrap the shared
  contracts. The columns are JSONB, so nothing else stops a malformed payload.
- **Publishing is one `db.batch([...])`.** `db.transaction()` throws on the neon-http
  driver, and a bare `begin`/`rollback` pair is not a transaction either — each `sql`
  template tag is its own HTTP request.
- Schema changes go in `src/lib/server/db/schema.ts`, then
  `pnpm --filter admin db:generate` (a reviewable migration) — not just `db:push`.

## Documentation map

Start at **`docs/README.md`**. Then:

| Need | Read |
| --- | --- |
| Setup, scripts | `docs/01-getting-started.md` |
| Architecture, both stacks, boundaries | `docs/02-architecture.md` |
| File map for both apps | `docs/03-project-structure.md` |
| Routes and page anatomy | `docs/04-routing-and-pages.md` |
| Components (props/behaviour) | `docs/05-components.md` |
| Tailwind v4, tokens, class layer | `docs/06-styling.md` |
| Design rules → code | `docs/07-design-system.md` |
| Content model + recipes | `docs/08-content-data-layer.md` |
| Meta tags, a11y | `docs/09-seo-and-metadata.md` |
| Biome, svelte-check, tsconfig | `docs/10-tooling.md` |
| Cloudflare deploy | `docs/11-deployment.md` |
| Known failure modes | `docs/12-troubleshooting.md` |
| Commit conventions, checklists | `docs/13-contributing.md` |
| The admin app | `docs/14-admin-app.md` |

A machine-readable index of the same set is in [`docs/llms.txt`](./docs/llms.txt).

## Committing

Use **Conventional Commits** — `<type>(<scope>): <summary>`, lowercase, imperative,
no trailing period. Types in use: `feat`, `fix`, `content`, `docs`, `build`, `chore`,
`refactor`, `style`. Scopes: `web`, `blog`, `packages`, `header`, `design`,
`workspace`, `tooling`, `admin`.

**Do not append tool or agent attribution footers** — no `Generated with …`, no
`Co-Authored-By: …`. Commit messages contain only the message itself.

Full rules and task checklists: [docs/13-contributing.md](./docs/13-contributing.md).

---

## Svelte MCP server

If the Svelte MCP server is available in your session, prefer it for
Svelte 5 / SvelteKit 2 API questions — **the project's own `docs/` remain the
authority for this codebase's conventions.**

### 1. list-sections

Use this FIRST to discover all available documentation sections. Returns a structured
list with titles, use_cases, and paths. When asked about Svelte or SvelteKit topics,
ALWAYS use this tool at the start of the chat to find relevant sections.

### 2. get-documentation

Retrieves full documentation content for specific sections. Accepts single or
multiple sections. After calling `list-sections`, analyze the returned sections
(especially the `use_cases` field) and then fetch ALL sections relevant to the task.

### 3. svelte-autofixer

Analyzes Svelte code and returns issues and suggestions. Use it when writing Svelte
code, and keep calling it until no issues or suggestions are returned.

### 4. playground-link

Generates a Svelte Playground link with the provided code. After completing code,
ask the user if they want a playground link. Only call this tool after user
confirmation, and NEVER if code was written to files in their project.
