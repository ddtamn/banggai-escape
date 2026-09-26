<script lang="ts">
import { page } from '$app/state';
import { CARD_SIZES } from '$lib/card-sizes';
import BookingBar from '$lib/components/BookingBar.svelte';
import CtaBanner from '$lib/components/CtaBanner.svelte';
import DestinationCard from '$lib/components/DestinationCard.svelte';
import Faq from '$lib/components/Faq.svelte';
import Icon from '$lib/components/Icon.svelte';
import PackageCard from '$lib/components/PackageCard.svelte';
import PostCard from '$lib/components/PostCard.svelte';
import SectionHeader from '$lib/components/SectionHeader.svelte';
import Seo from '$lib/components/Seo.svelte';
import { img, media } from '$lib/data/media';
import { imageSrcset } from '$lib/images';
import { siteAgency } from '$lib/site-seo';

let { data } = $props();

const ctaBackground = $derived(data.settings.ctaBackground);
const faqs = $derived(data.settings.faqs);
const features = $derived(data.settings.features);
const site = $derived(data.settings.site);
const testimonials = $derived(data.settings.testimonials);

// Which items these are is decided in the loader; the page renders what it is handed.
const destinations = $derived(data.destinations);
const packages = $derived(data.packages);
const posts = $derived(data.posts);

const stars = [1, 2, 3, 4, 5];

/**
 * The hero photograph, as a URL and — where the edge can resize it — a `srcset`.
 *
 * `alt=""` is deliberate and not an oversight: the image is decorative here, the page's
 * subject is the `h1` beneath it, and describing the photograph would be noise for anyone
 * listening to the page.
 */
const heroImage = img(
	media['package-details-untouched-banggai-discovery']['turquoise-lagoon-paisu-pok'],
	2000,
);
const heroSrcset = $derived(imageSrcset(heroImage, data.imageTransforms));

/**
 * The two photographs inside the page body, with their resized variants.
 *
 * Both sit well below the fold, so both are lazy-loaded and neither competes with the hero for
 * bandwidth. Held as constants because each URL is needed twice — as the `src` fallback and as
 * what `imageSrcset` builds from — and writing it out twice is how the two drift apart.
 */
const teamImage = img(media.home['banggai-escape-team-at-sea']);
const teamSrcset = $derived(imageSrcset(teamImage, data.imageTransforms));

const waterfallImage = img(media.home['scenic-waterfall-in-banggai']);
const waterfallSrcset = $derived(imageSrcset(waterfallImage, data.imageTransforms));

/**
 * This page's identity for crawlers and share cards.
 *
 * The hero photograph is the share image, not the site card: a link preview showing the lagoon
 * the page is about is worth more than one showing a logo, and the photograph is already
 * resolved and already has dimensions from the media library.
 */
const canonicalUrl = $derived(new URL(page.url.pathname, page.url.origin).href);
</script>

<svelte:head>
	<!--
		The hero photograph, preloaded.

		It is the Largest Contentful Paint element on this page — the largest thing above the
		fold — and a preload puts the request in the queue before the parser has finished the
		head, which `fetchpriority` alone cannot do. Only one image is preloaded: a browser
		ignores a second, and the bytes would be wasted on something that was never the
		bottleneck.
	-->
	{#if heroSrcset}
		<link rel="preload" as="image" href={heroImage} fetchpriority="high" />
	{/if}
</svelte:head>

<Seo
	title="{site.name} — Discover Banggai, Escape The Ordinary"
	description="Banggai Escape designs seamless island journeys across the Banggai Archipelago in Central Sulawesi — mirror lakes, reef sanctuaries, and authentic local hospitality."
	canonical={canonicalUrl}
	siteName={site.name}
	locale={site.locale}
	image={{ url: heroImage, alt: 'Turquoise lagoon at Paisu Pok', width: 1408, height: 768 }}
	structuredData={[siteAgency(site, page.url.origin)]}
/>

<!-- Hero -->
<!--
	The hero photograph is an `<img>`, not a CSS `background-image`, and that is the whole
	point.

	A background cannot be preloaded and cannot carry a `fetchpriority` hint, so as a
	background this image was the Largest Contentful Paint element *by construction* — the
	one thing on the page a browser is structurally unable to start early. An `<img>` can be
	preloaded, prioritised, and offered resized variants, so the hero is now the fastest
	thing on the page rather than the slowest.

	The scrim is a sibling layer rather than a gradient baked into a `style` attribute, which
	is what lets the `style-src-attr` permission in the CSP exist at all: this removes the
	last `style={...}` on the page.
-->
<section class="relative overflow-hidden px-6 pt-12 pb-20 text-white md:pt-20 md:pb-28">
	<img
		class="absolute inset-0 size-full object-cover object-center"
		src={heroImage}
		srcset={heroSrcset}
		sizes={CARD_SIZES.full}
		alt=""
		width="2000"
		height="1100"
		fetchpriority="high"
		decoding="async"
	/>
	<div class="absolute inset-0 bg-forest-abyss/70"></div>
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

		<BookingBar packages={data.bookingOptions} whatsapp={site.whatsapp} />
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
			{#each packages as pkg (pkg.slug)}
				<PackageCard {pkg} />
			{/each}
		</div>
	</div>
</section>

<!-- Curated Destinations -->
<section class="section band-recessed">
	<div class="shell">
		<SectionHeader
			title={"Curated Destinations\nby Banggai Escape"}
			action={{ label: "View all destinations", href: "/destinations" }}
		/>
		<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
			{#each destinations as destination (destination.slug)}
				<DestinationCard {destination} />
			{/each}
		</div>
	</div>
</section>

<!-- Why travelers choose us -->
<section class="section bg-white">
	<div class="shell">
		<div class="mx-auto mb-14 max-w-2xl text-center">
			<h2 class="text-2xl font-extrabold text-stone-900 md:text-3xl">
				The Reason Travelers<br />Choose Banggai Escape
			</h2>
		</div>
		<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
			{#each features as feature (feature.title)}
				<!--
					`card-interactive` rather than a hand-rolled border. The old
					`border-stone-100` sat #f5f5f4 against the warm-sand ground of #f7f3ed,
					which is close enough to invisible that the row read as loose text rather
					than as three cards. `.card` uses the `hairline` token, which is a real
					step darker and does read.

					The text is left-aligned, not centred: DESIGN.md asks for left-aligned
					content grids and reserves centring for banners, and a centred body
					paragraph has no consistent left edge to read down.
				-->
				<div class="card card-interactive p-6 sm:p-8">
					<div
						class="mb-4 flex size-12 items-center justify-center rounded-xl bg-hairline text-xl text-forest-deep"
					>
						<Icon icon={feature.icon} size={20} />
					</div>
					<h3 class="mb-2.5 text-lg font-bold text-stone-900">
						{feature.title}
					</h3>
					<p class="text-sm leading-relaxed text-stone-600">{feature.text}</p>
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
					src={teamImage}
					srcset={teamSrcset}
					sizes={CARD_SIZES.halfShell}
					alt="Banggai Escape team at sea"
					loading="lazy"
					width="1200"
					height="900"
					decoding="async"
				/>
			</div>
			<div
				class="space-y-4 text-base leading-relaxed text-stone-600 md:space-y-5"
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
						<Icon icon="fa-solid fa-arrow-right" size={10} />
					</a>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- Testimonials -->
<section class="section-wide band-recessed">
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
						<!--
							Five icon elements read as "star star star star star". The row carries
							the rating as text for a screen reader and the icons are hidden from it,
							because five decorative glyphs and the sentence "Rated 5 out of 5" are not
							the same information.
						-->
						<div
							class="mb-3 flex gap-1 text-xs text-yellow-400"
							role="img"
							aria-label="Rated 5 out of 5"
						>
							{#each stars as star (star)}
								<Icon icon="fa-solid fa-star" size={14} />
							{/each}
						</div>
						<p class="mb-6 text-base leading-relaxed text-stone-600 italic">
							"{testimonial.quote}"
						</p>
					</div>
					<div class="flex items-center gap-3 border-t border-stone-100 pt-3">
						<img
							class="size-9 rounded-full object-cover"
							src={testimonial.avatar.src}
							srcset={testimonial.avatar.srcset}
							sizes={CARD_SIZES.avatar}
							alt={testimonial.avatar.alt ?? testimonial.name}
							loading="lazy"
							width="72"
							height="72"
						/>
						<div>
							<div class="text-xs font-bold text-stone-900">
								{testimonial.name}
							</div>
							<div class="text-label text-stone-400">
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
				<Icon icon="fa-solid fa-arrow-right" size={10} />
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
					src={waterfallImage}
					srcset={waterfallSrcset}
					sizes={CARD_SIZES.fiveTwelfths}
					alt="Scenic waterfall in Banggai"
					loading="lazy"
					width="900"
					height="1200"
					decoding="async"
				/>
			</div>
		</div>
	</div>
</section>

<!-- Travel Insights -->
<section class="section bg-white">
	<div class="shell">
		<SectionHeader
			title="Travel Insights"
			subtitle="Explore our curated journal for local secrets, travel inspiration, and practical tips for your next escape."
			action={{ label: "View all articles", href: "/blog" }}
		/>
		<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
			{#each posts as post (post.slug)}
				<PostCard {post} />
			{/each}
		</div>
	</div>
</section>

<CtaBanner
	title={"Ready To Begin Your\nNext Adventure?"}
	image={ctaBackground}
	ctaHref="/contact"
/>
