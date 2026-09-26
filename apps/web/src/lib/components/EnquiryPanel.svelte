<script lang="ts">
import { composeEnquiry, type Enquiry, whatsappLink, whatsappNumber } from '$lib/enquiry';

type Props = {
	/** Digits and country code. Anything unusable is reported rather than linked. */
	whatsapp: string;
	enquiry: Enquiry;
	/** What the visitor is being asked to do. */
	label?: string;
};

let { whatsapp, enquiry, label = 'Send this to us on WhatsApp' }: Props = $props();

/** Recomposed when a choice changes, so what is shown is always what would be sent. */
const message = $derived(composeEnquiry(enquiry, browserOrigin()));

/**
 * `null` when the stored number cannot be used. That is a described state, not an error:
 * a site mid-setup has no number yet, and the copy fallback below still works, so the
 * panel degrades to "copy this" rather than showing a dead button.
 */
const number = $derived(whatsappNumber(whatsapp));
const link = $derived(number ? whatsappLink(number, message) : null);

let copied = $state(false);
let copyFailed = $state(false);

/**
 * The page the enquiry came from, read on the client only. `composeEnquiry` takes the
 * origin as an argument rather than reaching for `window` itself, which is what keeps it
 * testable in a Node environment.
 */
function browserOrigin(): string | undefined {
	return typeof window === 'undefined' ? undefined : window.location.origin;
}

async function copyMessage() {
	copied = false;
	copyFailed = false;

	try {
		await navigator.clipboard.writeText(message);
		copied = true;
	} catch {
		// Clipboard access is refused when the page is not focused and on some browsers
		// over plain http. The message is on screen either way, so this is a hint, not a
		// failure the visitor has to recover from.
		copyFailed = true;
	}
}
</script>

<div class="rounded-2xl border border-hairline bg-stone-50 p-5">
	<p class="mb-3 text-sm font-bold text-stone-900">{label}</p>

	<!--
		The message is shown, not just sent. `wa.me` does nothing at all for a visitor
		without WhatsApp — no error, no fallback — so this text and the copy button are what
		make the hand-off safe rather than a silent dead end.
	-->
	<label class="sr-only" for="enquiry-message">Your message</label>
	<textarea
		id="enquiry-message"
		class="field min-h-32 resize-y font-mono text-xs leading-relaxed"
		readonly
		rows="5"
		value={message}
	></textarea>

	<div class="mt-4 flex flex-wrap items-center gap-3">
		{#if link}
			<a
				class="btn-forest gap-2 px-5 py-3"
				href={link}
				target="_blank"
				rel="noopener"
				data-track="whatsapp_enquiry"
			>
				<i class="fa-brands fa-whatsapp text-sm" aria-hidden="true"></i>
				<span>Open WhatsApp</span>
			</a>
		{/if}

		<button type="button" class="btn-ghost" onclick={copyMessage}>
			<i class="fa-solid fa-link text-xs" aria-hidden="true"></i>
			<span>Copy message</span>
		</button>
	</div>

	<!--
		`aria-live` so a screen reader hears the outcome of the copy without the visitor
		having to go looking for what changed.
	-->
	<p class="mt-3 min-h-5 text-xs" role="status" aria-live="polite">
		{#if copied}
			<span class="font-semibold text-forest-deep">Copied. Paste it into WhatsApp.</span>
		{:else if copyFailed}
			<span class="text-stone-600"
				>Your browser would not allow the copy. Select the text above and copy it
				manually.</span
			>
		{:else if !link}
			<span class="text-stone-600"
				>WhatsApp is not set up on this site yet — copying the message above is the way
				to reach us.</span
			>
		{/if}
	</p>
</div>
