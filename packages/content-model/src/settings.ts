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
