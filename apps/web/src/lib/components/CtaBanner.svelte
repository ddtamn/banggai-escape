<script lang="ts">
type Props = {
	title: string;
	text?: string;
	ctaLabel?: string;
	ctaHref?: string;
	image: string;
};

let {
	title,
	text = 'Let Banggai Escape design your perfect journey today.',
	ctaLabel = 'Book your trip',
	ctaHref = '/contact',
	image,
}: Props = $props();

const lines = $derived(title.split('\n'));
const style = $derived(
	`background-image: linear-gradient(rgba(10, 50, 48, 0.65), rgba(8, 38, 37, 0.75)), url('${image}'); background-size: cover; background-position: center;`,
);
</script>

<section class="relative px-6 py-16 text-center text-white sm:py-24 md:py-28" {style}>
	<div class="relative z-10 mx-auto max-w-2xl">
		<h2 class="mb-3 text-2xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
			{#each lines as line, index (line)}
				{#if index > 0}<br />{/if}{line}
			{/each}
		</h2>
		{#if text}
			<p class="mx-auto mb-8 max-w-md text-xs font-normal text-stone-200 sm:text-sm">{text}</p>
		{/if}
		<a class="btn-gold px-8 py-3.5" href={ctaHref}>{ctaLabel}</a>
	</div>
</section>
