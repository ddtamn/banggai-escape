<script lang="ts">
import CtaBanner from '$lib/components/CtaBanner.svelte';
import PackageCard from '$lib/components/PackageCard.svelte';
import SectionHeader from '$lib/components/SectionHeader.svelte';

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
</script>

<svelte:head>
	<title>{destination.name} — {site.name}</title>
	<meta name="description" content={destination.tagline} />
</svelte:head>

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
			<span class="text-gold"><i class="fa-solid fa-location-dot"></i></span>
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
					<span class="mb-2 text-[11px] font-bold tracking-wider text-stone-400 uppercase">
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
