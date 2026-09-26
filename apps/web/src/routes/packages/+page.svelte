<script lang="ts">
import type { TripType } from '@banggai/content-model';
import { page } from '$app/state';
import CtaBanner from '$lib/components/CtaBanner.svelte';
import Icon from '$lib/components/Icon.svelte';
import PackageCard from '$lib/components/PackageCard.svelte';
import PageHero from '$lib/components/PageHero.svelte';
import Seo from '$lib/components/Seo.svelte';
import { img, media } from '$lib/data/media';
import { imageSrcset } from '$lib/images';
import { breadcrumbList } from '$lib/seo';
import { siteAgency, siteCrumbs } from '$lib/site-seo';

let { data } = $props();

const ctaBackground = $derived(data.settings.ctaBackground);
const site = $derived(data.settings.site);

/** This page's own words, from the CMS. */
const copy = $derived(data.settings.packagesPage);

/** The closing invitation, from the CMS. See `$lib/components/CtaBanner`. */
const siteCta = $derived(data.settings.siteCta);
const packages = $derived(data.packages);

type Filter = 'All' | TripType;

const filters: Filter[] = ['All', 'Open Trip', 'Private Trip'];

let filter = $state<Filter>('All');
let query = $state('');

const visible = $derived(
	packages.filter((pkg) => {
		const matchesType = filter === 'All' || pkg.tripType === filter;
		const haystack = `${pkg.title} ${pkg.region} ${pkg.subtitle}`.toLowerCase();
		return matchesType && haystack.includes(query.trim().toLowerCase());
	}),
);

/**
 * The hero photograph, and its resized variants where the edge can produce them.
 *
 * Held in a constant rather than inlined at the call site because the URL is needed twice — as
 * the `src` fallback and as the thing `imageSrcset` builds candidates from — and writing it
 * out twice is how the two drift apart.
 */
const heroImage = img(
	media['package-details-untouched-banggai-discovery']['island-hopping-and-coral-sanctuary'],
	2000,
);
const heroSrcset = $derived(imageSrcset(heroImage, data.imageTransforms));
/**
 * This page's identity for crawlers and share cards.
 *
 * The canonical URL is built from `page.url`, so it is correct during SSR, identical to what a
 * crawler resolves, and carries no hardcoded domain — behind Cloudflare the request already
 * knows the public host. Query and fragment are dropped, because `?utm_source=…` is how a link
 * arrives rather than where it points.
 */
const canonicalUrl = $derived(new URL(page.url.pathname, page.url.origin).href);
const structuredData = $derived([
	breadcrumbList(page.url.origin, siteCrumbs({ name: 'Packages', path: '/packages' })),
]);
</script>

<Seo
	title="{site.name} — {copy.seoTitle}"
	description={copy.seoDescription}
	canonical={canonicalUrl}
	siteName={site.name}
	locale={site.locale}
	image={{ url: heroImage, alt: 'A tropical island coastline in the Banggai Archipelago' }}
	structuredData={structuredData}
/>
<!--
	The design's `packages/hero-bg` export is a 512×279 thumbnail, so it turns to mush once
	stretched full-bleed. Use the full-quality island shot from the same asset set instead.
-->
<PageHero
	title={copy.heroTitle}
	subtitle={copy.heroSubtitle}
	image={heroImage}
	imageSrcset={heroSrcset}
/>

<div class="section">
	<div class="shell">
		<div class="mb-8 flex flex-col items-center justify-between gap-4 md:flex-row">
			<div
				class="flex w-full items-center gap-2.5 overflow-x-auto pb-2 md:w-auto md:pb-0"
				role="group"
				aria-label="Filter packages by trip type"
			>
				{#each filters as option (option)}
					<button
						type="button"
						aria-pressed={filter === option}
						class="rounded-full border px-5 py-2 text-xs whitespace-nowrap transition-colors {filter ===
						option
							? 'border-gold bg-gold font-semibold text-white shadow-sm'
							: 'border-stone-200 bg-white font-medium text-stone-700 hover:bg-stone-50'}"
						onclick={() => (filter = option)}
					>
						{option}
					</button>
				{/each}
			</div>

			<div class="relative w-full md:w-80">
				<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-stone-400">
					<Icon icon="fa-solid fa-magnifying-glass" size={14} />
				</div>
				<label class="sr-only" for="package-search">Search packages</label>
				<input
					id="package-search"
					class="w-full rounded-full border border-stone-200 bg-white py-2 pr-4 pl-10 text-xs transition-all placeholder:text-stone-400 focus:border-gold-deep focus:ring-1 focus:ring-gold-deep focus:outline-none"
					type="search"
					placeholder="Search destinations or trips"
					bind:value={query}
				/>
			</div>
		</div>

		{#if visible.length}
			<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
				{#each visible as pkg (pkg.slug)}
					<PackageCard {pkg} />
				{/each}
			</div>
		{:else}
			<p class="py-16 text-center text-sm text-stone-500">
				No packages match “{query}”. Try a different destination or clear the search.
			</p>
		{/if}
	</div>
</div>

<CtaBanner
	title={siteCta.title}
	text={siteCta.text}
	ctaLabel={siteCta.ctaLabel}
	image={ctaBackground}
	ctaHref="/contact"
/>
