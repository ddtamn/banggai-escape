# Banggai Escape — Developer Documentation

Comprehensive engineering documentation for **Banggai Escape**: a pnpm workspace
holding two SvelteKit applications deployed to Cloudflare Workers.

| App | Package | What it is |
| --- | --- | --- |
| [`apps/web`](../apps/web) | `@banggai/web` | The public marketing site — SvelteKit 2 + Svelte 5 + Tailwind v4, reading published content from Neon and recording one analytics event per navigation |
| [`apps/admin`](../apps/admin) | `@banggai/admin` | The back-office — SvelteKit 2 + better-auth + Drizzle/Neon + shadcn-svelte. Sign-in, the route guard, and working screens for content, media, settings, and analytics |
| [`packages/content-model`](../packages/content-model) | `@banggai/content-model` | The Zod content contracts and the analytics vocabulary both apps share. Framework-agnostic, so both apps validate with the same code |

This `docs/` folder is the **deep reference**. For the short version, start with:

| Document | What it is |
| --- | --- |
| [`../README.md`](../README.md) | Quick start, scripts, deployment TL;DR |
| [`../DESIGN.md`](../DESIGN.md) | The design system — colours, type, components, layout (source of truth) |
| [`../apps/admin/README.md`](../apps/admin/README.md) | The generator command and stack choices for the admin app |

---

## For AI agents

If you are an AI coding agent, read in this order:

1. [`../AGENTS.md`](../AGENTS.md) — the operational contract (commands, hard rules,
   definition of done).
2. [`llms.txt`](./llms.txt) — a flat, machine-readable index of every file here.
3. The topic file you actually need, from the table below.

Each document is written to be parsed without following link chains: it declares its
**Scope**, names the concrete file paths that implement what it describes, and keeps
facts in tables. Relative links and heading anchors are verified against this folder.

Two things to internalise before editing anything:

- **Both apps run SvelteKit 2 stable.** Do not move either app to `next`.
- **`skipLibCheck: true` is required** in every tsconfig, and you must never add
  `wrangler types --check` back into `apps/web`'s scripts.
  See [10-tooling](./10-tooling.md) and
  [12-troubleshooting](./12-troubleshooting.md#the-wrangler-types--svelte-check-trap).

## Who this is for

Contributors and maintainers working on the codebase. It assumes you can read
TypeScript and Svelte, but not that you know SvelteKit, Tailwind v4, or the
Cloudflare adapter — those are explained where they matter.

## How to read it

Files are numbered in the order they are most useful. If you are new, read
`01` → `04` in sequence; after that, dip into the topic you need. **Files 04–09
describe `apps/web`**; `14` documents the admin app and `15` is the phased plan that built
it, phase by phase, with what each phase shipped and what remains open.

| # | Document | Read it when you need to… |
| --- | --- | --- |
| 01 | [Getting started](./01-getting-started.md) | Set up the repo, run it, and know which script does what |
| 02 | [Architecture](./02-architecture.md) | Understand the stack, the workspace model, and how a request becomes a page |
| 03 | [Project structure](./03-project-structure.md) | Find the file for a given concern |
| 04 | [Routing & pages](./04-routing-and-pages.md) | Know every URL the site serves and how each page is assembled |
| 05 | [Components](./05-components.md) | Reuse or change a shared component |
| 06 | [Styling](./06-styling.md) | Work with Tailwind v4, design tokens, and the class layer |
| 07 | [Design system](./07-design-system.md) | Map `DESIGN.md` rules onto the code that implements them |
| 08 | [Content & data layer](./08-content-data-layer.md) | Change a package, destination, article, or image — or work on how the site reads and caches them |
| 09 | [SEO, metadata & accessibility](./09-seo-and-metadata.md) | Touch titles, descriptions, images, or a11y attributes |
| 10 | [Tooling](./10-tooling.md) | Lint, format, typecheck, or reason about the config files |
| 11 | [Deployment](./11-deployment.md) | Build, preview, ship, or configure Cloudflare |
| 12 | [Troubleshooting](./12-troubleshooting.md) | Something is broken and you want the known cause |
| 13 | [Contributing](./13-contributing.md) | Make a change and get it merged |
| 14 | [The admin app](./14-admin-app.md) | Work on `apps/admin` — its stack, auth, database, scripts, and gaps |
| 15 | [Admin dashboard plan](./15-admin-dashboard-plan.md) | Phased plan for the admin CMS, Neon publishing, R2 media, and free-tier Cloudflare analytics |
| 16 | [Web polish plan](./16-web-polish-plan.md) | Measured gaps in `apps/web` and a phased plan for trust, real controls, craft, page weight, SEO, and copy in the CMS |

---

## Documentation conventions

- **Markdown, in-repo.** Docs live next to the code they describe and ship
  through the same review as the code. No separate docs site, no external tool.
- **Numbered files.** The numeric prefix fixes the reading order; GitHub sorts
  alphabetically, so the order survives without a sidebar.
- **Link, don't duplicate.** Design values live in `DESIGN.md`; the docs describe
  where and how the code applies them. When a value changes, it changes in one
  place.
- **Code snippets are illustrative.** They mirror the real patterns in
  `apps/web/src`. If a snippet and the source disagree, the source wins — and the
  snippet is a bug worth fixing.
- **Reference the path.** Every claim about behaviour names the file that
  implements it, so you can verify it in one hop.

## Glossary

Terms that appear throughout these docs and in the codebase.

| Term | Meaning |
| --- | --- |
| **Warm Sand** | `#F7F3ED`. The only light surface colour. Remapped onto `--color-white`, so `bg-white` *is* warm sand. |
| **Forest family** | The dark brand greens: `forest-deep` (`#18342A`), `forest-abyss` (`#0F231C`), `forest-mid` (`#214538`), `forest-line` (`#2C5346`). |
| **Gold family** | The accent bronzes: `gold` (`#B48A5A`), `gold-pressed`, `gold-light`, `gold-deep`. Reserved for actions, wayfinding, prices, pins. |
| **Shell / frame** | `mx-auto max-w-7xl px-6` — the 1280 px content frame used on every route. In CSS: `.shell` plus the `px-6` in `.section`. |
| **Section rhythm** | The 64 / 80 / 96 / 112 px vertical band spacing wired into `.section` and `.section-wide`. |
| **Runed / runes mode** | Svelte 5's signal-based reactivity (`$state`, `$derived`, `$effect`, `$props`). Forced on for all project files. |
| **Content model** | `packages/content-model` — the one definition of what a package, destination, article, or setting contains. Both apps validate against it. |
| **Read layer** | `apps/web/src/lib/server/content/` — the only public-site code that touches the database. Validates payloads and resolves media ids to URLs. |
| **Media manifest** | `src/lib/data/media.ts` — a generated map of decoration-image ids to CDN URLs, plus the `img()` builder. Content images come from the media library instead. |
| **Edge cache** | The five-minute window a rendered page may be served from the Workers cache. One `Cache-Control` header in `hooks.server.ts`; see [08-content-data-layer](./08-content-data-layer.md). |
| **Analytics Engine (WAE)** | Cloudflare's Workers Analytics Engine — the dataset the public Worker writes page views and clicks to, and the admin reads back over the SQL API. Counts events, never people. |
| **The vocabulary** | `packages/content-model/src/analytics.ts` — the event names, date ranges, dataset name, and the positional column layout both apps agree on. |
| **Stitch** | The design tool that produced the original screen exports under a git-ignored `.stitch/` folder. `DESIGN.md` is derived from it. |
| **Adapter** | `@sveltejs/adapter-cloudflare`, which builds the app into a Cloudflare Worker plus static assets. |
| **The wrangler trap** | A known interaction between `wrangler types` output and `svelte-check`. Fully explained in [12-troubleshooting](./12-troubleshooting.md#the-wrangler-types--svelte-check-trap). |
| **better-auth** | The auth library used by `apps/admin` (email + password, session cookies), wired through `hooks.server.ts` into `event.locals`. |
| **Drizzle** | The TypeScript ORM used by `apps/admin`; its schema lives in `src/lib/server/db/schema.ts`, and `drizzle-kit` generates migrations. |
| **Neon** | The managed Postgres database both apps connect to, over an HTTP driver (`@neondatabase/serverless`) suitable for Workers. The admin writes it; the site reads it. |
| **shadcn-svelte** | The component-library CLI/config behind the admin's UI; components are copied into `$lib/components/ui` rather than installed as a dependency. |
| **`sv`** | The official Svelte CLI (`pnpm dlx sv create`) used to scaffold `apps/admin`. Its choices are recorded in `apps/admin/README.md`. |
