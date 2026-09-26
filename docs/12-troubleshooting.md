# 12 — Troubleshooting

Known failure modes, what actually causes them, and the fix. Read the first entry
before you run `pnpm gen`.

---

## The `wrangler types` ↔ `svelte-check` trap

**This is the single most important entry in this document.** It has already cost
hours twice.

### Symptoms

- `pnpm check` suddenly reports **hundreds** of errors (579 was observed once; 19
  another time) coming from files you did not touch.
- The errors point at `.svelte-kit/cloudflare/_worker.js`, `.svelte-kit/output/**`,
  or generated code, and read like type mismatches in build artifacts.
- It appeared right after running `pnpm gen` / `wrangler types`.
- `svelte-check` was clean before.

### Cause

`wrangler types` emits **two different shapes** for
`apps/web/worker-configuration.d.ts`:

| Shape | When Wrangler produces it | Contains |
| --- | --- | --- |
| **Build-independent** (the one committed) | When `.svelte-kit/cloudflare/_worker.js` does **not** exist | Binding types + runtime types only |
| **Build-coupled** (the bad one) | When the adapter output **does** exist | The above **plus** a `Cloudflare.GlobalProps` block that imports `./.svelte-kit/cloudflare/_worker` |

The trap springs because `apps/web/tsconfig.json` lists the file under
`compilerOptions.types`:

```jsonc
"types": ["$app/types", "./worker-configuration.d.ts"]
```

A `types` entry is pulled wholesale into the type program. So when the file contains
that `import './.svelte-kit/cloudflare/_worker'`, the entire build output — generated
Worker code, bundled client assets, framework internals — becomes part of the
compilation, and `svelte-check` reports errors from all of it.

Nothing in `src/` uses `GlobalProps`, so the build-independent shape is complete for
this project.

### Fix

1. **Clear the adapter output**, then regenerate, so Wrangler emits the
   build-independent shape:

   ```sh
   rm -rf apps/web/.svelte-kit/cloudflare apps/web/.svelte-kit/cloudflare-tmp
   pnpm gen
   ```

2. **Confirm the file no longer imports the build output.** Search
   `apps/web/worker-configuration.d.ts` for `GlobalProps` and for
   `_worker`. Neither should appear. If they do, delete the output again and rerun —
   you raced a build.

3. **Re-check:**

   ```sh
   rm -rf apps/web/.svelte-kit/output
   pnpm check
   ```

   You should be back to `0 errors and 0 warnings`.

### Why it keeps not happening (in `apps/web`)

`apps/web`'s `pnpm check` and `pnpm build` **deliberately do not gate on
`wrangler types --check`.** Regeneration is explicit (`pnpm gen`) and rare. If you
ever "fix" the scripts by adding a type-check step back into `check` or `build`,
you will reintroduce this failure the first time someone builds before checking.
Don't.

> **`apps/admin` used to do the opposite** — its `build` and `check` both started with
> `wrangler types --check`. That gate was removed because it is state-dependent: once
> a build leaves `.svelte-kit/cloudflare` behind, it reports the committed
> build-independent file as "out of date", and the obvious remedy (`pnpm gen`) writes
> the build-coupled shape. Measured here: **4986 `svelte-check` errors**, all from
> `.svelte-kit/cloudflare/_worker.js`, cleared by deleting the output and regenerating.

### The one-liner rescue

If `svelte-check` ever explodes with errors from `.svelte-kit`, this clears it
without touching the committed types:

```sh
rm -rf apps/web/.svelte-kit/output apps/web/.svelte-kit/cloudflare
pnpm check
```

### When you genuinely need to regenerate

Only when a binding changes (a new KV namespace, D1 database, R2 bucket, or secret
needs a type). Then: clear output → `pnpm gen` → verify no `GlobalProps` → `pnpm check`.

### A local value got into the committed types

**Symptom:** `git diff` on `worker-configuration.d.ts` shows an `Env` entry nobody added —
a real `DATABASE_URL`, an account id, a token — right after a regeneration.

**Cause:** `wrangler types` loads `.env` and `.dev.vars` by default and folds every value it
finds into the generated `Env` interface, so regenerating on a machine whose `.env` is
filled in writes that machine's secrets into a file that is committed.

**Fix:** both apps pass an intentionally **empty** `--env-file .env.types` to
`wrangler types` (`pnpm gen`). `apps/web/.env.types` and `apps/admin/.env.types` are
committed for exactly this reason, and the root `.gitignore` keeps `.env.*` ignored except
that one file. If a value from a machine appears in the generated types, delete the adapter
output, regenerate, and confirm it is gone — and if a real secret reached a commit, rotate
it, because removing it from the file does not remove it from history.

---

## `svelte-check` cannot find `$app/...` or `./$types`

**Symptom:** errors like "Cannot find module `$app/state`" or "`./$types` is not a
module", usually right after a fresh clone or a `.svelte-kit` wipe.

**Cause:** SvelteKit's generated types (`$app/*`, `$types`, etc.) live under
`.svelte-kit/`, which `svelte-kit sync` produces.

**Fix:** run the sync step, or just run the script that chains it:

```sh
pnpm check          # runs svelte-kit sync first
# or
pnpm exec svelte-kit sync --cwd apps/web
```

`check` and `check:watch` both sync before checking; a bare `svelte-check` does not.

---

## Biome reports unused imports and variables in `.svelte` files

**Symptom:** `noUnusedVariables` / `noUnusedImports` complaints about props,
imported components, or handlers that are clearly used in the markup.

**Cause:** Biome's Svelte parser only reads the `<script>` block; it cannot see
markup usage.

**This is expected and already handled.** `biome.json` has an override turning both
rules off for `**/*.svelte`. If you see them, either the override was removed, or you
are running Biome from a directory that is not picking up the root `biome.json`
(run `pnpm check:code` from the repo root).

Do **not** try to satisfy Biome by deleting markup-used imports.

---

## Biome cannot parse `@theme` / `@apply` in CSS

**Symptom:** a parse error on `layout.css`, mentioning an unknown at-rule.

**Cause:** `css.parser.tailwindDirectives` is disabled or the config is not being
found.

**Fix:** confirm `biome.json` contains:

```jsonc
"css": { "parser": { "tailwindDirectives": true } }
```

and run Biome from the repo root.

---

## `pnpm install` says build scripts were ignored

**Symptom:** a warning about ignored build scripts (typically `workerd` or `esbuild`),
followed by `wrangler`/`vite` misbehaving.

**Cause:** pnpm 10+ blocks dependency post-install scripts by default.

**Fix:** the allowlist lives in `pnpm-workspace.yaml`:

```yaml
allowBuilds:
  workerd: true
  esbuild: true
```

Add a missing entry there (and reinstall) rather than using `--allow-all`, which
whitelists every dependency's scripts.

---

## An icon renders as a box, or as nothing at all

**Symptom:** a missing glyph, or an element that occupies no space.

**Cause:** the icon is not in the generated `apps/web/src/lib/icons.ts`. That map is built
from the `@fortawesome/fontawesome-free` package and committed, so it only learns about an
icon when the generator is run. Two cases:

- **Named in a template** — `icons.spec.ts` fails the build naming the icon and the files
  that use it. That is the intended outcome; run the generator.
- **Named only in the database** — an `icon` field on socials, features, visionMission or
  contactChannels. A source scan cannot see these, so nothing fails. In development
  `Icon.svelte` draws a red placeholder and logs `[icons] "<name>" is not in
  src/lib/icons.ts`; in production it draws a neutral placeholder of the right size.

**Fix:**

```sh
pnpm --filter @banggai/web exec tsx scripts/generate-icons.ts
```

The generator exits non-zero and names every icon it cannot resolve, so a typo fails loudly
rather than rendering blank. It reads the templates *and* an explicit list of the
database-held icons; that list is maintained by hand and is the honest cost of letting the
CMS hold the icon vocabulary instead of a fixed enum.

**If the name does not exist in Font Awesome at all** — brand glyphs were added over time,
and `fa-x-twitter` needs **≥ 6.4.2** — pick a different icon rather than substituting a
similar-looking one.

---


## A Tailwind class has no effect

**Symptom:** a style you wrote does nothing; the element renders unstyled.

**Cause (most common):** the class name is built dynamically, e.g.
`class="text-{color}-500"`. Tailwind v4 detects classes by scanning source files for
complete strings, so constructed names are never generated.

**Fix:** use complete class names in literals, or map a value to a full class string
(the pattern `Header.svelte` uses: `isActive ? 'text-gold' : 'text-stone-300'`).

**Other causes:**

- **`.btn-gold` uses an inline `background`**, so `bg-*` utilities will not override
  it. Use `bg-gold` without `.btn-gold` if you need a flat button.
- **`text-white` is not white** — it is Warm Sand (`#F7F3ED`), by design. See
  [06-styling](./06-styling.md#the-warm-sand-remap-read-this).
- A custom utility in `@layer utilities` can be overridden by later utilities in the
  cascade; check specificity/order.

---

## An image does not load

**Symptom:** a broken image, or a card with an empty frame.

The site has **two** sources of images, and the checks differ. Work out which one the
broken slot uses first: content images come from the database and are served from
`media.banggaiescape.com`; decoration images (hero bands, the About photograph, the package
mosaic) live in `lib/data/media.ts`, which is generated.

**Which host a decoration image is on matters**, because it decides whether it can be resized.
A value in `media.ts` is either a full `media.banggaiescape.com` URL — migrated, so it carries
a `srcset` — or a bare `aida-public` id, which Cloudflare's image transformer refuses with a
403 where a browser gets 200, so it renders unresized. A decoration image that is suddenly
large and has no `srcset` is very likely an unmigrated one.

**If it is a content image** — a package card, a destination gallery, a testimonial
avatar, the shared CTA background:

1. **`MEDIA_PUBLIC_URL` is not set.** `loadMedia` throws naming the asset, and the page
   500s rather than rendering a bare object key. Check `.env` / `.dev.vars` locally and
   the `vars` block in `wrangler.jsonc` in production.
2. **The URL 404s.** The object is not in the bucket. `curl -I` the URL the page renders
   and compare its key against `media_assets.object_key`. This is the failure the
   [promoted-media entry](#promoted-media-404s-from-the-media-domain) describes.
3. **The page 500s naming a payload field.** The stored value is not a `media_assets` id.
   A URL in a media field fails validation (`Invalid UUID`) on purpose — see
   [08-content-data-layer](./08-content-data-layer.md). Re-import or re-point the asset; do
   not "fix" it by loosening the contract.

**If it is a decoration image:**

1. **A media id typo.** Keys are `as const`, so this should be a *type* error — run
   `pnpm check`. If the key exists but points at a missing asset, you get a 404 from
   the CDN.
2. **Wrong bucket.** `media` is page-scoped: `media.home[...]`,
   `media.packages[...]`, `media.blog[...]`, `media.destinations[...]`,
   `media.contact[...]`, `media['about-us'][...]`, and the two `*-details-*` buckets.
   Using a `home` id from a `packages` context is a type error, but copying a wrong
   string literal is not always caught.
3. **A relative path** (e.g. `/images/foo.png`) is treated as an asset id and prefixed
   with the AIDA base. Put local files in `apps/web/static/` and either use an absolute
   URL or change the `AIDA` base.
4. **The AIDA CDN rejected the width.** `img()` appends `=w<width>`; extremely large
   widths can fail. Match the width to the slot. This entry only applies to an
   **unmigrated** value — a `media.banggaiescape.com` URL is returned by `img()` verbatim
   and never gets the suffix, because appending it to an R2 key would 404.
5. **A value is still a bare `aida-public` id.** Run
   `pnpm --filter @banggai/admin exec tsx scripts/replace-placeholder-media.ts` followed by
   `node .stitch/gen-media.mjs`. Until it does, the image cannot be resized, because
   Cloudflare's image transformer gets a 403 from that host where a browser gets 200 — so
   `$lib/images` deliberately emits no `srcset` for it and it is served at full size.

---

## `pnpm dev` works but `pnpm preview` shows an old or blank site

**Cause:** `pnpm preview` serves the **built** Worker, not the source, and it does
not watch.

**Fix:** `pnpm build` first, and re-run the build after every change you want to see
in preview. If the page renders unstyled, the build is stale or the CSS bundle was
not regenerated — rebuild.

Remember the runtime difference: `platform.env`, `ctx`, and `caches` exist in
`wrangler dev`/production but are `undefined` in `pnpm dev` (Node). `apps/admin`'s media
code reads `platform?.env.MEDIA_PUBLIC_URL` and `platform?.env.R2_MEDIA`; `apps/web` needs
no `platform` at all, because its cache policy is a response header the adapter acts on.

`apps/web` needs its own `.dev.vars` for the same reason the admin does — a Worker's `env`
never comes from `.env`. If `pnpm preview` returns `500` with
`DATABASE_URL is not set, so the site cannot read its content.`, that file is missing or
empty. See the next entry.

---

## `pnpm --filter @banggai/admin preview` 500s with `DATABASE_URL is not set`

**Symptom:** the built Worker starts and routes, but every page — `/login` included —
comes back `500`, and the worker log shows

```
Error: DATABASE_URL is not set
```

**Cause:** `preview` runs `.svelte-kit/cloudflare/_worker.js` under `wrangler dev`, and a
Worker's `env` comes from **`.dev.vars`**, not from `.env`. A checkout whose values live
only in `apps/admin/.env` therefore hands the Worker an `env` with no `DATABASE_URL`, and
`db/index.ts` throws on the first database call — which `hooks.server.ts` makes on every
request, so nothing renders at all.

`pnpm dev` is unaffected, because SvelteKit's dev server fills `$env/dynamic/private` from
`.env`. That asymmetry is the whole trap: dev works, so nothing looks wrong until the
first preview.

**Fix:** put the app's runtime variables in `apps/admin/.dev.vars` too (the values may be
copied from `.env`):

```sh
DATABASE_URL="postgres://…"
ORIGIN="http://localhost:4173"
BETTER_AUTH_SECRET="…"
```

Production has no `.dev.vars` at all — the same values are Worker secrets set with
`wrangler secret put`. See
[14-admin-app](./14-admin-app.md#local-environment-files).

---

## Database and media configuration (`apps/web`)

**Symptom:** every page on the public site is a `500`. The worker log (`/tmp/web-dev.log`,
`pnpm preview`'s output, or `wrangler tail`) names one of:

```
DATABASE_URL is not set, so the site cannot read its content.
MEDIA_PUBLIC_URL is not set, so media asset <id> has no public URL to render.
The stored site setting “…” does not satisfy its contract…
```

**Cause:** since Phase 4 the public site renders from Neon, so it has no fallback. The
first two messages are configuration; the third is data.

**Fix:**

| Message | Where it comes from |
| --- | --- |
| `DATABASE_URL is not set` | `apps/web/.env` (for `pnpm dev`) and `apps/web/.dev.vars` (for `pnpm preview`). Both are git-ignored; copy the pooled connection string from `apps/admin/.env`. |
| `MEDIA_PUBLIC_URL is not set` | The `vars` block in `apps/web/wrangler.jsonc`, or the same key in `.env` / `.dev.vars`. It is `https://media.banggaiescape.com`. |
| A setting or payload fails its contract | Real data drift. The message names the key and the offending field path; fix the row, or the contract, in that order of suspicion. |

The site deliberately has **no static fallback**. Serving a bundled copy of the content
when the database is unreachable would be two sources of truth and a page that is quietly
months out of date — and since Phase 6 there is no copy left to serve (see
[08-content-data-layer](./08-content-data-layer.md#the-retired-modules-are-gone)).

Two things worth knowing about the connection itself:

- Locally it is the same pooled string the admin uses, which means `neondb_owner` on a
  laptop. **Production must use `banggai_web`** — the read-only role, created with
  `pnpm --filter @banggai/admin db:roles` and stored with
  `wrangler secret put DATABASE_URL`.
- If role creation fails with `Role banggai_web does not exist. Set its password environment
  variable to create it.`, pass `WEB_DB_PASSWORD` as the entry says. A password cannot be
  read back out of Postgres, so the script can only set one.

---

## A publish has not appeared on the public site

**Symptom:** the admin shows a page as published, but the public URL still shows the old
version. Reloading changes nothing.

**This is the design, for up to five minutes.** `apps/web/src/hooks.server.ts` sets
`Cache-Control: public, max-age=0, s-maxage=300`, and the Cloudflare adapter's Worker keeps
the rendered page in the Workers cache for that long. A publish is therefore visible
"within five minutes", not instantly, and no deploy is involved either way.

**To see it sooner:**

- Be sure the admin's action really published — "Published — unpublished changes" is still
the *previous* revision being served.
- Any URL with a query string is a different cache key, so `?v=2` reads straight from the
database and is the quickest way to confirm the data is right.
- `Cache-Control: no-cache` on the request also bypasses the stored copy.
- Restarting `wrangler dev` clears the local cache; the deployed Worker has no dev server to
  restart, so wait the five minutes or add cache purging on publish (see
  [02-architecture](./02-architecture.md)).

**Related:** a bug that only reproduces on a second request, or content that looks one
revision behind, is often the cache rather than the loader.

---

## Promoted media 404s from the media domain

**Symptom:** "Copy to R2" (or "Copy all into the bucket") reports success, the media library
shows every asset as uploaded, and every URL on `media.banggaiescape.com` returns
Cloudflare's `Not Found` page.

**Cause:** `vite dev` and `wrangler dev` both bind a **simulated** R2 bucket, kept under
`.wrangler/state/v3/r2/`. The action wrote the bytes there and repointed `media_assets` at
keys only that process can read — so the database now claims files the deployed site cannot
serve. The action is doing exactly what it says; the environment is what is a lie. (The page
does warn: a promotion card that says *"This environment has no public media host"* means the
rows it writes will not be reachable in production.)

**Fix:** run the migration where the bucket is real — from the deployed admin. To repair a
run that already happened, push the objects at the same keys, since the rows already point at
them:

```sh
# 1. Read the bytes back through the dev server's own route (they are in the simulation)
curl -s "http://127.0.0.1:5173/media/<key>" -o /tmp/<key>

# 2. Put them in the real bucket, under the same key
pnpm --filter @banggai/admin exec wrangler r2 object put \
  "banggaiescape-media/<key>" --file /tmp/<key> --remote --content-type image/jpeg
```

Then confirm the object answers on the custom domain. A freshly written object can 404 for a
few seconds while the custom domain's negative cache expires; re-request before concluding it
is missing.

---

## A filter command fails with "no projects matched"

**Cause:** you filtered on a name that is not the one in `package.json` — a typo, or a
folder name used as if it were the package name (`pnpm --filter admin` and
`pnpm --filter apps/admin` both fail; the name is what `--filter` matches, and the folder
is not it).

**Fix:** the three names are `@banggai/web`, `@banggai/admin`, and `@banggai/content-model`
(`pnpm --filter @banggai/admin check`). `pnpm ls -r --depth -1` lists them. See
[14-admin-app](./14-admin-app.md).

---

## Port already in use

**Symptom:** Vite or Wrangler fails to bind.

**Fix:** stop the previous dev server (Vite picks the next free port and prints it,
so check the output), or target a specific one:

```sh
pnpm --filter @banggai/web dev -- --port 5199
pnpm --filter @banggai/web preview -- --port 4199
```

---

## Nested `<main>` / hydration or HTML-validity warnings

**Cause:** `+layout.svelte` already renders `<main>`, and several pages
(`packages/+page.svelte`, `destinations/[slug]/+page.svelte`, …) render another one
inside it. It is harmless in practice but invalid HTML.

**Fix:** when you touch such a page, change the inner `<main>` to `<div>` or remove
it. Do not remove the layout's `<main>`.

---

## Biome fails on the admin scaffold

**Symptom:** `pnpm check:code` reports a wall of errors (27 errors, 2 warnings in one
observed run, across 66 files) — all of them in `apps/admin/`, with names like
`lint/complexity/noUselessEmptyExport`, `assist/source/organizeImports`, and
`format`.

**Cause:** `apps/admin` was generated by `sv`, which writes spaces, double quotes,
and its own import ordering — none of which match the workspace `biome.json` (tabs,
single quotes, sorted imports). Because the root scripts run Biome across the whole
workspace, the unformatted scaffold fails the repo-wide check.

**Fix:**

```sh
pnpm --filter @banggai/admin exec biome check --write apps/admin   # or, from the root:
npx biome check --write apps/admin
```

That reformats and applies the safe fixes to the admin app only. Review the diff
before committing — a formatter rewrite of a fresh scaffold is expected to be large.
Note that `noExplicitAny` warnings in `src/lib/utils.ts` are shadcn-svelte boilerplate
and may need a targeted suppression rather than a code change.

Until it is fixed, treat `npx biome check apps/web` as the gate for the site (it is
clean) and do not read the repo-wide failure as a problem with your own change.

## `apps/admin` fails `check` or `build` on missing files

**Symptom:** admin `check`/`build` fails, citing a missing
`./worker-configuration.d.ts`, or `svelte-check` complains about missing SvelteKit
types, or the auth adapter cannot find tables.

**Cause:** `worker-configuration.d.ts` and `auth.schema.ts` are both generated, but both
are committed, so on a normal clone you are looking at a deleted file rather than a
missing scaffold step:

| Missing | Produce it with |
| --- | --- |
| `apps/admin/worker-configuration.d.ts` | `pnpm --filter @banggai/admin gen` (clear `.svelte-kit/cloudflare` first) |
| `.svelte-kit/` types | `pnpm --filter @banggai/admin exec svelte-kit sync` (or just run `check`, which syncs) |
| `src/lib/server/db/auth.schema.ts` tables | `pnpm --filter @banggai/admin auth:schema` (regenerate after changing `auth.ts`) |

**Fix:** generate whichever file is actually absent, then `pnpm --filter @banggai/admin check`.
Also confirm `apps/admin/.env` exists (copy `.env.example`) — `DATABASE_URL` is read on
the first database call and throws then.

> **Signed in, but told you are not an authorised administrator?** That is the guard
> working, not a bug. Membership is a row in the `administrators` table;
> `pnpm --filter @banggai/admin provision -- <email> <password>` grants it. A user who is not
> listed is refused, and a database that cannot be reached denies everyone **by design**
> — see [14-admin-app](./14-admin-app.md#authorization-the-administrators-table).

## `pnpm build` is killed with exit 143 ("Terminated")

**Symptom:** `pnpm build` — either app — prints the transform summary, then
`rendering chunks...`, and dies with `Terminated`, exit code **143**. No error, no stack,
no `JavaScript heap out of memory`. Run through `pnpm exec` the same failure can surface as
a plain exit code **1**, because pnpm translates a signal-killed child.

**Cause:** a memory-pressure watchdog in the sandbox sends **SIGTERM** to whatever drives
`MemAvailable` down to roughly 800 MB. It is **not** an OOM inside the app and not a cgroup
limit — check that first:

```sh
cat /sys/fs/cgroup/memory.events   # oom_kill 0
cat /sys/fs/cgroup/memory.max      # max — no cgroup limit at all
awk '/MemAvailable/{print $2/1024" MB"}' /proc/meminfo
```

The watchdog reproduces with no Vite involved at all:

```sh
node -e 'const a=[];let i=0;setInterval(()=>{a.push(Buffer.alloc(25*1024*1024,1))},150)'
```

That dies at ~10 s, at the same `MemAvailable`. Note the contrast: a process that
allocates a large block and then **holds it** survives fine at the same free memory — it is
the *rate* of growth, not the total, that trips the watchdog. So `NODE_OPTIONS`
`--max-old-space-size` does not help, and neither does removing packages the build never
imports.

**Fix:** free memory before building. In a Codespace the editor is usually the bigger
consumer — `ps -eo pid,rss,comm --sort=-rss | head` typically shows `svelte-language-server`,
the extension host and `tsserver` each holding hundreds of MB, against a build that needs
roughly 750 MB. Close the window (or the workspace's language servers) and the build fits.
No configuration change makes a 750 MB build fit in 200 MB of headroom.

**Do not read this as a passing build.** `pnpm check`, `pnpm --filter @banggai/admin check`,
`pnpm --filter @banggai/admin test` and `pnpm --filter @banggai/admin dev` all work in the same environment;
only the bundling step needs that much memory. If you cannot free it, say the build was not
run rather than reporting a green check you did not see.

## Playwright is not installed (admin browser tests)

**Symptom:** `pnpm --filter @banggai/admin test` fails to launch a browser for the `client`
Vitest project.

**Cause:** Playwright's browser binaries are downloaded separately from the npm
package, and they are not present in a fresh install (or in a headless CI/sandbox).

**Fix:**

```sh
pnpm --filter @banggai/admin exec playwright install chromium
```

On Linux the browser also needs system libraries. If it exits with
`error while loading shared libraries: libatk-1.0.so.0`, install them with
`pnpm --filter @banggai/admin exec playwright install --with-deps chromium` (needs root) or your
distro's equivalent.

If no browser can be installed in your environment at all, run only the Node project
(`--project server`) or skip browser tests; the server-side tests still run.

## The analytics dashboard says it is not configured

**Symptom:** `/analytics` renders "Not configured yet" and names one or both of
`CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_ANALYTICS_TOKEN`.

**Cause:** both are read through `$env/dynamic/private` on each request. The account id is a
`vars` entry in `apps/admin/wrangler.jsonc`, so a deploy and `wrangler dev` have it but
`vite dev` does not unless it is also in `.env`; the token exists only where you put it.

**Fix:** for local work put both in `apps/admin/.env`; for a deploy run
`pnpm --filter @banggai/admin exec wrangler secret put CLOUDFLARE_ANALYTICS_TOKEN` and leave
the id in `wrangler.jsonc`. Mind the usual asymmetry: `pnpm dev` reads `.env`, while the
built Worker reads `.dev.vars` — and Worker secrets in production.

A **rejected** token is a different message: "Cloudflare refused the analytics token (403)",
naming the permission it needs (`Account → Account Analytics → Read`). The token itself is
never rendered into the page.

## The analytics dashboard is empty

**Symptom:** `/analytics` loads, the ranges and Refresh work, and every number is zero (or
the page says "No events in this window").

Not a bug by itself. In order of likelihood:

1. **Nothing is writing.** The public Worker is not deployed, or is deployed without the
   `ANALYTICS` binding. Under `vite dev` there are no Worker bindings at all, so a local
   site records nothing — `recordEvent()` is a documented no-op there, by design.
2. **The dataset does not exist yet.** Analytics Engine creates it on the first write, so a
   fresh account has nothing to query and the dashboard rightly reports zero.
3. **Retention.** Analytics Engine keeps three months; `90` is the longest range offered for
   that reason.
4. **The traffic is younger than the cache.** Published pages are served with a five-minute
   edge cache, so a page view can be up to five minutes old.

What is *not* a silent zero: a count the API returns that cannot be read is thrown rather
than rendered as `0`, and a failed query shows the error card. A zero you can see is an
answer.

## Everything is broken and you do not know why

The full reset that solves most local weirdness without touching tracked files:

```sh
rm -rf node_modules apps/web/node_modules apps/admin/node_modules \
       apps/web/.svelte-kit apps/web/.wrangler \
       apps/admin/.svelte-kit apps/admin/.wrangler
pnpm install
pnpm check                       # the site
pnpm --filter @banggai/admin check        # only after generating admin's types/schema
```

`.svelte-kit` and `.wrangler` are generated and git-ignored, so deleting them is
always safe. Never commit them.

## Related

- [10-tooling](./10-tooling.md) — what each config file controls.
- [11-deployment](./11-deployment.md) — build output and the Wrangler setup.
- [06-styling](./06-styling.md) — Tailwind v4 behaviour.
- [08-content-data-layer](./08-content-data-layer.md) — the media manifest.
- [14-admin-app](./14-admin-app.md) — the admin app's generated files and toolchain.
- [`../README.md`](../README.md) — the same trap described briefly, for the quick-start level.
