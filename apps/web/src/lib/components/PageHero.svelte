<script lang="ts">
type Crumb = { label: string; href?: string };

type Props = {
	title: string;
	subtitle?: string;
	image: string;
	/**
	 * Resized variants of `image`, or `null` when the edge cannot produce them.
	 *
	 * Passed in rather than derived here, because a component cannot read the layout's data.
	 * The page already holds `data.imageTransforms`, so it computes this and hands it over —
	 * which keeps this component free of the read layer, as every other component is.
	 */
	imageSrcset?: string | null;
	crumbs?: Crumb[];
	/** Extra classes controlling the band's height. */
	height?: string;
	align?: 'center' | 'left';
};

let {
	title,
	subtitle,
	image,
	imageSrcset = null,
	crumbs = [],
	height = 'py-24 md:py-32',
	align = 'center',
}: Props = $props();
</script>

<!--
	The photograph is an `<img>` rather than a CSS `background-image`, which is the whole point.

	As a background it was the Largest Contentful Paint element *by construction*: a browser
	cannot preload a background, cannot give it a `fetchpriority` hint, and cannot offer it a
	resized candidate. Every hero band on three pages was structurally unable to start early.
	An `<img>` can be all three, so the hero is now the fastest thing on the page.

	The scrim is a sibling layer rather than a gradient baked into a `style` attribute, which is
	also what removes the last `style={...}` from this component — the reason the CSP needs a
	`style-src-attr` permission at all.

	`alt=""` is deliberate: the photograph is decorative here, the subject of the page is the
	`h1` beneath it, and describing it would be noise for anyone listening to the page.
-->
<section
	class="relative flex items-center overflow-hidden px-6 text-white {height} {align === 'center'
		? 'justify-center text-center'
		: ''}"
>
	<img
		class="absolute inset-0 size-full object-cover object-center"
		src={image}
		srcset={imageSrcset}
		sizes="100vw"
		alt=""
		fetchpriority="high"
		decoding="async"
	/>
	<div
		class="absolute inset-0"
		style="background-image: linear-gradient(rgba(12, 37, 28, 0.45), rgba(12, 37, 28, 0.55));"
	></div>

	<div class="relative z-10 {align === 'center' ? 'mx-auto max-w-3xl' : 'mx-auto w-full max-w-7xl'}">
		{#if crumbs.length}
			<nav class="mb-4 flex flex-wrap items-center gap-2 text-xs text-stone-300" aria-label="Breadcrumb">
				{#each crumbs as crumb, index (crumb.label)}
					{#if index > 0}<span aria-hidden="true">/</span>{/if}
					{#if crumb.href}
						<a class="transition hover:text-gold" href={crumb.href}>{crumb.label}</a>
					{:else}
						<span class="text-white">{crumb.label}</span>
					{/if}
				{/each}
			</nav>
		{/if}

		<h1 class="text-3xl font-extrabold tracking-tight drop-shadow-md sm:text-4xl md:text-5xl lg:text-6xl">
			{title}
		</h1>

		{#if subtitle}
			<p class="mx-auto mt-4 max-w-2xl text-sm leading-relaxed font-normal text-stone-200 sm:text-base">
				{subtitle}
			</p>
		{/if}
	</div>
</section>
