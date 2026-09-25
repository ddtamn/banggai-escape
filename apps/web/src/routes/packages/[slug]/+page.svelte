<script lang="ts">
import { fly } from 'svelte/transition';
import CtaBanner from '$lib/components/CtaBanner.svelte';
import PackageCard from '$lib/components/PackageCard.svelte';
import { ctaBackground } from '$lib/data/content';
import { img, media } from '$lib/data/media';
import { durationLabel, formatPrice, relatedPackages } from '$lib/data/packages';
import { site } from '$lib/data/site';

let { data } = $props();

const pkg = $derived(data.pkg);

/** The five-photo mosaic at the top of the detail page. */
const gallery = $derived(
	Object.values(media['package-details-untouched-banggai-discovery'])
		.slice(0, 5)
		.map((id) => img(id, 1200)),
);

const specs = $derived([
	{ label: 'Duration', value: durationLabel(pkg) },
	{ label: 'Group Size', value: pkg.groupSize },
	{ label: 'Type', value: pkg.tripType },
	{ label: 'Accomodation', value: pkg.accommodation },
]);

const badges = [
	{ icon: 'fa-solid fa-plane', title: 'Flight', text: 'Included' },
	{ icon: 'fa-solid fa-bed', title: 'Hotels', text: 'Comfortable Stay' },
	{ icon: 'fa-solid fa-person-hiking', title: 'Tours', text: 'Expert Guides' },
];

const related = $derived(relatedPackages(pkg.slug, 2));

let bookingCardEl = $state<HTMLElement | null>(null);
let showBookingBar = $state(false);

/**
 * Mobile booking bar — pinned to the bottom of the viewport while the booking
 * card itself is still below the fold, hidden as soon as the card scrolls into
 * view so there is only ever one "Book Now" on screen.
 */
$effect(() => {
	const card = bookingCardEl;
	if (!card) return;

	let frame = 0;
	const update = () => {
		frame = 0;
		// Appear once the reader has engaged with the page, and never while the
		// card itself is on screen.
		showBookingBar = window.scrollY > 160 && card.getBoundingClientRect().top > window.innerHeight;
	};

	const onScroll = () => {
		if (!frame) frame = requestAnimationFrame(update);
	};

	update();
	window.addEventListener('scroll', onScroll, { passive: true });
	window.addEventListener('resize', onScroll);
	return () => {
		window.removeEventListener('scroll', onScroll);
		window.removeEventListener('resize', onScroll);
		if (frame) cancelAnimationFrame(frame);
	};
});
</script>

<svelte:head>
	<title>{pkg.title} — {site.name}</title>
	<meta name="description" content={pkg.overview.slice(0, 155)} />
</svelte:head>

<main>
	<!--
		Photo gallery. On phones it is one snap-scrolling strip (CSS scroll snap, so
		no carousel JS) with a peek of the next photo as the swipe affordance; from
		`md` up the column wrappers switch to `display: contents`, letting the same
		five images reflow into the designed 4-column mosaic.
	-->
	<section class="mx-auto max-w-7xl px-6 pt-8 pb-10">
		<div
			class="-mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-1 scroll-pl-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:grid md:h-[500px] md:grid-cols-4 md:overflow-visible md:px-0 md:pb-0"
			role="group"
			aria-label="{pkg.title} photos"
		>
			<div class="contents md:flex md:h-full md:flex-col md:gap-4">
				{#each gallery.slice(0, 2) as src, index (src)}
					<div
						class="group h-[280px] w-[82%] shrink-0 snap-start overflow-hidden rounded-2xl shadow-sm sm:h-[340px] md:h-1/2 md:w-auto md:shrink"
					>
						<img
							class="size-full object-cover transition duration-500 group-hover:scale-105"
							{src}
							alt="{pkg.title} — photo {index + 1}"
							width="900"
							height="600"
						/>
					</div>
				{/each}
			</div>

			{#if gallery[2]}
				<div
					class="group h-[280px] w-[82%] shrink-0 snap-start overflow-hidden rounded-2xl shadow-sm sm:h-[340px] md:col-span-2 md:h-full md:w-auto md:shrink"
				>
					<img
						class="size-full object-cover transition duration-700 group-hover:scale-105"
						src={gallery[2]}
						alt="{pkg.title} — photo 3"
						width="1400"
						height="900"
					/>
				</div>
			{/if}

			<div class="contents md:flex md:h-full md:flex-col md:gap-4">
				{#each gallery.slice(3, 5) as src, index (src)}
					<div
						class="group h-[280px] w-[82%] shrink-0 snap-start overflow-hidden rounded-2xl shadow-sm sm:h-[340px] md:h-1/2 md:w-auto md:shrink"
					>
						<img
							class="size-full object-cover transition duration-500 group-hover:scale-105"
							{src}
							alt="{pkg.title} — photo {index + 4}"
							width="900"
							height="600"
						/>
					</div>
				{/each}
			</div>
		</div>

		<p
			class="mt-2 flex items-center justify-center gap-2 text-[11px] font-medium text-stone-500 md:hidden"
		>
			<i class="fa-solid fa-arrows-left-right text-[10px] text-gold"></i>
			Swipe to see all {gallery.length} photos
		</p>
	</section>

	<!-- Details + booking sidebar -->
	<section class="mx-auto max-w-7xl px-6 pb-16">
		<div class="grid grid-cols-1 gap-10 lg:grid-cols-12">
			<div class="space-y-9 lg:col-span-8">
				<div>
					<h1 class="text-3xl leading-tight font-extrabold tracking-tight text-stone-900 sm:text-4xl md:text-5xl">
						{pkg.title} - {pkg.subtitle}
					</h1>
					<p class="mt-3 max-w-3xl text-base leading-relaxed text-stone-600">
						A perfectly crafted {pkg.days}-day expedition designed to immerse you in pristine
						turquoise lagoons, mirror-like lakes, and the timeless warmth of Banggai island life.
					</p>
				</div>

				<div class="grid grid-cols-2 gap-4 border-y border-stone-200/80 py-5 sm:grid-cols-4">
					{#each specs as spec (spec.label)}
						<div>
							<span class="block text-xs font-medium text-stone-400">{spec.label}</span>
							<span class="mt-1 block text-sm font-bold text-stone-900 sm:text-base">
								{spec.value}
							</span>
						</div>
					{/each}
				</div>

				<div class="space-y-3">
					<h2 class="text-xl font-bold text-stone-900 sm:text-2xl">Trip Overview</h2>
					<p class="text-sm leading-relaxed text-stone-600 sm:text-base">{pkg.overview}</p>
				</div>

				<div class="space-y-4">
					<h2 class="text-xl font-bold text-stone-900 sm:text-2xl">Trip Highlights</h2>
					<ul class="space-y-2.5 text-sm text-stone-700 sm:text-base">
						{#each pkg.highlights as highlight (highlight.title)}
							<li class="flex items-start gap-2">
								<span class="min-w-max font-bold text-stone-900">• {highlight.title}:</span>
								<span>{highlight.text}</span>
							</li>
						{/each}
					</ul>
				</div>

				<div class="space-y-4">
					<h2 class="text-xl font-bold text-stone-900 sm:text-2xl">What's Included</h2>
					<ul class="space-y-3">
						{#each pkg.included as item (item)}
							<li class="flex items-center gap-3 text-sm text-stone-700 sm:text-base">
								<span
									class="flex size-5 flex-shrink-0 items-center justify-center rounded-full bg-forest-deep text-white"
								>
									<i class="fa-solid fa-check text-[10px]"></i>
								</span>
								<span>{item}</span>
							</li>
						{/each}
					</ul>
				</div>

				<div class="space-y-4 pt-2">
					<h2 class="text-xl font-bold text-stone-900 sm:text-2xl">Itinerary</h2>
					<div class="divide-y divide-stone-200">
						{#each pkg.itinerary as day, index (day.label)}
							<details class="group py-5" open={index === 0}>
								<summary
									class="flex w-full cursor-pointer items-center justify-between gap-4 text-left [&::-webkit-details-marker]:hidden"
								>
									<span>
										<span class="block text-[11px] font-bold tracking-wider text-stone-400 uppercase">
											{day.label}
										</span>
										<span class="block text-base font-bold text-stone-900 sm:text-lg">
											{day.title}
										</span>
									</span>
									<i
										class="fa-solid fa-chevron-down text-xs text-stone-500 transition-transform duration-300 group-open:rotate-180"
									></i>
								</summary>
								<p class="mt-3 text-sm leading-relaxed text-stone-600">{day.text}</p>
							</details>
						{/each}
					</div>
				</div>
			</div>

			<!-- Sticky booking widget -->
			<div class="lg:col-span-4">
				<div
					bind:this={bookingCardEl}
					class="sticky top-28 rounded-2xl border border-forest-line bg-forest-deep p-6 text-white shadow-md sm:p-7"
				>
					<div class="mb-5">
						<h2 class="text-2xl font-bold text-white">
							{pkg.days} {pkg.days === 1 ? 'Day' : 'Days'}
						</h2>
						<p class="mt-0.5 text-xs font-semibold text-stone-400">{pkg.region}</p>
					</div>

					<div class="border-b border-forest-line/60 pt-2 pb-5">
						<span class="mb-1 block text-[10px] font-bold tracking-widest text-gold-light uppercase">
							START FROM
						</span>
						<div class="flex items-baseline gap-1.5">
							<span class="text-2xl font-extrabold text-white sm:text-[26px]">
								{formatPrice(pkg.price)}
							</span>
							<span class="text-xs font-medium text-stone-400">/Person</span>
						</div>
					</div>

					<div class="my-6 grid grid-cols-3 gap-2 text-center">
						{#each badges as badge (badge.title)}
							<div class="flex flex-col items-center">
								<div
									class="mb-1.5 flex size-10 items-center justify-center rounded-full bg-white/10 text-gold-light"
								>
									<i class="{badge.icon} text-xs"></i>
								</div>
								<span class="text-xs font-bold text-white">{badge.title}</span>
								<span class="text-center text-[10px] leading-tight text-stone-400">
									{badge.text}
								</span>
							</div>
						{/each}
					</div>

					<a
						class="block w-full rounded-xl bg-gold px-4 py-3.5 text-center text-xs font-bold tracking-wider text-forest-deep uppercase shadow-sm transition-all hover:bg-gold-deep"
						href="/contact?package={pkg.slug}"
					>
						Book Now
					</a>

					<p class="mt-4 text-center text-[11px] text-stone-400">
						No payment today — we confirm availability first.
					</p>
				</div>
			</div>
		</div>
	</section>

	<!-- More journeys -->
	<section class="mx-auto max-w-7xl border-t border-stone-200/80 px-6 pt-6 pb-20">
		<div class="mb-8 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
			<div>
				<h2 class="text-2xl font-extrabold text-stone-900 md:text-3xl">You Might Also Like</h2>
			</div>
			<a
				class="flex items-center gap-1 text-xs font-bold text-stone-800 transition hover:text-forest-deep sm:text-sm"
				href="/packages"
			>
				<span>View All Packages</span>
				<i class="fa-solid fa-arrow-right text-[10px]"></i>
			</a>
		</div>

		<div class="grid grid-cols-1 gap-8 md:grid-cols-2">
			{#each related as pkgItem (pkgItem.slug)}
				<PackageCard pkg={pkgItem} />
			{/each}
		</div>
	</section>
</main>

<!--
	Mobile booking bar — the booking card pinned to the bottom of small screens:
	price plus a single primary action, no secondary detail to scan.
-->
{#if showBookingBar}
	<div
		class="fixed inset-x-0 bottom-0 z-40 border-t border-forest-line bg-forest-deep px-6 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-white shadow-[0_-8px_28px_rgba(15,35,28,0.28)] lg:hidden"
		transition:fly={{ y: 96, duration: 250 }}
	>
		<div class="flex items-center justify-between gap-4">
			<div class="min-w-0">
				<span class="block text-[10px] font-bold tracking-widest text-gold-light uppercase">
					START FROM
				</span>
				<div class="flex items-baseline gap-1.5">
					<span class="text-lg font-extrabold text-white">{formatPrice(pkg.price)}</span>
					<span class="text-[11px] font-medium text-stone-400">/Person</span>
				</div>
			</div>
			<a class="btn-gold shrink-0" href="/contact?package={pkg.slug}">Book Now</a>
		</div>
	</div>
{/if}

<CtaBanner
	title={'Ready To Begin Your\nNext Adventure ?'}
	text="Let Banggai Escape design your perfect journey today."
	ctaLabel="Book your trip"
	image={ctaBackground}
	ctaHref="/contact"
/>
