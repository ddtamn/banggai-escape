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
	'At Banggai Escape, we are a team of local experts dedicated to sharing the untouched wonders of the Banggai Archipelago with curious travelers. From our home in Luwuk, we have spent years learning every hidden cove, charting the best currents, and building genuine relationships with the communities that call these islands home.',
	'Travel is more than visiting a destination; it is about creating unforgettable stories. With deep local roots and a passion for our home, we design seamless, personalized journeys that let you experience Banggai the way we know it — thoughtfully, safely, and completely.',
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
 * The editorial copy of one inner page: how it describes itself, and its hero.
 *
 * A builder rather than one shared schema, and the distinction matters. A single schema would
 * have one set of defaults, so five pages would be seeded with the *same* placeholder words and
 * the blog would render "Banggai Escape" where its heading belongs. Per-page defaults are the
 * whole point; what the builder buys is that the five cannot drift in *shape* while differing in
 * content.
 *
 * `seoTitle` is the page's own name, **not** the browser title. The brand is appended by the
 * page (`${site.name} — ${seoTitle}`) for the same reason it is stored once in `site.name`:
 * transcribing "Banggai Escape" into seven stored strings is seven places to forget when the
 * business is renamed, and the stale ones fail silently — the page renders, the tab says the
 * old name.
 */
function innerPageCopy(defaults: {
	seoTitle: string;
	seoDescription: string;
	heroTitle: string;
	heroSubtitle?: string;
}) {
	return (
		z
			.strictObject({
				seoTitle: copy(defaults.seoTitle),
				seoDescription: copy(defaults.seoDescription),
				heroTitle: copy(defaults.heroTitle),
				/**
				 * Absent means "no standfirst", which is different from an empty one and is why this is
				 * `.optional()` rather than a defaulted string. An empty string would render an empty
				 * paragraph with its bottom margin, which is a visible gap; an absent key renders
				 * nothing at all.
				 */
				heroSubtitle: z.string().min(1).optional(),
			})
			// See `siteCtaSchema`.
			.prefault({})
	);
}

export const packagesPageCopy = innerPageCopy({
	seoTitle: 'Tour Packages',
	seoDescription:
		'Choose from our all-inclusive, fully customizable tour packages designed by local experts to showcase the very best of Central Sulawesi’s hidden gems.',
	heroTitle: 'Find Your Perfect\nBanggai Escape',
	heroSubtitle:
		'Choose from our all-inclusive, fully customizable tour packages designed by local experts to showcase the very best of Central Sulawesi’s hidden gems.',
});

export const destinationsPageCopy = innerPageCopy({
	seoTitle: 'Destinations',
	seoDescription:
		'Handpicked natural sanctuaries across the Banggai Archipelago, curated by local experts for travelers seeking authentic beauty.',
	heroTitle: 'Extraordinary Destinations',
	heroSubtitle:
		'Handpicked natural sanctuaries across the Banggai Archipelago, curated by local experts for travelers seeking authentic beauty.',
});

export const blogPageCopy = innerPageCopy({
	seoTitle: 'Blog',
	seoDescription:
		'Discover curated articles, destination guides, and travel insight to inspire your next adventure.',
	heroTitle: 'Insights to Help You\nTravel Smarter',
	heroSubtitle:
		'Discover curated articles, destination guides, and travel insight to inspire your next adventure.',
});

export const aboutPageCopy = innerPageCopy({
	seoTitle: 'About Us',
	seoDescription:
		'Born from a deep passion for sharing the untouched magic and legendary warmth of Banggai.',
	heroTitle: 'About Us',
});

export const contactPageCopy = innerPageCopy({
	seoTitle: 'Contact Us',
	seoDescription:
		'Plan your bespoke island journey with Banggai Escape — our local island specialists are on hand to tailor custom itineraries, boat transfers, and guided expeditions.',
	heroTitle: 'Let’s Get In Touch.',
});

export type InnerPageCopy = z.infer<typeof packagesPageCopy>;

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
	/** The home page's own words. See `homePageCopySchema` for why every field is defaulted. */
	homePage: homePageCopySchema,
	/** The four inner pages that share a hero shape: packages, destinations, blog, contact. */
	packagesPage: packagesPageCopy,
	destinationsPage: destinationsPageCopy,
	blogPage: blogPageCopy,
	aboutPage: aboutPageCopy,
	contactPage: contactPageCopy,
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
