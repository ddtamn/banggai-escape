/**
 * The three content kinds stored in `content_entries.kind`.
 *
 * `apps/web` calls the third one an "article" internally while the public route is
 * `/blog`; the enum uses the content-model word so the table and the contract agree.
 */
import { z } from 'zod';

export const contentKinds = ['package', 'destination', 'article'] as const;

export type ContentKind = (typeof contentKinds)[number];

export const contentKindSchema = z.enum(contentKinds);

/**
 * A reference to a row in `media_assets`, stored as its id.
 *
 * The id is opaque on purpose. Storing the id instead of a URL or an object key means a
 * media-domain change, a bucket rename, or moving a legacy asset into R2 never rewrites
 * a content record — only the `media_assets` row changes. Rendering resolves the ids it
 * needs in one lookup per page.
 *
 * Note what this schema does **not** promise: that the row exists. Only an id that
 * resolves to a live asset is valid content, and that is a runtime check.
 */
export const mediaIdSchema = z.uuid();

/**
 * A media field as a page renders it: where the bytes are, and what they show.
 *
 * This is the counterpart to `mediaIdSchema`, and it exists because a URL cannot carry the
 * one piece of an image an editor actually writes — the description. An `alt` attribute
 * matters to a screen-reader user and to an image search, and the administrator writes it
 * once in the media library. A bare string has nowhere to put it, so the alternative is
 * what the site did before: inventing `alt={pkg.title}` for every photograph and calling
 * that a description.
 *
 * `alt` is null rather than '' when the asset has no description yet, because the two mean
 * different things to whoever renders it: `''` marks an image as decorative, while null
 * says nobody has written one and leaves the call site free to fall back to something it
 * does know. The fallback belongs at the call site — the honest description of a
 * photograph depends on where it appears, and only the page knows that.
 */
export type RenderedMedia = {
	src: string;
	alt: string | null;
	/**
	 * Resized variants of `src`, as an `<img srcset>` value, or null where the edge cannot
	 * produce them.
	 *
	 * Null is a real state rather than a gap: in development there is no edge, and the
	 * design-tool placeholder images on `lh3.googleusercontent.com` are refused by
	 * Cloudflare's fetcher. A `srcset` of URLs that all fail would be worse than no `srcset`
	 * at all, so those images render from `src` alone. Callers pass it straight through and
	 * do not need to branch.
	 */
	srcset: string | null;
};

/**
 * A media value as `apps/web` still authors it, before the migration resolves it:
 * either a bare CDN asset id or an absolute URL.
 *
 * This exists so the static modules can keep their current values — and their types —
 * until Phase 4 replaces them with database reads. `img()` only prepends the CDN base
 * when the value is *not* already absolute, so both forms render.
 */
export const authoredMediaSchema = z.string().min(1);

/** Lowercase, hyphen-separated, as used by every public route. */
export const slugSchema = z
	.string()
	.min(1)
	.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be lowercase words separated by single hyphens');

/** A title/text pair, used by package highlights, destination experiences, and steps. */
export const titledTextSchema = z.strictObject({
	title: z.string().min(1),
	text: z.string().min(1),
});

/**
 * Payload fields whose value is a media reference, per kind.
 *
 * Declared once because three things must agree exactly: the one-shot export (which
 * collects legacy refs), the one-shot import (which rewrites them to ids), and the
 * admin's reference scan (which refuses to delete an in-use asset). A field missing from
 * this list keeps its authored value and then fails payload validation, so forgetting a
 * name here surfaces as a named error rather than as a broken image.
 *
 * `as const` + `satisfies` rather than a bare annotation, and the literals are the reason.
 * `Record<ContentKind, readonly string[]>` alone still guarantees the three kinds are all
 * listed, but it types every field name as `string` — and `RenderPayload` below asks
 * whether a field name is one of these, so a widened `string` would answer yes to *every*
 * field and quietly type a package's `region` as an image. `satisfies` keeps the
 * exhaustiveness check that the annotation was there for.
 */
export const mediaFieldsByKind = {
	package: ['image'],
	destination: ['image', 'gallery'],
	article: ['image', 'hero'],
} as const satisfies Record<ContentKind, readonly string[]>;

// ---------------------------------------------------------------------------
// package
// ---------------------------------------------------------------------------

export const tripTypes = ['Open Trip', 'Private Trip'] as const;

export type TripType = (typeof tripTypes)[number];

export const tripTypeSchema = z.enum(tripTypes);

export const itineraryDaySchema = z.strictObject({
	label: z.string().min(1),
	title: z.string().min(1),
	text: z.string().min(1),
});

export const packagePayloadSchema = z.strictObject({
	slug: slugSchema,
	title: z.string().min(1),
	subtitle: z.string().min(1),
	region: z.string().min(1),
	days: z.number().int().positive(),
	/** Zero for a single-day trip. */
	nights: z.number().int().nonnegative(),
	tripType: tripTypeSchema,
	/** Per person, in IDR. */
	price: z.number().int().nonnegative(),
	image: mediaIdSchema,
	groupSize: z.string().min(1),
	accommodation: z.string().min(1),
	overview: z.string().min(1),
	highlights: z.array(titledTextSchema).min(1),
	included: z.array(z.string().min(1)).min(1),
	itinerary: z.array(itineraryDaySchema).min(1),
	featured: z.boolean().optional(),
});

/**
 * The stored contract, and the authored one it is derived from.
 *
 * Spreading `.shape` (rather than `z.extend()`) keeps the strictness, so an unknown key
 * is still a failure in both variants.
 */
export const packageSourceSchema = z.strictObject({
	...packagePayloadSchema.shape,
	image: authoredMediaSchema,
});

export type PackagePayload = z.infer<typeof packagePayloadSchema>;

export type PackageSource = z.infer<typeof packageSourceSchema>;

// ---------------------------------------------------------------------------
// destination
// ---------------------------------------------------------------------------

export const quickInfoSchema = z.strictObject({
	bestTime: z.string().min(1),
	duration: z.string().min(1),
	highlights: z.string().min(1),
	accessibility: z.string().min(1),
});

export const destinationPayloadSchema = z.strictObject({
	slug: slugSchema,
	name: z.string().min(1),
	region: z.string().min(1),
	tagline: z.string().min(1),
	image: mediaIdSchema,
	overview: z.array(z.string().min(1)).min(1),
	quickInfo: quickInfoSchema,
	experiences: z.array(titledTextSchema).min(1),
	gallery: z.array(mediaIdSchema).min(1),
	featured: z.boolean().optional(),
});

export const destinationSourceSchema = z.strictObject({
	...destinationPayloadSchema.shape,
	image: authoredMediaSchema,
	gallery: z.array(authoredMediaSchema).min(1),
});

export type DestinationPayload = z.infer<typeof destinationPayloadSchema>;

export type DestinationSource = z.infer<typeof destinationSourceSchema>;

// ---------------------------------------------------------------------------
// article
// ---------------------------------------------------------------------------

/**
 * The article body is a closed union of block kinds. `steps` and `callout` exist
 * because the published articles already use them; anything else has to be added here
 * rather than smuggled in as loose markup.
 */
export const blockSchema = z.discriminatedUnion('kind', [
	z.strictObject({ kind: z.literal('p'), text: z.string().min(1) }),
	z.strictObject({
		kind: z.literal('h'),
		/** Anchor id, so the table of contents can link to the heading. */
		id: z.string().min(1),
		text: z.string().min(1),
	}),
	z.strictObject({ kind: z.literal('steps'), items: z.array(titledTextSchema).min(1) }),
	z.strictObject({ kind: z.literal('callout'), title: z.string().min(1), text: z.string().min(1) }),
]);

export type Block = z.infer<typeof blockSchema>;

export const articlePayloadSchema = z.strictObject({
	slug: slugSchema,
	category: z.string().min(1),
	tags: z.array(z.string().min(1)),
	title: z.string().min(1),
	excerpt: z.string().min(1),
	image: mediaIdSchema,
	/** Display strings as published ("March 12, 2026"), not ISO dates. */
	date: z.string().min(1),
	updated: z.string().min(1),
	readTime: z.string().min(1),
	author: z.string().min(1),
	authorRole: z.string().min(1),
	hero: mediaIdSchema,
	body: z.array(blockSchema).min(1),
});

export const articleSourceSchema = z.strictObject({
	...articlePayloadSchema.shape,
	image: authoredMediaSchema,
	hero: authoredMediaSchema,
});

export type ArticlePayload = z.infer<typeof articlePayloadSchema>;

export type ArticleSource = z.infer<typeof articleSourceSchema>;

/**
 * The stored payload for one content kind.
 *
 * Note that an article's `author`/`authorRole` are the published byline, which is
 * content; `content_revisions.author_email` records the administrator who pressed
 * publish, which is audit data. They are different people and both are kept.
 */
export const payloadSchemas = {
	package: packagePayloadSchema,
	destination: destinationPayloadSchema,
	article: articlePayloadSchema,
} as const;

/** What `apps/web`'s static modules hold today, before media ids are resolved. */
export const sourceSchemas = {
	package: packageSourceSchema,
	destination: destinationSourceSchema,
	article: articleSourceSchema,
} as const;

export type PayloadFor<Kind extends ContentKind> = z.infer<(typeof payloadSchemas)[Kind]>;

/** The field names that hold a media reference in a payload of this kind. */
type MediaFieldName<Kind extends ContentKind> = (typeof mediaFieldsByKind)[Kind][number];

/**
 * How one stored media field becomes a rendered one. A single reference (`image`, `hero`)
 * becomes one image; a list of them (`gallery`) becomes a list of images. Anything else is
 * left alone, which cannot happen today — every entry in `mediaFieldsByKind` holds a string
 * or a list of them — but keeps the type total if that ever stops being true.
 */
type RenderedField<Value> = Value extends string
	? RenderedMedia
	: Value extends readonly string[]
		? RenderedMedia[]
		: Value;

/**
 * A payload with its media fields resolved, derived rather than written out.
 *
 * Deriving it from `MediaFieldName` is the point: the field list and the type have to agree,
 * and nothing at runtime can catch it when they do not. A field added to the list and
 * forgotten here would still receive a `RenderedMedia` from the resolver while its type still
 * said `string`, so the mistake would reach a visitor as `<img src="[object Object]">`.
 * Deriving it makes that a type error at the component that renders the image.
 *
 * `Payload` is passed concretely rather than looked up through `PayloadFor<Kind>`, because a
 * mapped type over a still-generic indexed access stays *deferred* — and a deferred
 * `Field extends MediaFieldName<Kind>` test resolves to both branches, which quietly types
 * every field as `string | RenderedMedia` instead of only the media ones.
 */
type RenderPayload<Payload, Media extends PropertyKey> = {
	[Field in keyof Payload]: Field extends Media ? RenderedField<Payload[Field]> : Payload[Field];
};

export type RenderedPackage = RenderPayload<PackagePayload, MediaFieldName<'package'>>;

export type RenderedDestination = RenderPayload<DestinationPayload, MediaFieldName<'destination'>>;

export type RenderedArticle = RenderPayload<ArticlePayload, MediaFieldName<'article'>>;

/**
 * The rendered payload for a kind, for callers that hold the kind as a type parameter.
 *
 * A dispatch rather than one generic mapped type, for the reason `RenderPayload` takes a
 * concrete payload: it has to resolve at the call site, where the kind is a literal.
 */
export type RenderedPayloadFor<Kind extends ContentKind> = Kind extends 'package'
	? RenderedPackage
	: Kind extends 'destination'
		? RenderedDestination
		: RenderedArticle;

/** Validates a stored JSONB payload against its kind's contract. */
export function parsePayload(kind: ContentKind, value: unknown) {
	return payloadSchemas[kind].safeParse(value);
}

/** Validates an authored record from `apps/web`'s static modules. */
export function parseSourcePayload(kind: ContentKind, value: unknown) {
	return sourceSchemas[kind].safeParse(value);
}
