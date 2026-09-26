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
 *
 * The two fractional entries are the *same* shell measured against a column of a 12-column
 * grid, not against the viewport — which is the mistake `sizes` most often invites. The shell
 * stops growing at 1280px, so past that point a fixed pixel figure is correct and `vw` is not.
 */
export const CARD_SIZES = {
	/** Packages — 4-up at `lg`, 2-up at `sm`, full width below. */
	fourUp: '(min-width: 1024px) 384px, (min-width: 640px) 50vw, 100vw',
	/** Destinations — 2-up at `md`, full width below. */
	twoUp: '(min-width: 768px) 600px, 100vw',
	/** Blog — 3-up at `lg`, 2-up at `sm`, full width below. */
	threeUp: '(min-width: 1024px) 426px, (min-width: 640px) 50vw, 100vw',
	/** 5 of 12 columns — the image beside the FAQ list. Single column below `md`. */
	fiveTwelfths:
		'(min-width: 1280px) 513px, (min-width: 1024px) 407px, (min-width: 768px) 300px, 100vw',
	/** 6 of 12 columns — the image beside the contact form. Single column below `lg`. */
	sixTwelfths: '(min-width: 1280px) 616px, (min-width: 1024px) 488px, 100vw',
	/**
	 * Half the shell — a 2-up grid that starts at `md`.
	 *
	 * Not the same as `twoUp`, which is the destinations showcase: that one is a 600px tile
	 * from `md`, this one is half the shell, which is only 360px at the same width. Reusing the
	 * name would have a browser fetch the 800w candidate for a 360px slot.
	 */
	halfShell:
		'(min-width: 1280px) 616px, (min-width: 1024px) 488px, (min-width: 768px) 360px, 100vw',
	/** A full-bleed image: hero, article body, gallery tile. */
	full: '100vw',
	/**
	 * A small round avatar, which is already tiny at 1x.
	 *
	 * Deliberately paired with images that are *not* given a `srcset`: the smallest candidate
	 * `IMAGE_WIDTHS` offers is 400w, which is larger than the avatar's own source. Offering a
	 * browser a choice here can only make it pick the bigger file.
	 */
	avatar: '(min-width: 1024px) 72px, 36px',
} as const;
