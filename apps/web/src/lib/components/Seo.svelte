<script lang="ts">
import { buildMetaTags, jsonLdBlock, type SeoImage } from '$lib/seo';

/**
 * One page's whole declaration to crawlers and share cards.
 *
 * ## Why the `<title>` lives here
 *
 * Because the tab title and the share-card title must be the same string. When a page writes
 * its own `<title>`, the Open Graph title is a second string a human has to remember to update
 * at the same time — and the failure is invisible, because a stale `og:title` renders a
 * perfectly good-looking link preview with the wrong name on it. Owning both here means they
 * are the same value by construction rather than by discipline.
 *
 * ## Structured data as a script
 *
 * JSON-LD goes in a `<script type="application/ld+json">` rather than in microdata attributes,
 * for one reason above all: it is a single blob the page already has the data for, so adding a
 * rich result costs no duplication of content into markup. `jsonLdScript` handles the one
 * thing `JSON.stringify` does not, which is that JSON is not HTML — see its comment.
 */
type Props = {
	title: string;
	description: string;
	/** Absolute. Built from `page.url` by the caller, so no domain is hardcoded here. */
	canonical: string;
	siteName: string;
	locale: string;
	/**
	 * The page's own picture, or null to fall back to the site card.
	 *
	 * Prefer a real photograph: a crawler and a feed both show a picture of the thing over a
	 * picture of the logo. The fallback exists so that *no* page is ever shared with no image,
	 * and it lives here rather than in the layout so this component remains the only thing that
	 * ever writes an `og:image`.
	 */
	image?: SeoImage | null;
	publishedTime?: string | null;
	modifiedTime?: string | null;
	author?: string | null;
	/**
	 * JSON-LD documents to embed, in the order they should appear.
	 *
	 * Several is the normal case, not an edge case: a package page is simultaneously a product,
	 * a page and a step in a trail, and a consumer that can only read one of those is better
	 * served by three correct documents than by one forced compromise.
	 */
	structuredData?: readonly unknown[];
};

let {
	title,
	description,
	canonical,
	siteName,
	locale,
	image = null,
	publishedTime = null,
	modifiedTime = null,
	author = null,
	structuredData = [],
}: Props = $props();

/**
 * The card a page falls back to: the site lockup on the site's own light surface.
 *
 * `Omit<…, 'alt'>` because the alt text is the *site's* name, which is a prop — a constant
 * carrying its own would go stale the day the business is renamed.
 */
const SITE_CARD = { url: '/og-default.png', width: 1200, height: 630 } as const;

const resolvedImage = $derived<SeoImage>(
	image ?? { ...SITE_CARD, alt: `${siteName} — island journeys across the Banggai Archipelago` },
);

const tags = $derived(
	buildMetaTags({
		title,
		description,
		canonical,
		siteName,
		locale,
		image: resolvedImage,
		publishedTime,
		modifiedTime,
		author,
	}),
);

/**
 * The JSON-LD blocks, as complete script elements.
 *
 * `html`-injection is used deliberately, and it is the only way to emit a script element with
 * dynamic contents from a Svelte template: Svelte compiles a literal script element in markup
 * as a script element and does not evaluate an expression inside it, and there is no attribute
 * form to put the payload in. So `jsonLdBlock` assembles the string — in a plain `.ts` module,
 * because a Svelte script block cannot contain the closing tag it is producing — and what
 * arrives here is a finished element.
 *
 * It is safe because of what it cannot contain: `jsonLdBlock` escapes every `<` before the
 * string gets this far, so the one mechanism that could execute an injected payload has been
 * stripped of the only sequence that could start one.
 */
const jsonLdBlocks = $derived(structuredData.map(jsonLdBlock));
</script>

<svelte:head>
	<title>{title}</title>

	<!--
		The tags are built rather than written out because there are a lot of them, they are the
		same on every page, and a hand-written list of this size is a list that will be wrong on
		one page. A `name`/`property` pair and a `rel` are different attributes, so the renderer
		branches on `attribute` rather than spreading one shape onto all three.
	-->
	{#each tags as tag (tag.attribute + tag.key)}
		{#if tag.attribute === 'rel'}
			<link rel={tag.key} href={tag.href} />
		{:else if tag.attribute === 'property'}
			<meta property={tag.key} content={tag.content} />
		{:else}
			<meta name={tag.key} content={tag.content} />
		{/if}
	{/each}

	{#each jsonLdBlocks as block, index (index)}
		{@html block}
	{/each}
</svelte:head>
