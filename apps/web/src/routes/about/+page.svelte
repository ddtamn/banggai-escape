<script lang="ts">
import { page } from '$app/state';
import { CARD_SIZES } from '$lib/card-sizes';
import CtaBanner from '$lib/components/CtaBanner.svelte';
import Icon from '$lib/components/Icon.svelte';
import Seo from '$lib/components/Seo.svelte';
import { img, media } from '$lib/data/media';
import { imageSrcset } from '$lib/images';
import { breadcrumbList } from '$lib/seo';
import { siteAgency, siteCrumbs } from '$lib/site-seo';

let { data } = $props();

// The site's shared editorial blocks, read once in the layout loader and inherited here.
const ctaBackground = $derived(data.settings.ctaBackground);

/** The closing invitation, from the CMS. See `$lib/components/CtaBanner`. */
const siteCta = $derived(data.settings.siteCta);
const features = $derived(data.settings.features);
const site = $derived(data.settings.site);

/** This page's own words, from the CMS. */
const copy = $derived(data.settings.aboutPage);
const stats = $derived(data.settings.stats);
const visionMission = $derived(data.settings.visionMission);

/** The hero photograph, and the resized variants the edge can produce from it. */
const heroImage = img(media['about-us']['travelers-joyfully-cheering-outdoors-in-nature'], 2000);
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
	siteAgency(site, page.url.origin),
	breadcrumbList(page.url.origin, siteCrumbs({ name: 'About us', path: '/about' })),
]);
</script>

<Seo
	title="{site.name} — {copy.seoTitle}"
	description={copy.seoDescription}
	canonical={canonicalUrl}
	siteName={site.name}
	locale={site.locale}
	image={{ url: heroImage, alt: 'A group of travellers cheering outdoors in nature' }}
	structuredData={structuredData}
/>
<!-- Hero -->
<section class="relative flex min-h-[460px] items-center justify-center overflow-hidden bg-forest-deep sm:min-h-[520px]">
	<img
		class="absolute inset-0 size-full object-cover object-center brightness-[0.70]"
		src={heroImage}
		srcset={heroSrcset}
		sizes={CARD_SIZES.full}
		alt="Travelers joyfully cheering outdoors in nature"
		width="2000"
		height="1200"
		fetchpriority="high"
		decoding="async"
	/>
	<div class="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-black/50"></div>

	<div class="relative z-10 mx-auto max-w-4xl space-y-4 px-6 text-center text-white">
		<h1 class="text-3xl font-extrabold tracking-tight drop-shadow-md sm:text-4xl md:text-5xl lg:text-6xl">
			{copy.heroTitle}
		</h1>
		{#if copy.heroSubtitle}
			<p class="mx-auto max-w-2xl text-sm leading-relaxed font-normal text-stone-200 drop-shadow sm:text-base">
				{copy.heroSubtitle}
			</p>
		{/if}
	</div>
</section>

<!-- Our story + stats -->
<section class="mx-auto max-w-7xl px-6 py-16 md:py-24">
	<div class="max-w-4xl">
		<div class="mb-6 flex items-center space-x-2.5">
			<span class="inline-block h-[3px] w-7 rounded-full bg-gold-deep"></span>
			<span class="text-xs font-bold tracking-[0.2em] text-stone-600 uppercase">OUR STORY</span>
		</div>

		<h2 class="mb-8 text-2xl leading-snug font-extrabold text-forest-deep sm:text-3xl sm:leading-tight md:text-[34px]">
			Banggai Escape was born from a deep-rooted love for our home—the pristine, untouched archipelago
			of Banggai. We realized that while these islands offer world-class turquoise lagoons, rich
			culture, and breathtaking marine life, navigating them requires genuine local knowledge.
		</h2>

		<p class="mb-14 text-base leading-relaxed text-stone-600 md:text-lg">
			Founded by locals and hospitality enthusiasts, we bridge the gap between curious global
			travelers and authentic island experiences. We take care of every detail—from seamless island
			transfers to tailored daily itineraries—allowing you to immerse yourself fully in the magic of
			the tropics with total safety, comfort, and ease.
		</p>
	</div>

	<div
		class="grid grid-cols-1 gap-8 divide-y divide-stone-200 rounded-2xl border border-stone-100 bg-white p-6 shadow-sm sm:grid-cols-2 sm:divide-y-0 sm:divide-x sm:p-8 lg:grid-cols-4 lg:p-10"
	>
		{#each stats as stat, index (stat.label)}
			<div
				class="flex flex-col justify-start sm:pt-0 {index === 0
					? ''
					: 'pt-6'} {index === 3 ? 'sm:pl-6' : 'sm:px-6'}"
			>
				<span class="text-4xl font-black tracking-tight text-forest-deep md:text-5xl">
					{stat.value}
				</span>
				<p class="mt-2 text-xs leading-snug text-stone-500 md:text-sm">{stat.label}</p>
			</div>
		{/each}
	</div>
</section>

<!-- Vision & mission -->
<section class="bg-white py-12 md:py-20">
	<div class="mx-auto max-w-7xl px-6">
		<div class="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-12">
			<div>
				<div class="mb-8 flex items-center space-x-2.5">
					<span class="inline-block h-[3px] w-7 rounded-full bg-gold-deep"></span>
					<span class="text-xs font-bold tracking-[0.2em] text-stone-600 uppercase">
						VISION &amp; MISSION
					</span>
				</div>

				<div class="space-y-6">
					{#each visionMission as item (item.title)}
						<div class="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm sm:p-7">
							<div class="mb-4 flex items-center gap-3">
								<span
									class="flex size-10 items-center justify-center rounded-xl border border-stone-100 bg-white text-forest-deep"
								>
									<Icon icon={item.icon} size={14} class="text-gold" />
								</span>
								<h3 class="text-lg font-bold text-forest-deep">{item.title}</h3>
							</div>
							<p class="text-sm leading-relaxed text-stone-500">{item.text}</p>
						</div>
					{/each}
				</div>
			</div>

			<div class="relative">
				<div class="overflow-hidden rounded-3xl border border-stone-100 shadow-lg">
					<img
						class="h-[400px] w-full object-cover object-center transition duration-500 hover:scale-105 sm:h-[460px]"
						src={img(
							media['about-us'][
								'diverse-expedition-team-members-happily-bonding-in-mountain-hiking-gear'
							],
							1400
						)}
						alt="Diverse expedition team members happily bonding in mountain hiking gear"
						loading="lazy"
						width="1400"
						height="940"
					/>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- Why choose us -->
<section class="border-t border-stone-100 bg-white py-16 md:py-24">
	<div class="mx-auto max-w-7xl px-6">
		<div class="mx-auto mb-14 max-w-3xl text-center">
			<h2 class="text-2xl font-extrabold text-forest-deep md:text-3xl">
				The Reason Travelers<br />Choose Banggai Escape
			</h2>
		</div>

		<div class="grid grid-cols-1 gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-3">
			{#each features as feature (feature.title)}
				<div
					class="flex flex-col justify-between rounded-2xl border border-stone-100 bg-white p-7 shadow-sm transition hover:shadow-md"
				>
					<div>
						<div
							class="mb-5 flex size-12 items-center justify-center rounded-xl border border-stone-100 bg-white text-stone-700"
						>
							<i class="{feature.icon} text-base"></i>
						</div>
						<h3 class="mb-2.5 text-lg font-bold text-forest-deep">{feature.title}</h3>
						<p class="text-sm leading-relaxed text-stone-500">{feature.text}</p>
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>

<CtaBanner
		title={siteCta.title}
		text={siteCta.text}
		ctaLabel={siteCta.ctaLabel}
		image={ctaBackground}
		ctaHref="/contact"
/>
