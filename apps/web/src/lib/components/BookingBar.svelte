<script lang="ts">
import EnquiryPanel from '$lib/components/EnquiryPanel.svelte';
import { type BookingPackage, durationLabel } from '$lib/enquiry';

type Props = {
	packages: BookingPackage[];
	/** Digits and country code; unusable values are reported by the panel, not thrown. */
	whatsapp: string;
};

let { packages, whatsapp }: Props = $props();

/** The ceiling used when a package's own maximum cannot be read. */
const FALLBACK_MAX_GUESTS = 20;

let selectedSlug = $state('');
let dateFrom = $state('');
let dateTo = $state('');
let guests = $state(2);

const selected = $derived(packages.find((pkg) => pkg.slug === selectedSlug) ?? null);

/**
 * The stepper's ceiling is the selected package's own maximum where one could be read.
 *
 * `groupSize` is authored prose, so this is a ceiling that is right when the prose parses
 * and a generous default when it does not — never a limit the operator did not agree to.
 */
const maxGuests = $derived(selected?.maxGuests ?? FALLBACK_MAX_GUESTS);

/** A newly chosen package may cap the guest count below what is already selected. */
$effect(() => {
	if (guests > maxGuests) guests = maxGuests;
});

/** Today, so neither date field can offer a departure in the past. */
const today = new Date().toISOString().slice(0, 10);

const enquiry = $derived({
	package: selected,
	dateFrom: dateFrom || null,
	dateTo: dateTo || null,
	guests,
});

function step(delta: number) {
	guests = Math.min(maxGuests, Math.max(1, guests + delta));
}
</script>

<div class="mt-8 w-full max-w-4xl text-left">
	<fieldset class="rounded-2xl bg-white p-4 text-stone-800 shadow-2xl sm:p-5">
		<legend class="sr-only">Plan your trip</legend>

		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12">
			<!--
				A native `<select>` rather than a custom listbox: on a phone it opens the
				operating system's own picker, which is faster and more accessible than
				anything reimplemented, and this audience is mobile-majority.
			-->
			<div class="lg:col-span-4">
				<label class="field-label" for="booking-package">Package</label>
				<div class="relative">
					<i
						class="fa-solid fa-magnifying-glass pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-stone-400"
						aria-hidden="true"
					></i>
					<!--
						`bg-none` is load-bearing. `@tailwindcss/forms` puts its own chevron in a
						`background-image` on every `select`, independently of `appearance`, so
						without it this control shows two arrows: the plugin's and the one below.
					-->
					<select
						id="booking-package"
						class="field appearance-none bg-none pr-10 pl-9"
						bind:value={selectedSlug}
					>
						<option value="">Any package</option>
						{#each packages as pkg (pkg.slug)}
							<option value={pkg.slug}>{pkg.title} — {durationLabel(pkg)}</option>
						{/each}
					</select>
					<i
						class="fa-solid fa-chevron-down pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-stone-400"
						aria-hidden="true"
					></i>
				</div>
			</div>

			<div class="lg:col-span-5">
				<span class="field-label" id="booking-dates-label">Preferred dates (optional)</span>
				<div class="grid grid-cols-2 gap-2">
					<div>
						<label class="sr-only" for="booking-date-from">From</label>
						<input
							id="booking-date-from"
							class="field"
							type="date"
							min={today}
							bind:value={dateFrom}
							aria-describedby="booking-dates-hint"
						/>
					</div>
					<div>
						<label class="sr-only" for="booking-date-to">To</label>
						<input
							id="booking-date-to"
							class="field"
							type="date"
							min={dateFrom || today}
							bind:value={dateTo}
							aria-describedby="booking-dates-hint"
						/>
					</div>
				</div>
				<!--
					No availability calendar, on purpose. The content model has no departure
					dates, so a picker that greyed out sold-out days would be inventing
					availability that does not exist. These are preferences, and a person
					confirms them.
				-->
				<p id="booking-dates-hint" class="mt-1.5 text-xs text-stone-500">
					Leave blank if you are not sure — we will suggest dates.
				</p>
			</div>

			<div class="lg:col-span-3">
				<span class="field-label" id="booking-guests-label">Guests</span>
				<div class="flex items-center gap-3" role="group" aria-labelledby="booking-guests-label">
					<button
						type="button"
						class="btn-on-image !bg-stone-100 !text-stone-700 hover:!bg-stone-200"
						onclick={() => step(-1)}
						disabled={guests <= 1}
						aria-label="One fewer guest"
					>
						<i class="fa-solid fa-minus text-xs" aria-hidden="true"></i>
					</button>
					<label class="sr-only" for="booking-guest-count">Number of guests</label>
					<input
						id="booking-guest-count"
						class="field w-16 text-center"
						type="number"
						min="1"
						max={maxGuests}
						bind:value={guests}
					/>
					<button
						type="button"
						class="btn-on-image !bg-stone-100 !text-stone-700 hover:!bg-stone-200"
						onclick={() => step(1)}
						disabled={guests >= maxGuests}
						aria-label="One more guest"
					>
						<i class="fa-solid fa-plus text-xs" aria-hidden="true"></i>
					</button>
				</div>
			</div>
		</div>
	</fieldset>

	<div class="mt-4 text-left">
		<EnquiryPanel {whatsapp} {enquiry} label="Send your plan to us" />
	</div>
</div>
