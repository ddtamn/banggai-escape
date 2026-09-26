<script lang="ts">
import type { FaqItem } from '@banggai/content-model';
import Icon from '$lib/components/Icon.svelte';

type Props = {
	items: FaqItem[];
	/** Index of the item expanded by default. */
	openIndex?: number;
};

let { items, openIndex = 0 }: Props = $props();
</script>

<div class="divide-y divide-stone-200">
	{#each items as item, index (item.question)}
		<details class="group py-4" open={index === openIndex}>
			<summary
				class="flex w-full cursor-pointer items-center justify-between py-1 text-left text-xs font-bold text-stone-900 sm:text-sm [&::-webkit-details-marker]:hidden"
			>
				<span>{item.question}</span>
				<Icon icon="fa-solid fa-chevron-down" size={14} class="text-stone-500 transition-transform duration-200 group-open:rotate-180" />
			</summary>
			<div class="pt-2 text-base leading-relaxed text-stone-500">{item.answer}</div>
		</details>
	{/each}
</div>
