<script lang="ts">
import { fly } from 'svelte/transition';
import { page } from '$app/state';
import { CARD_SIZES } from '$lib/card-sizes';
import CtaBanner from '$lib/components/CtaBanner.svelte';
import Icon from '$lib/components/Icon.svelte';
import PostCard from '$lib/components/PostCard.svelte';
import SectionHeader from '$lib/components/SectionHeader.svelte';
import Seo from '$lib/components/Seo.svelte';
import ShareRow from '$lib/components/ShareRow.svelte';
import { authorBio, tableOfContents } from '$lib/content';
import { img, media } from '$lib/data/media';
import { blogPosting, breadcrumbList } from '$lib/seo';
import { siteCrumbs } from '$lib/site-seo';

let { data } = $props();

const site = $derived(data.settings.site);

/** The closing invitation, from the CMS. See `$lib/components/CtaBanner`. */
const siteCta = $derived(data.settings.siteCta);

/**
 * The words on a content card.
 *
 * Cards render on four routes each, so this is read once per page and handed to them
 * rather than the card importing settings — a shared component takes props, and a page
 * that reaches into the database from a component is a component that cannot be previewed.
 */
const cardLabels = $derived(data.settings.cards);

/** This page's own words, from the CMS. See `siteSettingSchemas.articleDetail`. */
const copy = $derived(data.settings.articleDetail);
const post = $derived(data.post);
const toc = $derived(tableOfContents(post));
const related = $derived(data.related);
const popular = $derived(data.popular);

let activeId = $state('');
let tocOpen = $state(false);
let articleVisible = $state(false);
let articleEl = $state<HTMLElement | null>(null);

const activeHeading = $derived(toc.find((heading) => heading.id === activeId));

/**
 * Scroll spy — the heading the reader is actually inside. Every heading's own
 * `scroll-margin-top` says where it comes to rest when anchored, so a heading
 * counts as current as soon as it reaches that line. Measuring instead of
 * hardcoding an offset keeps the spy correct at every breakpoint, where the
 * fixed header plus the mobile contents bar take up different heights.
 */
$effect(() => {
	const ids = toc.map((heading) => heading.id);
	if (!ids.length) return;

	let spots: { id: string; el: HTMLElement; landing: number }[] = [];
	let frame = 0;

	const measure = () => {
		spots = ids.flatMap((id) => {
			const el = document.getElementById(id);
			if (!el) return [];
			const margin = Number.parseFloat(getComputedStyle(el).scrollMarginTop);
			return [{ id, el, landing: Number.isNaN(margin) ? 0 : margin }];
		});
	};

	const update = () => {
		frame = 0;
		let current = ids[0];
		for (const spot of spots) {
			if (spot.el.getBoundingClientRect().top <= spot.landing + 8) current = spot.id;
		}
		// A short closing section never reaches its anchor line, so pin the last one.
		const atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
		activeId = atEnd ? ids[ids.length - 1] : current;
	};

	const onScroll = () => {
		if (!frame) frame = requestAnimationFrame(update);
	};
	const onResize = () => {
		measure();
		onScroll();
	};

	measure();
	update();
	window.addEventListener('scroll', onScroll, { passive: true });
	window.addEventListener('resize', onResize);
	return () => {
		window.removeEventListener('scroll', onScroll);
		window.removeEventListener('resize', onResize);
		if (frame) cancelAnimationFrame(frame);
	};
});

/** The bottom contents bar belongs to the article, so it comes and goes with it. */
$effect(() => {
	const el = articleEl;
	if (!el) return;
	const observer = new IntersectionObserver(([entry]) => (articleVisible = entry.isIntersecting), {
		rootMargin: '-80px 0px -40% 0px',
	});
	observer.observe(el);
	return () => observer.disconnect();
});

/**
 * The absolute, canonical URL of this article, for the share row and the canonical link.
 *
 * Built from `page.url` rather than `location`, so it is correct during SSR and is the
 * same string a crawler resolves. Behind Cloudflare `page.url.origin` is already the
 * public host, so nothing here hardcodes a domain — the request knows.
 *
 * Query and fragment are dropped: `?utm_source=…` is how a link arrives, not where it
 * points, and a canonical URL that varies per campaign is not canonical.
 */
const canonicalUrl = $derived(new URL(page.url.pathname, page.url.origin).href);

/**
 * This article as a `BlogPosting`, plus the trail that leads to it.
 *
 * The dates come from the revision, not from `post.date` and `post.updated`. Those are display
 * strings an editor typed for a human reader — "March 12, 2026" — and a consumer that cannot
 * parse them treats the article as undated, which loses the date treatment in a feed and the
 * freshness signal in a result.
 */
const structuredData = $derived([
	blogPosting({
		headline: post.title,
		description: post.excerpt,
		url: canonicalUrl,
		image: post.hero.src,
		publishedTime: data.publishedAt,
		modifiedTime: data.updatedAt,
		author: post.author,
		siteName: site.name,
		publisherLogo: '/logomark.png',
	}),
	breadcrumbList(
		page.url.origin,
		siteCrumbs({ name: 'Blog', path: '/blog' }, { name: post.title, path: page.url.pathname }),
	),
]);
</script>

<svelte:head>
	<!--
		The article's own photograph, preloaded.

		It is the Largest Contentful Paint element on this page and `fetchpriority="high"`
		tells the browser to start it early, but a preload is stronger still: it puts the
		request in the queue before the parser has finished the head. Only the largest
		candidate is preloaded, because a browser ignores a second image preload and the
		bytes would be wasted.
	-->
	{#if post.hero.srcset}
		<link rel="preload" as="image" href={post.hero.src} fetchpriority="high" />
	{/if}
</svelte:head>

<Seo
	title="{post.title} — {site.name}"
	description={post.excerpt}
	canonical={canonicalUrl}
	siteName={site.name}
	locale={site.locale}
	image={{ url: post.hero.src, alt: post.hero.alt ?? post.title }}
	publishedTime={data.publishedAt}
	modifiedTime={data.updatedAt}
	author={post.author}
	structuredData={structuredData}
/>

<svelte:window
	onkeydown={(event) => {
		if (event.key === 'Escape') tocOpen = false;
	}}
/>

<!-- Title -->
<section class="border-b border-stone-100 bg-white px-6 pt-8 pb-6">
	<div class="mx-auto max-w-7xl">
		<div class="mb-4">
			<span
				class="inline-block rounded-full bg-gold/15 px-3 py-1 text-label font-bold tracking-wider text-gold-deep uppercase"
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
					<div class="text-label font-medium text-stone-400">
						{post.updated} · {post.readTime}
					</div>
				</div>
			</div>

			<ShareRow
				url={canonicalUrl}
				title={post.title}
				description={post.excerpt}
			/>
		</div>
	</div>
</section>

<!-- Hero image -->
<section class="mx-auto mt-6 mb-12 max-w-7xl px-6">
	<div class="overflow-hidden rounded-xl border border-stone-100 bg-white shadow-lg">
		<img
			class="h-auto max-h-[540px] w-full object-cover object-center transition-transform duration-500 hover:scale-[1.01]"
			src={post.hero.src}
			srcset={post.hero.srcset}
			sizes={CARD_SIZES.full}
			alt={post.hero.alt ?? post.title}
			width="2000"
			height="1100"
			fetchpriority="high"
			decoding="async"
		/>
	</div>
	<p class="mt-3 text-center text-base text-stone-500 italic">{post.excerpt}</p>
</section>

<!-- Article + aside -->
<section class="mx-auto mb-24 max-w-7xl px-6">
	<div class="grid grid-cols-1 items-start gap-12 lg:grid-cols-12">
		<article
			bind:this={articleEl}
			class="text-base leading-relaxed text-stone-700 sm:text-lg lg:col-span-8"
		>
			{#each post.body as block, index (index)}
				{#if block.kind === 'p'}
					<p class="mb-6 leading-relaxed text-stone-600">{block.text}</p>
				{:else if block.kind === 'h'}
					<h2
						id={block.id}
						class="mt-10 mb-4 scroll-mt-36 text-2xl font-bold tracking-tight text-stone-900 sm:text-[26px] lg:scroll-mt-28"
					>
						{block.text}
					</h2>
				{:else if block.kind === 'steps'}
					<div class="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
						{#each block.items as item (item.title)}
							<div
								class="rounded-lg border border-stone-200/80 bg-white p-4 transition hover:border-stone-300"
							>
								<h3 class="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-stone-900">
									{item.title}
								</h3>
								<p class="text-base leading-relaxed text-stone-600">{item.text}</p>
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
			<div class="mt-4 flex items-start gap-4 rounded-xl border border-stone-200 bg-white p-6">
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
							class="rounded bg-stone-200 px-2 py-0.5 text-label font-bold tracking-wider text-stone-700 uppercase"
						>
							{post.authorRole}
						</span>
					</div>
					<p class="text-base leading-relaxed text-stone-600">{authorBio}</p>
				</div>
			</div>
		</article>

		<!-- Aside -->
		<aside class="flex flex-col gap-8 lg:col-span-4 lg:sticky lg:top-28">
			{#if toc.length}
				<div
					class="hidden rounded-xl border border-stone-200 bg-white p-6 shadow-sm lg:block"
				>
					<div class="mb-3 flex items-center gap-2 border-b border-stone-100 pb-3 text-stone-900">
						<Icon icon="fa-solid fa-list-ul" size={14} class="text-gold" />
						<h2 class="text-xs font-extrabold tracking-wider text-stone-800 uppercase">
							Table of Contents
						</h2>
					</div>
					<ul class="space-y-2 text-xs font-medium text-stone-600">
						{#each toc as heading (heading.id)}
							<li>
								<a
									class="block border-l-2 pl-2 transition {heading.id === activeId
										? 'border-gold font-bold text-gold-deep'
										: 'border-transparent hover:text-stone-900 hover:underline'}"
									aria-current={heading.id === activeId ? 'location' : undefined}
									href="#{heading.id}"
								>
									{heading.text}
								</a>
							</li>
						{/each}
					</ul>
				</div>
			{/if}

			<div class="rounded-xl border border-forest-line bg-forest-deep p-6 text-white shadow-md">
				<span class="mb-2 block text-label font-bold tracking-widest text-gold-light uppercase">
					{copy.articleCtaTitle}
				</span>
				<h3 class="mb-3 text-base font-bold leading-tight">
					{copy.articleCtaText}
				</h3>
				<p class="mb-5 text-sm leading-relaxed text-stone-300">
					{copy.articleCtaBody}
				</p>
				<a
					class="block w-full rounded bg-gold py-2.5 text-center text-xs font-bold tracking-wider text-forest-deep uppercase shadow-sm transition-all hover:bg-gold-deep"
					href="/contact"
				>
					{copy.articleCtaLabel}
				</a>
				<div
					class="mt-4 flex items-center justify-between border-t border-forest-line/60 pt-4 text-label font-medium text-stone-400"
				>
					<span>{copy.articleCtaCallLabel}</span>
					<a class="font-semibold text-stone-200" href={site.phoneHref}>{site.phone}</a>
				</div>
			</div>

			{#if popular}
				<a
					class="block overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm transition hover:shadow-md"
					href="/packages/{popular.slug}"
				>
					<div class="relative">
						<span
							class="absolute top-3 left-3 rounded bg-gold px-2.5 py-1 text-label font-extrabold text-forest-abyss uppercase shadow"
						>
							{copy.articleCtaPopularLabel}
						</span>
						<img
							class="h-44 w-full object-cover"
							src={popular.image.src}
							srcset={popular.image.srcset}
							sizes={CARD_SIZES.threeUp}
							alt={popular.image.alt ?? popular.title}
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

<!--
	Mobile table of contents — pinned directly under the header while the article is
	on screen: one row showing the section the reader is in, expanding downward.
-->
{#if toc.length && (articleVisible || tocOpen)}
	<div class="fixed inset-x-0 top-20 z-40 lg:hidden" transition:fly={{ y: -96, duration: 250 }}>
		{#if tocOpen}
			<button
				type="button"
				class="fixed inset-0 -z-10 bg-forest-abyss/40"
				aria-label="Close contents"
				onclick={() => (tocOpen = false)}
			></button>
		{/if}

		<div
			class="border-b border-hairline bg-white shadow-[0_8px_28px_rgba(24,52,42,0.14)]"
			role="region"
			aria-label="Table of contents"
		>
			<button
				type="button"
				class="flex w-full items-center gap-3 px-6 py-2.5 text-left"
				aria-expanded={tocOpen}
				onclick={() => (tocOpen = !tocOpen)}
			>
				<Icon icon="fa-solid fa-list-ul" size={14} class="text-gold" />
				<span class="shrink-0 text-label font-bold tracking-widest text-stone-400 uppercase">
					Contents
				</span>
				<span class="min-w-0 flex-1 truncate text-sm font-semibold text-stone-800">
					{activeHeading?.text ?? 'On this page'}
				</span>
				<Icon icon="fa-solid fa-chevron-down" size={14} class="text-stone-400 transition-transform {tocOpen ? 'rotate-180' : ''}" />
			</button>

			{#if tocOpen}
				<ul class="max-h-[55vh] overflow-y-auto px-3 pb-2">
					{#each toc as heading (heading.id)}
						<li>
							<a
								href="#{heading.id}"
								aria-current={heading.id === activeId ? 'location' : undefined}
								class="block rounded-lg px-3.5 py-2.5 text-sm transition {heading.id === activeId
									? 'bg-stone-100 font-bold text-gold-deep'
									: 'text-stone-600 hover:bg-stone-100'}"
								onclick={() => (tocOpen = false)}
							>
								{heading.text}
							</a>
						</li>
					{/each}
				</ul>
				<div class="mx-auto mb-2.5 h-1 w-10 rounded-full bg-stone-200"></div>
			{/if}
		</div>
	</div>
{/if}

<!-- Related articles -->
{#if related.length}
	<section class="border-t border-stone-200 bg-white px-6 py-16">
		<div class="mx-auto max-w-7xl">
			<SectionHeader
				title={copy.keepReadingLabel}
				subtitle={copy.relatedLabel}
				action={{ label: 'View all posts', href: '/blog' }}
			/>
			<div class="grid grid-cols-1 gap-8 md:grid-cols-3">
				{#each related as item (item.slug)}
					<PostCard post={item} labels={cardLabels.post} />
				{/each}
			</div>
		</div>
	</section>
{/if}

<CtaBanner
	title={siteCta.title}
	text={siteCta.text}
	ctaLabel={siteCta.ctaLabel}
	image={img(media['blog-details-how-to-get-to-banggai-islands']['lush-cascades-and-untouched-karst-valleys-across-banggai-kepulauan-central-sulawesi'], 2000)}
	ctaHref="/contact"
/>
