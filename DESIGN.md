# Design System: BANGGAI ESCAPE WEB DESIGN
**Project ID:** 14189134410534936126
**Screens analyzed:** Home (Desktop), Packages, Package Details — Untouched Banggai Discovery, Destinations, Destination Details — Paisu Pok Lake, Blog, Blog Details — How to Get to Banggai Islands, About Us, Contact
**Source of truth:** `.stitch/designs/*.html` (+ `.stitch/designs/*.png`, `.stitch/metadata.json`)
**Device target:** Desktop-first, 2560px artboards, fully responsive

---

## 1. Visual Theme & Atmosphere

Banggai Escape is a **gilded eco-adventure travel house** — the visual language of a luxury expedition brochure translated into a fast, image-led website. Every page opens with a **dark, immersive photographic stage**: a deep-forest hero band or a full-bleed image veiled by a green-tinted gradient. Below it, the page "exhales" into **bright white and warm cream content fields** where thin hairline rules and whisper-soft shadows do the structural work instead of heavy chrome.

The mood is **weathered-luxury meets tropical documentary** — confident, editorial, and quietly premium rather than glossy or corporate. Deep jungle emerald (#18342A and its near-black siblings) is the constant; **brushed gold (#B48A5A)** is the only jewel, and it is rationed carefully: call-to-action pills, the active navigation item, prices, location pins, small icon touches, and section eyebrow dots. The palette reads as "forest canopy + palm oil lantern light."

The photography does the selling. Layouts are **gallery-first**: generous 4:3 and full-bleed hero image blocks, slow 300–500 ms scale-on-hover zooms, gradient scrims at image bottoms so white type can sit over water and karst. Typography is deliberately **small and restrained** — body copy runs at 12–14 px, captions and metadata at 10–11 px uppercase with wide letter-spacing — so images, not text, carry the emotional weight. Headlines alone go large (30–60 px extrabold) to anchor each band.

**Key Characteristics**
- Dark-forest "curtain" hero bands opening onto white/cream content
- Rationed brushed-gold accent reserved for actions and wayfinding
- Pill-dominant geometry — 167 `rounded-full` instances vs. only 9 `rounded-3xl`
- Photography-first cards with slow, confident hover zooms
- Tiny uppercase micro-labels with wide tracking as a recurring signature
- Thin hairline borders + soft functional shadows instead of hard depth
- Editorial, patient pacing: alternating white ↔ cream sections with 64–112 px vertical breathing room

---

## 2. Color Palette & Roles

### Foundation — The Forest Family
- **Deep Forest Green (#18342A)** — The primary brand color. Fixed header bar, footer field, inner-page hero overlay base, dark pill buttons. Appears on every screen.
- **Forest Abyss (#0F231C)** — Reduced, near-black green for the footer base, hero vignette bottom, and deep card fills on dark surfaces. Used sparingly to add weight without introducing a second hue.
- **Forest Mid (#214538)** — Secondary dark surface: embedded dark pills ("View all packages"), dark card fills, hero glow mid-stop. One step lighter than the base so dark-on-dark layering stays legible.

### Accent — The Gold Family
- **Gilded Gold (#B48A5A)** — *The* accent. Primary CTAs, active nav state, section eyebrow dots, location pins, icons inside contact rows, price emphasis. Never used for body text or large fills.
- **Gold Pressed (#966F41)** — Hover/active shade of the primary CTA. The only permitted darkening of the gold.
- **Gold Champagne Gradient** — The signature CTA finish: `linear-gradient(135deg, #C9A67C 0%, #9E7748 50%, #A87F50 100%)`, wrapped in a **colored glow shadow** `0 2px 10px rgba(200, 153, 56, 0.35)`. This is what makes the main button feel metallic rather than flat.

### Light Surfaces
- **Warm Sand (#F7F3ED)** — Default page and card background; the dominant content surface.
- **Coastal Cream (#F7F3ED)** — Alternating section band and card fill; introduces a barely-perceptible warmth so consecutive white sections still read as separate.
- **Sand Paper (#F1EAE0)** — Warmer cream used for the editorial/package body areas and tag chips.
- **Input Sand (#F7F3ED)** — Form field resting fill; lifts to warm sand on focus.

### Text, Lines & Structure
- **Charcoal Ink (#1F1F1F)** — Body and headline text on light surfaces (page base is `#1a1a1a`; Tailwind's `stone-900` #1C1917 stands in for headlines).
- **Warm Gray (#6B625A)** — Secondary/body copy, descriptions, supporting metadata. Creates hierarchy without harsh contrast.
- **Hairline Stone (#E9E2D6)** — Soft borders, card outlines, dividers on cream.
- **Cool Granite (#E3DACB)** — Form field borders and neutral chips; pairs with `#F7F3ED` panel fills.

### Functional / Semantic
- **Sea Emerald (#B48A5A)** — Confirmation cues and nature attributes (the leaf icon on "Open Trip" package meta).
- **Alert Crimson (#BD3D44)** — Errors, warnings, and the only "loud" non-gold accent in the system. Rare.
- **Info Slate (#64748B)** — Neutral system messaging and metadata.

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

**Iconography:** Font Awesome 6.4.0 (`fa-solid`, `fa-regular`, `fa-brands`) loaded from CDN. Icons are always small (10–14 px), tinted with gold or the local text color, and frequently sit inline with 10–11 px uppercase labels.

### Hierarchy & Weights
- **Display / Hero (H1):** Extrabold (800), `tracking-tight`, 3 steps (`text-3xl → text-5xl → text-6xl`, ≈30–60 px), line-height ≈1.15. Centered on hero bands with a soft `drop-shadow-md` when sitting over photography.
- **Section Headers (H2):** Extrabold (800), `tracking-tight`, `text-2xl → text-3xl` (24–30 px) on light bands; `text-3xl → text-4xl/5xl` when it's a full-bleed banner headline. Left-aligned in content grids, centered in banners.
- **Card / Item Titles (H3):** Bold (700), `text-sm` (14 px), `leading-snug`. Small but heavy — density is carried by weight, not size.
- **Body Text:** Regular (400), `text-xs → text-sm` (12–14 px), relaxed line-height (1.6–1.7). Intentionally compact; the photography supplies the visual scale.
- **Micro-labels / Eyebrows:** Bold (700), **10–11 px uppercase**, `tracking-wider` to `tracking-widest`. Used for form labels, footer column headers, card tags, filter chips, and button text. This tiny-wide-caps treatment is the single most repeated typographic signature in the system.
- **Prices:** Bold (700), `text-xs`, in Charcoal Ink, with the "Start from" line above in a 11 px Warm Gray and the "/Person" suffix dropped to 10 px regular — a three-tier micro-hierarchy inside one card corner.

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
- **Surface:** Warm sand on cream/sand bands, defined by a **1 px hairline border** (`#E9E2D6` / `stone-200`), *not* by shadow.
- **Shadow Strategy:** Nearly flat at rest (`shadow-sm` / `shadow-xs`). On hover the card lifts to `shadow-md` and the image scales to 105 % over 300–500 ms — motion, not darkness, communicates interactivity.
- **Image Treatment:** Image occupies the top of the card (`h-44` for package/article cards, `h-64–72` for destination showcases) and is **full-bleed to the card edges** with `object-cover` and `overflow-hidden` on the container.
- **Floating Badges:** `bg-black/60 backdrop-blur-xs`, white, 10 px semibold, `rounded-full`, `px-2 py-0.5`, pinned 12 px from the image corners (e.g. duration top-left, group size top-right).
- **Internal Padding:** `p-4`–`p-5` (16–20 px) for compact cards. Footer columns are denser still.
- **Card Footer Row:** a `border-t border-stone-100` divider with the meta row beneath it is the standard "View Details" foot — keeps cards visually aligned when body copy varies in length.
- **Dark Cards:** on dark bands, cards use Forest Mid / `#11221B` fills with `border-emerald-900/60` hairlines instead of white.

### Navigation
- **Bar:** Fixed to the top (`fixed top-0 z-50`), 80 px tall (`h-20`), Deep Forest Green field, `border-b #2C5346/40`, `shadow-sm`; content constrained to `max-w-7xl mx-auto px-6`.
- **Logo Lockup:** 40 px `rounded-md` cream tile holding a "BE" monogram in extrabold Deep Forest, beside the three-line uppercase wordmark described above.
- **Links:** `text-sm font-medium`, `space-x-8`. Idle state is `stone-300`; hover goes warm sand; the **active page is Gilded Gold** — gold is the wayfinding color, not an underline.
- **Utility Cluster:** A language selector chip (Indonesian flag + "EN" + chevron) in a `rounded` `hover:bg-white/5` container, followed by the gold "CONTACT US" pill.
- **Mobile (≤lg):** Off-canvas drawer sliding in from the **right** (`w-4/5 max-w-sm`), Deep Forest fill, `shadow-2xl`, over a `bg-black/60 backdrop-blur-sm` scrim. Trigger is a `fa-bars` button in a `rounded-lg hover:bg-white/10` target; closes on backdrop click, link click, or `Escape`. Body scroll is locked while open and `aria-expanded` is maintained on the trigger.

### Inputs & Forms
- **Stroke:** 1 px Cool Granite (#E3DACB) at rest; resting fill is Input Sand (#F7F3ED), `transition: all 0.2s ease`.
- **Corner Style:** `rounded-xl` (12 px) for standalone fields — one notch softer than cards but firmer than the pill buttons.
- **Focus State:** fill brightens to warm sand, border shifts to the bronze family (#966F41), plus the soft outer glow `0 0 0 3px rgba(180, 138, 90, 0.2)`. The gold ring is the only focus treatment in the system.
- **Padding & Iconography:** `py-3` with `pl-10` when a leading icon is present (`pl-3.5` for the inline phone/prefix variant); `text-sm`, `placeholder-gray-400`. Textareas are `resize-none` at `rows="4"`.
- **Labels:** positioned **above** the field, `text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-2` — same micro-label voice used everywhere else.
- **Layout:** two-column name/email pairs on desktop, full-width message, `space-y` stacking with a gold submit pill.

### Recurring Patterns
- **Section Header Row:** left-aligned H2 + 12 px Warm Gray subtitle, with a Forest Pill "View all →" aligned to the right baseline (`flex items-end justify-between`). Appears above every content grid.
- **Eyebrow Chip:** small `rounded-full` pill with a gold dot + 12 px emerald-tinted label, e.g. "New summer destinations added" on the hero.
- **Stats / Attribute Row:** inline `gap-4` cluster of 10–11 px `stone-500` items, each prefixed by a 10 px gold or emerald icon.
- **FAQ Accordion:** `divide-y divide-stone-200` rows; 12–14 px bold question with a `fa-chevron-down/up` toggle at the right, 12 px `stone-500` answer with relaxed leading below.
- **Testimonial / Info Tiles:** cream tiles with hairline borders and a small circular avatar or icon badge.

---

## 5. Layout Principles

### Grid & Structure
- **Primary Container:** `max-w-7xl` (≈1280 px) with `px-6` (24 px) gutters — used 38 times and the default frame for every content band. Narrower reading columns use `max-w-2xl`/`max-w-3xl` for hero copy, CTAs and forms.
- **Content Grids:** Packages → **4-up** on large desktop (`lg:grid-cols-4`); Destinations → **2×2 showcase** (`md:grid-cols-2`); Blog/Travel Insights → **3-up** (`lg:grid-cols-3`); FAQ + supporting image → **7/5 split** inside a 12-column band.
- **Footer Grid:** 12-column at `lg`, collapsing to 2-column stacked: 5 cols brand block, 3 cols destinations, 2 cols menu, 2 cols contact.
- **Breakpoints in use:** 1 column on mobile → 2 columns at `sm`/`md` → full column count at `lg`. (`lg` is the pivot point for both grids and the header's desktop nav.)

### Whitespace Strategy
- **Section Rhythm:** `py-16` / `py-20` for standard content bands, `py-24` / `py-28` for hero and feature bands, `py-32` / `py-36` for the deepest hero banners. The system consistently mixes a 4-step vertical scale (64 / 80 / 96 / 112 px) rather than one fixed unit.
- **Alternating Ground:** sections alternate Warm Sand ↔ Coastal Cream (with a `border-t border-stone-200/60` hairline marking the switch), which is what gives the long pages their chaptered feel.
- **Hero Bands:** always extra-generous — `pt-28 md:pt-36 pb-20 md:pb-28` on the home hero, `py-24 md:py-32` on inner-page photographic heroes.
- **Density:** internal card padding stays tight (16–20 px) while *inter*-section distance stays large — dense cards, airy chapters. This contrast is deliberate.

### Alignment & Visual Balance
- **Text Alignment:** Left-aligned for all content and navigation (optimal for scanning long travel copy); centered exclusively in hero bands, CTA banners, and footer micro-copy.
- **Asymmetry:** Section header rows deliberately pair a leftweighted title block with a right-aligned action pill; the FAQ band pairs a tall text column against a single large image block.
- **Photography Weight:** image-to-text ratio is roughly 70/30 on listing pages and near 100 % on hero bands — the interface is a frame for the imagery, not a competitor to it.
- **Full-Bleed Moments:** the closing "Ready To Begin Your Next Adventure?" CTA and inner-page heroes break edge-to-edge out of the container to punctuate the page before the footer.
- **Reading Flow:** clear top-to-bottom storytelling — hero → value proposition → packages → destinations → FAQ → editorial → CTA → footer.

### Responsive Behavior & Touch
- **Mobile-first collapse:** grids reduce to a single column, the header becomes a right-side drawer, and the home booking bar reflows from a single `rounded-full` row on desktop into a stacked `rounded-2xl` panel on mobile.
- **Touch Targets:** CTA pills carry `py-2.5–3.5` with `px-5–8`, comfortably clearing the 44 px minimum; icon-only circles are a full 40 px square.
- **Image Behavior:** `object-cover` everywhere with fixed-height frames, so images crop rather than reflow; hero photos use `center`/`center 60%` positioning to protect the subject.
- **Scroll-safe Header:** the fixed 80 px bar is compensated by hero top padding (`pt-28`+), so content never hides beneath it.

---

## 6. Design System Notes for Stitch Generation

Use this section verbatim as prompting context when generating new screens for Banggai Escape.

### Language to Use
- **Atmosphere:** "Deep-forest luxury eco-adventure; dark photographic hero band opening onto airy white and cream content"
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
- Light surfaces: "Warm Sand (#F7F3ED)", "Coastal Cream (#F7F3ED)", "Sand Paper (#F1EAE0)"
- Text: "Charcoal Ink (#1F1F1F)" and "Warm Gray (#6B625A)"
- Structure: "Hairline Stone (#E9E2D6)" and "Cool Granite (#E3DACB)"

### Component Prompts
- "Create a fixed 80px navigation bar in Deep Forest Green (#18342A) with a cream rounded-monogram logo tile, `text-sm` medium links in warm stone gray, the active link in Gilded Gold (#B48A5A), a language chip, and a gold champagne-gradient pill CTA with a soft gold glow on the right."
- "Design a package card with generously rounded corners, a hairline border, a full-bleed 4:3 image with a slow hover zoom, floating glass badges for duration and group size, a bold 14px title, a three-tier price block, and a hairline divider with a 'View Details →' row at the bottom."
- "Design a destination showcase card with `rounded-3xl` corners, a tall full-bleed photo, a bottom-up charcoal scrim, a gold location pin with a white title, and a circular glass icon button in the bottom-right corner."
- "Create a full-bleed CTA banner: ocean photography under a deep-green gradient veil, a centered extrabold headline in white, and a gold champagne-gradient pill button."
- "Build a contact form with 11px uppercase bold labels above `rounded-2xl` inputs on a sand (#F7F3ED) fill, a 1px cool-gray border that shifts to gold with a soft gold outer glow on focus, and a gold submit pill."

### Incremental Iteration
1. Change **one component at a time** (e.g. "Update the package card meta row").
2. Be numeric and specific ("increase card interior padding from 16px to 20px").
3. Reference this file's vocabulary consistently — pull the descriptive color names and shadow language directly from Sections 2 and 4.

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
    "white":        "#F7F3ED",
    "cream":        "#F7F3ED",  // alternate sections, card fills
    "sand":         "#F1EAE0",  // editorial/package bodies, chips
    "inputFill":    "#F7F3ED",
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
    "icons":     "Font Awesome 6.4.0",
    "weights": { "body": 400, "medium": 500, "semibold": 600, "bold": 700, "extrabold": 800 },
    "scale": {
      "heroH1":   "30–60px / 1.15 / 800 / tracking-tight",
      "sectionH2":"24–30px / tight / 800",
      "cardH3":   "14px / 1.4 / 700",
      "body":     "12–14px / 1.6–1.7 / 400",
      "microLabel":"10–11px / uppercase / 700 / tracking-wider"
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
    "breakpoints":{ "sm": 640, "md": 768, "lg": 1024 }
  }
}
```
