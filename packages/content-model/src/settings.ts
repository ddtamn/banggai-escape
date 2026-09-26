/**
 * The site's own content: brand and contact details, chrome, and the shared editorial
 * blocks that appear on more than one page.
 *
 * `site_settings` is a known-key table rather than a general key/value store, so a typo
 * in a key is a validation failure instead of a silently ignored row.
 */
import { z } from 'zod';
import { authoredMediaSchema, mediaIdSchema, type RenderedMedia } from './content';

/**
 * Setting fields whose value is a media reference. `avatar` sits inside each testimonial,
 * so the walker matches on field name rather than on a fixed path.
 */
export const mediaSettingFieldNames = ['avatar'] as const;

/**
 * Settings whose *entire* value is a media reference. `ctaBackground` is named here and
 * not above because there is no field to match on: the value at the JSON root *is* the
 * ref, so a name-matching walker would silently skip it.
 */
export const mediaSettingKeys = ['ctaBackground'] as const;

export type MediaSettingKey = (typeof mediaSettingKeys)[number];

/** Whether a setting's value is a media reference at the root. */
export function isMediaSettingKey(key: string): key is MediaSettingKey {
	return (mediaSettingKeys as readonly string[]).includes(key);
}

export const siteProfileSchema = z.strictObject({
	name: z.string().min(1),
	tagline: z.string().min(1),
	locale: z.string().min(1),
	phone: z.string().min(1),
	/** `tel:` link built from `phone`. */
	phoneHref: z.string().min(1),
	/**
	 * The WhatsApp number enquiries are handed to, as digits and a country code with no
	 * `+` or spacing — the only shape `wa.me` accepts.
	 *
	 * It is stored rather than derived from `contactChannels` on purpose. Deriving it
	 * would mean searching authored prose for whichever entry happens to mention WhatsApp
	 * today, and the day someone reworded that entry the booking bar would quietly stop
	 * working. A field an editor can see and change is worth more than a clever lookup.
	 *
	 * Kept permissive here — the shape is a hint, not a promise — because `$lib/enquiry`
	 * re-normalises it and returns `null` for anything it cannot use, which is handled as
	 * a described state rather than a crash.
	 */
	whatsapp: z.string().min(1),
	email: z.string().min(1),
	address: z.array(z.string().min(1)).min(1),
	reviewCount: z.number().int().nonnegative(),
});

export type SiteProfile = z.infer<typeof siteProfileSchema>;

/**
 * Every page-copy field carries the copy it replaces as its default.
 *
 * This is a deliberate reversal of how the rest of this file is written, and the reason is
 * the deploy. A `strictObject` field with no default is a field the stored value must have, so
 * a schema that gains one takes the site down — every page that reads the setting returns 500 —
 * from the moment it is deployed until the data catches up. That is not theoretical: adding
 * `site.whatsapp` without seeding production first did exactly that, and `sitemap.xml` answering
 * 200 while every page answered 500 was the only clue to which half had been deployed.
 *
 * A default inverts that. A row that omits the field parses, the current copy renders, and the
 * migration becomes a convenience — it makes the existing values explicit and editable — rather
 * than a precondition for the site existing. Adding a page-copy field in future is then a
 * one-line change that cannot take anything down.
 *
 * The trade is that a defaulted field is optional as far as the contract is concerned, so
 * nothing *forces* an editor to fill it in. That is the right way round: the page renders
 * sensible copy either way, and the schema's job is to reject nonsense, not to enforce
 * completeness on a page that already reads correctly.
 */
const copy = (value: string) => z.string().min(1).default(value);

/**
 * A nested copy object that may be absent entirely.
 *
 * `.prefault({})` rather than `.default({})`, and the difference is the whole point. A Zod
 * `.default()` returns its value *without parsing it*, so `.default({})` on a section would
 * hand back a bare `{}` — an object with none of the fields the shape declares, which then
 * fails the moment anything reads it. `.prefault({})` runs the default *through* the schema, so
 * an absent section arrives as a fully populated one and every leaf default applies.
 *
 * Without this, `homePage.safeParse({})` fails on all seven sections and the deploy-safety
 * property above is fiction.
 */
const section = <Shape extends z.ZodRawShape>(shape: Shape) =>
	// The `as never` is what lets `prefault({})` typecheck. `prefault` wants a value of the
	// schema's *input* type, and every field in these shapes has a default, so the honest input
	// is `{}` — but the mapped type Zod infers for "all fields optional" is not `{}`, so it
	// rejects it. This is the one place the cast is made, and it is checked at runtime by
	// `settings-copy.spec.ts`, which parses `{}` and asserts every field came back populated.
	z.strictObject(shape).prefault({} as never);

/** The closing invitation that appears at the foot of every page. */
export const siteCtaSchema = z
	.strictObject({
		/**
		 * `\n` is a line break, which is how the banner's two-line lockup is expressed. Stored as
		 * one string rather than two fields so an editor can rewrap it without two edits that can
		 * disagree.
		 */
		title: copy('Ready To Begin Your\nNext Adventure?'),
		text: copy('Let Banggai Escape design your perfect journey today.'),
		ctaLabel: copy('Book your trip'),
	})
	// The object itself is prefaulted as well as its fields, so an *absent* value is also the
	// current copy. That is defence in depth rather than redundancy: `loadSiteSettings` refuses
	// a key with no row at all, and it does so before it parses anything, so the loud failure
	// that caught the `whatsapp` outage is untouched. This is the second line — it means a
	// future change to that check cannot quietly take the site down instead.
	.prefault({});

export type SiteCta = z.infer<typeof siteCtaSchema>;

/** One titled band on the home page: a heading, an optional standfirst, an optional link. */
const homeSectionShape = {
	title: copy('Section'),
	/** Absent means the band has no standfirst, rather than an empty one. See `heroSubtitle`. */
	subtitle: z.string().min(1).optional(),
	actionLabel: z.string().min(1).optional(),
};

/**
 * The home page's own words.
 *
 * Split by the band it appears in rather than flattened, because that is how an editor thinks
 * about it: "the packages band says X" is a question with an answer, and "field 7 says X" is
 * not. `subtitle` and `actionLabel` are optional per band because the design genuinely differs —
 * two of the six have no standfirst, and one has no link.
 */
/**
 * The two About paragraphs, as the copy they replace. Held in a constant because both the
 * schema default and the `prefault` that fills an absent `body` need them, and a paragraph
 * duplicated in two places is a paragraph that will be edited in one of them.
 *
 * Checked at runtime by `apps/web/src/lib/settings-copy.spec.ts`, which is where the
 * content-model package's behaviour is tested — the package itself has no test runner, only
 * `tsc --noEmit`.
 */
const ABOUT_BODY: string[] = [
	'At Banggai Escape, we are a team of local experts dedicated to sharing the untouched wonder of the Banggai Archipelago. Born from a deep passion for our home, we design seamless, personalized journeys that showcase vibrant marine life, pristine islands, and rich culture—all delivered with authentic warmth, safety, and comfort.',
	'Travel is more than visiting a destination; it is about creating unforgettable stories. Banggai Escape was founded to bridge curious travelers with Central Sulawesi’s most breathtaking hidden paradise. With seasoned local guides, flexible itineraries, and dedicated support, we ensure every moment of your journey is effortless and extraordinary.',
];

export const homePageCopySchema = z
	.strictObject({
		/** How this page describes itself to a crawler and to a share sheet. */
		seoTitle: copy('Banggai Escape — Discover Banggai, Escape The Ordinary'),
		seoDescription: copy(
			'Banggai Escape designs seamless island journeys across the Banggai Archipelago in Central Sulawesi — mirror lakes, reef sanctuaries, and authentic local hospitality.',
		),
		/** The pill above the headline. */
		badge: copy('New summer destinations added'),
		/** The `h1`. `\n` is a line break. */
		heading: copy('Discover Banggai\nEscape The Ordinary'),
		/** The paragraph under it. */
		intro: copy(
			'Embrace the natural beauty, culture, and heart of Banggai. Your journey begins with Banggai Escape.',
		),
		packages: section({
			...homeSectionShape,
			title: copy('The Banggai Experience'),
			subtitle: copy('Seamless planning, curated stays, and support at every step'),
			actionLabel: copy('View all packages'),
		}),
		destinations: section({
			...homeSectionShape,
			title: copy('Curated Destinations\nby Banggai Escape'),
			actionLabel: copy('View all destinations'),
		}),
		features: section({
			...homeSectionShape,
			title: copy('The Reason Travelers\nChoose Banggai Escape'),
		}),
		about: section({
			...homeSectionShape,
			title: copy('About us'),
			subtitle: copy(
				'Born from a deep passion for sharing the untouched magic and legendary warmth of Banggai.',
			),
			/**
			 * The two body paragraphs, in order.
			 *
			 * `min(2)` because the layout is a two-column grid with one paragraph each: a stored
			 * value of one would render a hole in the second column. Its own explicit `prefault`
			 * is required because `body` exists only on this band, so the shared `section()`
			 * helper — which knows only the fields it was handed — would leave it out.
			 */
			body: z.array(z.string().min(1)).min(2).prefault(ABOUT_BODY),
			actionLabel: copy('Learn More About Us'),
		}),
		testimonials: section({
			...homeSectionShape,
			title: copy('The Banggai Escape\nIn Their Words'),
		}),
		faqs: section({
			...homeSectionShape,
			title: copy('Everything you need to know about planning your seamless Banggai experience.'),
		}),
		insights: section({
			...homeSectionShape,
			title: copy('Travel Insights'),
			subtitle: copy(
				'Explore our curated journal for local secrets, travel inspiration, and practical tips for your next escape.',
			),
			actionLabel: copy('View all articles'),
		}),
		/** The label on the link to the reviews, after the count. */
		reviewsLabel: copy('Reviews'),
		// See `siteCtaSchema` for why the object is prefaulted as well as its fields.
	})
	.prefault({});

export type HomePageCopy = z.infer<typeof homePageCopySchema>;

/**
 * What every page that has a hero needs, as a raw shape a page can extend.
 *
 * A raw shape rather than a built schema, for the same reason `homeSectionShape` is one: these
 * pages need their own section headings underneath, and `strictObject` has no `extend` that
 * survives being wrapped in `prefault`. Each page spreads this and adds what is its own, so the
 * four shared fields cannot drift across five pages while the rest stay per-page.
 *
 * The one place the `heroSubtitle`-is-optional rule lives. Every page that declares a
 * standfirst replaces the optional field with a defaulted one, so no page schema exhibits the
 * base behaviour; `innerPageBaseCopy` below is what makes it testable without reaching for
 * `zod` from an app that does not depend on it.
 *
 * **`seoTitle` is the page's own name, not the browser title.** The brand is appended by the
 * page (`${site.name} — ${seoTitle}`) for the same reason it is stored once in `site.name`:
 * transcribing "Banggai Escape" into five stored strings is five places to forget when the
 * business is renamed, and the stale ones fail silently — the page renders, the tab says the
 * old name.
 *
 * ## The line between content and interface
 *
 * The fields here are things the *business* says: headings, standfirsts, calls to action. The
 * strings that describe a control — a form label, a placeholder, an `aria-label`, a "no results"
 * message — stay in the component that renders the control. The test is whether an editor would
 * expect to change it when they changed the business, and whether the string still makes sense
 * if the control's behaviour changed. "Trip Overview" is the first kind; "Close contents" is the
 * second, and putting the second in a CMS would mean an editor could rename a button into
 * something that is not a button. See `docs/08-content-data-layer.md`.
 */
const innerPageShape = {
	seoTitle: copy('Page'),
	seoDescription: copy('Page'),
	heroTitle: copy('Page'),
	/**
	 * Absent means "no standfirst", which is different from an empty one and is why this is
	 * `.optional()` rather than a defaulted string. An empty string would render an empty
	 * paragraph with its bottom margin, which is a visible gap; an absent key renders nothing
	 * at all.
	 */
	heroSubtitle: z.string().min(1).optional(),
} as const;

/**
 * The words on one inner page's *detail* route — `/packages/[slug]` and its two siblings.
 *
 * Separate keys from the listing pages' copy, and the split is the point. A listing page is a
 * hero over a grid of cards: it renders no section headings at all, so putting "Trip Overview"
 * on it would tell an editor that a page has a section it does not have, and the only way to
 * find out that it does not render is to publish and look. Each detail key carries exactly the
 * strings that route shows.
 *
 * The three shapes differ because the three pages do. That is not inconsistency to be smoothed
 * away — `destinations/[slug]` has a gallery and no booking box, and `blog/[slug]` has a
 * closing invitation and no itinerary.
 */
export const packageDetailCopy = z
	.strictObject({
		// Named fields rather than a list, because the page renders a fixed set of bands and a
		// list would let an editor delete one the layout still tries to render.
		overview: copy('Trip Overview'),
		highlights: copy('Trip Highlights'),
		included: copy("What's Included"),
		itinerary: copy('Itinerary'),
		/** The label above the price, and the suffix after it. */
		priceFromLabel: copy('START FROM'),
		perPersonLabel: copy('Person'),
		/**
		 * The booking button's own words.
		 *
		 * Both appear **twice** on this page — once in the booking box and once in the mobile
		 * bar that follows the reader down — so a hardcoded string was two places to change for
		 * one edit. That is the whole argument for the field.
		 */
		bookNowLabel: copy('Book Now'),
		bookingNote: copy('No payment today — we confirm availability first.'),
		related: copy('You Might Also Like'),
		relatedActionLabel: copy('View All Packages'),
		/**
		 * The standfirst under the package's name, with a `{days}` token for the trip length.
		 *
		 * A token for the same reason `galleryHint` is one: the sentence interpolates the
		 * duration, so a stored string either drops the number or needs a placeholder. The
		 * alternative — two stored fragments, "A perfectly crafted" and "-day expedition…"
		 * — was rejected because it makes the grammar a CMS field, and the pair has to be
		 * edited together or not at all. One sentence with a visible token is one edit.
		 */
		summary: copy(
			'A perfectly crafted {days}-day expedition designed to immerse you in pristine turquoise lagoons, mirror-like lakes, and the timeless warmth of Banggai island life.',
		),
		/**
		 * The gallery's affordance hint, with a `{count}` token for the photo total.
		 *
		 * A token rather than a stored `"Swipe to see all photos"`, because the sentence
		 * genuinely interpolates the number — "Swipe to see all 12 photos" — and storing the
		 * noun on its own would mean the grammar lived in the markup and the words in the
		 * CMS, which is the split this whole phase exists to remove. A token an editor can see
		 * is better than a sentence fragment that reads as broken English on its own.
		 */
		galleryHint: copy('Swipe to see all {count} photos'),
	})
	// See `siteCtaSchema`.
	.prefault({} as never);

export const destinationDetailCopy = z
	.strictObject({
		overview: copy('Overview'),
		quickInfo: copy('Quick Info'),
		experiences: copy('Key Experiences'),
		gallery: copy('Captured Moments in Paradise'),
	})
	// See `siteCtaSchema`.
	.prefault({} as never);

export const articleDetailCopy = z
	.strictObject({
		/** The closing invitation, which is a different message from the site-wide one. */
		articleCtaTitle: copy('Need Help Planning?'),
		articleCtaText: copy('Personalized Banggai Itineraries by Locals'),
		articleCtaBody: copy(
			'Skip the logistics hassle. Let our experts craft seamless boat rides, airport pickups, and lake transfers for you.',
		),
		articleCtaLabel: copy('Talk to a Specialist'),
		articleCtaCallLabel: copy('Call / WhatsApp:'),
		articleCtaPopularLabel: copy('Popular Tour'),
		keepReadingLabel: copy('Keep Reading'),
		relatedLabel: copy('More guides from our local team'),
	})
	// See `siteCtaSchema`.
	.prefault({} as never);

/**
 * The five pages that share a hero, each with its own defaults and any extra fields.
 *
 * The `as never` on `prefault({})` is the same one `section()` carries, for the same reason:
 * every field here is defaulted, so the honest input is `{}`, but the input type Zod infers
 * for "all fields optional" is not `{}` and rejects it. Checked at runtime by
 * `apps/web/src/lib/settings-copy.spec.ts`, which parses `{}` and asserts every leaf came back
 * populated — so the cast is verified rather than merely asserted.
 */
function innerPageCopy<Extra extends z.ZodRawShape>(extra: Extra) {
	return z.strictObject({ ...innerPageShape, ...extra }).prefault({} as never);
}

/**
 * The shared shape on its own, with nothing a page adds.
 *
 * Exists for one test: that the base is *optional* about a standfirst, and that an absent one
 * is rejected while an empty one is refused. No page can show that, because every page that has
 * a standfirst defaults it and every page that has not got a schema that does not exist. It is
 * published as a schema rather than as the raw shape so a consumer never has to reassemble one
 * — a reassembled copy is exactly how a caller ends up with something that is not prefaulted,
 * which is the bug the base exists to rule out.
 */
export const innerPageBaseCopy = z.strictObject(innerPageShape).prefault({} as never);

export const packagesPageCopy = innerPageCopy({
	seoTitle: copy('Tour Packages'),
	seoDescription: copy(
		'Choose from our all-inclusive, fully customizable tour packages designed by local experts to showcase the very best of Central Sulawesi’s hidden gems.',
	),
	heroTitle: copy('Find Your Perfect\nBanggai Escape'),
	heroSubtitle: copy(
		'Choose from our all-inclusive, fully customizable tour packages designed by local experts to showcase the very best of Central Sulawesi’s hidden gems.',
	),
	// The listing page has no section headings of its own — its cards do the talking — so it
	// inherits the shared ones and uses none of them.
});

export const destinationsPageCopy = innerPageCopy({
	seoTitle: copy('Destinations'),
	seoDescription: copy(
		'Handpicked natural sanctuaries across the Banggai Archipelago, curated by local experts for travelers seeking authentic beauty.',
	),
	heroTitle: copy('Extraordinary Destinations'),
	heroSubtitle: copy(
		'Handpicked natural sanctuaries across the Banggai Archipelago, curated by local experts for travelers seeking authentic beauty.',
	),
});

export const blogPageCopy = innerPageCopy({
	seoTitle: copy('Blog'),
	seoDescription: copy(
		'Discover curated articles, destination guides, and travel insight to inspire your next adventure.',
	),
	heroTitle: copy('Insights to Help You\nTravel Smarter'),
	heroSubtitle: copy(
		'Discover curated articles, destination guides, and travel insight to inspire your next adventure.',
	),
	// The listing page has no closing invitation of its own — the article page has one,
	// and it is in `articleDetailCopy` because that is the route that renders it.
});

export const aboutPageCopy = innerPageCopy({
	seoTitle: copy('About Us'),
	seoDescription: copy(
		'Born from a deep passion for sharing the untouched magic and legendary warmth of Banggai.',
	),
	heroTitle: copy('About Us'),
	// Added after assuming this page had no standfirst. It does — the sentence under its
	// heading — and the assumption was only visible by reading the page, which is the argument
	// for putting the copy in the CMS rather than reasoning about it in a schema.
	heroSubtitle: copy(
		'Born from a deep passion for sharing the untouched magic and legendary warmth of Banggai.',
	),
	storyEyebrow: copy('OUR STORY'),
	/**
	 * The story: a heading and a paragraph, not two paragraphs.
	 *
	 * An array because the markup is a heading followed by prose and an array keeps the order
	 * explicit, but `min(1)` rather than `min(2)` — there is one of each, and a `min(2)` would
	 * be satisfied by two paragraphs and no heading.
	 */
	storyTitle: copy(
		'Banggai Escape was born from a deep-rooted love for our home—the pristine, untouched archipelago of Banggai. We realized that while these islands offer world-class turquoise lagoons, rich culture, and breathtaking marine life, navigating them requires genuine local knowledge.',
	),
	storyBody: copy(
		'Founded by locals and hospitality enthusiasts, we bridge the gap between curious global travelers and authentic island experiences. We take care of every detail—from seamless island transfers to tailored daily itineraries—allowing you to immerse yourself fully in the magic of the tropics with total safety, comfort, and ease.',
	),
	missionEyebrow: copy('VISION & MISSION'),
	/**
	 * The band heading, which the home page also uses.
	 *
	 * Duplicated across the two pages on purpose rather than shared, because they are two
	 * different pages that happen to say the same thing today. An editor rewording one should
	 * not silently reword the other, and when they *should* match, the CMS makes that a
	 * decision rather than an accident of two literals happening to agree.
	 */
	reasonsTitle: copy('The Reason Travelers\nChoose Banggai Escape'),
});

export const contactPageCopy = innerPageCopy({
	seoTitle: copy('Contact Us'),
	seoDescription: copy(
		'Plan your bespoke island journey with Banggai Escape — our local island specialists are on hand to tailor custom itineraries, boat transfers, and guided expeditions.',
	),
	heroTitle: copy('Let’s Get In Touch.'),
	formEyebrow: copy('We’d Love to Hear From You.'),
	formIntro: copy(
		'Our local island specialists are on hand to tailor custom itineraries, boat transfers, and guided expeditions.',
	),
	formIntroLead: copy('Plan your bespoke island journey or write directly to'),
	/**
	 * The two halves of one sentence, because a link sits between them.
	 *
	 * "Prefer email? Write to `hello@…`. For anything urgent, call `(62) 813…`." is a single
	 * sentence with two anchors in it, so it cannot be one stored string without either
	 * stripping the links or embedding markup in the content. Two labels and a full stop in the
	 * markup is the honest decomposition — the stop is punctuation between two sentences, not
	 * copy.
	 */
	preferEmailLabel: copy('Prefer email? Write to'),
	urgentLabel: copy('For anything urgent, call'),
});

export const navItemSchema = z.strictObject({
	label: z.string().min(1),
	href: z.string().min(1),
});

export type NavItem = z.infer<typeof navItemSchema>;

export const languageSchema = z.strictObject({
	code: z.string().min(1),
	label: z.string().min(1),
	flag: z.string().min(1),
});

export type Language = z.infer<typeof languageSchema>;

export const socialSchema = z.strictObject({
	label: z.string().min(1),
	/** A Font Awesome class string. */
	icon: z.string().min(1),
	href: z.string().min(1),
});

export type Social = z.infer<typeof socialSchema>;

export const featureSchema = z.strictObject({
	icon: z.string().min(1),
	title: z.string().min(1),
	text: z.string().min(1),
});

export type Feature = z.infer<typeof featureSchema>;

export const testimonialSchema = z.strictObject({
	quote: z.string().min(1),
	name: z.string().min(1),
	country: z.string().min(1),
	avatar: mediaIdSchema,
});

/** The authored counterpart: the same testimonial, before its avatar is resolved. */
export const testimonialSourceSchema = z.strictObject({
	...testimonialSchema.shape,
	avatar: authoredMediaSchema,
});

export type Testimonial = z.infer<typeof testimonialSchema>;

export type TestimonialSource = z.infer<typeof testimonialSourceSchema>;

/**
 * A testimonial as a page renders it. The avatar is the one field here that becomes an
 * image rather than a URL — it is an `<img>` with the reviewer's face in it, so it carries
 * the media library's description.
 */
export type RenderedTestimonial = Omit<Testimonial, 'avatar'> & { avatar: RenderedMedia };

export const faqItemSchema = z.strictObject({
	question: z.string().min(1),
	answer: z.string().min(1),
});

export type FaqItem = z.infer<typeof faqItemSchema>;

export const statSchema = z.strictObject({
	value: z.string().min(1),
	label: z.string().min(1),
});

export type Stat = z.infer<typeof statSchema>;

export const contactChannelSchema = z.strictObject({
	icon: z.string().min(1),
	title: z.string().min(1),
	text: z.string().min(1),
	value: z.string().min(1),
	/** Second line for multi-line values such as the office address. */
	extra: z.string().min(1).optional(),
	href: z.string().min(1),
});

export type ContactChannel = z.infer<typeof contactChannelSchema>;

export const siteSettingSchemas = {
	site: siteProfileSchema,
	nav: z.array(navItemSchema).min(1),
	languages: z.array(languageSchema).min(1),
	socials: z.array(socialSchema),
	footerDestinations: z.array(navItemSchema),
	features: z.array(featureSchema),
	testimonials: z.array(testimonialSchema),
	faqs: z.array(faqItemSchema),
	stats: z.array(statSchema),
	visionMission: z.array(featureSchema),
	contactChannels: z.array(contactChannelSchema),
	blogCategories: z.array(z.string().min(1)),
	/** CTA banner background shared by every page. */
	ctaBackground: mediaIdSchema,
	/**
	 * The closing invitation's words, shared by every page.
	 *
	 * One setting rather than a prop per call site, because the banner appears nine times with
	 * identical wording. It also removes a real duplication: the strings lived in
	 * `CtaBanner`'s own defaults *and* were passed explicitly at five of the nine sites, so
	 * editing the default would have left half the site showing the old text.
	 */
	siteCta: siteCtaSchema,
	/**
	 * The words on a content card.
	 *
	 * The most repeated copy on the site: `PackageCard` renders on four routes and `PostCard`
	 * on four more, so "Start from", "/Person", "View Details" and "Read More" were eight
	 * hardcoded strings across eight call sites. They are content rather than chrome — an
	 * editor changing the site's voice would want them, and they are among the first words a
	 * visitor reads.
	 *
	 * Keyed by card rather than flat, because "View Details" and "Read More" are the same kind
	 * of string for two different kinds of card, and grouping them says so where eight
	 * unrelated fields would not.
	 */
	cards: z
		.strictObject({
			package: z
				.strictObject({
					/** Above the price. Sentence case, unlike the detail page's shoutier one. */
					priceFromLabel: copy('Start from'),
					/** After it, behind the slash: "/Person". */
					perPersonLabel: copy('Person'),
					actionLabel: copy('View Details'),
				})
				.prefault({} as never),
			post: z
				.strictObject({
					actionLabel: copy('Read More'),
				})
				.prefault({} as never),
		})
		// See `siteCtaSchema`.
		.prefault({} as never),

	/** The home page's own words. See `homePageCopySchema` for why every field is defaulted. */
	homePage: homePageCopySchema,
	/**
	 * The five pages that are a hero over a grid: their SEO metadata and their hero.
	 *
	 * Keyed per page rather than one shared `innerPages`, so a page can be edited without
	 * touching the others and so an editor's index lists them separately.
	 */
	packagesPage: packagesPageCopy,
	destinationsPage: destinationsPageCopy,
	blogPage: blogPageCopy,
	aboutPage: aboutPageCopy,
	contactPage: contactPageCopy,
	/**
	 * The three detail routes, which are a different shape from their listing pages: section
	 * headings, a booking box, a closing invitation. See `packageDetailCopy` for why these are
	 * not folded into the keys above.
	 */
	packageDetail: packageDetailCopy,
	destinationDetail: destinationDetailCopy,
	articleDetail: articleDetailCopy,
} as const;

/**
 * The authored counterpart, for the two keys that hold media. Everything else is
 * identical, so it is spread rather than repeated.
 */
export const siteSettingSourceSchemas = {
	...siteSettingSchemas,
	testimonials: z.array(testimonialSourceSchema),
	ctaBackground: authoredMediaSchema,
} as const;

export const siteSettingKeys = Object.keys(siteSettingSchemas) as SiteSettingKey[];

export type SiteSettingKey = keyof typeof siteSettingSchemas;

export type SiteSettingValue<Key extends SiteSettingKey> = z.infer<
	(typeof siteSettingSchemas)[Key]
>;

/**
 * A setting as a page renders it. Exactly one key changes, and the asymmetry is the point:
 * a testimonial's avatar is an image in the page and gains the library's description, while
 * `ctaBackground` stays a bare URL because it is a CSS background — a decorative layer with
 * no accessible name to give, so resolving it to an image would invent a field nothing reads.
 *
 * Declared here, beside the two shapes it distinguishes, so a second `<img>` setting cannot
 * be added without noticing that it owes the same treatment.
 */
export type RenderedSiteSettingValue<Key extends SiteSettingKey> = Key extends 'testimonials'
	? RenderedTestimonial[]
	: SiteSettingValue<Key>;

/** Validates one stored `site_settings.value` against the contract for its key. */
export function parseSiteSetting(key: SiteSettingKey, value: unknown) {
	return siteSettingSchemas[key].safeParse(value);
}

/** Validates one authored `site_settings.value` from `apps/web`'s modules. */
export function parseSourceSiteSetting(key: SiteSettingKey, value: unknown) {
	return siteSettingSourceSchemas[key].safeParse(value);
}
