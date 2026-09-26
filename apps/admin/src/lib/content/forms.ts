/**
 * The content forms, declared once as data.
 *
 * Three content kinds need list screens, edit screens, a preview, and a parser that
 * turns a submitted form back into a payload. They differ only in their fields, so the
 * fields are a **spec** and everything else is one implementation driven by it. A second
 * copy of "how a package is edited" is how the four places it matters — render, parse,
 * validate, preview — drift apart.
 *
 * The spec is framework-free on purpose: the page component renders it, the form action
 * parses with it, and the unit tests exercise both without a browser.
 *
 * ## How a submitted form becomes a payload
 *
 * Input names are **paths**: `highlights[0].title`, `included[2]`, `body[1].items[0].text`.
 * The renderer builds them with `childPath`/`itemPath`; the parser reads them back with
 * the same two functions, so the two cannot disagree about a name.
 *
 * Anything repeatable carries a hidden `__count` input, because the number of rows is
 * structural: there is no way to say "zero rows" with names alone, and counting indices
 * until one is missing breaks as soon as a middle row is removed. `__count` is written by
 * small `$state` in the page, so add/remove works with JavaScript and the initial rows
 * work without it.
 */
import type { ContentKind, SiteSettingKey } from '@banggai/content-model';

/** Re-exported so the content UI imports its types from one place. */
export type { ContentKind, SiteSettingKey };

/** A form field, as data. */
export type FieldSpec =
	/** One line of text. */
	| {
			readonly type: 'text';
			readonly name: string;
			readonly label: string;
			readonly hint?: string;
			/** Left blank means *absent*, not empty, for a contract field that is `.optional()`. */
			readonly optional?: boolean;
	  }
	/** Multi-line prose. */
	| {
			readonly type: 'words';
			readonly name: string;
			readonly label: string;
			readonly hint?: string;
			readonly optional?: boolean;
	  }
	/** A URL segment: lowercase words, single hyphens. */
	| { readonly type: 'slug'; readonly name: string; readonly label: string }
	| {
			readonly type: 'number';
			readonly name: string;
			readonly label: string;
			readonly hint?: string;
			/** Declared for the browser's own validation; the contract still decides. */
			readonly min?: number;
	  }
	| {
			readonly type: 'select';
			readonly name: string;
			readonly label: string;
			readonly options: readonly string[];
	  }
	| { readonly type: 'boolean'; readonly name: string; readonly label: string }
	/** A `media_assets` row, chosen by id. */
	| { readonly type: 'media'; readonly name: string; readonly label: string }
	| {
			readonly type: 'object';
			readonly name: string;
			readonly label: string;
			readonly fields: readonly FieldSpec[];
	  }
	/** A repeatable list of plain strings (`included`) or of media ids (`gallery`). */
	| {
			readonly type: 'list';
			readonly name: string;
			readonly label: string;
			readonly item: 'text' | 'media';
			/**
			 * Set when the contract puts `.min(1)` on this field, so the control can state the
			 * requirement where it applies. Declared rather than assumed because most of these
			 * fields may legitimately be empty — FAQs and blog categories among them — and a
			 * control that always says "at least one is required" teaches administrators to
			 * ignore the one case where it is true.
			 */
			readonly atLeastOne?: boolean;
	  }
	/** A repeatable group of fields (`highlights`, `itinerary`). */
	| {
			readonly type: 'rows';
			readonly name: string;
			readonly label: string;
			readonly fields: readonly FieldSpec[];
			/** See the note on `list`: only where the contract actually requires one. */
			readonly atLeastOne?: boolean;
	  }
	/** The article body: a closed union of block kinds, each with its own fields. */
	| { readonly type: 'blocks'; readonly name: string; readonly label: string };

/** One kind in the article body union, and the fields it owns. */
export type BlockSpec = {
	readonly kind: string;
	readonly label: string;
	readonly fields: readonly FieldSpec[];
};

const titleAndText: readonly FieldSpec[] = [
	{ type: 'text', name: 'title', label: 'Title' },
	{ type: 'text', name: 'text', label: 'Text' },
];

/** The four filler fields shared by `nav`, `footerDestinations`, and the two link lists. */
const navFields: readonly FieldSpec[] = [
	{ type: 'text', name: 'label', label: 'Label' },
	{ type: 'text', name: 'href', label: 'Link', hint: 'A path such as /packages' },
];

/** `features` and `visionMission` are the same shape, so they are the same spec. */
function featureSetting(name: string, label: string): FieldSpec {
	return { type: 'rows', name, label, fields: featureFields };
}

const featureFields: readonly FieldSpec[] = [
	{ type: 'text', name: 'icon', label: 'Icon', hint: 'A Font Awesome class' },
	{ type: 'text', name: 'title', label: 'Title' },
	{ type: 'words', name: 'text', label: 'Text' },
];

/** The four block kinds the contract allows. `h` needs an anchor id for the contents list. */
export const blockSpecs: readonly BlockSpec[] = [
	{ kind: 'p', label: 'Paragraph', fields: [{ type: 'words', name: 'text', label: 'Text' }] },
	{
		kind: 'h',
		label: 'Heading',
		fields: [
			{ type: 'text', name: 'id', label: 'Anchor id', hint: 'Lowercase, hyphenated' },
			{ type: 'text', name: 'text', label: 'Text' },
		],
	},
	{
		kind: 'steps',
		label: 'Steps',
		fields: [
			{ type: 'rows', name: 'items', label: 'Steps', fields: titleAndText, atLeastOne: true },
		],
	},
	{
		kind: 'callout',
		label: 'Callout',
		fields: [
			{ type: 'text', name: 'title', label: 'Title' },
			{ type: 'words', name: 'text', label: 'Text' },
		],
	},
];

export const blockKinds = blockSpecs.map((block) => block.kind);

/**
 * Field order is the screen order, and the field groups are the same ones the marketing
 * site uses: what it is, then how to sell it, then the detail.
 */
export const fieldSpecs: Record<ContentKind, readonly FieldSpec[]> = {
	package: [
		{ type: 'slug', name: 'slug', label: 'Slug' },
		{ type: 'text', name: 'title', label: 'Title' },
		{ type: 'text', name: 'subtitle', label: 'Subtitle' },
		{ type: 'text', name: 'region', label: 'Region' },
		{
			type: 'select',
			name: 'tripType',
			label: 'Trip type',
			options: ['Open Trip', 'Private Trip'],
		},
		{ type: 'number', name: 'days', label: 'Days', min: 1 },
		{ type: 'number', name: 'nights', label: 'Nights', min: 0 },
		{ type: 'number', name: 'price', label: 'Price per person (IDR)', min: 0 },
		{ type: 'media', name: 'image', label: 'Card image' },
		{ type: 'text', name: 'groupSize', label: 'Group size' },
		{ type: 'text', name: 'accommodation', label: 'Accommodation' },
		{ type: 'words', name: 'overview', label: 'Overview' },
		{
			type: 'rows',
			name: 'highlights',
			label: 'Highlights',
			fields: titleAndText,
			atLeastOne: true,
		},
		{
			type: 'list',
			name: 'included',
			label: 'What is included',
			item: 'text',
			atLeastOne: true,
		},
		{
			type: 'rows',
			name: 'itinerary',
			label: 'Itinerary',
			fields: [
				{ type: 'text', name: 'label', label: 'Day label', hint: 'e.g. Day 1' },
				{ type: 'text', name: 'title', label: 'Title' },
				{ type: 'words', name: 'text', label: 'Text' },
			],
			atLeastOne: true,
		},
		{ type: 'boolean', name: 'featured', label: 'Feature on the homepage' },
	],
	destination: [
		{ type: 'slug', name: 'slug', label: 'Slug' },
		{ type: 'text', name: 'name', label: 'Name' },
		{ type: 'text', name: 'region', label: 'Region' },
		{ type: 'text', name: 'tagline', label: 'Tagline' },
		{ type: 'media', name: 'image', label: 'Card image' },
		{
			type: 'list',
			name: 'overview',
			label: 'Overview paragraphs',
			item: 'text',
			atLeastOne: true,
		},
		{
			type: 'object',
			name: 'quickInfo',
			label: 'Quick info',
			fields: [
				{ type: 'text', name: 'bestTime', label: 'Best time' },
				{ type: 'text', name: 'duration', label: 'Duration' },
				{ type: 'text', name: 'highlights', label: 'Highlights' },
				{ type: 'text', name: 'accessibility', label: 'Accessibility' },
			],
		},
		{
			type: 'rows',
			name: 'experiences',
			label: 'Experiences',
			fields: titleAndText,
			atLeastOne: true,
		},
		{
			type: 'list',
			name: 'gallery',
			label: 'Gallery',
			item: 'media',
			atLeastOne: true,
		},
		{ type: 'boolean', name: 'featured', label: 'Feature on the homepage' },
	],
	article: [
		{ type: 'slug', name: 'slug', label: 'Slug' },
		{ type: 'text', name: 'title', label: 'Title' },
		{ type: 'text', name: 'category', label: 'Category' },
		{ type: 'list', name: 'tags', label: 'Tags', item: 'text' },
		{ type: 'words', name: 'excerpt', label: 'Excerpt' },
		{ type: 'media', name: 'image', label: 'Card image' },
		{ type: 'media', name: 'hero', label: 'Hero image' },
		{
			type: 'text',
			name: 'date',
			label: 'Published date',
			hint: 'As displayed, e.g. March 12, 2026',
		},
		{ type: 'text', name: 'updated', label: 'Updated date', hint: 'As displayed' },
		{ type: 'text', name: 'readTime', label: 'Read time', hint: 'e.g. 9 min read' },
		{ type: 'text', name: 'author', label: 'Byline name' },
		{ type: 'text', name: 'authorRole', label: 'Byline role' },
		{ type: 'blocks', name: 'body', label: 'Body' },
	],
};

/** `label` → `publishedAt`-style formatting is the caller's job; this is the label only. */
export const kindLabels: Record<ContentKind, string> = {
	package: 'Package',
	destination: 'Destination',
	article: 'Article',
};

export const kinds: readonly ContentKind[] = ['package', 'destination', 'article'];

// ---------------------------------------------------------------------------
// Site settings
// ---------------------------------------------------------------------------

/**
 * The site's own settings, as **one root field per key**.
 *
 * A setting's stored value *is* that field's value, so the root field is named after the
 * key: `faqs` is a `rows` field named `faqs`, giving input names of
 * `faqs[0].question` and a parsed value that is exactly the array the contract wants.
 * That is what lets the same renderer, parser and path helpers serve both a content
 * payload and a setting.
 *
 * The record is typed by `SiteSettingKey`, so adding a key to `@banggai/content-model`
 * fails `svelte-check` here until a spec exists for it — the type is what keeps the two in
 * step. Note that only the *type* is imported: importing the schema table would drag `zod`
 * and every settings schema into the browser bundle for no reason.
 *
 * `optional: true` matters on `contactChannels.extra`, the contract's only optional field.
 * A text input that submits `''` would fail `z.string().min(1).optional()` — `.optional()`
 * permits absence, not emptiness — so a blank optional field has to parse to absent.
 */
/**
 * One titled band on the home page.
 *
 * Every band offers the same three fields, and that is a decision rather than laziness. The
 * contract has `subtitle` and `actionLabel` optional on all of them, and a form that offered
 * them on some bands but not others would mean an editor could never add a standfirst to the
 * band that happens not to have one today — the capability would exist in the data and be
 * unreachable from the screen. Bands that have no standfirst simply leave it empty, and the
 * page renders nothing.
 */
function homeSection(name: string, label: string, extra: readonly FieldSpec[] = []): FieldSpec {
	return {
		type: 'object',
		name,
		label,
		fields: [
			{ type: 'words', name: 'title', label: 'Heading', hint: 'Use \\n for a line break' },
			{ type: 'words', name: 'subtitle', label: 'Standfirst', optional: true },
			{ type: 'text', name: 'actionLabel', label: 'Link label', optional: true },
			...extra,
		],
	};
}

/**
 * The five inner pages share one spec.
 *
 * A function rather than one written out five times, because five near-identical literals
 * drift: someone adds a field to one of them, forgets the other four, and the pages disagree
 * about what they can say. Each is still a *separate* key — one row in `site_settings`, one
 * entry in the editor's index — so a page can be edited without touching the others.
 */
/**
 * One detail route's own words.
 *
 * The counterpart to `innerPageSpec`, and deliberately not a parameter of it: a detail page has
 * no SEO metadata and no hero — both come from its entry — so giving it those fields would
 * offer an editor two controls that the page never reads. Keeping them separate is what stops
 * "Trip Overview" appearing on a form titled "Packages page", where it is never rendered.
 */
function detailSpec(
	key: 'packageDetail' | 'destinationDetail' | 'articleDetail',
	label: string,
	fields: readonly FieldSpec[],
): FieldSpec {
	return { type: 'object', name: key, label, fields };
}

function innerPageSpec(
	key: 'packagesPage' | 'destinationsPage' | 'blogPage' | 'aboutPage' | 'contactPage',
	label: string,
	extra: readonly FieldSpec[] = [],
): FieldSpec {
	return {
		type: 'object',
		name: key,
		label,
		fields: [
			{
				type: 'text',
				name: 'seoTitle',
				label: 'Page title',
				// The brand is appended by the page, so this is the page's own name — "Blog",
				// not "Blog — Banggai Escape". Storing the brand here would be a second copy
				// of it, and renaming the business would leave these stale without anything
				// failing.
				hint: 'The page’s own name — the site name is added to it',
			},
			{
				type: 'words',
				name: 'seoDescription',
				label: 'Page description',
				hint: 'About 150–160 characters',
			},
			{
				type: 'words',
				name: 'heroTitle',
				label: 'Hero heading',
				hint: 'Use \\n for a line break',
			},
			{
				type: 'words',
				name: 'heroSubtitle',
				label: 'Hero standfirst',
				// Optional, and marked as such, because a page whose hero has no standfirst
				// should render nothing rather than an empty paragraph with its margin.
				optional: true,
			},
			...extra,
		],
	};
}

export const settingSpecs: Record<SiteSettingKey, FieldSpec> = {
	site: {
		type: 'object',
		name: 'site',
		label: 'Brand and contact',
		fields: [
			{ type: 'text', name: 'name', label: 'Site name' },
			{ type: 'text', name: 'tagline', label: 'Tagline' },
			{ type: 'text', name: 'locale', label: 'Locale', hint: 'e.g. en' },
			{ type: 'text', name: 'phone', label: 'Phone as displayed' },
			{ type: 'text', name: 'phoneHref', label: 'Phone link', hint: 'tel:+62…' },
			{
				type: 'text',
				name: 'whatsapp',
				label: 'WhatsApp number',
				hint: 'Enquiries are sent here. Digits and country code only, e.g. 6281354911647',
			},
			{ type: 'text', name: 'email', label: 'Email' },
			{
				type: 'list',
				name: 'address',
				label: 'Address lines',
				item: 'text',
				atLeastOne: true,
			},
			{ type: 'number', name: 'reviewCount', label: 'Review count', min: 0 },
		],
	},
	siteCta: {
		type: 'object',
		name: 'siteCta',
		label: 'Closing banner',
		fields: [
			{ type: 'words', name: 'title', label: 'Heading', hint: 'Use \\n for a line break' },
			{ type: 'words', name: 'text', label: 'Text' },
			{ type: 'text', name: 'ctaLabel', label: 'Button label' },
		],
	},
	cards: {
		type: 'object',
		name: 'cards',
		label: 'Cards',
		fields: [
			{
				type: 'object',
				name: 'package',
				label: 'Package card',
				fields: [
					{ type: 'text', name: 'priceFromLabel', label: 'Price prefix' },
					{ type: 'text', name: 'perPersonLabel', label: 'Per-person suffix' },
					{ type: 'text', name: 'actionLabel', label: 'Button label' },
				],
			},
			{
				type: 'object',
				name: 'post',
				label: 'Article card',
				fields: [{ type: 'text', name: 'actionLabel', label: 'Button label' }],
			},
		],
	},
	homePage: {
		type: 'object',
		name: 'homePage',
		label: 'Home page',
		fields: [
			{
				type: 'text',
				name: 'seoTitle',
				label: 'Page title',
				hint: 'The browser tab and the share card',
			},
			{
				type: 'words',
				name: 'seoDescription',
				label: 'Page description',
				hint: 'About 150–160 characters',
			},
			{ type: 'text', name: 'badge', label: 'Hero badge' },
			{ type: 'words', name: 'heading', label: 'Hero heading', hint: 'Use \\n for a line break' },
			{ type: 'words', name: 'intro', label: 'Hero text' },
			homeSection('packages', 'Packages band'),
			homeSection('destinations', 'Destinations band'),
			homeSection('features', 'Reasons band'),
			homeSection('about', 'About band', [
				{ type: 'list', name: 'body', label: 'Paragraphs', item: 'text', atLeastOne: true },
			]),
			homeSection('testimonials', 'Reviews band'),
			homeSection('faqs', 'Questions band'),
			homeSection('insights', 'Journal band'),
			{ type: 'text', name: 'reviewsLabel', label: 'Reviews link label' },
		],
	},
	nav: {
		type: 'rows',
		name: 'nav',
		label: 'Main navigation',
		fields: navFields,
		// The contract's one required list besides `languages`: a site with no navigation
		// cannot be saved, so the control says so up front rather than after a refusal.
		atLeastOne: true,
	},
	languages: {
		type: 'rows',
		name: 'languages',
		label: 'Languages',
		fields: [
			{ type: 'text', name: 'code', label: 'Code', hint: 'e.g. en' },
			{ type: 'text', name: 'label', label: 'Label' },
			{ type: 'text', name: 'flag', label: 'Flag' },
		],
		atLeastOne: true,
	},
	socials: {
		type: 'rows',
		name: 'socials',
		label: 'Social links',
		fields: [
			{ type: 'text', name: 'label', label: 'Label' },
			{ type: 'text', name: 'icon', label: 'Icon', hint: 'A Font Awesome class' },
			{ type: 'text', name: 'href', label: 'Link' },
		],
	},
	footerDestinations: {
		type: 'rows',
		name: 'footerDestinations',
		label: 'Footer destinations',
		fields: navFields,
	},
	features: featureSetting('features', 'Features'),
	testimonials: {
		type: 'rows',
		name: 'testimonials',
		label: 'Testimonials',
		fields: [
			{ type: 'words', name: 'quote', label: 'Quote' },
			{ type: 'text', name: 'name', label: 'Name' },
			{ type: 'text', name: 'country', label: 'Country' },
			{ type: 'media', name: 'avatar', label: 'Avatar' },
		],
	},
	faqs: {
		type: 'rows',
		name: 'faqs',
		label: 'FAQs',
		fields: [
			{ type: 'text', name: 'question', label: 'Question' },
			{ type: 'words', name: 'answer', label: 'Answer' },
		],
	},
	stats: {
		type: 'rows',
		name: 'stats',
		label: 'Stats',
		fields: [
			{ type: 'text', name: 'value', label: 'Value', hint: 'As displayed, e.g. 1,200+' },
			{ type: 'text', name: 'label', label: 'Label' },
		],
	},
	visionMission: featureSetting('visionMission', 'Vision and mission'),
	contactChannels: {
		type: 'rows',
		name: 'contactChannels',
		label: 'Contact channels',
		fields: [
			{ type: 'text', name: 'icon', label: 'Icon', hint: 'A Font Awesome class' },
			{ type: 'text', name: 'title', label: 'Title' },
			{ type: 'words', name: 'text', label: 'Text' },
			{ type: 'text', name: 'value', label: 'Value' },
			{
				type: 'text',
				name: 'extra',
				label: 'Second line',
				hint: 'Optional',
				optional: true,
			},
			{ type: 'text', name: 'href', label: 'Link' },
		],
	},
	blogCategories: {
		type: 'list',
		name: 'blogCategories',
		label: 'Blog categories',
		item: 'text',
	},
	ctaBackground: {
		type: 'media',
		name: 'ctaBackground',
		label: 'CTA banner background',
	},
	packagesPage: innerPageSpec('packagesPage', 'Packages page'),
	destinationsPage: innerPageSpec('destinationsPage', 'Destinations page'),
	blogPage: innerPageSpec('blogPage', 'Blog page'),
	aboutPage: innerPageSpec('aboutPage', 'About page', [
		{ type: 'text', name: 'storyEyebrow', label: 'Story eyebrow' },
		{ type: 'words', name: 'storyTitle', label: 'Story heading' },
		{ type: 'words', name: 'storyBody', label: 'Story text' },
		{ type: 'text', name: 'missionEyebrow', label: 'Mission eyebrow' },
		{ type: 'words', name: 'reasonsTitle', label: 'Reasons band heading' },
	]),
	packageDetail: detailSpec('packageDetail', 'Package page', [
		{ type: 'text', name: 'overview', label: 'Overview heading' },
		{ type: 'text', name: 'highlights', label: 'Highlights heading' },
		{ type: 'text', name: 'included', label: 'Included heading' },
		{ type: 'text', name: 'itinerary', label: 'Itinerary heading' },
		{ type: 'text', name: 'priceFromLabel', label: 'Price prefix' },
		{ type: 'text', name: 'perPersonLabel', label: 'Per-person suffix' },
		{ type: 'text', name: 'bookNowLabel', label: 'Booking button label' },
		{ type: 'words', name: 'bookingNote', label: 'Booking note' },
		{ type: 'text', name: 'related', label: 'Related heading' },
		{ type: 'text', name: 'relatedActionLabel', label: 'Related link label' },
		{ type: 'text', name: 'galleryHint', label: 'Gallery swipe hint' },
		{
			type: 'words',
			name: 'summary',
			label: 'Standfirst under the title',
			hint: 'Use {days} where the trip length goes',
		},
	]),
	destinationDetail: detailSpec('destinationDetail', 'Destination page', [
		{ type: 'text', name: 'overview', label: 'Overview heading' },
		{ type: 'text', name: 'quickInfo', label: 'Quick info heading' },
		{ type: 'text', name: 'experiences', label: 'Experiences heading' },
		{ type: 'text', name: 'gallery', label: 'Gallery heading' },
	]),
	articleDetail: detailSpec('articleDetail', 'Article page', [
		{ type: 'text', name: 'articleCtaTitle', label: 'Banner heading' },
		{ type: 'text', name: 'articleCtaText', label: 'Banner standfirst' },
		{ type: 'words', name: 'articleCtaBody', label: 'Banner text' },
		{ type: 'text', name: 'articleCtaLabel', label: 'Banner button label' },
		{ type: 'text', name: 'articleCtaCallLabel', label: 'Banner phone label' },
		{ type: 'text', name: 'articleCtaPopularLabel', label: 'Banner tour label' },
		{ type: 'text', name: 'keepReadingLabel', label: 'Keep reading label' },
		{ type: 'words', name: 'relatedLabel', label: 'More guides standfirst' },
	]),
	contactPage: innerPageSpec('contactPage', 'Contact page', [
		{ type: 'text', name: 'formEyebrow', label: 'Form heading' },
		{ type: 'words', name: 'formIntro', label: 'Form intro' },
		{ type: 'text', name: 'formIntroLead', label: 'Form intro, before the email address' },
		{ type: 'text', name: 'preferEmailLabel', label: 'Email prompt' },
		{ type: 'text', name: 'urgentLabel', label: 'Urgent-call prompt' },
	]),
} as const;

/** The order the settings screen lists them in. Every key must appear exactly once. */
export const settingGroups: readonly {
	readonly title: string;
	readonly keys: readonly SiteSettingKey[];
}[] = [
	{ title: 'Brand and contact', keys: ['site'] },
	{
		title: 'Navigation and chrome',
		keys: ['nav', 'languages', 'socials', 'footerDestinations'],
	},
	{
		title: 'Shared blocks',
		keys: ['features', 'testimonials', 'stats', 'visionMission', 'ctaBackground'],
	},
	{ title: 'Contact page', keys: ['contactChannels', 'faqs'] },
	{ title: 'Blog', keys: ['blogCategories'] },
	{
		title: 'Page copy — shared, home, and the closing banner',
		keys: ['siteCta', 'cards', 'homePage'],
	},
	{
		title: 'Page copy — listing pages',
		keys: ['packagesPage', 'destinationsPage', 'blogPage', 'aboutPage', 'contactPage'],
	},
	{
		// A group of its own because these are a different *kind* of page: a listing page is a
		// hero over a grid, a detail page is a set of band headings. An editor looking for
		// "Trip Overview" should not be offered the page that never shows it.
		title: 'Page copy — detail pages',
		keys: ['packageDetail', 'destinationDetail', 'articleDetail'],
	},
];

/** One line per key for the index, where there is no room for the whole form. */
export const settingNotes: Record<SiteSettingKey, string> = {
	site: 'Name, tagline, the phone number and email, the postal address, and the review count in the header.',
	nav: 'The links in the main navigation, in order.',
	languages: 'The language switcher in the header.',
	socials: 'The social links in the footer.',
	footerDestinations: 'The destination links in the footer.',
	features: '“The reason travellers choose Banggai Escape” — used on the home and about pages.',
	testimonials: 'The reviews on the home page, with each reviewer’s avatar.',
	stats: 'The counters in the about section.',
	visionMission: 'The vision and mission cards on the about page.',
	contactChannels: 'The cards on the contact page — phone, email, office, hours.',
	faqs: 'The questions and answers shared by the home, about and contact pages.',
	blogCategories: 'The filter chips above the blog listing.',
	ctaBackground: 'The image behind the “plan your trip” banner on every page.',
	siteCta: 'The closing invitation at the foot of every page.',
	cards: 'The words on a package or article card — the price prefix and the button label.',
	homePage: 'The home page’s hero, its six section headings, and its About text.',
	packagesPage: 'The packages listing page — its hero, and how it describes itself.',
	destinationsPage: 'The destinations listing page — its hero, and how it describes itself.',
	blogPage: 'The blog listing page — its hero, and how it describes itself.',
	aboutPage: 'The about page — its story, its vision, and how it describes itself.',
	contactPage: 'The contact page — its hero and the wording around the form.',
	packageDetail:
		'One package page — its four band headings, the booking box, and the related block.',
	destinationDetail: 'One destination page — its four band headings.',
	articleDetail: 'One article page — the closing invitation and the “keep reading” block.',
};

/**
 * Every key, in the order the groups present them.
 *
 * Derived from `settingGroups` so the index and the sidebar cannot disagree about the
 * order. A key missing from a group is caught by a test rather than by a silent omission
 * on the page.
 */
export const settingKeys: readonly SiteSettingKey[] = settingGroups.flatMap((group) => group.keys);

/** Guards a route parameter before it reaches a spec lookup. */
export function isSiteSettingKey(value: string | undefined): value is SiteSettingKey {
	return typeof value === 'string' && Object.hasOwn(settingSpecs, value);
}

/** One row of the draft preview. */
export type PreviewRow = {
	readonly label: string;
	/** Empty for a media row: the page renders the image instead of text. */
	readonly text: string;
	/** Media ids, so the page can resolve them to URLs. */
	readonly media: readonly string[];
};

/**
 * Flattens a payload into labelled rows for the preview.
 *
 * The preview is the *administrator's* view of what they have entered, not a rendering of
 * the public page: the marketing components live in `apps/web`, and importing them would
 * cross the app boundary (AGENTS.md rule 7). So this walks the same spec the editor uses
 * and reports what is stored, which is what makes a missing field visible before publish
 * rather than after.
 */
export function describeFields(fields: readonly FieldSpec[], payload: unknown): PreviewRow[] {
	const rows: PreviewRow[] = [];

	const walk = (fields: readonly FieldSpec[], source: unknown, prefix: string) => {
		for (const field of fields) {
			const label = prefix ? `${prefix} · ${field.label}` : field.label;
			const value = readPath(source, field.name);

			switch (field.type) {
				case 'media':
					rows.push({
						label,
						text: typeof value === 'string' ? '' : '— not set —',
						media: typeof value === 'string' ? [value] : [],
					});
					break;

				case 'object':
					walk(field.fields, value, label);
					break;

				case 'list': {
					const items = Array.isArray(value) ? value : [];

					if (field.item === 'media') {
						rows.push({
							label,
							text: items.length === 0 ? '— empty —' : '',
							media: items.map(String),
						});
						break;
					}

					rows.push({
						label,
						text: items.length === 0 ? '— empty —' : items.join(' · '),
						media: [],
					});
					break;
				}

				case 'rows': {
					const items = Array.isArray(value) ? value : [];

					if (items.length === 0) {
						rows.push({ label, text: '— empty —', media: [] });
						break;
					}

					for (const [index, item] of items.entries()) {
						walk(field.fields, item, `${label} ${index + 1}`);
					}
					break;
				}

				case 'blocks': {
					const items = Array.isArray(value) ? value : [];

					if (items.length === 0) {
						rows.push({ label, text: '— empty —', media: [] });
						break;
					}

					for (const [index, item] of items.entries()) {
						const blockKind = String(readPath(item, 'kind') ?? 'unknown');
						const spec = blockSpecs.find((block) => block.kind === blockKind);

						walk(spec?.fields ?? [], item, `${label} ${index + 1} (${blockKind})`);
					}
					break;
				}

				case 'boolean':
					rows.push({ label, text: value === true ? 'Yes' : 'No', media: [] });
					break;

				default: {
					const text =
						value === undefined || value === null || value === '' ? '— not set —' : String(value);

					rows.push({ label, text, media: [] });
				}
			}
		}
	};

	walk(fields, payload, '');

	return rows;
}

/** The same, for one content kind's payload. */
export function describePayload(kind: ContentKind, payload: Record<string, unknown>): PreviewRow[] {
	return describeFields(fieldSpecs[kind], payload);
}

/** One choosable image, as the media fields render it. */
export type MediaOption = {
	readonly id: string;
	readonly label: string;
	readonly url: string | null;
};

/** Guards a route parameter before it reaches a query. */
export function isContentKind(value: string | undefined): value is ContentKind {
	return value === 'package' || value === 'destination' || value === 'article';
}

// ---------------------------------------------------------------------------
// Names
// ---------------------------------------------------------------------------

/** The input name for a field inside a group. */
export function childPath(parent: string, name: string): string {
	return parent ? `${parent}.${name}` : name;
}

/** The input name for one item of a repeatable list. */
export function itemPath(parent: string, index: number): string {
	return `${parent}[${index}]`;
}

/** The hidden input that carries how many items a repeatable field has. */
export function countName(parent: string): string {
	return `${parent}.__count`;
}

/**
 * Reads a value out of the payload for a field path.
 *
 * The renderer needs the current value of `highlights[1].title` while it is building the
 * form, and the path is already the input name — so it is also the address of the value.
 * One traversal instead of a per-field getter keeps the two in step for free.
 */
export function readPath(source: unknown, path: string): unknown {
	let current: unknown = source;

	for (const step of tokenise(path)) {
		if (current === null || typeof current !== 'object') return undefined;

		current = Array.isArray(current)
			? current[step.index ?? Number.NaN]
			: (current as Record<string, unknown>)[step.key ?? ''];
	}

	return current;
}

/**
 * `highlights[0].title` → `{key:'highlights'}, {index:0}, {key:'title'}`.
 *
 * A malformed path yields no steps rather than throwing: the input name is built by this
 * module, so a bad one is a bug in the spec rather than anything a visitor can send.
 */
function tokenise(path: string): { key?: string; index?: number }[] {
	const steps: { key?: string; index?: number }[] = [];

	for (const part of path.split('.')) {
		const match = part.match(/^([^[]*)((?:\[\d+\])*)$/);

		if (!match) return [];

		if (match[1]) steps.push({ key: match[1] });

		for (const index of match[2].matchAll(/\[(\d+)\]/g)) {
			steps.push({ index: Number(index[1]) });
		}
	}

	return steps;
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

/**
 * How many rows each repeatable field should open with.
 *
 * One for an empty field rather than zero, so a new entry shows something to type into and
 * an administrator is not asked to understand why the form is blank. Once they remove it,
 * the count stays removed — that is what makes "you need at least one" reachable.
 */
export function countsFor(fields: readonly FieldSpec[], payload: unknown): Record<string, number> {
	const counts: Record<string, number> = {};

	const walk = (fields: readonly FieldSpec[], source: unknown, prefix: string) => {
		for (const field of fields) {
			const path = childPath(prefix, field.name);

			if (field.type === 'object') {
				walk(field.fields, readPath(source, field.name), path);
				continue;
			}

			if (field.type === 'blocks') {
				const blocks = readPath(source, field.name);

				counts[path] = Math.max(1, Array.isArray(blocks) ? blocks.length : 0);

				// A block nests one level deeper than anything else: it owns the fields of
				// whichever kind is selected for it, and those can be repeatable in turn
				// (`steps.items`). Walking them here rather than in a second pass keyed on the
				// content kind is what lets the same walk count a site setting.
				for (const [index, block] of (Array.isArray(blocks) ? blocks : []).entries()) {
					const spec = blockSpecs.find((entry) => entry.kind === String(readPath(block, 'kind')));

					walk(spec?.fields ?? [], block, itemPath(path, index));
				}

				continue;
			}

			if (field.type === 'list' || field.type === 'rows') {
				const value = readPath(source, field.name);

				counts[path] = Math.max(1, Array.isArray(value) ? value.length : 0);
			}
		}
	};

	walk(fields, payload, '');

	return counts;
}

/** The same, for one content kind's payload. */
export function initialCounts(
	kind: ContentKind,
	payload: Record<string, unknown>,
): Record<string, number> {
	return countsFor(fieldSpecs[kind], payload);
}

/**
 * A setting's value, wrapped in the object the path walkers navigate.
 *
 * A setting's stored value *is* its single root field's value, but every reader here —
 * `readPath`, `countsFor`, the controls — starts from an object keyed by field name. So the
 * read side wraps and the write side unwraps. Both directions live next to each other
 * (`this` and `parseSettingForm`) because a mismatch between them is invisible until a form
 * opens blank.
 */
export function settingFormValues(key: SiteSettingKey, value: unknown): Record<string, unknown> {
	return { [key]: value };
}

/** The same, for one site setting's stored value. */
export function initialSettingCounts(key: SiteSettingKey, value: unknown): Record<string, number> {
	// Wrapped, because `countsFor` navigates from an object by field name: handed a bare
	// array it would read `array['faqs']`, find nothing, and open the form with one blank row
	// however many rows are stored.
	// One spec in a list: a setting has a single root field, and `countsFor` walks field
	// lists because that is what a content kind's payload needs.
	return countsFor([settingSpecs[key]], settingFormValues(key, value));
}

/** The block kind selected for each position of the article body. */
export function initialBlockKinds(
	kind: ContentKind,
	payload: Record<string, unknown>,
): Record<string, string> {
	if (kind !== 'article') return {};

	const blocks = readPath(payload, 'body');
	const kindsByPath: Record<string, string> = {};

	for (const [index, block] of (Array.isArray(blocks) ? blocks : []).entries()) {
		const blockKind = String(readPath(block, 'kind') ?? '');

		kindsByPath[itemPath('body', index)] = blockKinds.includes(blockKind) ? blockKind : 'p';
	}

	return kindsByPath;
}

/**
 * Builds a payload from submitted form data.
 *
 * This does **not** validate — the contract does, in the action, so a failure is reported
 * with the same `kind → field: message` lines as everywhere else. What this does is
 * coercion: numbers from strings, checkboxes from presence, `''` from an untouched field
 * into an absent value so the contract says "required" rather than "expected number,
 * received string".
 *
 * The payload is returned even on a shape this could not finish, so the form can be
 * re-rendered with what the administrator typed.
 */
export function parseFields(fields: readonly FieldSpec[], form: FormData): Record<string, unknown> {
	const payload: Record<string, unknown> = {};

	for (const spec of fields) {
		payload[spec.name] = readField(spec, spec.name, form);
	}

	return payload;
}

/** The same, for one content kind's form. */
export function parseContentForm(kind: ContentKind, form: FormData): Record<string, unknown> {
	return parseFields(fieldSpecs[kind], form);
}

/**
 * Parses one setting's form into the value its key stores.
 *
 * A setting has exactly one root field and the stored value *is* that field's value — an
 * array for `faqs`, an object for `site`, a media id for `ctaBackground`. There is no
 * wrapper object to unwrap, so `readField` on the root spec is the whole job and no
 * per-key code is needed.
 */
export function parseSettingForm(key: SiteSettingKey, form: FormData): unknown {
	const spec = settingSpecs[key];

	return readField(spec, spec.name, form);
}

/** Reads the fields a block kind owns, and nothing else — the union is strict. */
function readBlock(
	index: number,
	parent: string,
	form: FormData,
): Record<string, unknown> | undefined {
	const path = itemPath(parent, index);
	const kind = form.get(childPath(path, 'kind'))?.toString();

	const spec = blockSpecs.find((block) => block.kind === kind);

	// An unknown kind is left out rather than guessed at; the contract then fails on the
	// body, and the form shows which block.
	if (!spec) return undefined;

	const block: Record<string, unknown> = { kind: spec.kind };

	for (const field of spec.fields) {
		block[field.name] = readField(field, childPath(path, field.name), form);
	}

	return block;
}

function readField(spec: FieldSpec, path: string, form: FormData): unknown {
	switch (spec.type) {
		case 'text':
		case 'words': {
			const raw = text(form.get(path));

			// Blank means *absent* for an `.optional()` contract field. Returning `''` would
			// turn an untouched optional input into a validation error nobody can fix, since
			// `z.string().min(1).optional()` rejects emptiness as well as absence.
			return spec.optional && raw === '' ? undefined : raw;
		}

		case 'slug':
			return text(form.get(path));

		case 'number': {
			const raw = text(form.get(path));

			// Absent rather than NaN: the contract's own "required" reads better than
			// "expected number, received nan".
			return raw === '' ? undefined : Number(raw);
		}

		case 'select':
			return text(form.get(path));

		case 'boolean':
			// A missing checkbox is how a browser submits "unchecked".
			return form.get(path) !== null;

		case 'media':
			return text(form.get(path)) || undefined;

		case 'object': {
			const value: Record<string, unknown> = {};

			for (const field of spec.fields) {
				value[field.name] = readField(field, childPath(path, field.name), form);
			}

			return value;
		}

		case 'list': {
			const count = countOf(path, form);
			const items: unknown[] = [];

			for (let index = 0; index < count; index += 1) {
				const item = text(form.get(itemPath(path, index)));

				if (spec.item === 'media') items.push(item || undefined);
				else items.push(item);
			}

			return items;
		}

		case 'rows': {
			const count = countOf(path, form);
			const rows: unknown[] = [];

			for (let index = 0; index < count; index += 1) {
				const row: Record<string, unknown> = {};
				const rowPath = itemPath(path, index);

				for (const field of spec.fields) {
					row[field.name] = readField(field, childPath(rowPath, field.name), form);
				}

				rows.push(row);
			}

			return rows;
		}

		case 'blocks': {
			const count = countOf(path, form);
			const blocks: unknown[] = [];

			for (let index = 0; index < count; index += 1) {
				const block = readBlock(index, path, form);

				if (block) blocks.push(block);
			}

			return blocks;
		}
	}
}

/**
 * How many items a repeatable field has.
 *
 * `__count` is authoritative. Without it a submission that removed every row would be
 * indistinguishable from one that never had any, and the field could never become empty —
 * which is a state the contract rejects on purpose.
 */
function countOf(path: string, form: FormData): number {
	const raw = form.get(countName(path));

	if (raw === null) return 0;

	const count = Number.parseInt(raw.toString(), 10);

	if (!Number.isFinite(count) || count < 0) return 0;

	// A hostile submission could claim a huge count; each row costs a few field reads, so
	// this is a cheap sanity bound rather than a real limit.
	return Math.min(count, 500);
}

function text(value: FormDataEntryValue | null): string {
	return value === null ? '' : value.toString().trim();
}
