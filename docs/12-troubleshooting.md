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

## A Font Awesome icon renders as a box or blank

**Symptom:** a missing glyph, most famously the X/Twitter share icon.

**Cause:** the icon does not exist in the loaded Font Awesome version. Brand icons
in particular were added over time — `fa-x-twitter` needs **≥ 6.4.2**.

**Fix:** check the CDN link in `apps/web/src/app.html`. It should be **6.7.2**:

```html
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css" />
```

Bump the version rather than substituting a different icon.

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

**Causes and checks:**

1. **A media id typo.** Keys are `as const`, so this should be a *type* error — run
   `pnpm check`. If the key exists but points at a missing asset, you get a 404 from
   the CDN.
2. **Wrong bucket.** `media` is page-scoped: `media.home[...]`,
   `media.packages[...]`, `media.blog[...]`, `media.destinations[...]`,
   `media.contact[...]`, `media['about-us'][...]`, and the two `*-details-*` buckets.
   Using a `home` id from a `packages` context is a type error, but copying a wrong
   string literal is not always caught.
3. **A full URL in a field that expects an id** is fine — `img()` passes `http(s)`
   through untouched — but a *relative* path (e.g. `/images/foo.png`) is treated as
   an asset id and prefixed with the AIDA base. Put local files in
   `apps/web/static/` and either use an absolute URL or change the `AIDA` base.
4. **The AIDA CDN rejected the width.** `img()` appends `=w<width>`; extremely large
   widths can fail. Match the width to the slot.

---

## `pnpm dev` works but `pnpm preview` shows an old or blank site

**Cause:** `pnpm preview` serves the **built** Worker, not the source, and it does
not watch.

**Fix:** `pnpm build` first, and re-run the build after every change you want to see
in preview. If the page renders unstyled, the build is stale or the CSS bundle was
not regenerated — rebuild.

Remember the runtime difference: `platform.env`, `ctx`, and `caches` exist in
`wrangler dev`/production but are `undefined` in `pnpm dev` (Node). Nothing in `src`
uses them today, but if you add code that does, always optional-chain `platform`.

---

## A filter command fails with "no projects matched"

**Cause:** you filtered on a package that has no `package.json` — most likely
`@banggai/admin`, which is a deliberate placeholder.

**Fix:** filter on `@banggai/web` instead. Scaffold the admin app before using
`@banggai/admin` (see [apps/admin/README.md](../apps/admin/README.md)).

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
pnpm --filter admin exec biome check --write apps/admin   # or, from the root:
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
| `apps/admin/worker-configuration.d.ts` | `pnpm --filter admin gen` (clear `.svelte-kit/cloudflare` first) |
| `.svelte-kit/` types | `pnpm --filter admin exec svelte-kit sync` (or just run `check`, which syncs) |
| `src/lib/server/db/auth.schema.ts` tables | `pnpm --filter admin auth:schema` (regenerate after changing `auth.ts`) |

**Fix:** generate whichever file is actually absent, then `pnpm --filter admin check`.
Also confirm `apps/admin/.env` exists (copy `.env.example`) — `DATABASE_URL` is read on
the first database call and throws then.

> **Signed in, but told you are not an authorised administrator?** That is the guard
> working, not a bug. Membership is a row in the `administrators` table;
> `pnpm --filter admin provision -- <email> <password>` grants it. A user who is not
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

**Do not read this as a passing build.** `pnpm check`, `pnpm --filter admin check`,
`pnpm --filter admin test` and `pnpm --filter admin dev` all work in the same environment;
only the bundling step needs that much memory. If you cannot free it, say the build was not
run rather than reporting a green check you did not see.

## Playwright is not installed (admin browser tests)

**Symptom:** `pnpm --filter admin test` fails to launch a browser for the `client`
Vitest project.

**Cause:** Playwright's browser binaries are downloaded separately from the npm
package, and they are not present in a fresh install (or in a headless CI/sandbox).

**Fix:**

```sh
pnpm --filter admin exec playwright install chromium
```

On Linux the browser also needs system libraries. If it exits with
`error while loading shared libraries: libatk-1.0.so.0`, install them with
`pnpm --filter admin exec playwright install --with-deps chromium` (needs root) or your
distro's equivalent.

If no browser can be installed in your environment at all, run only the Node project
(`--project server`) or skip browser tests; the server-side tests still run.

## Everything is broken and you do not know why

The full reset that solves most local weirdness without touching tracked files:

```sh
rm -rf node_modules apps/web/node_modules apps/admin/node_modules \
       apps/web/.svelte-kit apps/web/.wrangler \
       apps/admin/.svelte-kit apps/admin/.wrangler
pnpm install
pnpm check                       # the site
pnpm --filter admin check        # only after generating admin's types/schema
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
