<script lang="ts">
import CtaBanner from '$lib/components/CtaBanner.svelte';
import DestinationCard from '$lib/components/DestinationCard.svelte';
import Faq from '$lib/components/Faq.svelte';
import PackageCard from '$lib/components/PackageCard.svelte';
import PostCard from '$lib/components/PostCard.svelte';
import SectionHeader from '$lib/components/SectionHeader.svelte';
import { ctaBackground, faqs, features, testimonials } from '$lib/data/content';
import { getDestination } from '$lib/data/destinations';
import { img, media } from '$lib/data/media';
import { featuredPackages } from '$lib/data/packages';
import { posts } from '$lib/data/posts';
import { site } from '$lib/data/site';

const curated = ['paisu-pok-lake', 'pulau-dua', 'piala-waterfall', 'mokokawa-waterfall']
	.map((slug) => getDestination(slug))
	.filter((destination) => destination !== undefined);

const insights = posts.slice(0, 3);
const stars = [1, 2, 3, 4, 5];
const heroFacts = [
	{
		icon: 'fa-solid fa-location-dot',
		label: 'WHERE TO?',
		value: 'Select Destinations',
	},
	{ icon: 'fa-regular fa-calendar', label: 'DATES', value: 'Select Dates' },
];

const heroImage = img(
	media['package-details-untouched-banggai-discovery']['turquoise-lagoon-paisu-pok'],
	2000,
);
const heroStyle = `background-image: linear-gradient(rgba(10, 33, 25, 0.72), rgba(6, 20, 16, 0.82)), url('${heroImage}'); background-size: cover; background-position: center;`;
</script>

<svelte:head>
	<title>{site.name} — Discover Banggai, Escape The Ordinary</title>
	<meta
		name="description"
		content="Banggai Escape designs seamless island journeys across the Banggai Archipelago in Central Sulawesi — mirror lakes, reef sanctuaries, and authentic local hospitality."
	/>
</svelte:head>

<!-- Hero -->
<section
	class="relative overflow-hidden px-6 pt-12 pb-20 text-white md:pt-20 md:pb-28"
	style={heroStyle}
>
	<div
		class="relative z-10 mx-auto flex max-w-4xl flex-col items-center text-center"
	>
		<div
			class="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 px-3.5 py-1 text-xs font-medium text-stone-100 backdrop-blur-sm md:mb-8"
		>
			<span class="size-1.5 rounded-full bg-gold"></span>
			<span>New summer destinations added</span>
		</div>

		<h1
			class="mb-4 max-w-3xl text-3xl leading-[1.15] font-extrabold tracking-tight drop-shadow-md sm:text-4xl md:mb-5 md:text-5xl lg:text-6xl"
		>
			Discover Banggai<br />Escape The Ordinary
		</h1>

		<p
			class="mx-auto mb-8 max-w-2xl px-2 text-sm leading-relaxed font-normal text-stone-200 sm:text-base md:mb-12"
		>
			Embrace the natural beauty, culture, and heart of Banggai. Your journey
			begins with Banggai Escape.
		</p>

		<form
			class="grid w-full max-w-4xl grid-cols-1 items-center gap-1.5 rounded-2xl bg-white p-1.5 text-left text-stone-800 shadow-2xl sm:grid-cols-2 sm:gap-1.5 sm:p-1.5 lg:grid-cols-12 lg:gap-0 lg:divide-x lg:divide-stone-200 lg:rounded-full lg:py-0.5 lg:pl-1.5 lg:pr-0.5"
			action="/packages"
		>
			{#each heroFacts as fact (fact.label)}
				<div
					class="flex items-center gap-3 border-b border-stone-100 px-3 py-1.5 sm:border-b-0 {fact.label ===
					'WHERE TO?'
						? 'lg:col-span-4'
						: 'lg:col-span-3'}"
				>
					<i class="{fact.icon} text-base text-forest-deep"></i>
					<div>
						<div
							class="text-[11px] font-bold tracking-wider text-stone-400 uppercase"
						>
							{fact.label}
						</div>
						<div class="text-sm font-semibold text-stone-800">{fact.value}</div>
					</div>
				</div>
			{/each}

			<div
				class="flex flex-col items-stretch justify-between gap-3 px-3 py-1.5 sm:col-span-2 sm:flex-row sm:items-center lg:col-span-5"
			>
				<div class="flex items-center gap-3">
					<i class="fa-solid fa-user-group text-base text-forest-deep"></i>
					<div>
						<div
							class="text-[11px] font-bold tracking-wider text-stone-400 uppercase"
						>
							GUESTS
						</div>
						<div class="text-sm font-semibold text-stone-800">Add Guests</div>
					</div>
				</div>
				<button
					type="submit"
					class="flex w-full shrink-0 items-center justify-center gap-2 rounded-full bg-forest-deep px-6 py-3 text-sm font-bold text-white transition duration-200 hover:bg-forest-abyss sm:w-auto"
				>
					<span>Book Schedule</span>
					<i class="fa-solid fa-arrow-right text-xs"></i>
				</button>
			</div>
		</form>
	</div>
</section>

<!-- The Banggai Experience -->
<section class="section bg-white">
	<div class="shell">
		<SectionHeader
			title={"The Banggai Experience"}
			subtitle="Seamless planning, curated stays, and support at every step"
			action={{ label: "View all packages", href: "/packages" }}
		/>
		<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
			{#each featuredPackages as pkg (pkg.slug)}
				<PackageCard {pkg} />
			{/each}
		</div>
	</div>
</section>

<!-- Curated Destinations -->
<section class="section bg-white">
	<div class="shell">
		<SectionHeader
			title={"Curated Destinations\nby Banggai Escape"}
			action={{ label: "View all destinations", href: "/destinations" }}
		/>
		<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
			{#each curated as destination (destination.slug)}
				<DestinationCard {destination} />
			{/each}
		</div>
	</div>
</section>

<!-- Why travelers choose us -->
<section class="section bg-white border-y border-stone-100">
	<div class="shell">
		<div class="mx-auto mb-14 max-w-2xl text-center">
			<h2 class="text-2xl font-extrabold text-stone-900 md:text-3xl">
				The Reason Travelers<br />Choose Banggai Escape
			</h2>
		</div>
		<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
			{#each features as feature (feature.title)}
				<div
					class="rounded-2xl border border-stone-100 bg-white p-6 text-center shadow-xs sm:p-8"
				>
					<div
						class="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl border border-stone-100 bg-white text-xl text-stone-700"
					>
						<i class={feature.icon}></i>
					</div>
					<h3 class="mb-2.5 text-lg font-bold text-stone-900">
						{feature.title}
					</h3>
					<p class="text-sm leading-relaxed text-stone-500">{feature.text}</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- About us -->
<section class="section-wide bg-white">
	<div class="shell">
		<div class="mb-8 md:mb-12">
			<h2 class="mb-2 text-2xl font-extrabold text-stone-900 md:text-3xl">
				About us
			</h2>
			<p class="text-xs text-stone-500 sm:text-sm">
				Born from a deep passion for sharing the untouched magic and legendary
				warmth of Banggai.
			</p>
		</div>
		<div class="grid grid-cols-1 items-center gap-8 md:grid-cols-2 lg:gap-12">
			<div
				class="h-64 w-full overflow-hidden rounded-3xl shadow-sm sm:h-80 md:h-96"
			>
				<img
					class="size-full object-cover"
					src={img(media.home["banggai-escape-team-at-sea"])}
					alt="Banggai Escape team at sea"
					loading="lazy"
					width="1200"
					height="900"
				/>
			</div>
			<div
				class="space-y-4 text-xs leading-relaxed text-stone-600 sm:text-sm md:space-y-5"
			>
				<p>
					At Banggai Escape, we are a team of local experts dedicated to sharing
					the untouched wonder of the Banggai Archipelago. Born from a deep
					passion for our home, we design seamless, personalized journeys that
					showcase vibrant marine life, pristine islands, and rich culture—all
					delivered with authentic warmth, safety, and comfort.
				</p>
				<p>
					Travel is more than visiting a destination; it is about creating
					unforgettable stories. Banggai Escape was founded to bridge curious
					travelers with Central Sulawesi's most breathtaking hidden paradise.
					With seasoned local guides, flexible itineraries, and dedicated
					support, we ensure every moment of your journey is effortless and
					extraordinary.
				</p>
				<div class="pt-2 sm:pt-4">
					<a class="btn-forest gap-2 px-5 py-3" href="/about">
						<span>Learn More About Us</span>
						<i class="fa-solid fa-arrow-right text-[10px]"></i>
					</a>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- Testimonials -->
<section class="section-wide border-t border-stone-100 bg-white">
	<div class="shell">
		<div class="mx-auto mb-14 max-w-xl text-center">
			<h2 class="text-2xl font-extrabold text-stone-900 md:text-3xl">
				The Banggai Escape<br />In Their Words
			</h2>
		</div>

		<div class="mb-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
			{#each testimonials as testimonial (testimonial.name)}
				<div
					class="flex flex-col justify-between rounded-2xl border border-stone-200/70 bg-white p-6 shadow-xs"
				>
					<div>
						<div class="mb-3 flex gap-1 text-xs text-yellow-400">
							{#each stars as star (star)}
								<i class="fa-solid fa-star"></i>
							{/each}
						</div>
						<p class="mb-6 text-xs leading-relaxed text-stone-600 italic">
							"{testimonial.quote}"
						</p>
					</div>
					<div class="flex items-center gap-3 border-t border-stone-100 pt-3">
						<img
							class="size-9 rounded-full object-cover"
							src={img(testimonial.avatar, 120)}
							alt={testimonial.name}
							loading="lazy"
							width="72"
							height="72"
						/>
						<div>
							<div class="text-xs font-bold text-stone-900">
								{testimonial.name}
							</div>
							<div class="text-[11px] text-stone-400">
								{testimonial.country}
							</div>
						</div>
					</div>
				</div>
			{/each}
		</div>

		<div class="text-center">
			<a class="btn-forest gap-2 px-5 py-3" href="/contact">
				<span>See {site.reviewCount}+ Reviews</span>
				<i class="fa-solid fa-arrow-right text-[10px]"></i>
			</a>
		</div>
	</div>
</section>

<!-- FAQ -->
<section class="section-wide bg-white">
	<div class="shell">
		<div class="grid grid-cols-1 items-start gap-8 md:grid-cols-12 lg:gap-12">
			<div class="md:col-span-7">
				<h2
					class="mb-8 max-w-lg text-2xl leading-tight font-extrabold text-stone-900 md:text-3xl"
				>
					Everything you need to know about planning your seamless Banggai
					experience.
				</h2>
				<Faq items={faqs} />
			</div>
			<div
				class="h-80 overflow-hidden rounded-3xl shadow-md sm:h-96 md:col-span-5 md:h-[420px]"
			>
				<img
					class="size-full object-cover"
					src={img(media.home["scenic-waterfall-in-banggai"])}
					alt="Scenic waterfall in Banggai"
					loading="lazy"
					width="900"
					height="1200"
				/>
			</div>
		</div>
	</div>
</section>

<!-- Travel Insights -->
<section class="section bg-white border-t border-stone-200/60">
	<div class="shell">
		<SectionHeader
			title="Travel Insights"
			subtitle="Explore our curated journal for local secrets, travel inspiration, and practical tips for your next escape."
			action={{ label: "View All Articles", href: "/blog" }}
		/>
		<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
			{#each insights as post (post.slug)}
				<PostCard {post} />
			{/each}
		</div>
	</div>
</section>

<CtaBanner
	title={"Ready To Begin Your\nNext Adventure ?"}
	image={ctaBackground}
	ctaHref="/contact"
/>
