# 11 — DeploymentEach app is a **Cloudflare Worker** that serves **static assets**, built by `@sveltejs/adapter-cloudflare`. This document covers the build output, the Wrangler config, and the commands to preview and ship.

There are **two Workers**, deployed independently:

| App | Worker name | Wrangler config | Root scripts? |
| --- | --- | --- | --- |
| `apps/web` | `banggai-escape` | [`apps/web/wrangler.jsonc`](../apps/web/wrangler.jsonc) | Yes — `pnpm build`, `pnpm preview` |
| `apps/admin` | `admin` | [`apps/admin/wrangler.jsonc`](../apps/admin/wrangler.jsonc) | No — use `pnpm --filter @banggai/admin …` |

Everything below describes `apps/web`; the admin Worker's differences are collected
in [The admin Worker](#the-admin-worker).

---

## What the build produces

`pnpm build` runs `vite build` through the adapter and writes everything to
`apps/web/.svelte-kit/cloudflare/`:

```
apps/web/.svelte-kit/cloudflare/
├─ _worker.js          # the SvelteKit server bundle → the Worker's `main`
├─ _routes.json        # asset-vs-worker routing rules (auto-generated)
└─ …                   # the client bundle and any static assets
```

`apps/web/src/../static/` (favicon, logos, `robots.txt`) is copied into the output
and served as assets by Cloudflare rather than by the Worker.

`.svelte-kit/` is **git-ignored** — it is produced by the build, never committed.

## `wrangler.jsonc`

```jsonc
{
	"$schema": "./node_modules/wrangler/config-schema.json",
	"name": "banggai-escape",
	"compatibility_date": "2026-09-24",
	"compatibility_flags": ["nodejs_als"],
	"main": ".svelte-kit/cloudflare/_worker.js",
	"assets": {
		"binding": "ASSETS",
		"directory": ".svelte-kit/cloudflare"
	},
	"vars": {
		"MEDIA_PUBLIC_URL": "https://media.banggaiescape.com"
	},
	"workers_dev": true,
	"preview_urls": true
}
```

| Field | Meaning |
| --- | --- |
| `name` | The Worker name on Cloudflare (also the `*.workers.dev` subdomain label) |
| `compatibility_date` | Pins workerd behaviour. **Bump deliberately**, not casually — a new date can change runtime semantics |
| `compatibility_flags` | `nodejs_als` enables `AsyncLocalStorage` |
| `main` | The Worker entry point, produced by the adapter |
| `assets.binding` / `directory` | Static assets are served from the adapter output through an `ASSETS` binding |
| `vars` | Non-secret configuration. `MEDIA_PUBLIC_URL` is the R2 custom domain that published media is read from |
| `workers_dev` | Enables a `*.workers.dev` URL |
| `preview_urls` | Enables per-version preview URLs |

`DATABASE_URL` is deliberately **not** in this file: it is a secret, and it is read
through `$env/dynamic/private` rather than from `platform.env` typings.

`$schema` points into `node_modules`, so editors validate the file. It requires
`pnpm install` to have run.

## Build and deploy

```sh
pnpm build
pnpm --filter @banggai/web exec wrangler deploy
```

The first `wrangler deploy` prompts for authentication (`wrangler login`) if you are
not already signed in, and creates the Worker if it does not exist. After that, a
`*.workers.dev` URL is available because `workers_dev` is enabled.

### Preview locally against the real runtime

```sh
pnpm build     # required first
pnpm preview   # wrangler dev .svelte-kit/cloudflare/_worker.js --port 4173
```

`pnpm preview` serves the *built* Worker in workerd on port `4173`, which is the
closest local approximation of production: bindings, `ctx`, and `caches` exist
there, unlike in `pnpm dev`. Restart it after every rebuild — it does not watch.

### Ship a non-production version

To upload a version without making it live, and get a preview URL:

```sh
pnpm --filter @banggai/web exec wrangler versions upload
```

Useful for reviewing a branch. Promote it later with `wrangler versions deploy`.

## Environment and secrets

Two values are required, and neither is committed:

| Name | Kind | What it is |
| --- | --- | --- |
| `DATABASE_URL` | **secret** | The Neon connection the Worker reads published content with. In production this must be the `banggai_web` role — read-only, and **not** granted the auth tables. |
| `MEDIA_PUBLIC_URL` | var | `https://media.banggaiescape.com`, the R2 custom domain published media is served from. Declared in `wrangler.jsonc`. |

`banggai_web` does not exist until you make it, and its password cannot be read back
afterwards, so it is a deliberate step rather than a side effect of deploying:

```sh
# 1. Create or converge the two roles and prove their grants hold. This resets the
#    password of whichever roles you supply one for, so it is also the rotate command.
WEB_DB_PASSWORD=$(openssl rand -hex 24) \
  pnpm --filter @banggai/admin db:roles

# 2. Build the connection string by swapping the user and password on DATABASE_URL
#    (pooled for the Worker), then store it. Never put it in the repository.
pnpm --filter @banggai/web exec wrangler secret put DATABASE_URL
```

The script prints no password and verifies itself by reconnecting as each role: it
asserts that `banggai_web` **can** read `content_entries` and **cannot** read `user`,
`session`, or write to `site_settings`.

Locally, `vite dev` reads `apps/web/.env` and `pnpm preview` reads `apps/web/.dev.vars`
(wrangler never reads `.env`). Both are git-ignored. They currently point at the same
pooled connection as the admin, which is fine on a laptop and wrong in production — the
deployed Worker must use `banggai_web`. See
[12-troubleshooting](./12-troubleshooting.md#databasemedia-configuration).

When something *else* needs a secret:

```sh
pnpm --filter @banggai/web exec wrangler secret put MY_SECRET
```

1. Add the variable to `wrangler.jsonc` (for non-secret vars, under `"vars"`; for
   secrets, just register the name) so it is part of the deployment configuration.
2. Add it to the `Env` interface so TypeScript knows about it. The cleanest path is
   to let Wrangler generate it — but **read the
   [wrangler trap](./12-troubleshooting.md#the-wrangler-types--svelte-check-trap) first**,
   because regenerating `worker-configuration.d.ts` at the wrong moment breaks
   `svelte-check`:

   ```sh
   rm -rf apps/web/.svelte-kit/cloudflare apps/web/.svelte-kit/cloudflare-tmp
   pnpm gen
   ```

   Alternatively, hand-add the field to the committed `worker-configuration.d.ts`.
3. Read it from the platform. `src/app.d.ts` already types `App.Platform` as
   `{ env: Env; ctx: ExecutionContext; caches: CacheStorage; cf?: … }`, so in a
   server `load`:

   ```ts
   export const load: PageServerLoad = ({ platform }) => ({
   	key: platform?.env.MY_SECRET,
   });
   ```

   `hooks.server.ts` already exists (it stamps the edge cache header), so a value that
   every request needs goes in its `handle`. For content specifically, prefer
   `$env/dynamic/private` over `platform.env`: it is populated on Cloudflare *and* in
   `pnpm dev`, which is why the read layer does not need a `platform` check.

`platform` is `undefined` in `pnpm dev` (Node), so always optional-chain it.

## Custom domain

1. In the Cloudflare dashboard, add the zone and create a Worker route or a custom
   domain for the Worker (Workers → your Worker → Settings → Domains & Routes).
2. Alternatively, declare it in `wrangler.jsonc` with a `routes` array and redeploy.
3. `workers_dev` can then be set to `false` if you do not want the `*.workers.dev`
   URL alongside the custom domain.

The site's `canonical` URLs and sitemap do not exist yet — see
[09-seo-and-metadata](./09-seo-and-metadata.md#missing-seo-pieces-roadmap) — so a
domain change currently needs no code change.

## Rollback

Wrangler keeps deployment history:

```sh
pnpm --filter @banggai/web exec wrangler deployments list
pnpm --filter @banggai/web exec wrangler rollback
```

Each deploy is a new immutable version; rollback points the Worker at an earlier one.
Because the build is deterministic from a commit, redeploying a known-good commit is
an equally valid recovery path.

## Deploy checklist

```sh
pnpm install --frozen-lockfile   # reproducible install
pnpm check                       # types + a11y: 0 errors, 0 warnings
pnpm check:code                  # lint + format
pnpm build                       # must exit 0
pnpm preview                     # optional: click through the built Worker
pnpm --filter @banggai/web exec wrangler deploy
```

Then verify the deployed URL: the home page renders styled (not unstyled HTML — a
sign the CSS bundle is missing), an article and a package detail page load, and a
bogus slug shows the branded error page with the header and footer intact.

## The admin Worker

`apps/admin` deploys separately, to a Worker named `admin` (`wrangler.jsonc`'s `name`, not
the package name), with the same adapter and asset layout:

```sh
pnpm admin:build
pnpm --filter @banggai/admin exec wrangler deploy
```

Differences to account for:

- **It has real secrets.** `DATABASE_URL`, `BETTER_AUTH_SECRET`, and `ORIGIN` must be
  set for the Worker before it can serve anything; `src/lib/server/db/index.ts`
  **throws on the first database call** without `DATABASE_URL`. Set them with
  `wrangler secret put` (run from `apps/admin`) or via the dashboard.
- **`ORIGIN`** must match the admin's public URL, or better-auth will mis-scope
  cookies and redirects.
- **Neither `build` nor `check` gates on `wrangler types --check`.** Both apps dropped
  that gate deliberately, because it flips with the adapter output. If a deploy fails
  on types, regenerate them with no build output present (see the
  [wrangler trap](./12-troubleshooting.md#the-wrangler-types--svelte-check-trap)).
- **Database migrations** are not part of the deploy. Apply schema changes
explicitly with `pnpm --filter @banggai/admin db:migrate` (or `db:push` for a throwaway
  environment) against the target database.
- **It has a bucket binding.** `R2_MEDIA` → `banggaiescape-media` is declared in
  `apps/admin/wrangler.jsonc`. The bucket has to exist in the account before the deploy,
  or the deploy fails; it is not created by it. Bindings are not secrets — do not set
  `R2_MEDIA` with `wrangler secret put`.
- **`MEDIA_PUBLIC_URL`** is a `vars` entry in the same file, not a secret. It points at
  the media custom domain, which is attached to the **bucket**, not to the Worker — so it
  survives deploys and needs no route on the Worker at all.
- **No custom-domain or routes config** is committed for either Worker yet.

### Media objects

Uploaded media is served from `media.banggaiescape.com`, a custom domain on the
`banggaiescape-media` bucket. Two consequences worth knowing before a deploy:

- **The public read path involves no Worker.** If the admin Worker is down or rolled back,
  published images still load; if the custom domain is removed, images fall back to the
  admin Worker's `/media/<key>` route (slower, and only for images the API resolves at
  render time).
- **Objects are public by key.** Which is why deleting is guarded by a reference check and
  why hiding an asset is documented as *not* a security control. See
  [Media](./14-admin-app.md#media-r2-and-the-media-library).

Full admin detail: [14-admin-app](./14-admin-app.md).

## Related

- [02-architecture](./02-architecture.md) — the request lifecycle behind the Worker.
- [10-tooling](./10-tooling.md) — `wrangler types` and the config files.
- [12-troubleshooting](./12-troubleshooting.md) — the deploy-time failure modes.
- [14-admin-app](./14-admin-app.md) — the admin Worker's stack and secrets.
