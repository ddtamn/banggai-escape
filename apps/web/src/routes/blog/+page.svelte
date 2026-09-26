<script lang="ts">
import CtaBanner from '$lib/components/CtaBanner.svelte';
import Icon from '$lib/components/Icon.svelte';
import PageHero from '$lib/components/PageHero.svelte';
import PostCard from '$lib/components/PostCard.svelte';
import { backgrounds, img } from '$lib/data/media';

let { data } = $props();

const blogCategories = $derived(data.settings.blogCategories);
const ctaBackground = $derived(data.settings.ctaBackground);
const site = $derived(data.settings.site);
const posts = $derived(data.posts);

/** The pill labels are plural where the post categories are singular. */
const matchesCategory = (category: string, filter: string) =>
	filter === 'Latest' || category.toLowerCase().startsWith(filter.replace(/s$/, '').toLowerCase());

let filter = $state('Latest');
let query = $state('');

const visible = $derived(
	posts.filter((post) => {
		const haystack =
			`${post.title} ${post.excerpt} ${post.category} ${post.tags.join(' ')}`.toLowerCase();
		return matchesCategory(post.category, filter) && haystack.includes(query.trim().toLowerCase());
	}),
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

<div class="section-wide">
	<div class="shell">
		<div class="mb-8 flex flex-col items-center justify-between gap-4 md:flex-row">
			<div
				class="flex w-full items-center gap-2.5 overflow-x-auto pb-2 md:w-auto md:pb-0"
				role="group"
				aria-label="Filter articles by category"
			>
				{#each blogCategories as category (category)}
					<button
						type="button"
						aria-pressed={filter === category}
						class="rounded-full border px-5 py-2 text-xs whitespace-nowrap transition-colors {filter ===
						category
							? 'border-gold bg-gold font-semibold text-white shadow-sm'
							: 'border-stone-200 bg-white font-medium text-stone-700 hover:bg-stone-50'}"
						onclick={() => (filter = category)}
					>
						{category}
					</button>
				{/each}
			</div>

			<div class="relative w-full md:w-80">
				<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-stone-400">
					<Icon icon="fa-solid fa-magnifying-glass" size={14} />
				</div>
				<label class="sr-only" for="article-search">Search articles</label>
				<input
					id="article-search"
					class="w-full rounded-full border border-stone-200 bg-white py-2 pr-4 pl-10 text-xs transition-all placeholder:text-stone-400 focus:border-gold-deep focus:ring-1 focus:ring-gold-deep focus:outline-none"
					type="search"
					placeholder="Search articles or topics"
					bind:value={query}
				/>
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
					{#if query.trim()}
						No articles match “{query}”. Try a different topic or clear the
						search.
					{:else}
						No articles published in <strong>{filter}</strong> yet.
					{/if}
				</p>
				<button
					type="button"
					class="btn-forest mt-6"
					onclick={() => {
						filter = 'Latest';
						query = '';
					}}>Show latest articles</button
				>
			</div>
		{/if}
	</div>
</div>

<CtaBanner
	title={'Ready To Begin Your\nNext Adventure?'}
	text="Let Banggai Escape design your perfect journey today."
	ctaLabel="Book your trip"
	image={ctaBackground}
	ctaHref="/contact"
/>
