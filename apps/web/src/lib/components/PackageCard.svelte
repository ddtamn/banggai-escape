<script lang="ts">
import type { RenderedPackage } from '@banggai/content-model';
import Icon from '$lib/components/Icon.svelte';
import { badgeDays, durationLabel, formatPrice } from '$lib/content';

type Props = { pkg: RenderedPackage };

let { pkg }: Props = $props();
</script>

<article class="card card-interactive">
	<div class="card-img">
		<img
			src={pkg.image.src}
			alt={pkg.image.alt ?? pkg.title}
			loading="lazy"
			width="900"
			height="600"
		/>
		<span class="badge top-3 left-3">{badgeDays(pkg)}</span>
		<span class="badge top-3 right-3">{pkg.groupSize.replace('Min ', '').replace(', Max ', ' - ')}</span>
	</div>

	<div class="flex flex-1 flex-col justify-between p-4">
		<div>
			<h3 class="text-sm font-bold text-stone-900">{pkg.title}</h3>
			<p class="mt-0.5 text-label text-stone-400">Start from</p>
			<p class="text-xs font-bold text-stone-900">
				{formatPrice(pkg.price)}
				<span class="text-label font-normal text-stone-400">/Person</span>
			</p>

			<div class="mt-3 flex items-center gap-4 text-label text-stone-500">
				<span class="flex items-center gap-1.5">
					<Icon icon="fa-solid fa-leaf" size={10} class="text-accent" />
					{pkg.tripType}
				</span>
				<span class="flex items-center gap-1.5">
					<Icon icon="fa-regular fa-clock" size={10} class="text-stone-400" />
					{durationLabel(pkg)}
				</span>
			</div>
		</div>

		<a
			class="mt-4 flex items-center justify-between border-t border-stone-100 pt-4 text-xs font-semibold text-stone-800 transition-colors hover:text-accent"
			href="/packages/{pkg.slug}"
		>
			<span>View Details</span>
			<Icon icon="fa-solid fa-arrow-right" size={10} />
		</a>
	</div>
</article>
