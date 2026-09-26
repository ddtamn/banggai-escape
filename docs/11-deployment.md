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

Two values are required for the site to serve anything, and neither is committed:

| Name | Kind | What it is |
| --- | --- | --- |
| `DATABASE_URL` | **secret** | The Neon connection the Worker reads published content with. In production this must be the `banggai_web` role — read-only, and **not** granted the auth tables. |
| `MEDIA_PUBLIC_URL` | var | `https://media.banggaiescape.com`, the R2 custom domain published media is served from. Declared in `wrangler.jsonc`. |
| `ANALYTICS` | binding | The Analytics Engine dataset (`BANGGAI_SITE_EVENTS`) that page views and clicks are written to. Declared in `wrangler.jsonc`, and Cloudflare creates the dataset on the first write — so it needs no setup step, and writing to it is fail-open: a missing or exhausted binding is logged and swallowed.

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
(wrangler never reads `.env`). Both are git-ignored. **In production the two Workers do not
share a database**: `apps/web`'s local files still point at the `dev` Neon branch, and the
deployed Worker connects to `production` as `banggai_web`. That is the whole point of the
role — a laptop can be pointed anywhere, a deployed Worker must not be.

Because the roles now exist on the `production` branch, `neon connection-string` needs to be
told which one to build:

```sh
neon connection-string br-<production-id> --role-name banggai_web
```

**`dev` and `production` are separate databases, not two versions of one.** Neon branches do
not merge — there is nothing to reconcile and no common ancestor, so a "merge" would mean
copying rows across. As of this deploy they already hold the same content, because
`production` was seeded from `dev` (below) and both were verified equal afterwards: 20
entries, 40 revisions, 13 settings, 29 media assets, 0 redirects, and **zero** slugs present on
one and not the other. The only difference is the `user` table, where `dev` also holds a
browser-check account.

The deployed Workers read `production`, and that is checkable rather than assumed: the
`user` table is the one thing the branches disagree on, so signing in to the deployed admin
with the `dev`-only account is **rejected** — which it can only be if the Worker is connected
to `production`.

### How `production` got its content

Worth recording, because the obvious next person will look for the script and it is not
there.

Phases 1–4 were rehearsed on the Neon `dev` branch, so for a long time **that branch was the
only copy of the content**: the static modules it was migrated from were deleted, and the two
one-shot scripts that loaded it were deleted with them. `production` had the auth tables and
no content.

It was seeded by a **single-use script that has since been deleted**, following the same
convention as `export-content.ts` and `import-content.ts` before it. What it did, so it can be
rebuilt if it ever has to be:

1. `pnpm db:migrate` against `production`, for the content schema.
2. A copy of `media_assets`, `content_entries`, `content_revisions`, `site_settings` and
   `slug_redirects` from `dev`, ids and all, each insert `on conflict do nothing` so a re-run
   adds nothing. The ids travel, so a media asset keeps the R2 object key it already has and
   an entry keeps the slug its URL is built from.
3. **Two passes, because the foreign key is circular.** `content_entries.published_revision_id`
   points at `content_revisions` and `content_revisions.entry_id` points back. Entries went in
   with a null pointer, revisions second, and the pointers were set by one `update … where
   published_revision_id is null`.
4. **Columns referencing `user` were nulled** — `site_settings.updated_by`,
   `content_revisions.author_id`, `media_assets.uploaded_by`. The `user` table is not copied,
   so a `dev` user id is a foreign key to a row that does not exist on the target, and the
   value belongs to the branch it happened on. They were found by asking the catalogue which
   columns reference `user`, not by a hand-written list.
5. **A contract gate before the first insert.** `site_settings` and every *live* revision were
   validated against `@banggai/content-model`, because those are the only rows the site
   reads. Superseded revisions were reported rather than refused: 20 of the 40 on `dev` are
   revision 1 from the first import, written before media references became
   `media_assets` ids, so their `image` field holds the old CDN asset string and is not a
   uuid. No entry points at one, so nothing serves them, but they are history and dropping
   them would have lost the admin's rollback for rows no page can reach.
6. `administrators` was **not** copied — it joins to `user`, and the two branches have
   different accounts. The grant is a row for the account that exists on the target.

Verified afterwards by reading the target back rather than trusting the copy: 20 live
revisions, all valid; 13 settings, all valid; 29 media rows; **zero** dangling media
references; zero entries whose pointer fails to resolve. A re-run reported every table
`already present`, which is the idempotency the `on conflict do nothing` was for.

### What is set where, today

| Setting | App | Kind | Value |
| --- | --- | --- | --- |
| `DATABASE_URL` | admin | Worker secret | `banggai_admin` on the **production** branch |
| `BETTER_AUTH_SECRET` | admin | Worker secret | generated for the deploy, not the local `.env` one |
| `ORIGIN` | admin | var | `https://admin.banggaiescape.com` |
| `DATABASE_URL` | web | Worker secret | `banggai_web` on the **production** branch |
| `MEDIA_PUBLIC_URL` | both | var | `https://media.banggaiescape.com` |
| `CLOUDFLARE_ACCOUNT_ID` | admin | var | the account that owns the zone and the bucket |
| `CLOUDFLARE_ANALYTICS_TOKEN` | admin | Worker secret | Read-only Account Analytics token; never client-visible. Set — see [Analytics](#analytics) |

`ADMIN_DB_PASSWORD` and `WEB_DB_PASSWORD` are read only by `db:roles`. They are not Worker
secrets and never leave the shell that ran it.

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

**Both Workers are deployed on custom domains, and the DNS records are created by the
deploy** — there is nothing to add by hand.

| Worker | Hostname | `wrangler.jsonc` |
| --- | --- | --- |
| `banggai-escape` (public site) | `https://banggaiescape.com` | `apps/web` |
| `admin` (back-office) | `https://admin.banggaiescape.com` | `apps/admin` |
| R2 bucket `banggaiescape-media` | `https://media.banggaiescape.com` | bucket custom domain, not a Worker |

Each app declares a `routes` entry with `"custom_domain": true`, and `wrangler deploy`
creates the record and the route together. **What this needs from the deploying credential
is a Workers Scripts edit for the account and a DNS edit for the zone**; a token with only
the first will upload the Worker and fail to attach the hostname.

`workers_dev` is `false` in both apps, which is deliberate. `workers_dev` would leave a
second origin serving the same app, and for the admin that is not cosmetic: better-auth
uses `ORIGIN` as its `baseURL` for the session cookie and the post-sign-in callback, so two
hostnames mean a session that appears to work and then drops. One hostname per Worker.

`ORIGIN` is a **var**, not a secret, in `apps/admin/wrangler.jsonc`:

```jsonc
"vars": { "ORIGIN": "https://admin.banggaiescape.com" }
```

It has to be the exact deployed origin. `wrangler secret put ORIGIN` looks right and is
wrong — the value is not a credential, and putting it in secrets only makes it harder to
read back.

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

## Continuous integration and delivery

Two workflows, in `.github/workflows/`.

| Workflow | Trigger | Does |
| --- | --- | --- |
| `ci.yml` | push to `main`, and every pull request | Five jobs: `workflows` (actionlint, see below), `check` (types and a11y in both apps plus the shared package), `lint` (Biome), `test` (both Vitest suites, with Chromium installed *before* the admin suite that needs it), `build` (both Workers' bundles) |
| `deploy.yml` | **after `ci.yml` succeeds on `main`**, or by hand | Builds and `wrangler deploy`s each Worker, then curls the hostname to prove it answered |

### `actionlint` is not ceremony

GitHub reports a malformed workflow as a run that fails in about a second, saying only *"This
run likely failed because of a workflow file issue"* — no file, no line, no reason. That is
exactly how the first version of `deploy.yml` died: a `? :` in an `if:` condition, which is
**not** in GitHub's expression language (it has `&&`, `||`, `!` and comparisons, and no
ternary) and which every YAML parser accepts without complaint.

So `ci.yml` runs `actionlint` as its first job, and a mistake like that is an ordinary red
with a line number rather than a one-second failure that names nothing. The same two halves of
the condition are now written as what the language actually offers:

```yaml
if: >-
  (github.event_name == 'workflow_dispatch' &&
   (github.event.inputs.app == 'both' || github.event.inputs.app == 'admin')) ||
  (github.event_name == 'workflow_run' &&
   github.event.workflow_run.conclusion == 'success' &&
   github.event.workflow_run.event == 'push' &&
   github.event.workflow_run.head_branch == 'main')
```

To check a workflow the same way before pushing:

```sh
docker run --rm -v "$PWD:/repo" -w /repo rhysd/actionlint:latest
```

### Why the deploy waits for CI

`deploy.yml` triggers on `workflow_run`, not on the same push. Deploying on the push would
race the test job, and the site could go out while the tests were still red. Its `if:`
conditions require `conclusion == 'success'`, `event == 'push'` and `head_branch == 'main'` —
a pull request's CI run also finishes successfully and must never deploy anything.

`workflow_dispatch` takes an `app` input (`both` / `admin` / `web`) for redeploying one
Worker without a code change.

### The admin build needs a secret that is not a secret

`pnpm --filter @banggai/admin build` fails without `BETTER_AUTH_SECRET` in the environment:

```
[BetterAuthError]: You are using the default secret. Please set `BETTER_AUTH_SECRET` …
```

better-auth refuses to be constructed with its default, and it does that while the bundle is
being rendered — so this is a **build-time** failure, not a runtime one. Locally it never
appears, because `apps/admin/.env` supplies the value. On a runner there is no `.env`, and the
first CI run failed on it.

Both workflows therefore set an obviously-named placeholder for the build steps:

```yaml
env:
  BETTER_AUTH_SECRET: build-placeholder-not-a-real-secret
```

It is a placeholder and not a credential, deliberately:

- **Nothing reads it at build time.** The real value is a Worker secret in Cloudflare, so the
  value here has no effect on anything that runs.
- **It is not `${{ secrets.* }}`.** A credential has no place in a build step, where it would
  be readable by anyone who can read the run's log and is not needed to build anything.

A deploy with no real secret still fails, on the first request, which is the fail-fast
behaviour the rest of this app uses and wants.

### The one secret CI needs, and the ones it must never have

**One: `CLOUDFLARE_API_TOKEN`**, a repository secret.
`CLOUDFLARE_ACCOUNT_ID` is an identifier rather than a credential — it is already public in
`wrangler.jsonc` — so the deploy steps write it literally instead of asking for it. That is
one thing to configure, not two.

**No database credential is in either workflow, and none is needed.** `DATABASE_URL` and
`BETTER_AUTH_SECRET` are already Worker secrets in Cloudflare, and `wrangler deploy` replaces a
Worker's code while leaving its secrets in place. So a leaked CI log cannot leak a connection
string, and a compromised workflow cannot read one.

To add it: **Settings → Secrets and variables → Actions → New repository secret**, name
`CLOUDFLARE_API_TOKEN`, paste the value. Confirm it with `workflow_dispatch` on this workflow
— CI itself needs no secrets at all.

One thing to know about scopes: this workflow declares `environment: production`, and a
secret set *on that environment* shadows a repository secret of the same name. If you add the
token at the environment level by accident, the repository one stops being used, and the
deploy fails with a 403 from the Cloudflare API rather than anything that names the cause.

A deploy-scoped token is the right long-term value here too, for the same reason as the
[analytics token](#the-credential-is-currently-broader-than-it-needs-to-be): one with Workers
Scripts edit and DNS edit on the account, and nothing else. The token in use works, so this is
a follow-up rather than a blocker.

Each deploy job declares `environment: production`, so a GitHub environment protection rule
can require a manual approval before anything reaches a live hostname.

### What CI does not run

- **`test:e2e`.** It needs a database and a signed-in administrator, and a runner has
  neither. The signed-in specs skip themselves without `ADMIN_EMAIL`/`ADMIN_PASSWORD`, so
  running it here would produce a green run that proved less than it appeared to.
- **`pnpm check:code` across the workspace.** It currently fails on the pre-existing
  unformatted `apps/admin` scaffold (see [AGENTS.md](../AGENTS.md)). `ci.yml` lints the paths
  this repository owns — `apps/web`, `packages`, `apps/admin/src`, `apps/admin/e2e` — so the
  gate is honest rather than permanently red.

## Deploy checklist

```sh
pnpm install --frozen-lockfile   # reproducible install
pnpm check                       # types + a11y: 0 errors, 0 warnings
pnpm --filter @banggai/content-model check
pnpm --filter @banggai/admin check
npx biome check apps/web packages apps/admin/src apps/admin/e2e
pnpm test                        # public read layer
pnpm --filter @banggai/admin test # admin, including the component project
pnpm build && pnpm --filter @banggai/admin build
pnpm --filter @banggai/web exec wrangler deploy
```

Then verify the deployed URL: the home page renders styled (not unstyled HTML — a
sign the CSS bundle is missing), an article and a package detail page load, and a
bogus slug shows the branded error page with the header and footer intact.

## Analytics

The admin's analytics dashboard is **live and reading real data**. The write path needed
nothing — the public Worker creates the `BANGGAI_SITE_EVENTS` dataset on its first event — and
the read path is `CLOUDFLARE_ANALYTICS_TOKEN`, a token with **Account → Account Analytics →
Read** on the one account. It is read per request from `$env/dynamic/private`, so setting it
takes effect on the next request with no redeploy.

Verified against the live API with the exact statement shapes `queries.ts` issues:

```
30-day totals:  page_view 26, booking_cta_click 1
daily series:   2026-09-26 -> 27
SHOW TABLES:    BANGGAI_SITE_EVENTS
```

`COUNT()` is not a valid aggregate on this endpoint (`COUNT() function must have 0
arguments`), which is the reason every count in `queries.ts` is `SUM(_sample_interval)`.

### The credential is currently broader than it needs to be

**Rotate this one when convenient.** The value stored in
`CLOUDFLARE_ANALYTICS_TOKEN` is the same token this repository deploys with, and that token
can do more than read analytics: it created both Workers and their DNS records, so it carries
Workers Scripts edit and DNS edit on the account.

That is a wider blast radius than the dashboard asks for. If the back-office were ever
compromised — a leaked session, a bad dependency, an XSS in a content field — a token limited
to `Account Analytics: Read` would cost an attacker a page-view count, whereas this one could
deploy a Worker and repoint a hostname. The dashboard only ever *reads*.

To narrow it:

1. Create a token at <https://dash.cloudflare.com/profile/api-tokens> → **Create Custom
   Token**, permission `Account | Account Analytics | Read`, **Account Resources** set to this
   account alone.
2. ```sh
   pnpm --filter @banggai/admin exec wrangler secret put CLOUDFLARE_ANALYTICS_TOKEN
   ```
3. Revoke the old one. Nothing else changes; the dashboard reads whichever token is in the
   secret.

A Worker secret is not readable back, so this cannot be verified by reading the value — sign
in and confirm the dashboard still renders rather than falling back to its "Not configured
yet" card.

The Free-tier allowance should be reconfirmed before release: 100,000 data points written per
day and 10,000 read queries per day, with three months of retention. The dashboard issues five
read queries per page load, and it never polls.

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
- **The analytics dashboard has its own pair.** `CLOUDFLARE_ACCOUNT_ID` is a `vars` entry
  (an identifier, not a credential) and `CLOUDFLARE_ANALYTICS_TOKEN` is a secret — a
  read-only token with **Account → Account Analytics → Read**. The reads also need the
  **public** Worker deployed and writing to the dataset, or there is nothing to count. The
  dashboard describes the missing variables rather than failing, so a half-configured
  deploy is visible on the page. See
  [Analytics](./14-admin-app.md#analytics-cloudflare-workers-analytics-engine).
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
