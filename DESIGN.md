# Design System: BANGGAI ESCAPE WEB DESIGN
**Project ID:** 14189134410534936126
**Screens analyzed:** Home (Desktop), Packages, Package Details — Untouched Banggai Discovery, Destinations, Destination Details — Paisu Pok Lake, Blog, Blog Details — How to Get to Banggai Islands, About Us, Contact
**Source of truth:** `.stitch/designs/*.html` (+ `.stitch/designs/*.png`, `.stitch/metadata.json`)
**Device target:** Desktop-first, 2560px artboards, fully responsive

---

## 1. Visual Theme & Atmosphere

Banggai Escape is a **gilded eco-adventure travel house** — the visual language of a luxury expedition brochure translated into a fast, image-led website. Every page opens with a **dark, immersive photographic stage**: a deep-forest hero band or a full-bleed image veiled by a green-tinted gradient. Below it, the page "exhales" into **bright warm sand content fields** where thin hairline rules and whisper-soft shadows do the structural work instead of heavy chrome.

The mood is **weathered-luxury meets tropical documentary** — confident, editorial, and quietly premium rather than glossy or corporate. Deep jungle emerald (#18342A and its near-black siblings) is the constant; **brushed gold (#B48A5A)** is the only jewel, and it is rationed carefully: call-to-action pills, the active navigation item, prices, location pins, small icon touches, and section eyebrow dots. The palette reads as "forest canopy + palm oil lantern light."

The photography does the selling. Layouts are **gallery-first**: generous 4:3 and full-bleed hero image blocks, slow 300–500 ms scale-on-hover zooms, gradient scrims at image bottoms so white type can sit over water and karst. Typography is deliberately **restrained** — body copy runs at 16 px with a 14 px floor, captions and metadata at 12 px (`text-label`) uppercase with wide letter-spacing — so images, not text, carry the emotional weight. Headlines alone go large (30–60 px extrabold) to anchor each band.

**Key Characteristics**
- Dark-forest "curtain" hero bands opening onto warm sand content
- Rationed brushed-gold accent reserved for actions and wayfinding
- Pill-dominant geometry — 167 `rounded-full` instances vs. only 9 `rounded-3xl`
- Photography-first cards with slow, confident hover zooms
- Tiny uppercase micro-labels with wide tracking as a recurring signature
- Thin hairline borders + soft functional shadows instead of hard depth
- Editorial, patient pacing: long, single-ground chapters with 64–112 px vertical breathing room

---

## 2. Color Palette & Roles

### Foundation — The Forest Family
- **Deep Forest Green (#18342A)** — The primary brand color. Fixed header bar, footer field, inner-page hero overlay base, dark pill buttons. Appears on every screen.
- **Forest Abyss (#0F231C)** — Reduced, near-black green kept for small accents only: hover state of the home hero's forest button and the ink of gold badges. It is never used as a card fill.
- **Forest Mid (#214538)** — Secondary dark surface: embedded dark pills ("View all packages"), dark card fills, hero glow mid-stop. One step lighter than the base so dark-on-dark layering stays legible.

### Accent — The Gold Family
- **Gilded Gold (#B48A5A)** — *The* accent. Primary CTAs, active nav state, section eyebrow dots, location pins, icons inside contact rows, price emphasis. Never used for body text or large fills.
- **Gold Pressed (#966F41)** — Hover/active shade of the primary CTA. The only permitted darkening of the gold.
- **Gold Champagne Gradient** — The signature CTA finish: `linear-gradient(135deg, #C9A67C 0%, #9E7748 50%, #A87F50 100%)`, wrapped in a **colored glow shadow** `0 2px 10px rgba(200, 153, 56, 0.35)`. This is what makes the main button feel metallic rather than flat.

### Light Surfaces
- **Warm Sand (#F7F3ED)** — *The only light surface.* Page ground, section bands, card and panel fills, and form field resting fill all resolve to this single value. Delineation comes from hairline borders, never from a second fill tint. In the build `--color-white` is remapped to this value, so every `bg-white` **is** Warm Sand — cool grays (`slate`, `gray`) are not used anywhere in the UI.

### Text, Lines & Structure
- **Charcoal Ink (#1F1F1F)** — Body and headline text on light surfaces (page base is `#1a1a1a`; Tailwind's `stone-900` #1C1917 stands in for headlines).
- **Warm Gray (#6B625A)** — Secondary/body copy, descriptions, supporting metadata. Creates hierarchy without harsh contrast.
- **Hairline Stone (#E9E2D6)** — Soft borders, card outlines, dividers on warm sand.
- **Cool Granite (#E3DACB)** — Form field borders and neutral chips; pairs with `#F7F3ED` panel fills.

### Functional / Semantic
- **Sea Emerald (#B48A5A)** — Confirmation cues and nature attributes (the leaf icon on "Open Trip" package meta).
- **Alert Crimson (#BD3D44)** — Errors, warnings, and the only "loud" non-gold accent in the system. Rare.
- **Info Slate (#64748B)** — Reserved for system messaging and metadata. **Currently unused:** secondary copy on dark surfaces is `stone-300`/`stone-400` and on light surfaces `stone-500`/`stone-600`, keeping the whole system warm.

### Photographic Scrims (not colors, but part of the palette's behavior)
- **Card scrim:** `linear-gradient(to top, rgba(0,0,0,0.80), rgba(0,0,0,0.20), transparent)` pinned to the bottom of destination cards so gold pins and white titles always clear the image.
- **Hero veil:** `linear-gradient(rgba(12,37,28,0.45), rgba(12,37,28,0.55))` over hero photography — always green-tinted, never neutral black.
- **CTA banner veil:** `linear-gradient(rgba(10,50,48,0.65), rgba(8,38,37,0.75))` — heavier, to protect centered white headlines.
- **Glass chips:** `rgba(0,0,0,0.60)` with backdrop blur for badges floating on photos.

> ⚠️ **Token drift to normalize.** Across the nine screens the same three families were re-declared six times with slightly different names and values (greens: `#0c251c`, `#0e241b`, `#0b241c`, `#0c231a`, `#0B1C15`, `#0D1E19`; golds: `#d8aa46`, `#d4af37`, `#d4a853`, `#e6b43c`, `#E3C165`, `#d8aa53`; token names: `brand.dark` / `emeraldDark` / `brand.green` / `brand.forest`). Treat the values in this document as canonical and collapse the aliases when implementing.

---

## 3. Typography Rules

**Primary Font Family:** Plus Jakarta Sans (300–800)
**Character:** A geometric-humanist sans with open apertures and slightly softened junctions. It reads contemporary and friendly in body sizes while staying crisp and architectural at extrabold display weights — the "premium but approachable" note the brand needs.

**Single Typeface:** Plus Jakarta Sans is the only family loaded and is used everywhere, including long-form editorial contexts. No secondary display or serif family ships.
*(Inter 300–700 and Playfair Display also appear in the original screens — legacy drift, now removed. Use Plus Jakarta Sans for all screens.)*

**Iconography:** Font Awesome 6.7.2 (`fa-solid`, `fa-regular`, `fa-brands`) loaded from CDN. Icons are always small (10–14 px), tinted with gold or the local text color, and frequently sit inline with 12 px uppercase labels. Icon sizes are the one deliberate exception to the type floor: an icon is sized, not read.

### Hierarchy & Weights
- **Display / Hero (H1):** Extrabold (800), `tracking-tight`, 3 steps (`text-3xl → text-5xl → text-6xl`, ≈30–60 px), line-height ≈1.15. Centered on hero bands with a soft `drop-shadow-md` when sitting over photography.
- **Section Headers (H2):** Extrabold (800), `tracking-tight`, `text-2xl → text-3xl` (24–30 px) on light bands; `text-3xl → text-4xl/5xl` when it's a full-bleed banner headline. Left-aligned in content grids, centered in banners.
- **Card / Item Titles (H3):** Bold (700), `text-sm` (14 px), `leading-snug`. Small but heavy — density is carried by weight, not size.
- **Body Text:** Regular (400), **16 px (`text-base`)** for long-form prose, **14 px
  (`text-xs`)** as the absolute floor for anything a visitor must read in order to act,
  relaxed line-height (1.6–1.7).
  *Revised from `text-xs → text-sm` (12–14 px).* 12 px body is below comfortable reading
  size and was the single largest reason the site read as unpolished: 83 of its text sizes
  were `text-xs`, which put testimonial quotes, FAQ answers and the About paragraphs at
  12 px. `text-xs` is redefined to 14 px in `layout.css`, so the floor holds site-wide.
- **Micro-labels / Eyebrows:** Bold (700), **12 px (`text-label`) uppercase**,
  `tracking-wider` to `tracking-widest`. Used for form labels, footer column headers, card
  tags, filter chips, and button text. This tracked-wide-caps treatment is the single most
  repeated typographic signature in the system.
  *Revised from 10–11 px.* The treatment is unchanged; the size moved to a named 12 px step
  because 10–11 px is at the edge of legibility on a high-DPI phone, and a signature is not
  worth a visitor squinting.
- **Prices:** Bold (700), `text-xs`, in Charcoal Ink, with the "Start from" line above at
  `text-label` Warm Gray and the "/Person" suffix at `text-label` regular — a three-tier
  micro-hierarchy inside one card corner.

### Spacing & Letter-spacing Principles
- Big headlines tighten (`tracking-tight`); small uppercase labels open up (`tracking-wider`). Never invert this.
- The brand wordmark stacks three lines at decreasing size and constant tracking — `BANGGAI` (14 px bold) / `ESCAPE` (12 px semibold) / `FOR GROUP` (8 px medium), all uppercase `tracking-wider`.
- Line-height is generous for long copy (1.6–1.7) and tight for headlines (1.15) and card titles (`leading-snug`).

---

## 4. Component Stylings

### Buttons
- **Shape:** Overwhelmingly **pill-shaped** (`rounded-full`) — soft, modern, and touch-generous. Small icon-only actions are perfectly circular (`w-10 h-10`). Deliberate exceptions: the square-ish `rounded-md` logo tile, `rounded-lg`/`rounded-xl` inputs and mobile toggles.
- **Primary CTA — "Gilded Pill":** Gold champagne gradient fill, `text-stone-900` (dark ink, never white — the gold is too light), `font-bold text-xs uppercase tracking-wider`, padding `px-5–8 py-2.5–3.5`, plus the colored glow shadow `0 2px 10px rgba(200,153,56,0.35)`. Examples: "CONTACT US", "BOOK YOUR TRIP".
- **Hover:** darkens to Gold Pressed (#966F41) with a 200 ms ease transition. The glow persists so the button never goes flat.
- **Secondary — "Forest Pill":** Forest Mid (#214538) fill, white text, `font-semibold text-xs`, `px-4 py-2.5`, always paired with a trailing `fa-arrow-right` at 10 px. Used for the repeating "View all packages / destinations / articles" affordance. Hovers to `stone-800`.
- **Tertiary — Ghost Link:** Bare text in `font-bold text-xs` with a 10 px arrow icon; hovers from Charcoal Ink to the emerald-green link color. Used for "Read More", "View Details".
- **On-image Icon Button:** `w-10 h-10` circle, `rgba(0,0,0,0.6)` with backdrop blur, white glyph; inverts to white fill with dark glyph on hover.
- **Focus:** 2 px ring in Gilded Gold (`focus:ring-2 focus:ring-goldAccent`) on nav/mobile controls; inputs use the gold glow instead (below).

### Cards & Containers
- **Corner Style:** Content cards use **generously rounded corners** (`rounded-2xl`, 16 px). Showcase/image-led cards step up to **`rounded-3xl`** (24 px) for a softer, editorial feel. Chips are either fully pill-shaped or a crisp 4 px `rounded`.
- **Surface:** Warm sand, held apart from the page ground by a **1 px hairline border** (`#E9E2D6` / `stone-200`), *not* by shadow — a card is a card because of its edge, not its fill.
- **Shadow Strategy:** Nearly flat at rest (`shadow-sm` / `shadow-xs`). On hover the card lifts to `shadow-md` and the image scales to 105 % over 300–500 ms — motion, not darkness, communicates interactivity.
- **Image Treatment:** Image occupies the top of the card (`h-44` for package/article cards, `h-64–72` for destination showcases) and is **full-bleed to the card edges** with `object-cover` and `overflow-hidden` on the container.
- **Floating Badges:** `bg-black/60 backdrop-blur-xs`, white, 10 px semibold, `rounded-full`, `px-2 py-0.5`, pinned 12 px from the image corners (e.g. duration top-left, group size top-right).
- **Internal Padding:** `p-4`–`p-5` (16–20 px) for compact cards. Footer columns are denser still.
- **Card Footer Row:** a `border-t border-stone-100` divider with the meta row beneath it is the standard "View Details" foot — keeps cards visually aligned when body copy varies in length.
- **Dark Cards:** on dark bands, cards use Forest Mid / `#11221B` fills with `border-emerald-900/60` hairlines instead of white. Dark cards that sit on light pages — the sticky booking widget on package details and the blog's "Talk to a Specialist" panel — use **Deep Forest Green (#18342A)**, the same field as the header, so the system's two dark surfaces read as one.

### Navigation
- **Bar:** Fixed to the top (`fixed top-0 z-50`), 80 px tall (`h-20`), Deep Forest Green field, `border-b #2C5346/40`, `shadow-sm`; content constrained to `max-w-7xl mx-auto px-6`.
- **Logo Lockup:** 40 px `rounded-md` warm sand tile holding a "BE" monogram in extrabold Deep Forest, beside the three-line uppercase wordmark described above.
- **Links:** `text-sm font-medium`, `space-x-8`. Idle state is `stone-300`; hover goes warm sand; the **active page is Gilded Gold** — gold is the wayfinding color, not an underline.
- **Utility Cluster:** A language selector chip (Indonesian flag + "EN" + chevron) in a `rounded` `hover:bg-white/5` container, followed by the gold "CONTACT US" pill.
- **Mobile (≤lg):** Off-canvas drawer sliding in from the **right** (`w-4/5 max-w-sm`), Deep Forest fill, `shadow-2xl`, over a `bg-black/60 backdrop-blur-sm` scrim. Trigger is a `fa-bars` button in a `rounded-lg hover:bg-white/10` target; closes on backdrop click, link click, or `Escape`. Body scroll is locked while open and `aria-expanded` is maintained on the trigger.

### Inputs & Forms
- **Stroke:** 1 px Cool Granite (#E3DACB) at rest; resting fill is Warm Sand (#F7F3ED), `transition: all 0.2s ease`.
- **Corner Style:** `rounded-xl` (12 px) for standalone fields — one notch softer than cards but firmer than the pill buttons.
- **Focus State:** border shifts to the bronze family (#966F41) plus the soft outer glow `0 0 0 3px rgba(180, 138, 90, 0.2)`. The gold ring is the only focus treatment in the system.
- **Padding & Iconography:** `py-3` with `pl-10` when a leading icon is present (`pl-3.5` for the inline phone/prefix variant); `text-sm`, `placeholder-gray-400`. Textareas are `resize-none` at `rows="4"`.
- **Labels:** positioned **above** the field, `text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-2` — same micro-label voice used everywhere else.
- **Layout:** two-column name/email pairs on desktop, full-width message, `space-y` stacking with a gold submit pill.

### Recurring Patterns
- **Section Header Row:** left-aligned H2 + 12 px Warm Gray subtitle, with a Forest Pill "View all →" aligned to the right baseline (`flex items-end justify-between`). Appears above every content grid.
- **Eyebrow Chip:** small `rounded-full` pill with a gold dot + 12 px emerald-tinted label, e.g. "New summer destinations added" on the hero.
- **Stats / Attribute Row:** inline `gap-4` cluster of `text-label` `stone-500` items, each prefixed by a 10 px gold or emerald icon.
- **FAQ Accordion:** `divide-y divide-stone-200` rows; `text-sm` bold question with a `fa-chevron-down/up` toggle at the right, 16 px `stone-500` answer with relaxed leading below.
- **Testimonial / Info Tiles:** warm sand tiles with hairline borders and a small circular avatar or icon badge.

---

## 5. Layout Principles

### Grid & Structure
- **Primary Container:** `max-w-7xl` (≈1280 px) with `px-6` (24 px) gutters — the frame for **every** route: listing bands, detail-page heroes, the footer and the article column. Narrower reading columns use `max-w-2xl`/`max-w-3xl` *inside* that frame for hero copy, CTAs, forms and long-form prose.
- **Content Grids:** Packages → **4-up** on large desktop (`lg:grid-cols-4`); Destinations → **2×2 showcase** (`md:grid-cols-2`); Blog/Travel Insights → **3-up** (`lg:grid-cols-3`); FAQ + supporting image → **7/5 split** inside a 12-column band.
- **Footer Grid:** 12-column at `lg`, collapsing to 2-column stacked: 5 cols brand block, 3 cols destinations, 2 cols menu, 2 cols contact.
- **Breakpoints in use:** 1 column on mobile → 2 columns at `sm`/`md` → full column count at `lg`. (`lg` is the pivot point for both grids and the header's desktop nav.)

### Whitespace Strategy
- **Section Rhythm:** `py-16` / `py-20` for standard content bands, `py-24` / `py-28` for hero and feature bands, `py-32` / `py-36` for the deepest hero banners. The system consistently mixes a 4-step vertical scale (64 / 80 / 96 / 112 px) rather than one fixed unit.
- **Single Ground:** every band sits on Warm Sand. Chapters are marked by a `border-t border-stone-200/60` hairline rather than a fill change, which keeps the long pages airy without introducing a second surface.
- **Hero Bands:** always extra-generous — `pt-28 md:pt-36 pb-20 md:pb-28` on the home hero, `py-24 md:py-32` on inner-page photographic heroes.
- **Density:** internal card padding stays tight (16–20 px) while *inter*-section distance stays large — dense cards, airy chapters. This contrast is deliberate.

### Alignment & Visual Balance
- **Text Alignment:** Left-aligned for all content and navigation (optimal for scanning long travel copy); centered exclusively in hero bands, CTA banners, and footer micro-copy.
- **Asymmetry:** Section header rows deliberately pair a leftweighted title block with a right-aligned action pill; the FAQ band pairs a tall text column against a single large image block.
- **Photography Weight:** image-to-text ratio is roughly 70/30 on listing pages and near 100 % on hero bands — the interface is a frame for the imagery, not a competitor to it.
- **Full-Bleed Moments:** the closing "Ready To Begin Your Next Adventure?" CTA and inner-page heroes break edge-to-edge out of the container to punctuate the page before the footer.
- **Reading Flow:** clear top-to-bottom storytelling — hero → value proposition → packages → destinations → FAQ → editorial → CTA → footer.

### Responsive Behavior & Touch
- **Mobile-first collapse:** grids reduce to a single column, the header becomes a right-side drawer, and the home booking bar reflows from a single `rounded-full` row on desktop into a stacked `rounded-2xl` panel on mobile. The language switcher stays in the fixed bar immediately left of the menu trigger at every breakpoint; the drawer carries only navigation and the gold CTA.
- **Touch Targets:** CTA pills carry `py-2.5–3.5` with `px-5–8`, comfortably clearing the 44 px minimum; icon-only circles are a full 40 px square.
- **Image Behavior:** `object-cover` everywhere with fixed-height frames, so images crop rather than reflow; hero photos use `center`/`center 60%` positioning to protect the subject.
- **Scroll-safe Header:** the fixed 80 px bar is compensated by hero top padding (`pt-28`+), so content never hides beneath it.

---

## 6. Design System Notes for Stitch Generation

Use this section verbatim as prompting context when generating new screens for Banggai Escape.

### Language to Use
- **Atmosphere:** "Deep-forest luxury eco-adventure; dark photographic hero band opening onto airy warm sand content"
- **Buttons:** "Pill-shaped" / "Gilded champagne gradient pill with a warm gold glow" (not "rounded-full" or "#B48A5A shadow")
- **Cards:** "Generously rounded corners with a hairline border, near-flat at rest, lifting softly with a slow image zoom on hover"
- **Shadows:** "Whisper-soft functional shadows and a colored gold glow on the primary CTA" (not "shadow-sm")
- **Spacing:** "Dense card interiors, airy chapter spacing" and "generous breathing room between sections"
- **Type:** "Tiny wide-tracked uppercase labels over restrained small body copy, with large extrabold headlines anchoring each band"

### Color References
Always name colors descriptively with their hex:
- Primary dark: "Deep Forest Green (#18342A)"
- Deepest ground: "Forest Abyss (#0F231C)"
- Secondary dark: "Forest Mid (#214538)"
- Accent / actions: "Gilded Gold (#B48A5A)" with "Gold Pressed (#966F41)" on hover
- Light surface: "Warm Sand (#F7F3ED)" — the only light ground; there are no cream or sand variants
- Text: "Charcoal Ink (#1F1F1F)" and "Warm Gray (#6B625A)"
- Structure: "Hairline Stone (#E9E2D6)" and "Cool Granite (#E3DACB)"

### Component Prompts
- "Create a fixed 80px navigation bar in Deep Forest Green (#18342A) with a warm sand rounded-monogram logo tile, `text-sm` medium links in warm stone gray, the active link in Gilded Gold (#B48A5A), a language chip, and a gold champagne-gradient pill CTA with a soft gold glow on the right."
- "Design a package card with generously rounded corners, a hairline border, a full-bleed 4:3 image with a slow hover zoom, floating glass badges for duration and group size, a bold 14px title, a three-tier price block, and a hairline divider with a 'View Details →' row at the bottom."
- "Design a destination showcase card with `rounded-3xl` corners, a tall full-bleed photo, a bottom-up charcoal scrim, a gold location pin with a white title, and a circular glass icon button in the bottom-right corner."
- "Create a full-bleed CTA banner: ocean photography under a deep-green gradient veil, a centered extrabold headline in white, and a gold champagne-gradient pill button."
- "Build a contact form with 11px uppercase bold labels above `rounded-2xl` inputs on a Warm Sand (#F7F3ED) fill, a 1px cool-gray border that shifts to gold with a soft gold outer glow on focus, and a gold submit pill."

### Incremental Iteration
1. Change **one component at a time** (e.g. "Update the package card meta row").
2. Be numeric and specific ("increase card interior padding from 16px to 20px").
3. Reference this file's vocabulary consistently — pull the descriptive color names and shadow language directly from Sections 2 and 4.

---

## 7. Implementation Notes (Current Build)

Tokens live in `src/routes/layout.css` (`@theme`) and are consumed directly by the SvelteKit components. Where the build has made a call, this is what it does.

### Surfaces
- **One light ground.** All page bands, cards, panels, chips and form fields are `bg-white` — which resolves to Warm Sand, never `#FFFFFF`.
- **No cool grays.** Earlier screens carried `bg-slate-50` bands, `bg-gray-50` tiles and `text-slate-*` copy. These are collapsed: section grounds are Warm Sand, and secondary text uses the warm `stone` family (`stone-300`/`stone-400` on dark forest, `stone-500`/`stone-600` on light).
- **Dark surfaces** remain Deep Forest Green with `border-forest-line` hairlines — the header, footer, sticky booking widget and the article "Talk to a Specialist" panel all share that field, so the system reads as one surface family.

### Frame & Rhythm
- **Page frame:** `mx-auto max-w-7xl px-6` on every route — listing bands, detail-page heroes, article columns and the footer all align to the same 1280 px frame with 24 px gutters.
- **Reading columns sit inside the frame:** `max-w-3xl` for destination prose and `max-w-2xl` for banners and hero copy; the article page splits the frame 8/4 between body and sticky aside.
- Vertical rhythm still comes from `.section` / `.section-wide` (64 / 80 / 96 / 112 px).

### Icons & Accents
- Iconography is loaded from CDN at **Font Awesome 6.7.2** (the X brand glyph requires ≥ 6.4.2).
- **Review stars are yellow** (`text-yellow-400`) — the single deliberate departure from Gilded Gold, so a rating reads as a rating rather than as brand chrome.
- Gold stays reserved for actions, wayfinding, prices and pins.

### Header
- The language switcher sits in the fixed bar, immediately before the menu trigger on mobile. Below `sm` there is no Contact pill in the bar — the drawer carries it.

### Mobile Patterns
- **Article contents bar.** The long-form article keeps its sticky desktop TOC in the aside, and on small screens hands the same list to a **fixed bar pinned directly under the header** (`top-20`, i.e. the 80px bar's height). Collapsed it is a single row — eyebrow, the section the reader is currently in, chevron — and it expands *downward* into a scrollable list, rotating the chevron to signal state. It carries a tap-to-dismiss scrim, Escape-to-close and a handle at the panel's lower edge, and it appears only while the article body is on screen so it never fights the footer. Active-section highlighting is a scroll spy, not a static first-item state: it measures each heading's own `scroll-margin-top` rather than hardcoding an offset, so it stays correct whether or not the bar is present. Article headings use `scroll-mt-36` on phones (clearing header + bar) and `lg:scroll-mt-28` once the bar is gone.
- **Package photo gallery.** The detail page's photo mosaic collapses on phones into a single **snap-scrolling strip** (CSS scroll snap, no carousel JS) with a peek of the next photo as the swipe affordance, plus a small numbered hint. From `md` up the same five images reflow into the designed 4-column mosaic — the column wrappers switch to `display: contents`, so only one set of images is ever in the DOM and never double-fetched.
- **Package booking bar.** The package detail page keeps its dark booking card in the aside; on small screens a **compact bottom bar** ("START FROM" price + one gold `Book Now` pill) slides up once the reader starts scrolling, and slides away the moment the full card is on screen — one CTA visible at a time, minimal information density, and a `env(safe-area-inset-bottom)` pad so the action clears the home indicator.
- Both bars are motion-based (`~250ms` slide) and sit below the 80px header (`z-40` vs `z-50`).

---

## Appendix — Canonical Token Reference

```jsonc
{
  "color": {
    "forestDeep":   "#18342A",  // header, footer, primary dark
    "forestAbyss":  "#0F231C",  // footer base, hero vignette floor
    "forestMid":    "#214538",  // secondary dark surfaces, dark pills
    "gold":         "#B48A5A",  // accent, CTAs, active nav, prices, pins
    "goldHover":    "#966F41",  // CTA hover/active
    "goldGradient": "linear-gradient(135deg, #C9A67C 0%, #9E7748 50%, #A87F50 100%)",
    "goldGlow":     "0 2px 10px rgba(200, 153, 56, 0.35)",
    "white":        "#F7F3ED",  // Warm Sand — the only light surface (page, bands, cards, inputs)
    "hairline":     "#E9E2D6",
    "granite":      "#E3DACB",
    "ink":          "#1F1F1F",
    "gray":         "#6B625A",
    "seaEmerald":   "#B48A5A",
    "alertCrimson": "#BD3D44",
    "infoSlate":    "#64748B",
    "scrimCard":    "linear-gradient(to top, rgba(0,0,0,0.80), rgba(0,0,0,0.20), transparent)",
    "heroVeil":     "linear-gradient(rgba(12,37,28,0.45), rgba(12,37,28,0.55))",
    "ctaVeil":      "linear-gradient(rgba(10,50,48,0.65), rgba(8,38,37,0.75))",
    "glassChip":    "rgba(0,0,0,0.60)"
  },
  "typography": {
    "fontSans":  "Plus Jakarta Sans, sans-serif",
    "icons":     "Font Awesome glyphs as inline SVG (generated)",
    "weights": { "body": 400, "medium": 500, "semibold": 600, "bold": 700, "extrabold": 800 },
    "scale": {
      "heroH1":   "30–60px / 1.15 / 800 / tracking-tight",
      "sectionH2":"24–30px / tight / 800",
      "cardH3":   "14px / 1.4 / 700",
      "body":     "16px / 1.6 / 400, 14px floor",
      "microLabel":"12px (text-label) / uppercase / 700 / tracking-wider"
    }
  },
  "shape": {
    "pill":   "rounded-full (buttons, badges, chips)",
    "card":   "rounded-2xl = 16px",
    "showcase":"rounded-3xl = 24px",
    "input":  "rounded-xl = 12px",
    "logo":   "rounded-md = 6px"
  },
  "layout": {
    "container":  "max-w-7xl mx-auto px-6",
    "readColumn": "max-w-2xl / max-w-3xl",
    "sectionPy":  ["64px", "80px", "96px", "112px"],
    "typeScale": {"label": "12px", "xs": "14px", "base": "16px"},
    "breakpoints":{ "sm": 640, "md": 768, "lg": 1024 }
  }
}
```
