# 14 — The Admin App (`apps/admin`)

The back-office application: a second SvelteKit app in the workspace with
authentication, a Postgres database, and a component library.

> **Status: the foundation is in place, but there is no CMS UI yet.** Sign-in, the
> route guard, the content schema, and the migration of the current static content all
> work. Missing: content CRUD, preview, media upload (R2), and analytics. Treat
> everything below as *what exists now*, and read
> [Gaps and next steps](#gaps-and-next-steps) before planning work.

---

## What it is for

The back-office is intended to let an administrator manage the content the marketing
site serves, plus see how the site is performing:

- tour **packages**
- **destinations**
- **articles** (the blog)
- **media** (image uploads and library)
- **site information** (brand, contact details, navigation)
- **analytics** (traffic and behaviour on the public site)

Today the app has a real sign-in, a protected dashboard, and a finished **media library**
(upload, alt text, browsing, reference-aware deletion). The content screens — packages,
destinations, articles, site information — and analytics are not built yet; the content
tables they will write to are already designed and migrated, and the current site content
has been imported into them.

## How it was created

`apps/admin/README.md` records the exact generator command, which is the fastest way
to understand the stack choices:

```sh
pnpm dlx sv@0.17.1 create --template minimal --types ts \
  --add vitest="usages:unit,component" \
        tailwindcss="plugins:typography,forms" \
        sveltekit-adapter="adapter:cloudflare+cfTarget:workers" \
        better-auth="demo:password" \
        drizzle="database:postgresql+postgresql:neon" \
  --install pnpm .
```

That is the Svelte CLI's `sv` generator, with: TypeScript, Vitest (unit + component),
Tailwind (typography + forms plugins), the Cloudflare adapter targeting Workers,
Better Auth with the password demo, and Drizzle against Neon Postgres.

## Stack

| Layer | Choice | Version |
| --- | --- | --- |
| Framework | **SvelteKit (stable, v2)** | `^2.63.0` |
| UI runtime | Svelte 5 (runes forced on) | `^5.56.1` |
| Styling | Tailwind v4 + `@tailwindcss/forms` + `@tailwindcss/typography` | `^4.3.0` |
| Component library | **shadcn-svelte** (`rhea` style), Lucide icons, `tailwind-variants`, `tw-animate-css` | `shadcn-svelte ^1.7.0` |
| Font | **Geist Variable** (via `@fontsource-variable/geist`) | `^5.3.0` |
| Auth | **better-auth**, email + password | `^1.6.23` |
| ORM / DB | **Drizzle ORM** + **drizzle-kit**, **Neon Postgres** over HTTP (`@neondatabase/serverless`) | `^0.45.2` / `^1.1.0` |
| Adapter / host | `@sveltejs/adapter-cloudflare` (Worker `admin`) | `^7.2.8` |
| Testing | **Vitest** + Playwright browser provider + `vitest-browser-svelte` | `^4.1.8` |
| Tooling | Vite 8, `svelte-check`, `wrangler` | — |

### The two apps share a SvelteKit major

| App | `@sveltejs/kit` | `@sveltejs/adapter-cloudflare` |
| --- | --- | --- |
| `apps/web` | `^2.63.0` (SvelteKit **2**, stable) | `^7.2.8` |
| `apps/admin` | `^2.63.0` (SvelteKit **2**, stable) | `^7.2.8` |

Both apps run the **same stable SvelteKit major**, so `$lib` works natively in both
and neither needs an alias shim. A future `packages/*` module *could* import
SvelteKit APIs (load helpers, `error`) and be consumed by both apps.

What they still do **not** share is anything else: no common tokens, types, or
components. Keep that separation until a deliberate `packages/*` package exists —
cross-app imports are not allowed ([03-project-structure](./03-project-structure.md#where-new-code-goes)).

## Structure

```
apps/admin/
├─ src/
│  ├─ app.html                      # document shell (no brand fonts/meta yet)
│  ├─ app.d.ts                      # App.Platform (env/ctx/caches/cf) + App.Locals (user/session)
│  ├─ hooks.server.ts               # better-auth handle → populates event.locals
│  ├─ lib/
│  │  ├─ index.ts                   # `$lib` placeholder
│  │  ├─ utils.ts                   # cn() re-export + shadcn type helpers│  │  ├─ assets/favicon.svg
│  │  ├─ components/                # the shell (adapted from dashboard-01 / login-01)
│  │  │  ├─ app-sidebar.svelte      # side nav, from `$lib/navigation`
│  │  │  ├─ site-header.svelte      # section title + ModeToggle
│  │  │  ├─ mode-toggle.svelte      # light ↔ dark, via mode-watcher
│  │  │  ├─ nav-main.svelte         # active item = longest matching prefix
│  │  │  ├─ nav-user.svelte         # identity + POST to /logout
│  │  │  ├─ login-form.svelte       # the sign-in card
│  │  │  ├─ content/
│  │  │  │  ├─ EntryForm.svelte     # a content payload's fields
│  │  │  │  ├─ FieldControl.svelte  # one field, including the repeatable ones
│  │  │  │  └─ status-badge.svelte  # draft / published / changed / archived
│  │  │  └─ ui/                     # shadcn-svelte components, incl. `chart/` (layerchart)
│  │  ├─ content/forms.ts           # the field-spec model for content *and* settings
│  │  ├─ content/forms.spec.ts      # unit tests (server project)
│  │  ├─ navigation.ts              # the one list of sections, for the sidebar and header
│  │  ├─ server/
│  │  │  ├─ auth.ts                 # betterAuth() instance
│  │  │  ├─ authz.ts                # administrators-table check + redirect sanitising
│  │  │  ├─ authz.spec.ts           # unit tests for the above (server project)
│  │  │  ├─ content/
│  │  │  │  ├─ service.ts           # entry/revision/redirect reads and writes
│  │  │  │  ├─ validate.ts          # assertValidPayload / assertValidSiteSetting
│  │  │  │  └─ validate.spec.ts     # contract tests (server project)
│  │  │  ├─ media/                  # upload, keys, references, picker options
│  │  │  ├─ analytics/              # Cloudflare Analytics Engine: client, queries, assembly
│  │  │  ├─ settings/service.ts     # listSettings / getSetting / saveSetting
│  │  │  └─ db/
│  │  │     ├─ index.ts             # LAZY neon() + drizzle() client
│  │  │     ├─ schema.ts            # domain tables + `export * from './auth.schema'`
│  │  │     └─ auth.schema.ts       # GENERATED — run `pnpm auth:schema`
│  ├─ routes/
│  │  ├─ +layout.svelte             # imports layout.css, favicon, ModeWatcher
│  │  ├─ +page.server.ts            # `/` → redirect to /dashboard
│  │  ├─ layout.css                 # Tailwind + shadcn-svelte tokens (neutral, Geist)
│  │  ├─ (auth)/login/              # public sign-in form + action
│  │  ├─ media/[key]/+server.ts     # serves an upload from R2
│  │  └─ (dashboard)/               # private group
│  │     ├─ +layout.server.ts       # session, then administrators-table guard
│  │     ├─ +layout.svelte          # sidebar shell: AppSidebar + SiteHeader
│  │     ├─ dashboard/+page.svelte  # overview placeholder
│  │     ├─ analytics/              # the dashboard: range filter, KPIs, chart, rankings
│  │     ├─ content/[kind]/         # list, new/, [slug]/ (edit, publish), [slug]/preview/
│  │     ├─ media/                  # the media library
│  │     ├─ settings/               # the index, and [key]/ to edit one
│  │     └─ logout/+server.ts       # POST-only sign-out
│  ├─ static/robots.txt
│  └─ .vscode/ .env.example .env.types .gitignore .npmrc
├─ components.json                  # shadcn-svelte config
├─ drizzle.config.ts                # drizzle-kit config (needs DATABASE_URL)
├─ package.json  tsconfig.json  vite.config.ts  wrangler.jsonc
└─ README.md                        # the `sv` default README
```

## Configuration

### `wrangler.jsonc`

```jsonc
{
	"name": "admin",
	"compatibility_date": "2026-09-25",
	"compatibility_flags": ["nodejs_als"],
	"main": ".svelte-kit/cloudflare/_worker.js",
	"assets": { "binding": "ASSETS", "directory": ".svelte-kit/cloudflare" },
	"r2_buckets": [{ "binding": "R2_MEDIA", "bucket_name": "banggaiescape-media" }],
	"vars": { "MEDIA_PUBLIC_URL": "https://media.banggaiescape.com" },
	"workers_dev": true,
	"preview_urls": true
}
```

Same shape as `apps/web`'s, with a different Worker **name** (`admin`) and a newer
`compatibility_date`. The two extra entries are the media storage — see
[Media](#media-r2-and-the-media-library).

`R2_MEDIA` is a **binding**, so it is declared here and regenerating types is what makes
`event.platform.env.R2_MEDIA` typed. `MEDIA_PUBLIC_URL` is a **var**, so it is *also*
declared here but reaches the app through `$env/dynamic` at runtime — which is why it can
be overridden in `.dev.vars` without touching this file.

### `vite.config.ts`

- Same plugin order as `apps/web`: `tailwindcss()` then `sveltekit({…})`.
- Uses `defineConfig` from **`vitest/config`**, not `vite`, because the Vitest
  config lives here too.
- Adds `'../drizzle.config.ts'` to the TypeScript project include, so
  `drizzle.config.ts` is type-checked from inside the app.
- Configures **two Vitest projects**:
  - `client` — Playwright Chromium (headless), for `src/**/*.svelte.{test,spec}.ts`,
    excluding `src/lib/server/**`.
  - `server` — Node environment, for `src/**/*.{test,spec}.ts`, excluding the
    `.svelte.` variants.
- `test.expect.requireAssertions: true` — a test with no assertion fails.

### `tsconfig.json`

```jsonc
{
	"extends": "./.svelte-kit/tsconfig.json",
	"compilerOptions": {
		"rewriteRelativeImportExtensions": true,
		"allowJs": true, "checkJs": true, "esModuleInterop": true,
		"forceConsistentCasingInFileNames": true, "resolveJsonModule": true,
		"skipLibCheck": true, "sourceMap": true, "strict": true,
		"moduleResolution": "bundler",
		"types": ["./worker-configuration.d.ts"]
	}
}
```

The shape matches `apps/web` (both extend the generated `.svelte-kit/tsconfig.json`),
with `skipLibCheck: true` doing the same job there: it suppresses the collision
between the Cloudflare runtime types and `lib.dom.d.ts`
([10-tooling](./10-tooling.md#typechecking-svelte-check--typescript)).

`apps/admin/worker-configuration.d.ts` is generated by `pnpm --filter @banggai/admin gen` and
committed in the same build-independent shape as `apps/web`. Because it is listed under
`types`, the app cannot typecheck until it exists. Clear the adapter output before
regenerating, per the
[wrangler trap](./12-troubleshooting.md#the-wrangler-types--svelte-check-trap).

### `components.json` (shadcn-svelte)

```jsonc
{
	"tailwind": { "css": "src/routes/layout.css", "baseColor": "neutral" },
	"aliases": {
		"components": "$lib/components", "utils": "$lib/utils",
		"ui": "$lib/components/ui", "hooks": "$lib/hooks", "lib": "$lib"
	},
	"style": "rhea", "iconLibrary": "lucide",
	"menuColor": "default-translucent", "menuAccent": "subtle"
}
```

The registry is `https://shadcn-svelte.com/registry`. Components are added with
`pnpm dlx shadcn-svelte@latest add <name>` and land in `$lib/components/ui`; utilities are
imported from `$lib/utils` (`cn` is re-exported there from the `cn` package).

Two registry **blocks** are the origin of the app's shell. Both were adapted rather than
used as shipped:

| Block | Command | What it gave the app |
| --- | --- | --- |
| `login-01` | `pnpm dlx shadcn-svelte@latest add login-01` | `login-form.svelte` — the sign-in card |
| `dashboard-01` | `pnpm dlx shadcn-svelte@latest add dashboard-01` | `app-sidebar.svelte`, `nav-main.svelte`, `nav-user.svelte`, `site-header.svelte` |

`login-01` lands in `$lib/components/login-01/`, but `dashboard-01` writes its files
**flat into `$lib/components/`** — they sit directly alongside the app's own components.

Every block ships demo content (Acme Lifecycle/Projects/Team navigation, a Quick Create
button, a GitHub link, a hardcoded "Documents" title, and Google / forgot-password /
sign-up affordances) and **all of it was deleted**, along with the demo routes
`src/routes/dashboard-01` and `src/routes/login-01`. A sidebar of `#` links is worse than a
short sidebar.

The components the blocks pull in transitively are kept (`sidebar`, `breadcrumb`, `sheet`,
`tooltip`, `avatar`, `dropdown-menu`, `select`, `separator`, `skeleton`, `table`,
`toggle-group`, `drawer`, `field`, `alert`, `empty`, `sonner`, `spinner`). The parts that
only existed to render the demo were removed: `ui/chart`, `section-cards`,
`chart-area-interactive` and every `data-table-*` file — and with them the `layerchart`,
`d3-*`, `@tanstack/svelte-table` and `@dnd-kit*` packages.

`iconLibrary` is `lucide`, so icons are imported from `@lucide/svelte` by path
(`@lucide/svelte/icons/package`). `@tabler/icons-svelte` is **not** used, and neither icon
package is imported from a barrel, which is what keeps the icon set out of the bundle.

`biome.json`'s `files.includes` excludes `**/components/ui`, because the CLI emits its own
formatting and those files should stay re-addable from the registry. The exclusion does
**not** cover `src/lib/utils.ts`, which the CLI also generates and which therefore still
reports two `noExplicitAny` errors — see
[12-troubleshooting](./12-troubleshooting.md#biome-fails-on-the-admin-scaffold).

### Environment

`.env.example` (copy to `.env`; `.env` is git-ignored and already present locally):

```sh
DATABASE_URL="postgres://user:password@host:port/db-name"
ORIGIN=""
BETTER_AUTH_SECRET=""
```

| Variable | Used by | Notes |
| --- | --- | --- |
| `DATABASE_URL` | `drizzle.config.ts`, `src/lib/server/db/index.ts` | **Required.** Pooled. `drizzle.config.ts` throws at load; `db/index.ts` throws on the first database call |
| `DATABASE_URL_UNPOOLED` | `drizzle.config.ts`, `scripts/db-roles.ts` | Optional; **preferred by `db:migrate`, `db:studio`, and `db:roles`** when present, because they run DDL. `neon env pull` writes it |
| `ORIGIN` | `src/lib/server/auth.ts` → `baseURL` | The app's own origin; must be correct for auth cookies/redirects. Not a secret |
| `BETTER_AUTH_SECRET` | `src/lib/server/auth.ts` → `secret` | Use a 32+ character, high-entropy value in production |
| `ADMIN_DB_PASSWORD` | `scripts/db-roles.ts` only | Sets `banggai_admin`'s password. Not read by the app |
| `WEB_DB_PASSWORD` | `scripts/db-roles.ts` only | Sets `banggai_web`'s password. Not read by the app |
| `CLOUDFLARE_API_TOKEN` | `wrangler` only | Not read by the app. Lets `wrangler r2 …` run non-interactively — see [Managing the bucket from the CLI](#managing-the-bucket-from-the-cli) |
| `CLOUDFLARE_ACCOUNT_ID` | `src/lib/server/analytics/client.ts` | Which account's Analytics Engine dataset to query. The `vars` entry in `wrangler.jsonc` in production — an identifier, not a credential |
| `CLOUDFLARE_ANALYTICS_TOKEN` | `src/lib/server/analytics/client.ts` | **Needed by the analytics dashboard only.** Read-only token (`Account → Account Analytics → Read`). Server-only; see [Analytics](#analytics-cloudflare-workers-analytics-engine) |

Administrator membership is **not** an environment variable. It is a row in the
`administrators` table, granted by `provision` — see
[Authorization](#authorization-the-administrators-table). That is deliberate: an env
allowlist cannot be revoked per person and cannot change without a redeploy.

Read through `$env/dynamic/private`, so they are runtime values (Worker secrets), not
inlined at build time. For production, set them with
`wrangler secret put` (see [11-deployment](./11-deployment.md#environment-and-secrets)).

### Local environment files

| File | Committed | Holds |
| --- | --- | --- |
| `.env.example` | yes | The template: every variable the app reads. Add new variables here. |
| `.env` | no | Local values. Read by `wrangler dev` (and by wrangler itself, for `CLOUDFLARE_API_TOKEN`) **and** by `drizzle-kit`. |
| `.dev.vars.example` | yes | The template for Worker bindings under `wrangler dev`. |
| `.dev.vars` | no | The Worker's local `env`, overriding `vars` in `wrangler.jsonc`. Copy the example and edit. Ignored, along with `.dev.vars.*`. |
| `.env.types` | yes | **Intentionally empty.** `pnpm gen` passes it to `wrangler types --env-file`, which *replaces* the default `.env`/`.dev.vars` loading. |

`.env` and `.dev.vars` are **not** interchangeable: wrangler reads `.env` for its own
configuration (API tokens, account ids) and `.dev.vars` for the Worker's `env`. A token
in `.dev.vars` is ignored; a binding in `.env` is invisible to the Worker.

> **`pnpm --filter @banggai/admin preview` needs the app's variables in `.dev.vars`, not `.env`.**
> `preview` serves the *built* Worker under `wrangler dev`, and that Worker's `env` comes
> from `.dev.vars` alone — so a checkout whose values live only in `.env` answers
> `500 · DATABASE_URL is not set` on **every** route, `/login` included. `pnpm dev` is
> unaffected, because SvelteKit's dev server fills `$env/dynamic/private` from `.env`, and
> that asymmetry is what makes this easy to miss until the first preview. Copy
> `DATABASE_URL`, `ORIGIN` and `BETTER_AUTH_SECRET` into `.dev.vars` to run the production
> bundle locally. See
> [12-troubleshooting](./12-troubleshooting.md#pnpm---filter-banggaiadmin-preview-500s-with-database_url-is-not-set).

The committed `.dev.vars.example` sets `MEDIA_PUBLIC_URL=""` for local development. That
is not a default anyone should copy blindly — see [Serving an
upload](#serving-an-upload) for why an empty value is the correct one locally.

The `.env.types` file exists so the committed `worker-configuration.d.ts` is the same
for every developer. Without it, `wrangler types` folds whatever is in the local `.env`
into the generated `Env` interface, and a machine with no `.env` regenerates a different
file. With it, the committed types describe the bindings declared in `wrangler.jsonc`
(`ASSETS` and `R2_MEDIA` today) and nothing about
anyone's machine. Runtime variables stay out of the types on purpose — they are read
through `$env/dynamic/private`, which is untyped by design.

> The `CLOUDFLARE_API_TOKEN` canary is verified, not assumed: appending a token to
> `.env`, clearing the adapter output, and re-running `pnpm gen` produces a
> byte-identical `worker-configuration.d.ts`. The `--env-file .env.types` policy is what
> buys that.

## Authentication (better-auth)

`src/lib/server/auth.ts`:

```ts	export const auth = betterAuth({
	baseURL: env.ORIGIN,
	secret: env.BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, { provider: 'pg' }),
	emailAndPassword: { enabled: true, disableSignUp: true },
	plugins: [
		sveltekitCookies(getRequestEvent), // must be the LAST plugin in the array
	],
});
```

Imported as `better-auth/minimal` deliberately: the minimal entry point avoids
pulling the full provider surface into the Worker bundle.

`src/hooks.server.ts` wires it into every request:

```ts
const handleBetterAuth: Handle = async ({ event, resolve }) => {
	const session = await auth.api.getSession({ headers: event.request.headers });
	if (session) {
		event.locals.session = session.session;
		event.locals.user = session.user;
	}
	return svelteKitHandler({ event, resolve, auth, building });
};
export const handle: Handle = handleBetterAuth;
```

`src/app.d.ts` types the result so every server `load`, action, and endpoint sees it:

```ts
interface Locals { user?: User; session?: Session }
```

So a route can gate on `locals.user` without re-fetching the session.

**Auth tables are generated.** `src/lib/server/db/auth.schema.ts` holds the `user`,
`session`, `account`, and `verification` tables that `drizzleAdapter` expects, and
`schema.ts` re-exports them so `drizzle-kit` sees them. Regenerate it (never hand-edit
it) after changing `auth.ts`:

```sh
pnpm --filter @banggai/admin auth:schema
```

The generator loads the config, so with a placeholder `DATABASE_URL` it logs
`Could not validate the database schema. Check your database connection.` and still
writes the file. That message is expected locally.

### Authorization: the `administrators` table

A valid session is **not** enough to use the admin. Every private route asks whether the
signed-in user id has a row in `administrators`:

```ts
// src/lib/server/authz.ts
export type AdministratorLookup = (userId: string) => Promise<boolean>;
export function isAdministrator(
	userId: string | null | undefined,
	lookup?: AdministratorLookup
): Promise<boolean>;
```

It **fails closed**: a missing user id, a revoked administrator, and an unreachable
database all answer `false`, so an outage degrades to "nobody gets in" rather than
"everybody does". The lookup throws only into a `console.error` before denying, because
otherwise a database outage is indistinguishable from a revoked account.

The lookup is a parameter so the decision — including that fail-closed branch — is
testable without a database.

Two things follow from moving this into a table:

- **Grant and revoke are SQL.** `provision` grants it (see below); revoking is
  `delete from administrators where user_id = '…'`, effective on the next request with no
  redeploy. There is no role hierarchy yet: administrator or nothing.
- **Every guarded request reads the database.** That is one extra indexed lookup on a
  primary key. If that ever becomes the bottleneck, cache it per session rather than
  removing the check.

Two distinct refusals, deliberately: no session at all redirects to `/login`, while a
signed-in non-administrator gets `403`. Sending the second case to the login form would
invite them to retry with credentials that will never work.

Phase 0 answered the same question with an `ADMIN_EMAILS` runtime variable. It is gone
from the code, `.env.example`, and this app's `.env`; nothing reads it any more.

### Provisioning the administrator (out of band)

`emailAndPassword.disableSignUp` is **true**, so nothing in the app can create an
account. The first administrator is created by a script instead:

```sh
pnpm --filter @banggai/admin provision -- admin@example.com 'the-password' 'Display Name'
```

It writes the same rows sign-up would — a `user` row plus a `credential` account with
`account_id = user_id` — hashed with better-auth's own `hashPassword`, inside one
`db.batch()` transaction, and it grants administrator membership by inserting the
`administrators` row. Re-running it for an existing email **resets that account's
password** rather than failing, so it doubles as the recovery path when email delivery
is not configured, and it reports whether membership had to be granted. It never echoes
the password.

Creating the user and granting membership are separate facts on purpose: an account can
exist without being an administrator, which is what makes revocation a one-row delete
rather than an account deletion.

Two things about it are deliberate:

- It does **not** call `auth.api.signUpEmail`. The `sveltekitCookies` plugin calls
  `getRequestEvent()` from an after-hook, so every `auth.api.*` helper throws outside a
  SvelteKit request context — including in a script or a unit test. That is also why
  sign-in can only be verified end to end through the app, not from a bare test.
- It drops a lone `--` from `argv`, because `pnpm run <script> -- a b` forwards the
  separator itself.

### Routes and the guard

```text
src/routes/
├── (auth)/login/                  # public: form + sign-in action
├── (dashboard)/+layout.server.ts  # guard: session, then administrators table
├── (dashboard)/+layout.svelte     # shell: header, identity, sign out
├── (dashboard)/dashboard/         # overview placeholder
├── (dashboard)/logout/+server.ts  # POST-only sign-out
└── +page.server.ts                # `/` redirects to /dashboard
```

Because the guard lives in a group layout, it runs on the server for every route in the
group — access control is not a hidden navigation item:

| State | Result |
| --- | --- |
| No session | `302` to `/login?redirectTo=…`, preserving the intended path |
| Session, not an administrator | `403` from the layout load |
| Session, administrator | Shell renders with `data.user` |

`safeRedirectTo()` keeps `redirectTo` to same-origin absolute paths, so a crafted link
cannot bounce a signed-in administrator to another host. Sign-out is a POST endpoint
rather than a page action, so the shell's form works from every route in the group
without each page defining the action.

A non-administrator who authenticates successfully is refused in the login action and
**has its session deleted**. The cookie better-auth just set is on the response, so it is
not in `event.request.headers` and `signOut` cannot see it; deleting the session row
leaves the cookie pointing at nothing, which does not depend on the cookie's name or
prefix. Verified in Chromium: the refused account ends up with zero live sessions and is
still bounced from `/dashboard`.

## Database (Drizzle + Neon)

`src/lib/server/db/index.ts` creates a Neon HTTP client and wraps it with Drizzle,
**lazily** — the client is built on first property access, never at module scope:

```ts
let database: Database | undefined;

function createDatabase(): Database {
	if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
	return drizzle(neon(env.DATABASE_URL), { schema });
}

export const db: Database = new Proxy({} as Database, {
	get(_target, property) {
		const instance = database ?? createDatabase();
		database = instance;
		const value = Reflect.get(instance, property);
		return typeof value === 'function' ? value.bind(instance) : value;
	},
});
```

Laziness is required, not stylistic. `env` comes from `$env/dynamic/private`, which
Cloudflare fills in per request, and `neon()` validates the connection string — so a
module-scope client both reads nothing at runtime and throws during `vite build`'s
post-build analysis.

The Neon **HTTP** driver is the right choice for Workers: it is fetch-based, so no
TCP sockets are needed.

### Migrations

```sh
pnpm --filter @banggai/admin db:generate   # writes drizzle/0000_*.sql — review it
pnpm --filter @banggai/admin db:migrate    # applies it
```

Two traps, both hit for real while wiring this up:

- **drizzle-kit picks Neon's WebSocket driver whenever `@neondatabase/serverless` is
  installed**, whatever the host. That driver is fine for migrations but not for
  pooled connections, which is why `drizzle.config.ts` prefers
  `DATABASE_URL_UNPOOLED`.
- **A quoted URL makes `db:migrate` fail silently** — exit code 1 with nothing but a
  spinner. `neon env pull` writes quoted values, so strip the quotes before using one
  on the command line.

`drizzle-kit` is configured in `drizzle.config.ts` (dialect `postgresql`, schema at
`./src/lib/server/db/schema.ts`, `strict: true`). That file is the single entry point,
so it re-exports the generated auth tables and declares the domain model on top:

```ts
export * from './auth.schema';
```

### Content schema

The design rule is that **columns are what the app queries; JSONB is what it renders.**
`apps/web`'s type modules are the field inventory, so a content item's editorial shape
lives in `draft_payload`/`payload` and the database only guarantees it is a JSON
object — per-kind validation happens in server code before a write. Everything the CMS
lists, sorts, or joins on is a real column.

| Table | Purpose |
| --- | --- |
| `content_entries` | One row per item, in any state. Unique on `(kind, slug)`; `sort_order` and `featured` drive listings; `archived_at` hides without deleting. |
| `content_revisions` | Immutable published snapshots. `(entry_id, revision_number)` is unique; `kind`, `slug`, and `author_email` are denormalised so the public read path needs no join and a byline survives account deletion. |
| `site_settings` | Brand, navigation, footer, social, and the shared editorial blocks (features, testimonials, FAQs, stats, categories), one row per known key — deliberately not a general key/value editor. |
| `media_assets` | `object_key` for R2 uploads, or `external_url` for artwork still on the legacy host. A `check` keeps exactly one populated, so changing media host never means rewriting content rows. `mime_type` is nullable because legacy artwork never recorded one; `media_assets_upload_check` still requires it for uploads. |
| `slug_redirects` | Permanent redirects written when a published slug changes. |
| `administrators` | Who may use the admin, tied to the provisioned better-auth user. Replaced Phase 0's `ADMIN_EMAILS` variable. |

Three decisions worth knowing before editing this file:

- **Status is derived, never stored.** "Draft", "Published", "Published with
  unpublished changes", and "Archived" are computed from `published_revision_id`,
  `draft_updated_at`, and `archived_at`. A stored status column would have to be
  rewritten on every save. Editing and publishing are separate facts: a published page
  stays live while its next edit is still a draft.
- **`content_entries.published_revision_id` has no foreign key.** The two tables
  reference each other, and a real constraint needs a second `ALTER` that `drizzle-kit`
  will not emit from one module. Only the publish path writes that column, and revisions
  are never deleted while their entry lives (deleting an entry cascades), so it cannot
  dangle in practice. `relations()` gives `db.query.*` the same shape without the
  constraint.
- **Publishing is one `db.batch()`.** `drizzle-orm/neon-http`'s
  `session.transaction()` throws `No transactions support in neon-http driver`, while
  `batch()` maps to the Neon client's `transaction([...])`. Insert the revision and move
  the pointer in the same batch. Note that issuing a bare `begin` and later a `rollback`
  as two `sql` template tags is **not** a transaction on this driver — each tag is its
  own HTTP request, so the statements commit immediately. Use `sql.transaction([...])`
  or `db.batch()` when you need atomicity, and clean up manual probe data explicitly
  rather than assuming a rollback.

One migration-time rule that is easy to get wrong: `apps/web`'s homepage picks its
four packages by **array position** (`packages.slice(0, 4)`), not by the `featured`
flag, and the blog index lists posts in authored order. The import has to write array
index into `sort_order` to keep those pages visually identical. `featured` currently
has no consumer on the public site, so switching the homepage to it later is a visible
behaviour change, not a refactor.

Two more decisions, both forced by something that actually failed:

- **The media unique indexes are not partial.** They were written as
  `... where object_key is not null`, which is redundant — Postgres already treats NULLs
  as distinct in a unique index, so any number of external-only rows coexist. The
  `where` clause only broke the content import: a partial index cannot be an
  `ON CONFLICT` target, and `insert … on conflict (external_url) do nothing` failed with
  `42P10 there is no unique or exclusion constraint matching the ON CONFLICT
  specification`. Making them plain indexes keeps the NULL behaviour and restores the
  upsert.
- **`site_settings.value` is typed `unknown`, not an object.** A settings row is
  whatever its key declares — an object for `site`, an array for `faqs`, a string for
  `ctaBackground` — so the shape is resolved per key by `parseSiteSetting()` rather than
  by the column. Content payloads stay `Record<string, unknown>` because they are always
  objects.

Generated files in this area must not be edited by hand: `drizzle/*.sql` and
`drizzle/meta/**` come from `db:generate`, and `drizzle/meta` is excluded from Biome
for that reason (see [10 — Tooling](./10-tooling.md)).

### Content contracts: `packages/content-model`

The shape of a package, destination, or article is declared **once**, in the
framework-agnostic workspace package `@banggai/content-model`:

```ts
// packages/content-model/src/content.ts
export const contentKinds = ['package', 'destination', 'article'] as const;
export const packagePayloadSchema = z.strictObject({ … });
export type PackagePayload = z.infer<typeof packagePayloadSchema>;
export function parsePayload(kind: ContentKind, value: unknown);
```

`apps/web` uses the package as **values**, not just types. Its read layer validates every
payload on the way out of the database with the same `parsePayload`, so the contract the
admin enforced on the way in is checked again on the way out. The components take the
payload types directly as props with nothing in between to drift — but the *rendered*
variants, not the stored ones: `RenderedPackage`, `RenderedDestination` and
`RenderedArticle`, which are the same shapes with each media field resolved to a
`RenderedMedia` (a URL plus the library's alt text) rather than a `media_assets` id. They
are derived from `mediaFieldsByKind` rather than written out, so adding a media field to a
payload cannot be forgotten here, and pointing a component at the stored type instead is a
type error rather than an `<img src="[object Object]">`.

The package also owns `references.ts` — the walker that answers "which fields are
media". Three callers have to agree on it exactly (the one-shot import, the admin's
delete guard, and the public site's swap back to images), and it lives here because that
last caller cannot import from `apps/admin`. Its resolver is generic in what it puts back,
so the import substitutes an id and the site substitutes a whole image through one
traversal.

`apps/admin` imports the schemas as values and validates before every write, through
`src/lib/server/content/validate.ts`:

```ts
assertValidPayload(kind, value);      // throws ContentValidationError with every issue
assertValidSiteSetting(key, value);
formatIssues(scope, issues);          // `package → itinerary.0.title: Too small`
```

The schemas are `strictObject`s, so a **renamed field is a failure, not content that
quietly stops rendering**. That is the property that makes the contract worth having: it
is the difference between a broken page and a validation error.

Watch out for two shapes when writing contracts here:

- **Media values are strings, deliberately permissive.** Two forms already exist in the
  modules: a bare CDN asset id (`media.*`) and an absolute URL (anything already through
  `img()`). `img()` only prepends the CDN base when the value is *not* already absolute,
  so storing the authored value keeps rendering byte-identical instead of baking in one
  width. Phase 2 replaces these with `media_assets` references.
- **Article `date`/`updated`/`readTime` are display strings** (`March 12, 2026`), not ISO
  dates, because that is what the modules contain and the migration has to round-trip.
  Sorting posts by date would need a new column, not a reinterpretation of this one.

### Database roles

```sh
ADMIN_DB_PASSWORD=… WEB_DB_PASSWORD=… pnpm --filter @banggai/admin db:roles
```

| Role | Grant |
| --- | --- |
| `banggai_admin` | `select, insert, update, delete` on all `public` tables — the back-office Worker |
| `banggai_web` | `select` on `content_entries`, `content_revisions`, `media_assets`, `site_settings`, `slug_redirects` — the public Worker |

The app connects as `neondb_owner` today, which can read every session token and
password hash. `banggai_web` deliberately has **no** access to `user`, `account`,
`session`, or `verification`: a read-only role that can read live session tokens is not
least privilege, and the public site has no reason to see them.

Three properties worth keeping:

- **It converges, it does not accumulate.** The script revokes before granting, so
  running it repeatedly cannot widen a role, and it adopts roles that already exist.
  Passwords are optional on later runs; without one, an existing password is left alone.
- **It refuses to create a role without a password.** A password cannot be read back out
  of Postgres, so creating an unusable role would just leave a trap.
- **It verifies itself.** It reconnects as each role and asserts both directions: that
  `banggai_admin` can write, that `banggai_web` can read `content_entries`, and that
  `banggai_web` is *denied* `user`, `session`, and writes. A grant that silently did
  nothing is the failure mode worth catching.

> **Neon roles are per branch.** Creating them on `dev` leaves `Production` untouched —
> verified: `Production` still lists none of them. Create the production roles at deploy
> time, against the production branch.

The script interpolates a password into `alter role … password '…'`, which cannot take a
bind parameter, so it accepts only `[A-Za-z0-9._~!*()-]{16,}` — an alphabet that needs
no quoting. That is a real constraint on the generated value, not a style preference.

### How the static content got here (the one-shot migration)

Recorded because it explains the shape of what is in the tables. **The scripts are gone**
— `apps/web/scripts/export-content.ts` and `apps/admin/scripts/import-content.ts` were
deleted in Phase 6, along with the `migrate:export` and `migrate:import` scripts they ran.

At the time they exchanged a JSON snapshot rather than an import between the two apps:

```sh
pnpm --filter @banggai/web migrate:export   # read the static modules, write ./.migration/
pnpm --filter @banggai/admin migrate:import # validate, seed, reconcile
```

`.migration/` was git-ignored and held one file per kind plus `settings.json`,
`media.json`, and a `snapshot.json` of counts. A directory of that name may still sit in
the repo root on the machine that ran the export; nothing reads it.

- **The export validates as it writes.** Every record goes through the content-model
  schemas, so a contract that no longer matches the live content fails there, at the
  source, with the field named. That is what proves the Phase 1 exit criterion.
- **The import re-validates anyway.** The snapshot is an untrusted file on disk, and the
  import is the process that writes rows.
- **`sortOrder` is the array index.** The homepage's four packages come from
  `packages.slice(0, 4)`, so position is content.
- **It is idempotent on `(kind, slug)` and on each media URL.** A plain re-run is a
  no-op and says so; `-- --replace` refreshes the draft and appends a **new** published
  revision, so history is never rewritten. Verified: two runs of `--replace` leave each
  entry with `revision_number` 1 and 2, `published_revision_id` pointing at the latest,
  and every revision payload equal to the draft.
- **Atomicity is per entry, not per run.** Each entry is one `db.batch()` (entry insert,
  revision insert, pointer move) with client-generated ids, because the HTTP driver has
  no interactive transaction. A run that dies part way leaves the entries it finished,
  correctly published, and reports the rest as still to do.
- **The report is the review artifact:** counts per kind, slugs with their `sortOrder`,
  featured flags, nested-field totals (itinerary days, gallery images, body blocks), the
  media breakdown, and any rows in the database that are *not* in the snapshot — which is
  how a renamed slug shows up instead of hiding.

## The overview

`src/routes/(dashboard)/dashboard/` is the first page an administrator sees, and it answers
three questions without a click: what is published, what changed recently, and is anyone
reading the site.

| Piece | Where |
| --- | --- |
| The screen | `src/routes/(dashboard)/dashboard/+page.svelte` |
| Its loader | `src/routes/(dashboard)/dashboard/+page.server.ts` |
| The counts it renders | `countStatuses` in `src/lib/server/content/service.ts` |

**One read per kind, used twice.** The totals and the recent-edits list come from the same
`listEntries` call, because the counts are derived from the rows rather than requested
separately — `countStatuses` is the same rule the list screen's filter tabs use, and
`statusLabels` is the same label map, so "Published — unpublished changes" cannot mean one
thing on the overview and another in the list. Asking `countByStatus` as well would read
every entry a second time to produce a number already in memory.

**Analytics is read here too, and quietly.** Thirty days is the window this screen is for,
and `loadAnalyticsView` is the one place that knows how to read Workers Analytics Engine, so
the overview borrows it rather than growing a second, smaller query path needing its own
tests. It costs five read queries per visit against a documented allowance of 10,000 a day,
and an unconfigured or failing analytics backend is rendered as a line of text with a link —
not as an alarm. An unconfigured dashboard should not be the first thing that greets a
sign-in.

Archived entries stay in the recent list: an administrator who archived something yesterday
wants to see that they did.

## Site settings

The thirteen shared values — brand block, navigation, footer links, features, testimonials,
stats, vision/mission, contact cards, FAQs, blog categories, and the CTA banner image — are
edited at `src/routes/(dashboard)/settings/` and written to `site_settings`.

| Piece | Where |
| --- | --- |
| The index (grouped, one card per key) | `src/routes/(dashboard)/settings/+page.svelte` |
| One setting's form and save action | `src/routes/(dashboard)/settings/[key]/+page.server.ts` |
| Reads and the validating write | `src/lib/server/settings/service.ts` |
| The specs for all thirteen keys | `src/lib/content/forms.ts` (`settingSpecs`) |

**Saving is the gate, unlike content.** `site_settings` has one row per key, the public site
reads it directly, and there is no draft or revision to publish — so `saveSetting` validates
against the contract *before* it writes and refuses with the offending paths named
(`site_settings.site → name: …`). There is deliberately no "save anyway": that check is the
only thing between a malformed JSONB value and the marketing site. It is also not a general
key/value editor, so an unknown key cannot reach the table.

**One root field per key.** A setting's stored value *is* the value of a single root field
named after its key, which is what lets the same renderer, parser and path helpers serve both
a content payload and a setting — `readField` on the root spec is the whole parser. The read
side wraps (`settingFormValues`) and the write side unwraps (`parseSettingForm`), and the two
live next to each other because a mismatch is invisible until a form opens blank. `settingSpecs`
is typed by `SiteSettingKey`, so adding a key to `@banggai/content-model` fails `svelte-check`
until a spec exists; `forms.spec.ts` covers the keys that no type can: the index groups and the
per-key notes.

**A failed save keeps the submission.** A refusal re-renders what was typed rather than the
stored value. Content can afford to reload the draft, but a setting is one long-lived value,
so silently discarding a refused edit is the worst outcome this screen has.

**Media references are guarded.** `testimonials[].avatar` and `ctaBackground` are the two keys
holding an image id, and the media library's delete guard walks settings as well as content.
Only those two keys load the 300-option picker.

## Media (R2 and the media library)

The media library is **finished end to end**: upload, metadata, alt text, browsing, and
reference-aware deletion, all behind the dashboard guard. So are the content editors and the
settings screen above.

| Piece | Where |
| --- | --- |
| The library UI | `src/routes/(dashboard)/media/+page.svelte` |
| Load + actions (`upload`, `alt`, `archive`, `restore`, `promote`, `delete`) | `src/routes/(dashboard)/media/+page.server.ts` |
| Serving an object from R2 | `src/routes/media/[key]/+server.ts` |
| Copying legacy bytes into the bucket | `src/lib/server/media/promote.ts` |
| Queries, filters, and the deletion guard | `src/lib/server/media/library.ts` |
| Byte validation and dimension reading | `src/lib/server/media/validate.ts` |
| Object keys and public URLs | `src/lib/server/media/keys.ts` |
| Finding media inside content | `src/lib/server/media/references.ts` |
| Validating, storing, and rolling back an upload | `src/lib/server/media/upload.ts` |

### The bucket

The bucket is `banggaiescape-media`, bound as `R2_MEDIA`, and it is read through the
custom domain **`media.banggaiescape.com`** (a custom domain set on the bucket, not a
route on any Worker). Public access via the `r2.dev` URL stays **disabled** — it is
rate-limited and not a production hostname. Verified, not assumed: an object PUT with
`wrangler r2 object put --remote` is served from that hostname with a valid certificate
and a 200.

### Upload validation

`validateUpload()` is pure — bytes in, decision out — so the rules are unit-tested and the
route handler is left with only I/O. Accepted: **JPEG, PNG, WebP, AVIF**, up to **10 MiB**.

- The type is decided by the file's **magic bytes**, never by its name or its declared
  `Content-Type`. A declared type that contradicts the bytes is refused.
- **SVG is deliberately absent.** It is active content, and serving a user-uploaded SVG
  from a public media host is an XSS vector.
- Dimensions are read from the header. AVIF reports `null` rather than a guess: a missing
  dimension displays as "unknown", a wrong one misleads.
- A row with an `objectKey` must have a `mimeType` (`media_assets_upload_check`), so an
  upload can never be stored with no recorded type.

### Object keys and URLs

A key is `<uuid>.<extension>`, so keys are **immutable**: replacing an image means a new
row and a new object, never overwriting bytes a live page is already pointing at. A
cached response can therefore never go stale, and an upload can never collide.

`publicMediaUrl()` resolves a row to a URL with two deliberate behaviours:

1. A row with an `externalUrl` keeps it **untouched**. Those bytes live on someone else's
   CDN, and rewriting the URL now would break them.
2. A row with an `objectKey` uses `MEDIA_PUBLIC_URL` when it is set, and this app's own
   `/media/<key>` route when it is not. The `r2.dev` URL is never used.

### Serving an upload

The `/media/<key>` route exists for two reasons:

- **Local development.** `wrangler dev` gets a *simulated* bucket, which no public
  hostname can reach, so this route is the only way a freshly uploaded image renders
  locally. That is why the committed `.dev.vars.example` sets `MEDIA_PUBLIC_URL=""`: the
  production hostname would be a lie about a local object.
- **A fallback.** If the bucket ever loses its custom domain, the app still works — it
  just pays to stream the bytes through the Worker.

It is **not an authorization boundary.** An R2 custom domain serves every object in the
bucket regardless of this route, so **hiding an asset is not a security control — only
deleting it is.** The route checks the key's shape and refuses an archived row, which is
all it honestly can do.

### Bringing the legacy artwork into the bucket

The content import seeded one row per image the old site referenced, but 29 of them point at
a design-tool CDN (`external_url`) that this project neither controls nor can keep paying
for. "Copy to R2", on a legacy card or as one bulk action, fetches those bytes, validates
them exactly as an upload is validated, writes them to the bucket, and repoints the row.

**The row id never changes**, which is the whole reason this is safe: every published
revision and site setting references an asset by id, so promotion is invisible to every
payload and only the URL it resolves to moves. `customMetadata.promotedFrom` on the object
records where it came from, because `media_assets` permits a key *or* a URL but not both.

It is idempotent and resumable: a row is eligible only while it has an `external_url` and
no `object_key`, so a promoted row is skipped and a batch that dies part way leaves the rest
to the next run. The URL is re-checked after redirects (https only, no address literals, no
internal hostname) — the *server* is the one fetching it, which is the shape of an SSRF bug.

> **Run it where the bucket is real.** `vite dev` and `wrangler dev` both bind a
> **simulated** bucket, so promoting from a local dev server rewrites the rows to keys that
> only that process can read and the deployed site can never serve. The page says so when it
> sees it (no `MEDIA_PUBLIC_URL`, or `dev`), and
> [12-troubleshooting](./12-troubleshooting.md#promoted-media-404s-from-the-media-domain)
> has the repair.

### Deleting is deliberately hard

An asset any content still points at is **never** removed. `findReferences()` looks in
three places, because a reference can hide in any of them:

- every entry's current `draft_payload`;
- **every** `content_revisions` payload, including superseded ones — restoring an old
  revision must not yield a broken image;
- every `site_settings` value, including a setting like `ctaBackground` whose whole value
  is the reference.

The refusal **names where it is used** (`package:island-hopping (draft)`), which is the
difference between a refusal an administrator can act on and one that looks like a bug.

What each action actually does:

| Action | Effect | Reversible |
| --- | --- | --- |
| **Hide** (`archived_at`) | Leaves the library and stops being served by `/media/<key>`. The row and any references survive | Yes |
| **Delete** | Guard first, then remove the R2 object, then the row. A legacy `externalUrl` row is only removed — there are no bytes here to delete | **No** |

The ordering matters: deleting the object first and the row second means a failed object
deletion leaves a retryable state, whereas the reverse would strand an object nothing can
find again. If the row insert fails after a successful PUT, `storeUpload()` deletes the
object it just wrote.

### Managing the bucket from the CLI

`CLOUDFLARE_API_TOKEN` in `.env` (not `.dev.vars` — see the table above) lets these run
without an interactive login. Bucket management needs `Workers R2 Storage → Edit`;
`wrangler whoami` additionally wants `Account Settings → Read`; a custom domain needs
`Zone → Zone → Read` for the zone id and `DNS → Edit` for the record.

The bucket must exist. Create it once with
`pnpm --filter @banggai/admin exec wrangler r2 bucket create banggaiescape-media`, and attach the
domain with:

```sh
pnpm --filter @banggai/admin exec wrangler r2 bucket domain add banggaiescape-media \
  --domain media.banggaiescape.com --zone-id <zone-id> --min-tls 1.2
```

## Analytics (Cloudflare Workers Analytics Engine)

`/analytics` answers four questions: how many page views, per day and per page; which
package, destination and article pages were read; and how often the tracked calls to action
were clicked. It reads **Workers Analytics Engine (WAE)**, which is not Neon — there is no
SQL adapter for it — so it has its own credential, its own client and its own failure modes.

**It counts page views, not people, and says so.** Nothing in the pipeline records an IP
address, a user agent, a cookie, a referrer, a query string or any identifier. There is no
visitor id, so a "unique visitors" card is not a number this system can produce, and the
page avoids the word rather than inventing one.

### The write path (public site)

The vocabulary — event names, ranges, the dataset name, the column layout — lives in
`packages/content-model/src/analytics.ts`, because both apps need it and neither may import
the other. One data point is:

| Column | Holds |
| --- | --- |
| `index1` | the event name — the sampling key |
| `blob1` | the event name |
| `blob2` | the path, with no query string |
| `blob3` | `package` \| `destination` \| `article`, or `''` |
| `blob4` | the content slug, or `''` |

- **The browser posts to `/api/events`; the Worker writes the point.** `$lib/analytics` in
  the public site sends `{ event, path }`, and `src/lib/server/analytics.ts` calls
  `writeDataPoint()`. Writing server-side means an ad blocker that never loads our script
  cannot hide a page view, and the browser never holds anything that could write to the
  dataset directly.
- **Four events, three names.** `page_view`, `booking_cta_click` and `contact_click`.
  There is deliberately no `package_view`: a package page view *is* a page view, and the
  kind is a dimension of it (`blob3`), so the same visit is never counted twice. The kind
  and slug are **derived on the server** from the path, so a caller has no dimension to lie
  about.
- **The endpoint is public and narrow rather than secret.** POST only (which is also why no
  `OPTIONS` is implemented — a cross-origin JSON POST cannot be sent without a preflight),
  a same-origin check on `Sec-Fetch-Site` with `Origin` as fallback, a strict two-field
  schema that refuses an invented key, and a 1 KB body cap. A path that could carry an email
  address, a token or free prose is refused. Every refusal is a bare status code, and the
  client ignores the response, so analytics can never surface as an error to a visitor.
- **Page views come from `afterNavigate`**, once per real navigation, and never from a
  prefetch or a `__data.json` refetch. A 404 is not counted; `data-track` clicks are
  collected by one delegated listener on the window.
- **Fail open, always.** A missing binding, an exhausted allowance or a runtime refusal is
  logged and swallowed — `recordEvent()` does not await and never throws — so the failure
  mode is a flat chart, not a broken page. Under `vite dev` there is no binding and the
  write is a silent no-op.

`index1` is the event name on purpose: Analytics Engine samples per index *value*, so the
high-volume event absorbs the sampling while the rare clicks stay exact for far longer.

### The read path (admin)

`src/lib/server/analytics/` is imported only by the page's loader:

| File | Does |
| --- | --- |
| `client.ts` | Resolves `CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_ANALYTICS_TOKEN` per call, and posts one statement to the SQL API |
| `queries.ts` | Builds the five fixed aggregate statements and maps their rows |
| `service.ts` | Runs them together (`Promise.all`) and assembles the summary |

- **Five aggregates, one page load.** Totals per event, page views per day, top pages, top
  content and CTA clicks — all at once, never one query per chart point and never a poll.
  Refreshing is a button that calls `invalidateAll()`, so a dashboard left open overnight
  costs nothing. Free Workers allow 10,000 read queries/day, so a page load is 5 of them.
- **Every count is `SUM(_sample_interval)`.** A sampled row stands for many original rows,
  so a bare `COUNT()` under-reports. The consequence is stated on the page: a busy day is an
  estimate, not an exact figure.
- **The SQL API takes no bind parameters**, so the rule is that no request value ever
  reaches a query string. The only varying part is the date range, and it varies as a
  number that `parseAnalyticsRange()` has already forced onto `7 | 30 | 90`; everything else
  is a literal. There is no "run this SQL" surface anywhere in the admin.
- **The API renders every value as a string, and can return `null`.** Rows are coerced, and
  a count that cannot be read **throws** rather than rendering as a zero — a zero is a fact,
  and a dashboard that mixes the two is one nobody can trust.
- **Three states, all first-class:** `unconfigured` (no credential), `error` (Cloudflare
  said no), and `ready`. An *empty window* is `ready`, because "no traffic in the last seven
  days" is a fact and not a failure. Days with no events are filled in as explicit zeros, so
  the chart's x-axis is continuous — three bars for three days a week apart would otherwise
  draw as evenly spaced activity.
- **The daily series has a text alternative.** The same numbers are rendered in a
  screen-reader-only table, so the chart is not the only way to read them.

WAE keeps **three months** of data, which is why `90` is the longest range offered — a wider
one would only draw empty days and read as an outage.

### Configuring it

| Setting | Where | Notes |
| --- | --- | --- |
| `ANALYTICS` | `apps/web/wrangler.jsonc` binding | `BANGGAI_SITE_EVENTS`. Cloudflare creates the dataset on the first write, so this is the only place its name is declared — renaming it starts a second, empty table |
| `CLOUDFLARE_ACCOUNT_ID` | `apps/admin/wrangler.jsonc` `vars`, or `.env` locally | An identifier, not a credential |
| `CLOUDFLARE_ANALYTICS_TOKEN` | `wrangler secret put`, or `.env` locally | Read-only: **Account → Account Analytics → Read**, scoped to the account. Server-only |

```sh
pnpm --filter @banggai/admin exec wrangler secret put CLOUDFLARE_ANALYTICS_TOKEN
```

Until both are present the dashboard renders its instructions instead of failing, naming
the variables that are missing — including the half-configured case, which is the likelier
slip. Until the public Worker is deployed and writing there is nothing to show even with a
working token.

### What is verified, and what is not

The whole write path was driven end to end against the built Worker under workerd: a real
browser produced seven `POST /api/events → 204` through the guards, with the dataset binding
in place. `pnpm --filter @banggai/admin test` covers the vocabulary, the SQL shape and the
client. What **cannot** be verified from a laptop is the read path against the live SQL API,
because neither Worker is deployed and no token exists yet: the dashboard has been exercised
in its `unconfigured` state and through those unit tests, not against real aggregate data.

## Scripts

The package is **`@banggai/admin`**, and the four common ones have root shortcuts —
`pnpm admin:dev`, `admin:build`, `admin:check`, `admin:test`:

| Command | Does |
| --- | --- |
| `pnpm --filter @banggai/admin dev` | Vite dev server |
| `pnpm --filter @banggai/admin build` | `vite build` |
| `pnpm --filter @banggai/admin preview` | `wrangler dev .svelte-kit/cloudflare/_worker.js --port 4173` |
| `pnpm --filter @banggai/admin check` | `svelte-kit sync && svelte-check` |
| `pnpm --filter @banggai/admin test` | `vitest --run` (unit + contract tests) |
| `pnpm --filter @banggai/admin test:unit` | `vitest` (watch) |
| `pnpm --filter @banggai/admin test:e2e` | `playwright test` — the browser checks; needs a dev server, a database, and credentials |
| `pnpm --filter @banggai/admin gen` | `wrangler types --env-file .env.types` |
| `pnpm --filter @banggai/admin db:push` | `drizzle-kit push` |
| `pnpm --filter @banggai/admin db:generate` | `drizzle-kit generate` (migration SQL) |
| `pnpm --filter @banggai/admin db:migrate` | `drizzle-kit migrate` |
| `pnpm --filter @banggai/admin db:studio` | `drizzle-kit studio` |
| `pnpm --filter @banggai/admin auth:schema` | Regenerate `auth.schema.ts` from `auth.ts` |
| `pnpm --filter @banggai/admin provision` | Create/reset the administrator and grant membership: `-- <email> <password> ['Name']` |
| `pnpm --filter @banggai/admin db:roles` | Create/converge `banggai_admin` and `banggai_web`, then verify the grants |

> **Neither script gates on `wrangler types --check`.** The scaffold's `build` and
> `check` both started with it, but that check is state-dependent: once a build leaves
> `.svelte-kit/cloudflare` behind, it reports the committed types as "out of date",
> and satisfying it with `pnpm gen` writes the build-coupled shape — measured here at
> **4986 `svelte-check` errors** from `.svelte-kit/cloudflare/_worker.js`. Both scripts
> now mirror `apps/web`; regeneration stays explicit. See the
> [wrangler trap](./12-troubleshooting.md#the-wrangler-types--svelte-check-trap).

> **Root `dev`, `build`, `check` and `preview` stay pointed at `@banggai/web`**, because
> that is what CI and the public deploy gate on. The admin is reached through its own
> package or the `admin:` shortcuts above.

## Testing

`apps/admin` is the **only** app with a test runner.

- Two Vitest projects (browser/server) are defined in `vite.config.ts`, as above.
- `test.expect.requireAssertions: true` means every test must assert something.
- `src/lib/server/authz.spec.ts` covers the administrator decision and the redirect
  sanitiser in the Node project, stubbing `$lib/server/db` so importing the module cannot
  touch the environment or Neon. The lookup is injected, so the fail-closed branch is
  covered without a database.
- `src/lib/server/media/validate.spec.ts` covers the upload rules. Its fixtures build
  **real** PNG, JPEG, WebP, and AVIF headers rather than committing binary blobs — which
  is how the WebP signature bug (a `RIFF` form type read from the wrong offset, so every
  real WebP was rejected) was caught.
- `src/lib/server/media/references.spec.ts` covers the walker both admin callers share,
  including that rewriting never mutates its input and never blanks a value it cannot
  resolve.
- `src/lib/server/media/library.spec.ts` covers the deletion guard through the pure
  `referencesIn`: published vs. superseded revisions, settings that hold the reference at
  the root, and that an unknown content kind throws rather than reporting "not
  referenced" and letting a delete through.
- `src/lib/server/media/keys.spec.ts` covers key generation (including that an extension
  reaching a URL cannot carry path separators) and the URL resolution rules above.
- `src/lib/content/forms.spec.ts` covers the form model's invariants: that the three
  settings structures (specs, index groups, notes) all cover the contract's keys exactly
  once, that a `rows`/`list` submission parses back into a value its contract accepts, that
  a blank optional field becomes absent rather than empty, and that removing every row
  yields an empty array. It also pins the wrap the settings read path depends on — handing
  the walker an unwrapped value opens a form with one row however many are stored.
- `src/lib/server/content/validate.spec.ts` covers the content contracts: that each kind
  is accepted as the migrated content is stored, and that a renamed field, a missing
  required field, an empty required collection, a value outside a union, and an unknown
  article block kind are all refused by name.
- `src/lib/components/content/field-control.svelte.spec.ts` covers the one component with
  real branching in it, in the **`client`** project (real Chromium, real DOM): that each of
  the ten field types renders the control the contract expects, that an absent value becomes
  empty rather than `"undefined"`, that a `slug` field carries the pattern that matches
  `slugSchema`, that a media field holding an id the library no longer has **says so**
  instead of rendering a broken image, and that a repeatable field posts a `__count` its own
  rows agree with. `svelte-check` can confirm every branch typechecks and nothing more.
- `src/lib/server/content/service.spec.ts` covers **publish atomicity**, which is the one
  property in this app that a browser check cannot see and a happy-path test cannot catch.
  Its fake models the driver: `batch()` commits all of its statements or none, and a write
  awaited on its own commits at once. So the tests assert that a failure at statement two
  *or* three leaves nothing committed, that the entry's pointer names the revision the same
  batch inserted, that a same-slug publish batches two statements, and that an invalid draft
  or an archived entry is refused before the database is touched at all. Verified by
  replacing the batch with three ordinary awaits: four of the eight fail, and the diagnostic
  shows the revision row **committed** while the publish reports no error — the half-written
  publish the contract exists to prevent.
- `apps/web` is the app with no browser runner, so the shared media walker's spec lives here:
  the same file also asserts that resolving a reference to a rendered **image** (a URL plus
  the library's description) touches exactly the fields `mediaFieldsByKind` declares. That
  guards the derivation behind `RenderedPayloadFor`, which is a type nothing executes.
- The scaffold's `src/lib/vitest-examples/` demos (a unit test and a component test)
  were removed — they tested the generator, not this app.
- `src/lib/server/media/promote.spec.ts` covers the legacy-artwork copy: that a row whose
  bytes are already in the bucket is skipped, that one dead host does not abandon the batch,
  that bytes which are not an accepted image never reach the bucket, that the object is
  deleted again if the row update fails, and that a redirect is re-checked. Its fetch stub
  is duck-typed rather than a real `Response`, because a constructed `Response` has an empty
  `url` — and the module re-checks the final URL after redirects.
- `src/lib/server/analytics/vocabulary.spec.ts` covers the shared analytics contract from
  the app that consumes it: that a range is coerced onto the three offered values, that a
  detail path maps to a kind and slug while a listing path does not, that the event parser
  refuses an unknown name, an invented dimension and a personal-looking path — including
  `//evil.example`, which a browser reads as another host — and that a data point carries
  exactly one index, because Analytics Engine drops a point with two.
- `src/lib/server/analytics/queries.spec.ts` pins the shape of every query: the shared
  dataset, `SUM(_sample_interval)` and never `COUNT(`, the window, the ranking filters, and
  that the only varying part of a statement is a number already forced onto an allowlist.
  A hostile `?range=` is interpolated to prove it cannot reach the SQL. The row mappers are
  covered too, including that an unreadable count throws instead of rendering as a zero.
- `src/lib/server/analytics/client.spec.ts` covers the SQL API client and the dashboard
  assembly against a stubbed `fetch`: the endpoint and bearer token a query uses, how each
  failure is reported (a refused credential named as a permission, no token echoed into a
  message a page will render), and both configured outcomes. The unconfigured state is
  asserted to make **no** request at all.
- Tests run in **both** projects. The `server` project holds everything above; the
  `client` project holds the one component spec, which renders in real Chromium. Chromium
  **is** installed here
  (`pnpm --filter @banggai/admin exec playwright install --with-deps chromium`), so the
  project launches rather than failing on a missing browser.

### Browser checks (`test:e2e`)

`playwright.config.ts` and `e2e/*.spec.ts` drive a real Chromium against `vite dev` and a
real database. They are **not** part of `pnpm test`: they need a running server and an
administrator, so each signed-in spec is skipped without `ADMIN_EMAIL`/`ADMIN_PASSWORD`
rather than failed, and the anonymous ones still run.

```sh
ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=… pnpm --filter @banggai/admin test:e2e
E2E_WRITE=1 …                                     # also run the one check that saves
```

| File | Covers |
| --- | --- |
| `auth.spec.ts` | The guard redirects an anonymous visitor and preserves where they were going; signing in reaches the shell |
| `shell.spec.ts` | Every sidebar destination answers 200; the theme toggle flips light↔dark with **no reload** and the choice survives one |
| `content.spec.ts` | Each kind's list opens with all five status filters; a search narrows it; a published item shows its publish controls, revision history and draft preview; an unknown slug and an unknown kind 404; the new screen has no publish control; a non-URL-safe slug is refused and creates nothing; and the write round trip — create, save a draft with a slug and nothing else, be **refused** a publish with the field named, then delete it again |
| `settings.spec.ts` | The index links all thirteen keys once and groups them, every form opens, an unknown key 404s, the header and sidebar agree, the form opens with every stored row, and an invalid value is refused without writing |
| `media.spec.ts` | The filters answer, an unknown key 404s, the cards offer both actions, and a non-image upload is refused before anything is stored |

The content list's status filters carry `aria-current` on the active one. They did not at
first: the active filter was marked by colour alone, which is invisible to a screen reader
and to anyone who cannot tell the two shades apart. `svelte-check` does not report it —
there is no rule for a missing attribute — so it turned up when a browser check asserted
the state, which is the argument for having those checks.

Three behaviours shape how these are written, and each one cost real debugging time:
`resolve()` emits a **relative** href during SSR and an absolute one after hydration, so
nothing matches on `href^="/…"`; a click that lands before hydration is handled by the
browser rather than the client router, so clicking is retried until its effect is
observable; and a field filled before hydration has its value restored from the
server-rendered attribute, which silently leaves the *old* value in place and makes the save
that follows prove nothing. `e2e/helpers.ts` holds the three helpers, each with the reason
it exists.

Do not run the build while the dev server is up: both write `.svelte-kit`, and a build
underneath a running server makes the next check fail in a way that looks like a bug in the
app.

**Nothing in the suite can destroy data.** Deletion is never clicked — an unreferenced
asset would really be removed and its bytes cannot be put back — and the only write, the
FAQ round trip, restores what it touched and is opt-in behind `E2E_WRITE`. What the suite
does prove is the class of bug that `svelte-check` cannot see: in Phase 3 both content forms
posted to a `default` action the routes did not define, so "Save draft" returned 404 — found
only by driving a browser, and the reason this suite is committed instead of thrown away.
- `src/lib/server/**` is excluded from the browser project on purpose: server code
  must not be exercised in a browser context.

## Design system: **not** the Banggai brand system

This is the most important divergence for anyone expecting the admin to look like the
marketing site.

- `layout.css` defines the **shadcn-svelte neutral theme** in OKLCH (`--background`,
  `--primary`, `--sidebar`, `--chart-*`, `--radius`), with light and `.dark` variants,
  and maps them to Tailwind utilities through `@theme inline`.
- The font is **Geist Variable**, not Plus Jakarta Sans.
- There is **no** forest/gold/warm-sand token, no `DESIGN.md` colour, and no shared
  component with `apps/web`.

The earlier placeholder README (before the scaffold replaced it) said the admin
should reuse `DESIGN.md`'s tokens. **That decision is currently unresolved** — the
scaffold ships the shadcn neutral theme. Options:

1. **Keep shadcn neutrals** and accept that the admin is an internal tool that does
   not need brand fidelity (simplest, and defensible — shadcn components assume these
   tokens).
2. **Re-theme to the brand** by overriding the shadcn tokens (`--primary`, `--ring`,
   `--sidebar-*`) with the forest/gold values from `DESIGN.md` rather than replacing
   the token names — this keeps shadcn components working while making the app feel
   like Banggai Escape.

Option 2 is the smaller change and is what `DESIGN.md` implies; whichever is chosen,
record it in `DESIGN.md` so both apps agree.

**Light/dark mode is real — and it is light/dark only.** `<ModeWatcher defaultMode="light" />`
sits in `src/routes/+layout.svelte` and injects the pre-paint script that applies the stored
class before the first frame, so a dark-mode administrator never sees a white flash. The
header's toggle calls `toggleMode()` from `mode-watcher`, which is a strict light↔dark flip:
`system` is never a reachable state, which is why `defaultMode` is set explicitly rather
than left to the OS.

Which icon shows is decided by **CSS**, from the `dark` class on `<html>` — not by state.
The server cannot know the visitor's preference, so rendering the icon from state would
flash the wrong one and mismatch on hydration. Both icons are always in the DOM and the
inactive one is scaled away, which is also what gives the switch its rotation. The toggle
introduces no new tokens: it is built from the same shadcn neutrals as everything else.

## Gaps and next steps

Ordered roughly by dependency:

Phases 0–5 are complete in code. The three Phase 3 loose ends are done: the package is
`@banggai/admin` with root shortcuts, the browser checks are committed (`test:e2e`), and all
29 legacy images were copied into the bucket (verified served from the custom domain with
byte-identical content). The publish contract is covered by a unit test as well — see
[Testing](#testing) for what the fake driver models and why it was verified by breaking the
service. Phase 4 has landed as well — the public site renders from Neon, its
read layer resolves stored `media_assets` ids through the web-side equivalent of
`publicMediaUrl`, slug renames 301 to the new URL, and pages are served from a five-minute
edge cache. Its one visitor-facing gap — the media library's alt text never reaching an
`alt` attribute — is closed: a resolved media field is now a `RenderedMedia` carrying the
description as well as the URL, documented in
[08-content-data-layer](./08-content-data-layer.md#mediats--ids-to-images). Phase 5 has
landed too: the public Worker records validated page views and
clicks, and the admin reads them back from Cloudflare's SQL API. The database no longer
references the design-tool host; only the site's page-decoration images still come from the
AIDA CDN. **Both Workers are deployed** — `admin.banggaiescape.com` and
`banggaiescape.com`, each on its own custom domain, which `wrangler deploy` created the DNS
records for — and both read the **production** Neon branch, the public one as the read-only
`banggai_web` role. The dashboard has still never been seen against real aggregates, because
its read token is the one setting that could not be created from here.

1. **Component tests: started, not finished.** The `client` Vitest project now holds one
   spec — `FieldControl`, the form renderer, which is where the branching is. The screens
   themselves (the overview's three states, the list's empty and filtered states, the publish
   panel) are covered only by the browser checks, which is a reasonable place to stop, but
   a second component spec would confirm the project is usable for whoever comes next.
2. **The analytics read token.** Everything else is deployed. The dashboard needs
   `CLOUDFLARE_ANALYTICS_TOKEN` — Account → Account Analytics → Read — and it cannot be
   minted from the token this repository holds, which lacks token-write permission. Until
   it is set the dashboard shows its "Not configured yet" card, which names the setting and
   the scope. The write path needs nothing: the deployed public Worker already created the
   dataset. See
   [11-deployment](./11-deployment.md#analytics-the-one-thing-left).
3. **There is no staging environment.** The `dev` Neon branch is where the work was
   rehearsed, and it still holds a copy of the content; the deployed Workers read
   `production`. A staging branch with its own Workers is the remaining part of Phase 6 and
   is not built.
3. **Analytics — Cloudflare Workers Analytics Engine. Built.** The write path is live in
   the public Worker and the dashboard reads it in the admin; see
   [Analytics](#analytics-cloudflare-workers-analytics-engine) for what is wired and what
   only a deploy can prove. The decision it implements is unchanged: the administrator
   asked for a Cloudflare analytics option with a free tier, so WAE writes validated
   page/content/CTA events from the public Worker and the admin queries aggregates from its
   server. Cloudflare's published pricing for Workers Free lists 100,000 data points
   written/day and 10,000 SQL read queries/day, and documents three-month retention; it also
   notes that billing is not yet active while the pricing is forward-looking, so reconfirm
   the account's terms before release. Cloudflare Web Analytics remains an optional free
   RUM/performance dashboard, but it supports no custom events and is not the source for the
   in-admin content analytics view. See the full data model, limits, privacy notes,
   implementation plan, and official references in
   [15 — Admin Dashboard Plan](./15-admin-dashboard-plan.md#analytics-decision-cloudflare-workers-analytics-engine).

## Deployment

`apps/admin` builds to its own Worker and deploys independently of the site:

```sh
pnpm --filter @banggai/admin build
pnpm --filter @banggai/admin exec wrangler deploy
```

Set secrets with `wrangler secret put DATABASE_URL` / `BETTER_AUTH_SECRET` / `ORIGIN` /
`CLOUDFLARE_ANALYTICS_TOKEN` before the first deploy — the app throws on the first database call without
`DATABASE_URL`, so a misconfigured deploy fails as soon as it serves a request (which
is the desired fail-fast behaviour, but means a missing secret shows up as a runtime
error in the logs rather than at deploy time).

Two things are **not** secrets and must not be set with `wrangler secret put`:

- **`R2_MEDIA`** — a binding, already declared in `wrangler.jsonc`. The bucket must exist
  in the same account before the first deploy, or the deploy fails.
- **`MEDIA_PUBLIC_URL`** — the `vars` entry in `wrangler.jsonc`. There is no local
  `.dev.vars` override in production, so the deployed Worker uses the custom domain.

The media custom domain (`media.banggaiescape.com`) is attached to the **bucket**, not to
the Worker, so it keeps working across deploys and if the Worker is never deployed at all.

## Related

- [02-architecture](./02-architecture.md) — the workspace and why the two apps are shaped this way.
- [03-project-structure](./03-project-structure.md) — where files live in both apps.
- [10-tooling](./10-tooling.md) — Biome, Vitest, and the shared config.
- [11-deployment](./11-deployment.md) — Cloudflare deployment for both Workers.
- [12-troubleshooting](./12-troubleshooting.md) — the wrangler trap, applied to admin.
- [`../DESIGN.md`](../DESIGN.md) — the brand system the admin may or may not adopt.
