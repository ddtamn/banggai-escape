<script lang="ts">
import type { AnalyticsEvent } from '@banggai/content-model';

/**
 * The banner's words, from the CMS.
 *
 * These were props with defaults until Phase 6, which is how the same three strings ended up in
 * this file *and* passed explicitly at five of the nine call sites: editing the default would
 * have left half the site on the old text, and nothing said so. One `siteCta` row, read by the
 * layout and passed down, is the only copy of an invitation that appears on every page.
 */
type Props = {
	title: string;
	text?: string | null;
	ctaLabel: string;
	/** Where the button goes. Navigation, so it stays a prop: the contact page points at its own form. */
	ctaHref?: string;
	image: string;
	/**
	 * The event this banner's call to action reports. Declared rather than assumed, and
	 * defaulted because every banner on the site closes on the same invitation to get in
	 * touch. See `$lib/analytics` — `data-track` is read by one delegated listener.
	 */
	track?: AnalyticsEvent;
};

let {
	title,
	text = null,
	ctaLabel,
	ctaHref = '/contact',
	image,
	track = 'booking_cta_click',
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
		<a class="btn-gold px-8 py-3.5" href={ctaHref} data-track={track}>{ctaLabel}</a>
	</div>
</section>
