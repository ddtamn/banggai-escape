# 15 — Admin Dashboard Implementation Plan

**Scope:** the planned administrator experience in `apps/admin`, the content and
analytics data flows it depends on, and the changes required to make `apps/web` read
published content from Neon. This is a plan, not a description of implemented
features. Current scaffold details remain in [14 — The Admin App](./14-admin-app.md).

## Outcome and decisions

Deliver a simple, responsive back-office where the administrator can maintain
packages, destinations, articles, media, and public site information; preview and
publish changes; and review privacy-conscious site analytics. Preserve public URLs,
SEO metadata, and the site's existing design. Deploy the admin and public site as
separate Cloudflare Workers.

| Decision | Plan |
| --- | --- |
| Content source of truth | **Neon Postgres.** The admin writes content; `apps/web` reads only published content. Publishing must not require a code change or redeploy. |
| Initial access model | **One administrator.** No public registration. Provision the first account through a controlled setup step and allowlist it. Keep the design extensible, but defer editor/publisher role management. |
| Analytics | **Cloudflare Workers Analytics Engine (WAE)** for page-view and content-event data queried by the admin. Use the Cloudflare Workers Free allowance and enforce usage/refresh limits. Do not add a paid analytics vendor. |
| Media storage | **Cloudflare R2.** Publicly readable published assets use a dedicated media hostname; only authenticated admin operations can upload or remove objects. |
| UI foundation | The requested shadcn-svelte preset **`b3XpoFP7kQ`** and dashboard block **`dashboard-01`**, adapted for Banggai Escape's CMS tasks. Keep the admin's system separate from `apps/web`'s marketing design tokens. |
| App boundary | No imports from one app into another. If both apps need shared content types, put only framework-agnostic types/helpers in a deliberate workspace package such as `packages/content-model`. |

### Resolved implementation decisions

Four choices this plan originally left open are now settled. Each was checked against
the installed dependencies rather than assumed.

**Validation library — Zod v4, as a direct dependency of `apps/admin`.** The schemas
live in `packages/content-model`, so both apps share one definition and the TypeScript
types come from `z.infer` instead of being written twice. `zod@4.6.5` is already in the
dependency tree (better-auth's `better-call` depends on it), so declaring it adds no new
package. `apps/web` imports **types only** (`import type { … }`), which is erased at build
time, so the public bundle does not grow. One library then covers all three needs:
typed-per-kind payload validation, form/action input, and the analytics query allowlist.
No form library (Superforms or similar) is added in the MVP.

**Publish atomicity — `db.batch([...])`, never `db.transaction()`.** Verified in the
installed `drizzle-orm/neon-http`: `session.transaction()` throws
`No transactions support in neon-http driver`, while `batch()` forwards to the Neon
client's `transaction([...])`, which executes the statements as one transaction in a
single HTTP round trip. A publish therefore writes the revision and moves the published
pointer inside one `batch()` call. The better-auth adapter stays on its default
`transaction: false` for the same reason.

**Content migration artifact — two one-shot scripts exchanging a JSON snapshot.**
`apps/web/scripts/export-content.ts` reads the typed modules (`packages`, `destinations`,
`posts`, `site`, `content`) and writes one JSON file per kind into a git-ignored
`.migration/` directory, converting media through `img()` and never touching the
generated `media.ts`. `apps/admin/scripts/import-content.ts` reads those files, validates
every record against the content-model schemas, seeds `content_entries` with a published
`content_revisions` row plus `media_assets` entries, and is idempotent on `(kind, slug)`
so it can be re-run safely. It prints a reconciliation table — counts per kind, slugs,
featured flags, unresolved media — which is the review artifact. `tsx` is added as a
devDependency in each app (`pnpm --filter web migrate:export`,
`pnpm --filter admin migrate:import`), and both scripts are deleted after cutover, so no
permanent cross-app import is created.

**Draft preview — in-admin and fidelity-limited.** The admin renders drafts with its own
minimal renderers for the article `Block` union and the field groups, rather than reusing
`apps/web` components. Cross-app imports are forbidden, and promoting the public
renderers into a workspace package would require Tailwind class scanning plus dual
consumption in both apps — more than the MVP needs. This preview checks structure and
completeness, and published pages stay reachable through `PUBLIC_SITE_ORIGIN`. Preview
responses sit behind the dashboard guard and always send
`cache-control: private, no-store`; draft content is never reachable from a public route.
If pixel-level fidelity later becomes a requirement, promote the renderers to a shared
package then.

## Current state and constraints

- `apps/admin` is a SvelteKit 2 / Svelte 5 app with better-auth, Drizzle/Neon,
  Tailwind CSS v4, shadcn-svelte, and the Cloudflare adapter. It has no CMS, no R2
  binding, no analytics integration, and no content tables. Phase 0's shell is in
  place: the auth schema is generated, sign-in and sign-out are real, an `ADMIN_EMAILS`
  allowlist fails closed, and `(dashboard)` is guarded server-side. The demo `task`
  table and the demo routes are gone. See [14 — The Admin App](./14-admin-app.md).
- `apps/web` currently reads packages, destinations, posts/articles, site details,
  and shared editorial content from typed modules in `apps/web/src/lib/data/`.
  These routes are server-rendered; there is no runtime content database yet. See
  [08 — Content & Data Layer](./08-content-data-layer.md).
- Both apps are on stable SvelteKit 2. Keep runes mode, strict TypeScript, Tailwind
  v4, `skipLibCheck: true`, and Cloudflare Workers. Never import source files across
  the app boundary.
- The admin scaffold currently uses the shadcn-svelte `rhea` configuration. Treat
  it as the starting state only: apply the requested preset and review the resulting
  `components.json`, CSS tokens, and copied components rather than mixing preset
  files with stale scaffold styles. The existing project's preset-application
  procedure is detailed in [Dashboard shell](#dashboard-shell).
- Do not edit generated auth or Cloudflare type files by hand. Follow
  [14 — The Admin App](./14-admin-app.md) and
  [12 — Troubleshooting](./12-troubleshooting.md) when generating them.

## Target architecture

```text
Administrator browser
    │ HTTPS; better-auth session
    ▼
apps/admin — SvelteKit Worker
    ├── Neon (write CMS content, settings, and revisions)
    ├── R2 binding (authorized media writes/deletes)
    └── Cloudflare Analytics Engine SQL API (server-side, aggregate reads)

Public browser
    ▼
apps/web — SvelteKit Worker
    ├── Neon read-only role (published content and site settings only)
    ├── R2 public media hostname (published images)
    └── Analytics Engine binding (write validated aggregate events)
```

The public app never receives database credentials, admin credentials, or the
Analytics Engine query token. The admin never reads draft content into public pages.
Create a small `packages/content-model` only for shared TypeScript types and pure
content helpers; keep admin write services and web read services inside their own
apps. If that package is introduced, add `packages/*` to the pnpm workspace
intentionally and test both consumers.

## UX and information architecture

### Dashboard shell

Apply the requested shadcn-svelte preset ID `b3XpoFP7kQ` to the existing admin project,
then add the `dashboard-01` block from `apps/admin`:

```sh
pnpm dlx shadcn-svelte@latest apply b3XpoFP7kQ
pnpm dlx shadcn-svelte@latest add dashboard-01
```

Use **`apply`**, not `init --preset`. Verified against the pinned shadcn-svelte 1.7.0:
`apply [options] [preset]` is documented as "apply a preset to an existing project" and
accepts `--only theme,font`, `--no-deps-install`, `-y`, and `-s`, whereas `init`
re-initialises project configuration that this scaffold already has.

Review the resulting `components.json`, CSS tokens, and copied components rather than
accepting them unread — the scaffold currently ships the `rhea` style, and preset files
must not end up mixed with stale scaffold styles. Confirm that both the preset ID and
the `dashboard-01` block resolve against the registry before treating either as
available; both live outside this repo.

Use `dashboard-01` as the initial responsive shell and adapt its labels, navigation,
and content to this site. Review and commit all generated configuration and component
changes.
Keep the dashboard visually quiet, content-first, keyboard accessible, and usable
on a phone: collapsible desktop sidebar, mobile navigation, clear page titles,
breadcrumbs, one obvious primary action, visible focus styles, readable status
labels, and helpful empty/error/loading states. Use the admin preset's tokens, not
`apps/web`'s forest/gold brand fills, unless the chosen preset itself defines an
appropriate accent.

### Main navigation and screens

| Screen | Primary jobs |
| --- | --- |
| Overview | See content totals/status, recent edits, quick links to create content, and a concise 30-day analytics summary. |
| Packages | Search/filter/sort; create, edit, preview, publish, unpublish, reorder, and archive tour packages. |
| Destinations | Manage destination details, highlights, gallery, featured state, and related media. |
| Articles | Manage blog metadata and the site's existing structured article blocks; preview, publish, and archive. |
| Media | Upload, search, filter, preview, copy an asset reference, edit alt text, and see or protect content references. |
| Site information | Manage identity, contact details, navigation, social links, footer destinations, and selected shared homepage/editorial content. |
| Analytics | Choose a date range and inspect page views, content views, CTA events, daily trends, and top pages/content. |

Keep table interactions familiar: searchable lists, status and category filters,
sortable columns, pagination only when needed, row actions, a clearly labelled
“Create” action, and confirmation for destructive/unpublish operations. Use
sectioned forms with inline validation rather than one very long form. Keep the
site's existing route paths and front-end components where possible.

### Editing experience by content type

- **Packages:** basics and slug; price (integer IDR); region, duration, trip type,
  group size, accommodation; overview; highlights; included items; itinerary days;
  featured/order; cover media; SEO title/description.
- **Destinations:** name/slug, region, tagline, overview paragraphs, quick info,
  experiences, gallery, featured/order, SEO.
- **Articles:** title/slug, category, tags, excerpt, author/byline, published date,
  read-time display, card/hero media, SEO, and a structured block editor matching
  the existing `Block` union (`p`, `h`, `steps`, `callout`). Do not allow arbitrary
  HTML in the MVP. Preserve unique URL-safe heading IDs.
- **Media:** useful thumbnail grid/list, upload progress, image preview, filename,
  dimensions/size/type, alt text, public URL/reference, and usage state. Require alt
  text before an image can be used as meaningful content.
- **Site information:** grouped, typed settings for brand/contact, menu/footer,
  social links, and shared content such as FAQs, testimonials, features, stats, and
  blog categories. Provide safe add/remove/reorder controls and URL validation for
  links. Do not expose arbitrary script or HTML settings.

All forms need save-draft, preview, and publish actions with clear success/error
feedback. Warn before leaving a dirty form. Add a safe preview that is private to the
admin and never exposes draft content through public routes.

## Content model and publishing

### Suggested data shape

Keep indexed, queryable fields relational and nested editorial data structured. A
practical initial model is:

- Better Auth's generated user/session/account/verification tables, plus a minimal
  administrator allowlist tied to the provisioned user.
- `content_entries`: UUID, kind (`package`, `destination`, `article`), draft slug,
  archive state, sort order, timestamps, and typed-per-kind draft payload. Enforce
  unique slugs per kind and validate payloads by kind in server-side code. Treat
  editing state and publication as separate facts: derive list labels such as Draft,
  Published, Published with unpublished changes, and Archived from the draft payload
  and published-revision pointer rather than hiding the live version when a draft is
  changed.
- `content_revisions`: immutable content snapshot, entry ID, revision number, slug,
  author, and publication timestamp. Keep a pointer to the currently published
  revision on each entry; a publish operation validates and creates the new snapshot
  then moves the pointer atomically. This lets a published page stay live while its
  next edit remains a draft, and makes history/rollback possible.
- `site_settings`: a fixed set of typed settings keys, JSON values, updated time,
  and administrator ID. Validate known settings shapes; do not create an arbitrary
  key/value editor exposed to admins.
- `media_assets`: UUID, R2 object key (or existing external URL for migrated
  artwork), original name, MIME type, byte size, dimensions, alt text, upload time,
  and uploaded-by. Store references by asset ID/object key, not hard-coded bucket
  URLs. Track relationships or check references before deletion.
- `slug_redirects`: content kind, old slug, new slug, and created time for published
  slug changes; return a permanent redirect from old public URLs.

Use UUID primary keys and timestamps, database uniqueness/foreign-key constraints
where applicable, and indexes for content kind/status/slug/order and analytics- or
media-library lookups. Preserve package/destination/article fields documented in
[08 — Content & Data Layer](./08-content-data-layer.md). Nested fields such as
package itinerary/highlights, destination experiences/gallery, article blocks/tags,
and settings are suitable for JSONB when validated at write time. Keep the article
block union and the current public rendering behavior intact during migration.
Index content by kind/status/slug/order and media by the fields used for library
filtering; analytics queries remain in Workers Analytics Engine, not Neon.

### Publish contract

1. Save and validate a draft without changing the live public revision.
2. Preview a draft only through an authenticated admin flow.
3. On publish, validate required fields, referenced media, slug uniqueness, and SEO;
   then write the revision and move the published pointer in one `db.batch([...])` call.
   The HTTP driver has no interactive transactions — `db.transaction()` throws
   `No transactions support in neon-http driver` — while `batch()` is one transaction.
   Cover this path with a test that fails the second statement and asserts that neither
   write landed.
4. On unpublish, remove the public pointer but retain the draft/history.
5. On a published slug change, create a redirect from the former slug.
6. The public app queries only published revisions/settings. Do not fall back
   silently to the old TypeScript arrays after cutover; that would create two sources
   of truth. Add a short-lived edge cache only after correctness is verified, and
   make the maximum publish-to-public delay explicit (target: under five minutes).

### Migration and public-site integration

Migrate the existing entries from `apps/web/src/lib/data/{packages,destinations,posts,site,content}.ts`
into Neon, preserving their current URLs, ordering, SEO fields, content blocks, and
featured flags. Convert generated media IDs through the existing `img()` helper when
exporting data; never hand-edit generated `media.ts`. For this one-time transfer, use the
[reviewed export/import workflow](#resolved-implementation-decisions) — one script per
app exchanging a JSON snapshot — rather than creating a permanent cross-app import. Compare record counts and sample each
record type before switching reads.

Then replace static collection lookups with server-only read functions in `apps/web`
and load functions for existing routes. Move pure types/formatters needed by both
apps into `packages/content-model`; keep UI components presentational. Preserve
`/packages/:slug`, `/destinations/:slug`, and `/blog/:slug`, generate the existing
metadata from the published record, and test not-found/redirect behavior. Use a
read-only Neon role and a separate admin write credential. Set up staging first and
cut over only after database content and page rendering match the current site.

## Media storage with R2

- Create a dedicated bucket and bind it to the admin Worker. Attach a custom media
  hostname for public reads; uploaded content images are public by design, but bucket
  writes and deletes must remain server-side and authenticated. Do not use an
  unrestricted public upload endpoint or make `r2.dev` the production media URL.
- Use UUID-based immutable object keys; validate MIME type, file extension, declared
  and actual size, and image dimensions. Set a conservative configurable upload cap
  (initial target: 10 MiB per image) and reject unsupported files with a useful error.
- The MVP may stream uploads through the authenticated admin Worker into R2. Add a
  direct/presigned upload flow only if real upload volume justifies the extra
  credentials and endpoints.
- Retain existing AIDA/CDN artwork as external media references during the initial
  content migration; new uploads go to R2. Move legacy binary assets later if
  desired, rather than blocking the CMS launch on a bulk media migration.
- Prevent deletion of in-use media. Prefer archive/soft-delete in the UI and require
  confirmation before removing an unused R2 object. Use URL/object-key helpers so a
  later media-domain change does not require rewriting content records.

## Analytics decision: Cloudflare Workers Analytics Engine

Cloudflare offers free options, but they serve different purposes:

- **Cloudflare Web Analytics** is free and privacy-focused, and provides browser-side
  performance/RUM metrics. It is useful as an optional Cloudflare-hosted view of
  page performance, but it is not the selected source for custom package/article
  engagement metrics in this product dashboard.
- **Workers Analytics Engine** is the primary choice because the public site runs on
  Workers, can write custom events through a dataset binding, and the admin can
  query aggregates through the documented SQL API. This avoids a paid analytics
  service and keeps analytics out of Neon.

Cloudflare's [current WAE pricing page](https://developers.cloudflare.com/analytics/analytics-engine/pricing/)
lists a Workers Free allowance of **100,000 data points written per day and 10,000
read queries per day**. It also says billing is not yet active while published
pricing is provided for future estimation. Treat these as the current documented
free allowance, not a promise that pricing will never change; confirm the account's
current terms before release and set a conservative usage budget. The expected design
writes one point per page view and selected event, and only a small number of queries
per analytics view/date-range change. WAE retains data for **three months**
([limits](https://developers.cloudflare.com/analytics/analytics-engine/limits/)).

### Event flow and dashboard metrics

1. Add a WAE dataset binding to `apps/web/wrangler.jsonc` (proposed dataset:
   `BANGGAI_SITE_EVENTS`). Cloudflare creates the dataset on first write.
2. Track one initial page view and each client-side route navigation in `apps/web`.
   Send page-view and selected browser-only click events through a small same-origin
   SvelteKit event endpoint, which validates the event allowlist and writes one
   `writeDataPoint()` to the Worker's Analytics Engine binding. This avoids counting
   route prefetches as views; trigger page views only after an actual navigation.
   Track a limited set of events such as `package_view`, `destination_view`,
   `article_view`, `booking_cta_click`, and `contact_click`; do not send every UI
   interaction.
3. Store only aggregate-friendly dimensions: event name, normalized route/content
   kind, safe content slug, and timestamp. Exclude IP addresses, email/name, raw
   query strings, form content, persistent IDs, session replay, and fingerprinting.
   Validate event names and maximum payload size; if a public event endpoint is
   needed, keep it POST-only, same-origin, rate-limited where practical, and reject
   unknown event names/dimensions. Analytics failure must never break page rendering
   or navigation.
4. In the admin Worker, query the WAE SQL API from server code using fixed,
   parameter-safe query templates and an allowlisted date range. Configure a
   Cloudflare account ID as a non-secret variable and a narrowly scoped
   `Account Analytics: Read` API token as a Worker secret. Never expose that token
   to client code or accept arbitrary SQL from a request. Query SQL API's `FORMAT
   JSON` response on page load/date-range changes and do not poll.
5. Show 7-day, 30-day, and last-three-months date ranges, daily page views, top pages,
   top package/destination/article views, and selected CTA clicks. Label the KPI
   **page views**, not **unique visitors**: the MVP will not attempt cross-visit or
   unique-user tracking. Use sampling-aware aggregation with `_sample_interval` as
   documented by Cloudflare and make the three-month retention boundary visible.

6. Fetch only when the analytics page opens or the date range changes; add a manual
   refresh and loading/empty/error states. Avoid polling. Cache briefly only if query
   volume warrants it; do not query once per chart point.

The same-origin event endpoint is public by necessity. Keep it narrow (POST only,
small body, strict event allowlist, same-origin checks, no user-provided dimensions),
apply edge rate protections where available, monitor write counts, and fail open.
Cloudflare Web Analytics may be enabled later for Web Vitals, but it is distinct from
the in-admin analytics system: Cloudflare's FAQ says Web Analytics does not currently
support custom events. Do not duplicate page-view beacons by default. No third-party
analytics package is required for the MVP; use the dashboard/chart components brought
in by the requested shadcn-svelte block where practical.


## Authentication, authorization, and security

- Generate Better Auth's schema using the documented generator, apply migrations,
  and replace the password demo with the real login flow. Disable public sign-up and
  provision the first administrator out of band. Every private route and server
  action must enforce an authenticated, allowlisted user; hiding navigation items is
  not access control.
- Put CMS pages under a protected route group/layout. Keep Better Auth endpoints
  reachable as required, and redirect unauthenticated dashboard requests to login
  with a safe return path. Verify session expiry/sign-out and use secure cookies and
  the correct production `ORIGIN`.
- Validate all form/action/API input on the server. Enforce allowed content kinds,
  unique slugs, field lengths, safe URLs, valid media references, and size limits.
  Render article data as structured escaped content, never unsanitized HTML.
- Restrict the public Worker to published-content reads with a Neon read-only role.
  Keep database URLs, Better Auth secrets, R2 write capability, and Cloudflare
  analytics token in runtime secrets/bindings; never commit or return them to the
  browser.
- Require an explicit confirmation for unpublish/archive/delete and check references
  before asset deletion. Record who changed/published settings and content. Use
  least-privilege Cloudflare API tokens and separate staging/production credentials.

## Routes and implementation map

Suggested route layout (adapt to the existing scaffold, avoid duplicate demo pages):

```text
src/routes/
├── (auth)/login/
├── (dashboard)/+layout.server.ts   # session + administrator guard
├── (dashboard)/dashboard/
├── (dashboard)/packages/           # list, create, edit, preview
├── (dashboard)/destinations/
├── (dashboard)/articles/
├── (dashboard)/media/
├── (dashboard)/settings/
├── (dashboard)/analytics/
└── api/auth/[...all]/              # Better Auth handler as configured
```

Admin server code belongs under `apps/admin/src/lib/server/` (content services,
R2 service, analytics client, validators). Keep browser-safe UI out of server-only
modules. Public read services and route load functions belong in `apps/web`; shared
pure types belong in the workspace package, not either app's source tree.

## Phased delivery

### Phase 0 — foundation and secure app shell

- Generate auth/Worker types and verify the scaffold can check/build; read the admin
  notes about the Wrangler types trap first.
- Provision one allowlisted admin; add the real login/logout flow and a protected
  dashboard layout before adding CRUD.
- Apply the requested shadcn-svelte preset and add `dashboard-01`; customize labels,
  navigation, responsive behavior, and empty states. Remove the welcome/demo routes
  and example-only tests once replacements exist.
- Replace the demo `task` schema with the first migration-backed domain schema.

**Done so far:** Worker types generated and committed
(`wrangler types --env-file .env.types`, so the file no longer varies with a developer's
local `.env`); `pnpm --filter admin check` and `build` both pass, and the
`wrangler types --check` gate was removed from both scripts; Better Auth's schema is
generated and its migration is applied; the Neon project is linked (`.neon`,
git-ignored); `(auth)/login`, the `(dashboard)` guard, the shell, and a POST-only
sign-out exist; the demo routes, welcome page, `vitest-examples/`, and the demo `task`
table are removed; `src/lib/server/authz.spec.ts` covers the allowlist and redirect
sanitising.

The administrator is provisioned out of band and public sign-up is disabled
(`pnpm --filter admin provision`; see
[14 — The Admin App](./14-admin-app.md#provisioning-the-administrator-out-of-band)).
The whole flow — guard redirect, rejected password, successful sign-in, sign-out, and
the guard again — was verified in Chromium against the dev server, which is also the
only way to test it: better-auth's `api` helpers cannot run outside a request context.

Still open in this phase: applying the preset, and replacing the minimal shell with
`dashboard-01`.

> **The `dev` branch is in place.** The project's default branch is `Production`, and the
> auth migration is applied there. Schema and content work happens on `dev`
> (`neon checkout dev --create`, then `pnpm --filter admin db:migrate`), so the content
> migration is rehearsed somewhere disposable. Point local `.env` at it with
> `neon env pull --file` and keep the values unquoted.

**Exit:** a production-shaped admin can log in, all dashboard routes are protected,
and the responsive shell passes type/a11y checks.

### Phase 1 — content types, schema, and safe migration path

- Define the typed content contracts and validators from existing package,
  destination, article, site, and shared-content modules. Add a shared package only
  for code both apps actually need.
- Implement Drizzle schema and reviewable SQL migrations for content, revisions,
  settings, media metadata, redirects, and administrator allowlisting.
- Create staging DB roles (admin writer, public read-only) and an export/import path
  for current static content. Reconcile counts, slugs, nested fields, and media URLs.
  Write array position into `sort_order`: the homepage's four packages come from
  `packages.slice(0, 4)`, not from the `featured` flag.

**Done:** all of it, against the `dev` branch, with `Production` untouched.

*Branch and schema.* `dev` exists (`neon checkout dev --create`) and local
`apps/admin/.env` points at it, so `pnpm --filter admin db:migrate` rehearses against
disposable data while `Production` keeps only the auth migration. Three migrations are
applied there: `0001` adds `content_entries`, `content_revisions`, `site_settings`,
`media_assets`, `slug_redirects`, `administrators`, and the `content_kind` enum; `0002`
and `0003` fix what building the import exposed — nullable `mime_type` with an
owner-check for uploads, and non-partial unique indexes on `object_key`/
`external_url` (a partial index cannot be an `ON CONFLICT` target, so the idempotent
media upsert failed with `42P10`). `db:generate` reports "no schema changes, nothing to
migrate", so the migrations match the schema, and the constraints were exercised
against the branch: `(kind, slug)` and `(entry_id, revision_number)` reject duplicates,
the media `check` rejects both "neither source" and "both sources", and many
external-only assets coexist.

*Contracts.* `packages/content-model` is a new workspace package
(`packages/*` added to `pnpm-workspace.yaml`) holding the per-kind Zod schemas and the
site-setting contracts. `apps/web` imports types from it and nothing else — its data
modules keep their export names as aliases — so the public bundle is unchanged and the
contracts can no longer drift from what the site renders. `apps/admin` validates
through `src/lib/server/content/validate.ts`.

*Migration path.* `apps/web/scripts/export-content.ts` writes a validated snapshot to a
git-ignored `.migration/`; `apps/admin/scripts/import-content.ts` re-validates it, seeds
the content tables, and prints the reconciliation report. Verified against the branch:
**20 content entries** (8 packages, 9 destinations, 3 articles), 20 published revisions,
13 settings, 28 distinct media assets. Every payload round-trips structurally identical,
`sortOrder`/`featured` match the modules, and nested fields survive (itinerary days,
gallery images, and all four article block kinds). The import is idempotent on
`(kind, slug)` and on each media URL; `--replace` appends a revision rather than
rewriting one.

*Roles and access.* `pnpm --filter admin db:roles` creates `banggai_admin` (write) and
`banggai_web` (read-only, and **not** on the auth tables), converges rather than
accumulates, and verifies itself by reconnecting as each role. Administrator
membership moved from `ADMIN_EMAILS` to the `administrators` table; the guard fails
closed, and a signed-in non-administrator is refused and has its session deleted.

**Exit:** every current content item survives a test migration and validates against
its intended type; production content has not yet been switched over. **Met** — the
counts above are the reconciliation, and `Production` still has only the four auth
tables.

### Phase 2 — media foundation

- Create the R2 bucket, binding, and public custom domain; update `wrangler.jsonc`
  and regenerate Cloudflare Worker types using the documented output-clearing flow.
  Add authenticated upload, metadata persistence, media browsing, alt text, and safe
  reference-aware deletion.
- Seed current remote image references as external media records and update migrated
  content to use stable media references.

**Exit:** upload/use an image in a draft, publish it, and confirm it loads on the
public site without exposing write credentials.

**Built (the admin half is complete; the public half waits for Phase 4).** The bucket
`banggaiescape-media` exists, is bound as `R2_MEDIA`, and is read through the custom
domain `media.banggaiescape.com` — verified end to end with a remote object PUT fetched
back over that hostname with a valid certificate. `r2.dev` public access stays disabled.

- Upload, alt text, browsing, filters, hide/restore, and reference-aware deletion are all
  implemented and guarded by the dashboard layout.
- Uploads are validated by **magic bytes** (JPEG/PNG/WebP/AVIF, 10 MiB cap, SVG refused),
  with dimensions read from the header. Keys are `<uuid>.<ext>`, so they are immutable.
- Deletion is refused while **any** draft, **any** revision (including superseded ones),
  or **any** site setting still references the asset, and the refusal names where.
- The 29 imported media rows were seeded, and every payload in the database now
  references a `media_assets.id` rather than an authored CDN value — which is why the
  stored contract (`packagePayloadSchema`, …) is now stricter than the authored one
  (`packageSourceSchema`, …) that `apps/web` still uses.

**Two corrections to this plan, both measured rather than assumed:**

- The second bullet's "stable media references" means **the `media_assets` id**, chosen
  over storing a stable key. That forces two contract variants (payload vs. source),
  because the un-migrated static modules still author CDN values.
- **`mediaSettingKeys` had to be split from `mediaSettingFieldNames`.** `ctaBackground`'s
  *value* is the reference, so a name-matching walker missed it entirely — the export
  silently dropped it and the import then failed on it. `mediaSettingKeys` covers
  settings whose value is the ref; `mediaSettingFieldNames` covers refs in a named field
  (`testimonial.avatar`).

Still open: the exit criterion itself (a draft image loading on the public site), which
requires Phase 4's Neon read path; and retiring the legacy CDN by copying those bytes into
R2 (their `mime_type` is null precisely because the old host never recorded one).

### Phase 3 — CMS CRUD and publish workflow

- Deliver list/forms/preview/publish for packages, destinations, and articles, then
  site settings. Add search/filter/status handling, reorder/featured controls, slug
  validation, immutable published revisions, redirects, and audit metadata.
- Replace scaffold demo routes and complete the core CRUD test coverage.

**Exit:** the administrator can create, edit, preview, publish, unpublish, and restore
or safely replace content without editing source files.

**Built, except site settings.** `(dashboard)/content/[kind]/` has the list (status filters,
search, reorder, feature, archive, delete), `new/`, `[slug]/` (edit, the publish workflow,
revision history, redirects) and `[slug]/preview/`. All three kinds are driven by one
field-spec model in `src/lib/content/forms.ts` and one service in
`src/lib/server/content/service.ts`, so "how a package is edited" exists once instead of
three times that drift.

The rule the screens are built around: **saving a draft never validates; publishing does.**
`saveDraft` insists only on a well-formed slug, so a half-finished edit can be parked
without touching what visitors see. `publish` is the gate — it validates the payload
against the shared contract, appends an immutable revision, moves the entry's published
pointer, and records a redirect when the slug changed, all in one `db.batch()` (on
neon-http, `sql\`begin\`` is *not* a transaction). Status — `draft` / `published` /
`changed` / `archived` — is **derived** from the draft, the published revision and
`archivedAt`, never stored, so it cannot drift out of step with the data.

Verified by driving a real browser against `pnpm dev`: sign-in, the shell, all five nav
destinations, the theme toggle, and create → save draft → publish-refused → delete. That
check was a throwaway script, not a committed test.

Site settings is the one screen still missing; its 13 keys are stored and validated but
have no UI.

### Phase 4 — switch the public site to Neon

- Add `apps/web` read-only database access and server-side loaders for published
  content/settings. Preserve existing page presentation, SEO, paths, and 404s.
- Test staging against the current static site. Deploy database-backed reads only
  after content reconciliation, then remove the TypeScript content arrays as the
  runtime source of truth (keep generated `media.ts` only if still needed for legacy
  artwork resolution).
- Add slug redirects and a defined edge-cache/publish freshness policy.

**Exit:** a publish from admin appears on the public site within five minutes and
requires no marketing Worker redeploy; drafts remain invisible to visitors.

### Phase 5 — Cloudflare analytics

- Add the WAE dataset binding to the public Worker and regenerate its Cloudflare
  types using the documented output-clearing flow; implement allowlisted
  page/content/CTA event collection with fail-open behavior.
- Add the admin's server-only SQL API client and aggregate queries; build daily chart,
  KPI, top pages/content, and date-range filter with loading/error/empty states.
- Test sampling-aware query results, API-token permissions, the three-month
  retention window, refresh behavior, and daily write/query usage against the Free
  allowance.

**Exit:** admin displays real aggregate events from the live/staging public site;
no analytics credential or personal data is exposed.

### Phase 6 — hardening and release

- Run functional, browser, security, migration, and performance checks; verify mobile
  and keyboard workflows and check logs for failed Neon/R2/analytics operations.
- Configure separate staging and production Worker bindings/secrets; deploy admin
  independently, then deploy public database-backed reads after the migration
  checklist is signed off.
- Document account bootstrap, secret setup, R2/domain setup, migration/rollback,
  content recovery, and analytics limits in `docs/14-admin-app.md` or the relevant
  operational documentation once implemented.

## Environment and Cloudflare setup checklist

| Setting | App | Kind | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | admin | secret | Neon connection with CMS write privileges. |
| `DATABASE_URL` | web | secret | Separate Neon connection restricted to published-content reads. |
| `ORIGIN` | admin | **config, not a secret** | Exact deployed admin origin; Better Auth uses it as `baseURL` for cookies and redirects. |
| ~~`ADMIN_EMAILS`~~ | admin | — | **Removed in Phase 1.** Membership is now a row in the `administrators` table, granted by `pnpm --filter admin provision`; revoking it is deleting that row. |
| `ADMIN_DB_PASSWORD`, `WEB_DB_PASSWORD` | admin | secret | Passwords for the two database roles, read only by `db:roles`. Not read by either Worker. |
| `BETTER_AUTH_SECRET` | admin | secret | High-entropy Better Auth signing secret. |
| `PUBLIC_SITE_ORIGIN` | admin | config | Safe public-site link/preview URL. |
| `R2_MEDIA` | admin | R2 binding | R2 bucket binding for authenticated media operations. |
| `MEDIA_PUBLIC_URL` | admin + web | config | Public custom-domain base URL for published media. |
| `ANALYTICS` | web | Analytics Engine binding | WAE dataset used for validated event writes. |
| `CLOUDFLARE_ACCOUNT_ID` | admin | non-secret config | Account identifier used to query the SQL API. |
| `CLOUDFLARE_ANALYTICS_TOKEN` | admin | secret | Read-only Account Analytics API token; never client-visible. |

Set production values as Cloudflare Worker secrets/vars/bindings and local development
values in ignored `.env` files. Do not write actual secrets in this plan or commit
them. Create the dataset automatically through the Worker binding; create the R2
bucket/custom domain and least-privilege API token in Cloudflare before staging.

## Verification and definition of done

- **Admin types/a11y:** `pnpm --filter admin check` with generated types current;
  resolve all new Svelte warnings. Be mindful of the documented Wrangler generation
  trap.
- **Admin tests:** `pnpm --filter admin test` for validators, publish state changes,
  authorization, media validation/reference rules, and analytics query parsing. Add
  browser tests for sign-in, protected routes, and core editor workflows.
- **Web checks:** `pnpm check`, `npx biome check apps/web`, and `pnpm build` for
  public-site data/routing/CSS changes. Root checks target `apps/web` only.
- **Admin style:** run Biome on changed admin files without reformatting the
  unrelated scaffold; keep the existing root `pnpm check:code` caveat in mind.
- **Database:** generate and inspect SQL migrations; test upgrade and rollback against
  a non-production Neon branch/database; verify current content counts and sample
  values after import.
- **Integration:** use `wrangler dev` with staging-safe Neon/R2/analytics bindings;
  verify publish visibility, redirects, public read-only behavior, upload failure,
  analytics failure, and sign-out/expired sessions.
- **Privacy/cost:** verify no visitor identifiers or query-string PII are sent;
  monitor WAE daily writes and SQL queries and remain below current Free limits.

The feature is ready when the single administrator can securely manage all requested
content, upload and reuse media, edit public site information, publish without a
redeploy, and see useful page/content analytics in the admin; visitors only receive
published content; and both apps pass their applicable checks/builds.

## Reference links

- [Admin scaffold and constraints](./14-admin-app.md)
- [Current web content/data model](./08-content-data-layer.md)
- [Workers Analytics Engine](https://developers.cloudflare.com/analytics/analytics-engine/)
- [Workers Analytics Engine setup](https://developers.cloudflare.com/analytics/analytics-engine/get-started/)
- [Workers Analytics Engine SQL API and permissions](https://developers.cloudflare.com/analytics/analytics-engine/sql-api/)
- [Workers Analytics Engine pricing](https://developers.cloudflare.com/analytics/analytics-engine/pricing/)
- [Workers Analytics Engine retention and limits](https://developers.cloudflare.com/analytics/analytics-engine/limits/)
- [Cloudflare Web Analytics and privacy](https://developers.cloudflare.com/web-analytics/about/)
- [shadcn-svelte CLI](https://www.shadcn-svelte.com/docs/cli)

## Related

- [14 — The Admin App](./14-admin-app.md)
- [02 — Architecture](./02-architecture.md)
- [08 — Content & Data Layer](./08-content-data-layer.md)
- [09 — SEO, metadata & accessibility](./09-seo-and-metadata.md)
- [11 — Deployment](./11-deployment.md)
- [12 — Troubleshooting](./12-troubleshooting.md)
