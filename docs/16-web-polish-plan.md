# 16 — Web Polish, SEO, Performance and Security Plan

What the public site still needs to look professional, rank, load fast and behave safely.
Every claim in this document was measured against the live site on 2026-09-26, not assumed.

> **Scope:** `apps/web`. The admin is out of scope except where an upload-time hook is the
> only sane place to do something (see [images](#phase-4--weight)). Where this plan
> contradicts the roadmap in [09-seo-and-metadata](./09-seo-and-metadata.md), this plan
> wins; the gaps recorded there are re-stated here with what is now known about them.

---

## The findings this plan is built on

| # | Finding | Measured | Severity |
| --- | --- | --- | --- |
| 1 | The contact form discards every enquiry | `preventDefault()` then `submitted = true`; no `action`, no `method`, and the only POST endpoint on the site is `/api/events` | **Critical** |
| 2 | The hero "booking" bar has no inputs | Two styled `<div>`s and a submit that navigates to `/packages` | High |
| 3 | Images are ~95% of page weight | 5.2 MB across 25 unique images on `/`; hero 326 KB | High |
| 4 | No security headers at all | Live response carries no CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` or `frame-ancestors` | High |
| 5 | Type is set too small, everywhere | 116 occurrences under 14px — 75 at 12px, 23 at 10px, 18 at 11px | High |
| 6 | No social or canonical metadata | No `og:*`, `twitter:*`, `rel="canonical"`, JSON-LD, or `sitemap.xml` | High |
| 7 | Four dead footer socials | Every `socials.href` is `"#"` — Instagram, TikTok, Facebook, YouTube | Medium |
| 8 | The hero is an unpreloadable LCP element | A CSS `background-image`, which cannot be preloaded or given `fetchpriority` | Medium |
| 9 | Two render-blocking third-party stylesheets | Google Fonts (7 weight files, 2 origins) and Font Awesome 6.7.2 from cdnjs | Medium |
| 10 | Six external origins on the home page | Including `lh3.googleusercontent.com` and `images.unsplash.com` placeholders | Medium |
| 11 | Share buttons are inert | Four buttons with `aria-label`s and no handlers | Medium |
| 12 | Documented accessibility gaps | No `prefers-reduced-motion`, no skip link, nested `<main>`, unlabelled star ratings | Medium |

**What is already right, and must not be regressed.** The code payload is light — 21 KB
HTML, 12 KB CSS and 2 KB of entry JS, all brotli. There is **no `{@html}` anywhere**:
article bodies are a closed union of block kinds rendered through escaped interpolation, so
authored content cannot inject script. That is what makes a strict CSP viable rather than a
permissive one. The design system in [`DESIGN.md`](../DESIGN.md) is coherent and the
analytics layer is cookie-free and fails open. This plan polishes execution; it does not
redesign the brand.

---

## Phase 1 — Trust and safety — **done**

### The contact form has to actually reach someone

`apps/web/src/routes/contact/+page.svelte:13` currently reads:

```ts
function handleSubmit(event: SubmitEvent) {
	event.preventDefault();
	submitted = true;
}
```

A visitor fills in their details, sees a confirmation, and nothing is sent. This is the
highest-stakes item in the plan: it is a business's enquiry channel, and a form that
appears to submit and does not is a deceptive pattern rather than a cosmetic gap.

**Decision: one enquiry path, on WhatsApp.** The number already exists in the CMS —
`contactChannels` carries a "Call & WhatsApp" entry at `+6281354911647` — and the audience
books over WhatsApp. So the contact form composes a message and hands off to
`https://wa.me/6281354911647?text=…`, sharing one helper with the hero booking bar
([Phase 2](#phase-2--real-controls)) rather than growing a second code path.

Because `wa.me` **silently does nothing for a visitor without WhatsApp**, both surfaces
show the composed message with a **Copy message** button beside the WhatsApp button.

Persisting enquiries into Neon (an `enquiries` table) is a reasonable follow-up, but it is
deliberately not in this phase: it needs a spam defence, a retention policy and a
notification path, and none of that should be bolted on to a form that currently sends
nothing.

### Security headers

All of it lands in `apps/web/src/hooks.server.ts`, alongside the existing caching `handle`:

| Header | Value | Why |
| --- | --- | --- |
| `content-security-policy` | strict `default-src 'self'`, with the origins this site actually uses | There is no `{@html}`, so inline script is never needed |
| `strict-transport-security` | `max-age=31536000; includeSubDomains` | The site is HTTPS-only behind Cloudflare |
| `x-content-type-options` | `nosniff` | Stops MIME sniffing on media |
| `referrer-policy` | `strict-origin-when-cross-origin` | Keeps campaign data out of the WhatsApp referrer |
| `permissions-policy` | camera, mic, geolocation denied | Nothing on the site uses them |
| `frame-ancestors` | `'none'` | Clickjacking; the admin must not be framable either |

The CSP has to name the remaining origins precisely — the media host, Google Fonts,
cdnjs and `static.cloudflareinsights.com` — which is one more reason [Phase 4](#phase-4--weight)
removes the third-party stylesheets. Enforce it in a report-only pass first, read the
violations, then switch it on.

### Accessibility gaps already on record

[09-seo-and-metadata](./09-seo-and-metadata.md#gaps-worth-knowing) lists these; all four are
still open and all four are cheap:

- **No `prefers-reduced-motion`.** The mobile bars, hover zooms and
  `scroll-behavior: smooth` on `<html>` all animate unconditionally.
- **No skip-to-content link.** Keyboard users tab the whole header on every page.
- **Nested `<main>`.** The layout already provides one; `contact` and others add another.
- **Star ratings have no accessible name.** A screen reader announces
  "star star star star star". Give the row an `aria-label` such as "Rated 5 out of 5".

### Copy errors that are visible on every visit

- `"Ready To Begin Your Next Adventure ?"` — space before the question mark.
- Action labels disagree on capitalisation: `View all packages`, `View All Articles`,
  `View all destinations`, `Learn More About Us`.

These are Phase 6's real subject, but they are corrected in passing wherever a file is
already open, because they are the cheapest polish on the site.

### Dead social links

Every `socials.href` is `"#"`. Either supply the real profiles or remove the row — four
icons that do nothing in the footer of every page is worse than no social row at all.

---

## Phase 2 — Real controls — **done**

### The hero booking bar

**This is an enquiry builder, not a search widget.** There are no results to filter, so
the usual search-bar patterns — result counts, facets, zero-result states — do not apply.
The research consensus on this kind of control is consistent on two points: *present
flexible inputs as the default rather than an advanced option*, and *never front-load
complexity before the user has seen value*. Three optional fields and one CTA.

| Field | Control | Behaviour |
| --- | --- | --- |
| **Select Package** | native `<select>` | Defaults to "Any package". Lists every published package as `Title — 4D3N` so duration is legible in the list. Native matters: on a phone it opens the OS picker, and this audience is mobile-majority. |
| **Preferred dates** | two optional native `<input type="date">` | From/To, `min` set to today, labelled as *preferences*. Blank means flexible. |
| **Guests** | stepper, 1–20, default 2 | Ceiling drops to the selected package's maximum when one is chosen. |

**No availability calendar.** The content model has no departure dates and no availability
(`packagePayloadSchema` carries `days`, `nights`, `tripType`, `price`, `groupSize` and no
dates at all), so a picker that greys out sold-out days would be inventing availability.
These are preferences handed to a person, which is how a WhatsApp-first operator actually
works.

**`groupSize` is a display string** — `"Min 2, Max 8"`, already string-manipulated for
display by `PackageCard`. Parse the maximum defensively for the stepper ceiling and fall
back to the cap above when parsing fails. Do not build a numeric guest model in this phase.

Composed message, then handed off:

```
Hello Banggai Escape, I'd like to ask about:
• Package: 4D3N Banggai Island Odyssey
• Dates: 12–19 July 2026
• Guests: 2

Sent from https://banggaiescape.com
```

Two implementation notes that matter:

- **The number comes from the CMS, not a constant.** Add a validated `whatsapp` field to
  the site profile (digits and country code only), seeded from the existing
  `contactChannels` value. A hardcoded phone number in a component is exactly the kind of
  copy `AGENTS.md` forbids.
- **The loader returns a minimal list.** `apps/web/src/routes/+page.server.ts` currently
  returns `packages.slice(0, 4)` with full payloads, which is right for the card grid and
  wrong for a dropdown — shipping every package's complete itinerary to populate a
  `<select>` is wasteful. Add a second, minimal shape:
  `{ slug, title, days, nights, maxGuests }`.

### Share buttons

`apps/web/src/routes/blog/[slug]/+page.svelte` defines four share rows with `aria-label`s
and no handlers. Implement:

- **Web Share API** where `navigator.share` exists (all mobile browsers) — the native
  sheet is better than any custom row.
- **Real X / Facebook / WhatsApp URLs and Copy link** everywhere else.
- Build every URL from `page.url` so the shared link is the canonical one, and use
  `rel="noopener"`.

---

## Phase 3 — Craft — **done**

### The type scale

The single largest reason the site reads as unpolished. 116 occurrences below 14px,
including 23 at 10px, and body paragraphs, testimonial quotes and FAQ answers all sit at
11–12px.

- Raise the floor to **14px**, and **16px for body copy**.
- Define the scale in the `@theme` block in `apps/web/src/routes/layout.css` so it is a
  token rather than a convention, and so it cannot silently regress.
- Leave the two legitimate small sizes — superscript-style metadata and the badge/chip
  labels — as tokens with names that say they are labels.

This is a large mechanical diff across every component. It is worth doing early anyway,
because it changes how everything else reads.

### Section rhythm and hierarchy

Every section on the home page is the same warm sand, separated by ad-hoc
`border-y border-stone-100`, so the page has no visual beats. Establish real rhythm from
the `section` / `section-wide` utilities that already exist in `layout.css`, and give
sections alternating grounds from the existing token set — no new colours.

Then remove the tells that the `frontend-design` skill
(`.agents/skills/frontend-design/SKILL.md`) names as the commonest signatures of a
generated page, all of which this page currently has:

- a centred hero over a dark image
- three equal feature cards
- ALL-CAPS eyebrow labels (`WHERE TO?`, `DATES`, `GUESTS`)
- `→` appended to link and button text
- one border-radius everywhere (`rounded-2xl` on every card, `rounded-full` on every pill)
- `shadow-xs` under every card

None of these is wrong alone. Together they are what reads as unconsidered. The brand
stays; the tells go.

---

## Phase 4 — Weight — **done**

### Third-party stylesheets

The home page depends on **six external origins**. Two of them are render-blocking CSS.

**Self-host the typeface.** `@fontsource-variable/plus-jakarta-sans` (v5.3.0) exists. The
site uses six weights (normal, medium, semibold, bold, extrabold, black), so a variable
font is strictly better: 7 files across 2 origins become 1 file and 0 origins.

**Subset Font Awesome — do not replace it.** The `icon` fields hold `fa-*` class strings
**in the database** (socials, contact channels, features, nav), so an editor picks them
from the CMS. There are ~31 distinct icons across the site, 17 of them on the home page
alone. Swapping to inline SVG means migrating every icon string in the data and building
an icon picker. Instead, install `@fortawesome/fontawesome-free` and import only the icons
actually used: that removes the cdnjs origin and cuts the payload to a fraction of the full
library while leaving the CMS's icon vocabulary intact.

### Images: 5.2 MB to under 1 MB — **done, by a different route than planned**

**The storage design needs no migration.** With a fixed width set (400/900/2000) and
deterministic keys (`{uuid}-{width}.webp`), `RenderedMedia` can build a `srcset` from the
base URL with no schema change, because the widths are known rather than looked up.

Then:

- The **hero** becomes `<img fetchpriority="high">` with a preload. A CSS `background-image`
  cannot be preloaded and cannot carry a priority hint, so as written the LCP element is
  structurally unpreloadable. This is the highest-leverage single change in the phase.
- `srcset`/`sizes` across the 49 content-image references on the home page.
- A `loading`/`fetchpriority` pass: 3 images are eager today and none is marked
  high-priority.
- The **29 legacy assets** on `lh3.googleusercontent.com` and `images.unsplash.com` are
  design-tool placeholders, not owned media. They need fetching and re-uploading, and those
  hosts should not survive to production.

**One constraint to resolve during implementation:** Cloudflare Workers cannot run `sharp`,
so variant generation has to happen in Node — a one-shot script, as this repo has already
done — or through Cloudflare's transform API. Storage and URL scheme are settled; the
transform step is the open question, and it carries a cost implication worth deciding
deliberately.

#### What was actually built, and the measured result

**Cloudflare Image Resizing, not `sharp`-generated R2 variants.** The open question above
resolved in favour of `/cdn-cgi/image/`. It needs no column on `media_assets` recording which
widths exist, and no step to run after every upload, because a Worker cannot execute `sharp` and
there is therefore no stored state to fall out of sync. `onerror=redirect` covers the failure
case that made the database column necessary in the first place.

Widths are 400/800/1600 — exactly 2x steps, so a high-DPI screen always has a candidate worth
fetching and no step sits close enough to another to be redundant. `CARD_SIZES` holds one entry
per *grid*, because a `srcset` resolves against `sizes` and not against the viewport: a browser
told "the viewport is 1280px" picks the 1600w candidate for a card that renders 384px wide, and
the saving is thrown away.

| | Before | After |
| --- | --- | --- |
| Home page, phone | 4.28 MB | 245 KB |
| The 7 migrated placeholders, 400w | 1,986 KB | 128 KB |

A 400w request against a 217 KB JPEG original returns a 16 KB AVIF; 800w returns 42 KB. Costs
are effectively nil: Cloudflare bills *unique* transformations, the width set is fixed, so the
count is bounded by images × widths — roughly 90 here, against a 5,000/month free allowance —
and does not grow with traffic.

**The placeholders turned out to be the interesting part.** The edge gets a **403** from
`lh3.googleusercontent.com` where a browser gets 200, which is why these seven were the last
unresized images on the site: they could not carry a `srcset` at all. They are now in the media
library, with a substitution map the generator applies so a regeneration cannot re-introduce the
dependency. Two consequences followed, and both are recorded in `419a812`:

- `PageHero` was a CSS `background-image`, so three page heroes were the Largest Contentful Paint
  element *by construction* — a browser cannot preload, prioritise or offer resized candidates
  for a background. It is an `<img>` with a sibling scrim now.
- The migration only pays off if the images have a `srcset` to land in, so the about hero, the
  contact lake and the two home-page body photographs were converted too. Two new `CARD_SIZES`
  entries exist because two of those grids have no equivalent among the old names; reusing
  `twoUp` would have had a browser fetch the 800w candidate for a 360px slot. The two author
  avatars are deliberately left without one — the smallest candidate is 400w, larger than their
  own source, so a `srcset` there could only make a browser pick the bigger file.

---

## Phase 5 — Discoverability — **done**

Everything on the [09 roadmap](./09-seo-and-metadata.md#missing-seo-pieces-roadmap) was
outstanding and was re-verified against the live site on 2026-09-26. All of it now ships.

| Piece | Where |
| --- | --- |
| `og:*`, `twitter:*`, canonical, description | `lib/seo.ts` builds them; `components/Seo.svelte` renders them |
| `<link rel="canonical">` | built from `page.url`, so no domain is hardcoded |
| `sitemap.xml` | `routes/sitemap.xml/+server.ts`, plus a `Sitemap:` line in `static/robots.txt` |
| JSON-LD | `TravelAgency` (home/about/contact), `TouristTrip`+`Product` (package), `TouristAttraction` (destination), `BlogPosting` (article), `BreadcrumbList` (every page) |
| Fallback share card | `static/og-default.png`, generated by `apps/admin/scripts/build-og-image.ts` |

Four decisions the plan did not foresee:

- **`Seo` owns `og:image` as the only writer**, falling back to the site card. A layout-level
  default would emit a *second* `og:image` on every page that has its own, and a consumer
  picking between two candidates picks non-deterministically — so the page's photograph would
  sometimes lose to the logo, with nothing on the page to show why.
- **Dates come from the revision, not the payload.** `articlePayload.date` and `.updated` are
  display strings an editor typed for a human reader ("March 12, 2026"). Structured data cannot
  parse them, so `PublishedEntry` now carries `publishedAt` and `updatedAt` from
  `content_revisions` and `content_entries`.
- **A destination is a `TouristAttraction`, not a product.** It has no price and no
  availability, and putting an `Offer` on it is exactly the kind of claim that earns a
  structured-data penalty.
- **No `sameAs` while the social links are `href="#"`.** A placeholder would assert an identity
  the business has not claimed, and it is the kind of claim a consumer cannot check but will
  publish. `lib/site-seo.ts` filters to real `http(s)` URLs so an editor cannot reintroduce one.

This phase also **fixed a real blind spot in `csp.spec.ts`**. That test reads origins out of the
source and asserts the policy allows them; it failed on three origins introduced here — all from
test fixtures and a JSON-LD `@context`. Widening `img-src` to satisfy it would have been a real
security regression made to appease a string in a test, so the scanner was corrected instead: a
`.spec.ts` file never renders, and a `@context` is a vocabulary identifier nothing ever
requests. A test now asserts both exclusions stay narrow, so they cannot decay into a blanket
escape hatch.

---

## Phase 6 — Copy into the CMS — **done**

Every page's editorial copy now comes from the CMS. No headline, standfirst, marketing
paragraph, link label, price prefix or SEO string is written in a template.

The plan scoped this to the home page. It turned out to be roughly forty strings across nine
routes plus two card components, so the work ran in four commits rather than one, each ending
at a point that could be verified against the dev server.

### What moved, and where

| Keys | What |
| --- | --- |
| `siteCta` | The closing banner's three strings. It appeared on nine pages with identical wording, and the strings lived in `CtaBanner`'s defaults *and* were passed explicitly at five of them — so editing the default would have left half the site on the old text. Two call sites also passed the title without its line break, so contact and about rendered it on one line while the other seven broke it across two. |
| `homePage` | The hero, all six section bands, both About paragraphs, the reviews label |
| `packagesPage` … `contactPage` | Each listing page's hero and SEO metadata |
| `packageDetail`, `destinationDetail`, `articleDetail` | Band headings, the booking box, the article's closing invitation |
| `cards` | "Start from", "/Person", "View Details", "Read More" — eight literals across eight call sites |

Listing and detail are **separate keys** because they are different shapes. `/packages` is a
hero over a grid and has no "Trip Overview"; putting it there would tell an editor the page has
a section it does not, and the only way to find out otherwise is to publish and look.

### The deploy hazard, and the inversion

The plan's step list said to write a migration and seed the data. Doing that would have walked
straight into the trap documented in [Phase 1](./08-content-data-layer.md#add-a-required-field-to-a-setting--and-read-this-part):
**a required setting field deployed before its data is 500 on every page.** The plan was written
before that lesson was learned in production.

So every page-copy field carries the copy it replaces as a Zod default. A row that omits the
field parses, the current copy renders, and the migration becomes a convenience rather than a
precondition for the site existing. `apps/web/src/lib/settings-copy.spec.ts` asserts the
property the design rests on — that `undefined` and `{}` both parse and that **no leaf is left
empty** — rather than that the defaults exist, since a default that is never reached is no
protection at all.

### The line: content or interface

Drawn at *would an editor expect to change it, and does the string still make sense if the
control's behaviour changed?* Headings, prose, link labels, price prefixes and SEO metadata are
content. Form labels, placeholders, `aria-label`s, "no results" messages, breadcrumb labels and
the accessible name of a fieldset are interface, and stay in the component. The booking bar's
`sr-only` legend is "Plan your trip" — that was in the CMS for a commit and then taken back
out, because an editor could rename it into something that is not a control.

A field that interpolates a value is stored as the whole sentence with a visible token —
`Swipe to see all {count} photos` — because two stored fragments would make the grammar a CMS
field and force the halves to be edited together or not at all.

### Claims above that this phase falsified

- **"Write a reviewable migration with `db:generate`."** There is no DDL here. `site_settings`
  already has a `key`/`value` pair; the change is an insert, not a migration, so it is a
  one-shot script like `add-whatsapp-to-site-setting.ts`. `db:generate` is for schema changes.
- **"Seed from the current copy."** Seeded from `schema.parse({})` rather than transcribed, and
  the difference mattered twice. A hand-typed copy of the About paragraphs had been written
  from a truncated `grep` and was a *paraphrase* — seeding it would have replaced live copy with
  different words, silently, because a substituted string still validates. There is now a test
  comparing the schema's defaults against the approved words.
- **"This also gives per-locale copy a home."** It does not, and it is not close. The settings
  table is keyed by setting, not by locale, so a second language needs a second key per page
  (`homePageId`) or a locale dimension on the row. Phase 7 is unstarted, so nothing here
  pre-empts that decision — but this phase is not the head start it looked like.

---

## Decisions and their reasons

| Decision | Reason |
| --- | --- |
| Enquiries hand off to WhatsApp | The number is already in the CMS, the audience books that way, and it needs no new credential or infrastructure |
| Composed message stays visible with a Copy fallback | `wa.me` silently does nothing without WhatsApp installed |
| No availability calendar | The content model has no dates; a picker would invent availability |
| Subset Font Awesome rather than replace it | Icon class strings are CMS-authored data, so replacement means a data migration and an icon picker |
| Fixed width set with deterministic keys | Lets `srcset` be derived from the base URL with **no** database change |
| Hero as `<img fetchpriority="high">` | A CSS background cannot be preloaded, so as written the LCP element is unpreloadable |
| Language / i18n deferred | Explicitly out of scope for now. The switcher stays as it is, which leaves it inert — a known trade-off, not an oversight |

### Two claims above that did not survive contact

Recorded because a plan that quietly drops its own reasoning is worse than one that never made
it.

- **"No database change" held for the edge route but not for the placeholders.** The width
  variants genuinely need no column — the edge route has no stored state to fall out of sync.
  But the seven design-tool placeholders on `lh3.googleusercontent.com` turned out to be
  unreachable *by the edge*, which get a 403 where a browser gets 200, so they could carry no
  `srcset` and were never resized. Fixing that needed `media_assets` rows and a substitution map
  the generator applies, not a schema change. See `419a812`.
- **"Subset Font Awesome rather than replace it" is still right, and the Phase 4 work went
  further than the plan said.** The `fa-*` strings are CMS-authored data, so the icons are now
  inline SVG generated by `apps/web/scripts/generate-icons.ts` — 15 KB against Font Awesome's
  365 KB — while the data contract stays exactly as it was. That keeps the decision and its
  reason intact.

### Not finished, and deliberately

- **The 65 unreachable placeholder references in `media.ts`.** The generator emits 72; seven are
  reachable from a template and were migrated, and the rest are dead weight in a generated file
  no page renders. Migrating them would mean paying storage for images nothing can display.
- **A Core Web Vitals reading against the p75 thresholds.** The image work was verified by
  measured bytes (4.28 MB → 245 KB on a phone, and 1,986 KB → 128 KB for the migrated
  placeholders at 400w), which is the part that was under this plan's control. The field data
  the thresholds ask for is not something this repository can produce.
- **The language switcher is still inert.** Phase 7 was deferred; the decision and its reason
  are in the table above. It is a visible affordance that does nothing, which is a trade-off
  rather than an oversight, and the only thing on this list a visitor can see.

### Closed after the phases above

- ~~**The 7 `media_assets` rows exist only in the development database.**~~ Both branches now
  have all seven, with real dimensions and byte sizes. This needed a second pass at the
  migration script: its idempotency check was "is this asset already in the map?", which is true
  whether or not *the database in front of it* knows the asset exists — so one run left every
  other branch's library short. It now splits into a fetch half that happens once per image
  ever, and a register half that runs once per database, keyed on the R2 object key (the one
  identity branches share) with `on conflict do nothing`. Pointing `DATABASE_URL` at a branch
  and re-running is the whole procedure; a re-run there reports `0 added, 7 already present`.

  Worth noting what this says about the R2 objects and the substitution map: both are shared
  across branches, so neither carries a database's identity. An earlier version of the map
  recorded a `media_assets` **uuid**, which was correct in exactly one database and misleading
  in every other — and read by nothing, which is what made it look like bookkeeping rather than
  a claim that could not be true. It is gone.

---

## Definition of done for every phase

Unchanged from `AGENTS.md`, and this plan is exactly the class of work it warns about —
these changes typecheck and build without ever running a loader.

```sh
pnpm check        # 0 errors, 0 warnings — no new a11y warnings
pnpm test
npx biome check apps/web
pnpm build
```

Plus, because none of this is verifiable from the four commands above:

- a real request against `pnpm dev` (needs `DATABASE_URL` and `MEDIA_PUBLIC_URL` in
  `apps/web/.env`), inspected with a browser-like `Accept: text/html`
- a Core Web Vitals read against the p75 thresholds — **LCP ≤ 2.5 s, INP ≤ 200 ms,
  CLS ≤ 0.1** — before and after the performance phase
- a confirmation that a deploy through CI still gates on a green run

---

## Related

- [06 Styling](./06-styling.md) — the `@theme` token table and the component class layer.
- [07 Design system](./07-design-system.md) — design rules as code.
- [08 Content data layer](./08-content-data-layer.md) — `RenderedMedia`, `srcset`, and the read layer.
- [09 SEO and metadata](./09-seo-and-metadata.md) — the authoritative SEO reference; its roadmap is superseded by this plan.
- [11 Deployment](./11-deployment.md) — CI/CD and the Cloudflare setup.
- [`../DESIGN.md`](../DESIGN.md) — the design system, source of truth for `apps/web`.
