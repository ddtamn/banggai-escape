/**
 * What a card's image actually occupies, in CSS pixels, at each breakpoint.
 *
 * A `srcset` is resolved against `sizes`, not the viewport. Getting this wrong is the quiet
 * way to throw the whole saving away: a browser told "the viewport is 1280px" picks the
 * 1600w candidate for a card that renders 384px wide, and the site ends up serving the
 * largest file it has.
 *
 * The numbers come from the grids the cards sit in, which `DESIGN.md` fixes: packages are
 * four-up on large desktop, destinations a two-up showcase, blog three-up. Each is inside the
 * `max-w-7xl` shell with 24px gutters.
 */
export const CARD_SIZES = {
	/** Packages — 4-up at `lg`, 2-up at `sm`, full width below. */
	fourUp: '(min-width: 1024px) 384px, (min-width: 640px) 50vw, 100vw',
	/** Destinations — 2-up at `md`, full width below. */
	twoUp: '(min-width: 768px) 600px, 100vw',
	/** Blog — 3-up at `lg`, 2-up at `sm`, full width below. */
	threeUp: '(min-width: 1024px) 426px, (min-width: 640px) 50vw, 100vw',
	/** A full-bleed image: hero, article body, gallery tile. */
	full: '100vw',
	/** A small round avatar, which is already tiny at 1x. */
	avatar: '(min-width: 1024px) 72px, 36px',
} as const;
