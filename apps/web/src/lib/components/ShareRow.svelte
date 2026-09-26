<script lang="ts">
import Icon from '$lib/components/Icon.svelte';

/**
 * Sharing, done properly.
 *
 * The four buttons this replaces had `aria-label`s and no handlers at all, so they were
 * controls that announced themselves and did nothing.
 *
 * ## The Web Share API comes first
 *
 * On a phone it opens the visitor's own share sheet — the one they already know, with
 * every app they have installed. That is strictly better than four hand-picked targets,
 * and it is the only approach that respects a device's own app choices.
 *
 * It is feature-detected rather than assumed, and it requires a user gesture, so the
 * buttons remain as the fallback rather than being replaced.
 *
 * ## Every URL is built from the canonical page
 *
 * A shared link that is not the canonical one splits the site's own signals and sends
 * traffic to a URL that may redirect. `href` is read from the page rather than from
 * `location`, so it is correct during SSR and matches what a crawler would see.
 */

type Props = {
	url: string;
	title: string;
	/** Summary text, where the target accepts one. */
	description?: string;
};

let { url, title, description }: Props = $props();

let copied = $state(false);
let copyFailed = $state(false);

/** The native sheet, where the browser has one. */
const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

interface Target {
	label: string;
	icon: string;
	/** Where it sends the reader. Omitted for "copy". */
	href?: string;
	/** Rendered as a button rather than a link. */
	action?: () => void;
}

const targets = $derived<Target[]>([
	...(canShare
		? [
				{
					label: 'Share',
					icon: 'fa-solid fa-share-nodes',
					action: async () => {
						try {
							await navigator.share({ title, text: description, url });
						} catch {
							// The visitor dismissed the sheet, which is not an error and must
							// not be reported as one. `AbortError` is the normal outcome.
						}
					},
				} satisfies Target,
			]
		: []),
	{
		label: 'Share on X',
		icon: 'fa-brands fa-x-twitter',
		href: `https://x.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
	},
	{
		label: 'Share on Facebook',
		icon: 'fa-brands fa-facebook-f',
		href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
	},
	{
		label: 'Share on WhatsApp',
		icon: 'fa-brands fa-whatsapp',
		href: `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`,
	},
	{
		label: 'Copy link',
		icon: 'fa-solid fa-link',
		action: copy,
	} satisfies Target,
]);

async function copy() {
	copied = false;
	copyFailed = false;

	try {
		await navigator.clipboard.writeText(url);
		copied = true;
	} catch {
		// Refused when the document is not focused, and on some browsers over plain http.
		copyFailed = true;
	}
}
</script>

<div class="flex items-center gap-2 text-xs font-medium text-stone-500">
	<span class="mr-1 hidden sm:inline">Share:</span>

	{#each targets as target (target.label)}
		{#if target.href}
			<a
				class="flex size-8 items-center justify-center rounded-full border border-stone-200 transition-colors hover:bg-stone-100 hover:text-stone-900"
				href={target.href}
				target="_blank"
				rel="noopener noreferrer"
				aria-label={target.label}
			>
				<i class="{target.icon} text-xs" aria-hidden="true"></i>
			</a>
		{:else}
			<button
				type="button"
				class="flex size-8 items-center justify-center rounded-full border border-stone-200 transition-colors hover:bg-stone-100 hover:text-stone-900"
				aria-label={target.label}
				onclick={target.action}
			>
				<i class="{target.icon} text-xs" aria-hidden="true"></i>
			</button>
		{/if}
	{/each}

	<!--
		`role="status"` so the outcome of "Copy link" is announced. A copy that silently
		succeeds is indistinguishable from a copy that never ran.
	-->
	<span class="ml-1" role="status" aria-live="polite">
		{#if copied}
			<span class="font-semibold text-forest-deep">Link copied</span>
		{:else if copyFailed}
			<span class="text-stone-600">Copy blocked — select the address bar instead</span>
		{/if}
	</span>
</div>
