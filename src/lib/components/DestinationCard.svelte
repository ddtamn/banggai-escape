<script lang="ts">
	import { destinationImage, type Destination } from '$lib/data/destinations';

	type Props = { destination: Destination; href?: string };

	let { destination, href = `/destinations/${destination.slug}` }: Props = $props();

	const image = $derived(destinationImage(destination, 1200));
</script>

<a
	class="group relative block h-64 overflow-hidden rounded-3xl shadow-sm sm:h-72"
	href={href}
	aria-label="Explore {destination.name}"
>
	<img
		class="size-full object-cover transition-transform duration-500 group-hover:scale-105"
		src={image}
		alt={destination.name}
		loading="lazy"
		width="1200"
		height="800"
	/>
	<div class="scrim absolute inset-0"></div>

	<div class="absolute inset-x-6 bottom-6 flex items-end justify-between">
		<div class="text-white">
			<div class="mb-1 flex items-center gap-1.5 text-xs text-gold">
				<i class="fa-solid fa-location-dot text-xs"></i>
				<span class="text-base font-bold text-white">{destination.name}</span>
			</div>
			<p class="ml-4 text-xs text-stone-300">{destination.region.split(',')[0]}</p>
		</div>

		<span class="btn-on-image" aria-hidden="true">
			<i class="fa-solid fa-arrow-up-right-from-square text-xs"></i>
		</span>
	</div>
</a>
