<script lang="ts">
import CtaBanner from '$lib/components/CtaBanner.svelte';
import DestinationCard from '$lib/components/DestinationCard.svelte';
import Icon from '$lib/components/Icon.svelte';
import PageHero from '$lib/components/PageHero.svelte';
import { backgrounds, img } from '$lib/data/media';

let { data } = $props();

const ctaBackground = $derived(data.settings.ctaBackground);
const site = $derived(data.settings.site);
const destinations = $derived(data.destinations);

let query = $state('');

const visible = $derived(
	destinations.filter((destination) =>
		`${destination.name} ${destination.region} ${destination.tagline}`
			.toLowerCase()
			.includes(query.trim().toLowerCase()),
	),
);
</script>

<svelte:head>
	<title>Destinations — {site.name}</title>
	<meta
		name="description"
		content="Handpicked natural sanctuaries across the Banggai Archipelago, curated by local experts for travelers seeking authentic beauty."
	/>
</svelte:head>

<PageHero
	title="Extraordinary Destinations"
	subtitle="Handpicked natural sanctuaries across the Banggai Archipelago, curated by local experts for travelers seeking authentic beauty."
	image={img(backgrounds.destinations['hero-bg'], 2000)}
/>

<div class="section-wide">
	<div class="shell">
		<div class="mb-8 flex justify-end md:mb-10">
			<div class="relative w-full max-w-xs sm:max-w-sm">
				<span class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-stone-400">
					<Icon icon="fa-solid fa-magnifying-glass" size={14} />
				</span>
				<label class="sr-only" for="destination-search">Search destinations</label>
				<input
					id="destination-search"
					class="w-full rounded-full border border-granite bg-white py-2.5 pr-4 pl-10 text-sm text-stone-700 transition outline-none placeholder:text-stone-400 focus:ring-2 focus:ring-forest-mid"
					type="search"
					placeholder="Search destinations"
					bind:value={query}
				/>
			</div>
		</div>

		{#if visible.length}
			<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 md:gap-7 lg:grid-cols-3">
				{#each visible as destination (destination.slug)}
					<DestinationCard {destination} />
				{/each}
			</div>
		{:else}
			<p class="py-16 text-center text-sm text-stone-500">
				No destinations match “{query}”. Try another spelling or browse the full list.
			</p>
		{/if}
	</div>
</div>

<CtaBanner
	title={'Ready To Begin Your\nNext Adventure?'}
	image={ctaBackground}
	ctaHref="/contact"
/>
