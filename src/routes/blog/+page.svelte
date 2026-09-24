<script lang="ts">
	import CtaBanner from '$lib/components/CtaBanner.svelte';
	import PageHero from '$lib/components/PageHero.svelte';
	import PostCard from '$lib/components/PostCard.svelte';
	import { blogCategories, ctaBackground } from '$lib/data/content';
	import { backgrounds, img } from '$lib/data/media';
	import { posts } from '$lib/data/posts';
	import { site } from '$lib/data/site';

	/** The pill labels are plural where the post categories are singular. */
	const matchesCategory = (category: string, filter: string) =>
		filter === 'Latest' || category.toLowerCase().startsWith(filter.replace(/s$/, '').toLowerCase());

	let filter = $state('Latest');

	const visible = $derived(
		posts.filter((post) => matchesCategory(post.category, filter))
	);

	const featured = $derived(visible.slice(0, 2));
	const rest = $derived(visible.slice(2));
</script>

<svelte:head>
	<title>Blog — {site.name}</title>
	<meta
		name="description"
		content="Discover curated articles, destination guides, and travel insight to inspire your next adventure."
	/>
</svelte:head>

<PageHero
	title={'Insights to Help You\nTravel Smarter'}
	subtitle="Discover curated articles, destination guides, and travel insight to inspire your next adventure"
	image={img(backgrounds.blog['hero-bg'], 2000)}
	height="py-28 md:py-36"
/>

<main class="section-wide">
	<div class="shell">
		<div class="mb-12 flex flex-wrap items-center justify-center gap-2 md:gap-3">
			<div class="inline-flex flex-wrap justify-center gap-1 rounded-full bg-sand p-1.5">
				{#each blogCategories as category (category)}
					<button
						type="button"
						aria-pressed={filter === category}
						class="rounded-full px-4 py-2 text-xs whitespace-nowrap transition-colors {filter ===
						category
							? 'bg-white font-bold text-stone-900 shadow-sm'
							: 'font-medium text-stone-600 hover:text-stone-900'}"
						onclick={() => (filter = category)}
					>
						{category}
					</button>
				{/each}
			</div>
		</div>

		{#if featured.length}
			<div class="mb-8 grid grid-cols-1 gap-8 md:grid-cols-2">
				{#each featured as post (post.slug)}
					<PostCard {post} />
				{/each}
			</div>
		{/if}

		{#if rest.length}
			<div class="mb-8 grid grid-cols-1 gap-8 md:grid-cols-3">
				{#each rest as post (post.slug)}
					<PostCard {post} />
				{/each}
			</div>
		{/if}

		{#if !visible.length}
			<div class="py-16 text-center">
				<p class="text-sm text-stone-500">
					No articles published in <strong>{filter}</strong> yet.
				</p>
				<button
					type="button"
					class="btn-forest mt-6"
					onclick={() => (filter = 'Latest')}					>Show latest articles</button
				>
			</div>
		{/if}
	</div>
</main>

<CtaBanner
	title={'Ready To Begin Your\nNext Adventure ?'}
	text="Let Banggai Escape design your perfect journey today."
	ctaLabel="Book your trip"
	image={ctaBackground}
	ctaHref="/contact"
/>
