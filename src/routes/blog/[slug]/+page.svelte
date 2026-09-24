<script lang="ts">
	import CtaBanner from '$lib/components/CtaBanner.svelte';
	import PostCard from '$lib/components/PostCard.svelte';
	import SectionHeader from '$lib/components/SectionHeader.svelte';
	import { img, media } from '$lib/data/media';
	import { author, relatedPosts, tableOfContents } from '$lib/data/posts';
	import { packages } from '$lib/data/packages';
	import { site } from '$lib/data/site';

	let { data } = $props();

	const post = $derived(data.post);
	const toc = $derived(tableOfContents(post));
	const related = $derived(relatedPosts(post.slug, 3));
	const popular = packages[0];

	const shares = [
		{ label: 'Share on X', icon: 'fa-brands fa-x-twitter' },
		{ label: 'Share on Facebook', icon: 'fa-brands fa-facebook-f' },
		{ label: 'Share on WhatsApp', icon: 'fa-brands fa-whatsapp' },
		{ label: 'Copy link', icon: 'fa-solid fa-link' }
	];
</script>

<svelte:head>
	<title>{post.title} — {site.name}</title>
	<meta name="description" content={post.excerpt} />
</svelte:head>

<!-- Breadcrumb + title -->
<section class="border-b border-stone-100 bg-white px-4 pt-8 pb-6 sm:px-6">
	<div class="mx-auto max-w-4xl">
		<nav class="mb-6 flex flex-wrap items-center gap-2 text-xs font-medium text-stone-400" aria-label="Breadcrumb">
			<a class="transition hover:text-stone-700" href="/">Home</a>
			<span aria-hidden="true">/</span>
			<a class="transition hover:text-stone-700" href="/blog">Blog</a>
			<span aria-hidden="true">/</span>
			<span class="truncate text-stone-800 sm:max-w-none">{post.title}</span>
		</nav>

		<div class="mb-4">
			<span
				class="inline-block rounded-full bg-gold/15 px-3 py-1 text-[11px] font-bold tracking-wider text-gold-deep uppercase"
			>
				{post.category}
			</span>
		</div>

		<h1 class="mb-6 text-3xl leading-[1.2] font-extrabold tracking-tight text-stone-900 sm:text-4xl md:text-5xl">
			{post.title}
		</h1>

		<div class="flex flex-wrap items-center justify-between gap-4 border-y border-stone-100 py-4">
			<div class="flex items-center gap-3">
				<div
					class="size-10 overflow-hidden rounded-full border border-forest-line bg-forest-deep text-gold-light shadow-sm"
				>
					<img
						class="size-full object-cover"
						src={img(media.home['banggai-escape-team-at-sea'], 160)}
						alt={post.author}
						width="80"
						height="80"
					/>
				</div>
				<div>
					<div class="text-xs font-bold text-stone-900 sm:text-sm">{post.author}</div>
					<div class="text-[11px] font-medium text-stone-400">
						{post.updated} · {post.readTime}
					</div>
				</div>
			</div>

			<div class="flex items-center gap-2 text-xs font-medium text-stone-500">
				<span class="mr-1 hidden sm:inline">Share:</span>
				{#each shares as share (share.label)}
					<button
						type="button"
						class="flex size-8 items-center justify-center rounded-full border border-stone-200 transition-colors hover:bg-stone-50 hover:text-stone-900"
						aria-label={share.label}
					>
						<i class="{share.icon} text-xs"></i>
					</button>
				{/each}
			</div>
		</div>
	</div>
</section>

<!-- Hero image -->
<section class="mx-auto mt-6 mb-12 max-w-5xl px-4 sm:px-6">
	<div class="overflow-hidden rounded-xl border border-stone-100 bg-stone-100 shadow-lg">
		<img
			class="h-auto max-h-[540px] w-full object-cover object-center transition-transform duration-500 hover:scale-[1.01]"
			src={img(post.hero, 2000)}
			alt={post.title}
			width="2000"
			height="1100"
		/>
	</div>
	<p class="mt-3 text-center text-xs text-stone-500 italic">{post.excerpt}</p>
</section>

<!-- Article + aside -->
<section class="mx-auto mb-24 max-w-7xl px-4 sm:px-6 lg:px-8">
	<div class="grid grid-cols-1 items-start gap-12 lg:grid-cols-12">
		<article class="text-base leading-relaxed text-stone-700 sm:text-lg lg:col-span-8">
			{#each post.body as block, index (index)}
				{#if block.kind === 'p'}
					<p class="mb-6 leading-relaxed text-stone-600">{block.text}</p>
				{:else if block.kind === 'h'}
					<h2
						id={block.id}
						class="mt-10 mb-4 scroll-mt-28 text-2xl font-bold tracking-tight text-stone-900 sm:text-[26px]"
					>
						{block.text}
					</h2>
				{:else if block.kind === 'steps'}
					<div class="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
						{#each block.items as item (item.title)}
							<div
								class="rounded-lg border border-stone-200/80 bg-slate-50 p-4 transition hover:border-stone-300"
							>
								<h3 class="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-stone-900">
									{item.title}
								</h3>
								<p class="text-xs leading-relaxed text-stone-600">{item.text}</p>
							</div>
						{/each}
					</div>
				{:else if block.kind === 'callout'}
					<div class="my-6 rounded-r-md border-l-4 border-gold bg-gold/10 p-5">
						<p class="text-sm leading-relaxed text-forest-deep italic sm:text-base">
							<strong class="font-sans font-bold not-italic text-gold-deep">{block.title}</strong>
							— {block.text}
						</p>
					</div>
				{/if}
			{/each}

			<!-- Tags -->
			<div class="flex flex-wrap items-center gap-2 border-t border-stone-200 pt-6 pb-8">
				<span class="mr-2 text-xs font-bold tracking-wider text-stone-400 uppercase">Tags:</span>
				{#each post.tags as tag (tag)}
					<span class="rounded-full bg-stone-100 px-3 py-1 text-xs text-stone-600 transition hover:bg-stone-200">
						#{tag.replace(/\s+/g, '')}
					</span>
				{/each}
			</div>

			<!-- Author -->
			<div class="mt-4 flex items-start gap-4 rounded-xl border border-stone-200 bg-slate-50/90 p-6">
				<div
					class="size-14 flex-shrink-0 overflow-hidden rounded-full border border-forest-line bg-forest-deep"
				>
					<img
						class="size-full object-cover"
						src={img(media.home['banggai-escape-team-at-sea'], 200)}
						alt={post.author}
						width="100"
						height="100"
					/>
				</div>
				<div class="flex-1">
					<div class="mb-1 flex items-center gap-3">
						<h3 class="text-sm font-bold text-stone-900">{post.author}</h3>
						<span
							class="rounded bg-stone-200 px-2 py-0.5 text-[10px] font-bold tracking-wider text-stone-700 uppercase"
						>
							{post.authorRole}
						</span>
					</div>
					<p class="text-xs leading-relaxed text-stone-600">{author.bio}</p>
				</div>
			</div>
		</article>

		<!-- Aside -->
		<aside class="space-y-8 lg:col-span-4 lg:sticky lg:top-28">
			{#if toc.length}
				<div class="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
					<div class="mb-3 flex items-center gap-2 border-b border-stone-100 pb-3 text-stone-900">
						<i class="fa-solid fa-list-ul text-xs text-gold"></i>
						<h2 class="text-xs font-extrabold tracking-wider text-stone-800 uppercase">
							Table of Contents
						</h2>
					</div>
					<ul class="space-y-2 text-xs font-medium text-stone-600">
						{#each toc as heading, index (heading.id)}
							<li>
								<a
									class="block border-l-2 pl-2 transition {index === 0
										? 'border-gold font-bold text-gold-deep'
										: 'border-transparent hover:text-stone-900 hover:underline'}"
									href="#{heading.id}"
								>
									{heading.text}
								</a>
							</li>
						{/each}
					</ul>
				</div>
			{/if}

			<div class="rounded-xl border border-forest-line bg-forest-abyss p-6 text-white shadow-md">
				<span class="mb-2 block text-[10px] font-bold tracking-widest text-gold-light uppercase">
					Need Help Planning?
				</span>
				<h3 class="mb-3 text-base font-bold leading-tight">
					Personalized Banggai Itineraries by Locals
				</h3>
				<p class="mb-5 text-xs leading-relaxed text-slate-300">
					Skip the logistics hassle. Let our experts craft seamless boat rides, airport pickups, and
					lake transfers for you.
				</p>
				<a
					class="block w-full rounded bg-gold py-2.5 text-center text-xs font-bold tracking-wider text-forest-deep uppercase shadow-sm transition-all hover:bg-gold-deep"
					href="/contact"
				>
					Talk to a Specialist
				</a>
				<div
					class="mt-4 flex items-center justify-between border-t border-forest-line/60 pt-4 text-[11px] font-medium text-slate-400"
				>
					<span>Call / WhatsApp:</span>
					<a class="font-semibold text-slate-200" href={site.phoneHref}>{site.phone}</a>
				</div>
			</div>

			{#if popular}
				<a
					class="block overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm transition hover:shadow-md"
					href="/packages/{popular.slug}"
				>
					<div class="relative">
						<span
							class="absolute top-3 left-3 rounded bg-gold px-2.5 py-1 text-[10px] font-extrabold text-forest-abyss uppercase shadow"
						>
							Popular Tour
						</span>
						<img
							class="h-44 w-full object-cover"
							src={img(popular.image, 900)}
							alt={popular.title}
							loading="lazy"
							width="900"
							height="560"
						/>
					</div>
					<div class="p-5">
						<h3 class="mb-1.5 text-sm font-bold text-stone-900">{popular.title}</h3>
						<p class="text-xs leading-relaxed text-stone-500">{popular.region}</p>
					</div>
				</a>
			{/if}
		</aside>
	</div>
</section>

<!-- Related articles -->
{#if related.length}
	<section class="border-t border-stone-200 bg-slate-50 px-4 py-16 sm:px-6 lg:px-8">
		<div class="mx-auto max-w-7xl">
			<SectionHeader
				title="Keep Reading"
				subtitle="More guides from our local team"
				action={{ label: 'View all posts', href: '/blog' }}
			/>
			<div class="grid grid-cols-1 gap-8 md:grid-cols-3">
				{#each related as item (item.slug)}
					<PostCard post={item} />
				{/each}
			</div>
		</div>
	</section>
{/if}

<CtaBanner
	title={'Ready To Begin Your\nNext Adventure ?'}
	text="Let Banggai Escape design your perfect journey today."
	ctaLabel="Book your trip"
	image={img(media['blog-details-how-to-get-to-banggai-islands']['lush-cascades-and-untouched-karst-valleys-across-banggai-kepulauan-central-sulawesi'], 2000)}
	ctaHref="/contact"
/>
