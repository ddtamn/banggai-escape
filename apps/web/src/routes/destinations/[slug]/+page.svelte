<script lang="ts">
import { page } from '$app/state';
import { CARD_SIZES } from '$lib/card-sizes';
import CtaBanner from '$lib/components/CtaBanner.svelte';
import Icon from '$lib/components/Icon.svelte';
import PackageCard from '$lib/components/PackageCard.svelte';
import SectionHeader from '$lib/components/SectionHeader.svelte';
import Seo from '$lib/components/Seo.svelte';
import { breadcrumbList, touristAttraction } from '$lib/seo';
import { COUNTRY, siteCrumbs } from '$lib/site-seo';

let { data } = $props();

const ctaBackground = $derived(data.settings.ctaBackground);
const site = $derived(data.settings.site);
const destination = $derived(data.destination);
/** A representative mosaic drawn from the destination photography set. */
const mosaic = $derived(data.mosaic);

const quickInfo = $derived([
	{ label: 'BEST TIME', value: destination.quickInfo.bestTime },
	{ label: 'IDEAL DURATION', value: destination.quickInfo.duration },
	{ label: 'HIGHLIGHTS', value: destination.quickInfo.highlights },
	{ label: 'ACCESSIBILITY', value: destination.quickInfo.accessibility },
]);

const related = $derived(data.related);

/**
 * This page's own address, built from the request.
 *
 * Correct during SSR, identical to what a crawler resolves, and carrying no hardcoded domain —
 * behind Cloudflare the request already knows the public host. Query and fragment are dropped,
 * because `?utm_source=…` is how a link arrives rather than where it points.
 */
const canonicalUrl = $derived(new URL(page.url.pathname, page.url.origin).href);

const structuredData = $derived([
	touristAttraction({
		name: destination.name,
		description: destination.tagline,
		url: canonicalUrl,
		image: destination.image.src,
		region: destination.region,
		// The same code the organisation document uses, imported rather than restated: two
		// copies of a country code is one more copy to forget when the business moves.
		country: COUNTRY,
		modifiedTime: data.updatedAt,
	}),
	breadcrumbList(
		page.url.origin,
		siteCrumbs(
			{ name: 'Destinations', path: '/destinations' },
			{ name: destination.name, path: page.url.pathname },
		),
	),
]);
</script>

<Seo
	title="{destination.name} — {site.name}"
	description={destination.tagline}
	canonical={canonicalUrl}
	siteName={site.name}
	locale={site.locale}
	image={{ url: destination.image.src, alt: destination.image.alt ?? destination.name }}
	modifiedTime={data.updatedAt}
	structuredData={structuredData}
/>

<!-- Hero -->
<section class="relative flex h-[480px] items-center justify-center overflow-hidden sm:h-[560px] lg:h-[640px]">
	<img
		class="absolute inset-0 size-full object-cover object-center"
		src={destination.image.src}
		alt={destination.image.alt ?? destination.name}
		width="2000"
		height="1200"
	/>
	<div class="absolute inset-0 bg-forest-deep/60"></div>

	<div class="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-6 text-center">
		<nav class="mb-4 flex items-center gap-2 text-xs font-medium text-white/70" aria-label="Breadcrumb">
			<a class="transition hover:text-white" href="/">Home</a>
			<span aria-hidden="true">/</span>
			<a class="transition hover:text-white" href="/destinations">Destinations</a>
		</nav>
		<h1
			class="mb-3 text-3xl leading-tight font-extrabold tracking-tight text-white drop-shadow-md sm:text-4xl md:text-5xl lg:text-6xl"
		>
			{destination.name}
		</h1>
		<p class="mb-6 text-sm leading-relaxed font-normal text-white/90 sm:text-base">
			{destination.tagline}
		</p>
		<div
			class="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-medium text-white/95 shadow-sm backdrop-blur-sm"
		>
			<span class="text-gold"><Icon icon="fa-solid fa-location-dot" size={14} /></span>
			<span>{destination.region}</span>
		</div>
	</div>
</section>

<div class="mx-auto max-w-7xl space-y-16 px-6 py-14 sm:py-16">
	<!-- Overview -->
	<section>
		<h2 class="mb-4 text-xl font-bold text-forest-deep sm:text-2xl">Overview</h2>
		<div class="max-w-3xl space-y-4 text-sm leading-relaxed text-stone-600 sm:text-base">
			{#each destination.overview as paragraph, index (index)}
				<p>{paragraph}</p>
			{/each}
		</div>
	</section>

	<!-- Quick info -->
	<section>
		<h2 class="mb-5 text-xl font-bold text-forest-deep sm:text-2xl">Quick Info</h2>
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
			{#each quickInfo as info (info.label)}
				<div
					class="flex flex-col justify-between rounded-2xl border border-stone-200/80 bg-white p-5 shadow-xs"
				>
					<span class="mb-2 text-label font-bold tracking-wider text-stone-400 uppercase">
						{info.label}
					</span>
					<p class="text-xs leading-snug font-semibold text-stone-800 sm:text-sm">{info.value}</p>
				</div>
			{/each}
		</div>
	</section>

	<!-- Key experiences -->
	<section>
		<h2 class="mb-5 text-xl font-bold text-forest-deep sm:text-2xl">Key Experiences</h2>
		<ul class="space-y-3.5 text-sm text-stone-700 sm:text-base">
			{#each destination.experiences as experience (experience.title)}
				<li class="flex items-start">
					<span class="mt-2.5 mr-3 inline-block size-1.5 flex-shrink-0 rounded-full bg-stone-900"
					></span>
					<span>
						<strong class="font-bold text-stone-900">{experience.title}:</strong>
						{experience.text}
					</span>
				</li>
			{/each}
		</ul>
	</section>

	<!-- Gallery -->
	<section>
		<h2 class="mb-6 text-xl font-bold text-forest-deep sm:text-2xl">Captured Moments in Paradise</h2>
		<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
			{#each mosaic as image, index (image.src)}
				<div
					class="overflow-hidden rounded-2xl shadow-sm {index < 2
						? 'h-64 sm:h-80 md:col-span-2 md:h-96'
						: 'h-56 sm:h-64'}"
				>
					<img
						class="size-full object-cover object-center transition duration-500 hover:scale-105"
						src={image.src}
						srcset={image.srcset}
						sizes={CARD_SIZES.twoUp}
						alt={image.alt ?? `${destination.name} — view ${index + 1}`}
						loading="lazy"
						width="1200"
						height="800"
					/>
				</div>
			{/each}
		</div>
	</section>

	<!-- Related packages -->
	<section>
		<SectionHeader title="Related Packages" subtitle="Journeys that include this destination" />
		<div class="grid grid-cols-1 gap-6 md:grid-cols-3">
			{#each related as pkg (pkg.slug)}
				<PackageCard {pkg} />
			{/each}
		</div>
	</section>
</div>

<CtaBanner
	title={'Ready To Begin Your\nNext Adventure?'}
	text="Let Banggai Escape design your perfect journey today."
	image={ctaBackground}
	ctaHref="/contact"
/>
