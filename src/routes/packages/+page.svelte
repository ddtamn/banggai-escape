<script lang="ts">
	import CtaBanner from '$lib/components/CtaBanner.svelte';
	import PackageCard from '$lib/components/PackageCard.svelte';
	import PageHero from '$lib/components/PageHero.svelte';
	import { backgrounds, img } from '$lib/data/media';
	import { ctaBackground } from '$lib/data/content';
	import { packages, type TripType } from '$lib/data/packages';
	import { site } from '$lib/data/site';

	type Filter = 'All' | TripType;

	const filters: Filter[] = ['All', 'Open Trip', 'Private Trip'];

	let filter = $state<Filter>('All');
	let query = $state('');

	const visible = $derived(
		packages.filter((pkg) => {
			const matchesType = filter === 'All' || pkg.tripType === filter;
			const haystack = `${pkg.title} ${pkg.region} ${pkg.subtitle}`.toLowerCase();
			return matchesType && haystack.includes(query.trim().toLowerCase());
		})
	);
</script>

<svelte:head>
	<title>Tour Packages — {site.name}</title>
	<meta
		name="description"
		content="Choose from our all-inclusive, fully customizable tour packages designed by local experts to showcase the very best of Central Sulawesi's hidden gems."
	/>
</svelte:head>

<PageHero
	title={'Find Your Perfect\nBanggai Escape'}
	subtitle="Choose from our all-inclusive, fully customizable tour packages designed by local experts to showcase the very best of Central Sulawesi's hidden gems."
	image={img(backgrounds.packages['hero-bg'], 2000)}
/>

<main class="section">
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
					<i class="fa-solid fa-magnifying-glass text-xs"></i>
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
</main>

<CtaBanner
	title={'Ready To Begin Your\nNext Adventure ?'}
	image={ctaBackground}
	ctaHref="/contact"
/>
