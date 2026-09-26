<script lang="ts">
import CtaBanner from '$lib/components/CtaBanner.svelte';
import { img, media } from '$lib/data/media';

let { data } = $props();

const contactChannels = $derived(data.settings.contactChannels);
const ctaBackground = $derived(data.settings.ctaBackground);
const site = $derived(data.settings.site);

let submitted = $state(false);

function handleSubmit(event: SubmitEvent) {
	event.preventDefault();
	submitted = true;
}
</script>

<svelte:head>
	<title>Contact Us — {site.name}</title>
	<meta
		name="description"
		content="Plan your bespoke island journey with Banggai Escape — our local island specialists are on hand to tailor custom itineraries, boat transfers, and guided expeditions."
	/>
</svelte:head>

<div>
	<!-- Top: image + form -->
	<section class="mx-auto max-w-7xl px-6 pt-12 pb-20">
		<div class="grid grid-cols-1 items-start gap-12 lg:grid-cols-12">
			<div class="relative lg:col-span-6">
				<div class="relative h-[480px] w-full overflow-hidden rounded-3xl bg-white shadow-2xl sm:h-[640px]">
					<img
						class="size-full object-cover object-center"
						src={img(media.contact['paisu-pok-lake-with-canoe-floating-on-clear-water'], 1400)}
						alt="Paisu Pok Lake with canoe floating on clear water"
						width="1400"
						height="1400"
					/>
				</div>
			</div>

			<div class="flex flex-col justify-start lg:col-span-6">
				<h1 id="contact-section" class="mb-3 scroll-mt-28 text-3xl font-extrabold tracking-tight text-forest-deep sm:text-4xl md:text-5xl">
					Let's Get In Touch.
				</h1>

				<p class="mb-8 text-sm leading-relaxed text-stone-600 sm:text-base">
					Plan your bespoke island journey or write directly to
					<a class="font-semibold text-forest-deep underline" href="mailto:{site.email}">{site.email}</a
					>.
				</p>

				<div class="rounded-3xl border border-stone-100 bg-white p-6 shadow-sm sm:p-8">
					{#if submitted}
						<div class="py-10 text-center">
							<div
								class="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-forest-deep text-xl text-gold"
							>
								<i class="fa-solid fa-check"></i>
							</div>
							<h2 class="mb-2 text-lg font-bold text-forest-deep">Thank you — message received.</h2>
							<p class="mx-auto max-w-sm text-sm leading-relaxed text-stone-500">
								One of our island specialists will reply within 2–4 hours during operational
								hours. For anything urgent, call us on
								<a class="font-semibold text-forest-deep" href={site.phoneHref}>{site.phone}</a>.
							</p>
						</div>
					{:else}
						<form class="space-y-5" onsubmit={handleSubmit}>
							<div>
								<label class="field-label" for="name">Full Name</label>
								<input id="name" name="name" class="field" type="text" placeholder="Your full name" required />
							</div>

							<div>
								<label class="field-label" for="email">Email Address</label>
								<input
									id="email"
									name="email"
									class="field"
									type="email"
									placeholder="you@example.com"
									required
								/>
							</div>

							<div>
								<label class="field-label" for="phone">Phone Number</label>
								<div class="flex items-stretch gap-3">
									<span
										class="flex flex-shrink-0 items-center gap-2 rounded-xl border border-granite bg-white px-3 text-sm font-semibold text-stone-700"
									>
										<span class="inline-block size-4 overflow-hidden rounded-xs bg-red-600">
											<span class="block h-1/2 w-1/2 bg-blue-900"></span>
											<span class="block h-1/2 w-full bg-white"></span>
										</span>
										+62
									</span>
									<input
										id="phone"
										name="phone"
										class="field flex-1"
										type="tel"
										placeholder="812 3456 7890"
									/>
								</div>
							</div>

							<div>
								<label class="field-label" for="message">Message</label>
								<textarea
									id="message"
									name="message"
									class="field resize-none"
									rows="5"
									placeholder="Tell us your travel dates, group size and the places you would love to see."
									required
								></textarea>
							</div>

							<button class="btn-gold w-full px-8 py-3.5" type="submit">
								Send Message
								<i class="fa-solid fa-arrow-right text-[11px]"></i>
							</button>
						</form>
					{/if}
				</div>
			</div>
		</div>
	</section>

	<!-- Concierge & support -->
	<section class="mx-auto max-w-7xl border-t border-stone-100 px-6 py-16">
		<div class="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
			<div>
				<h2 class="text-2xl font-extrabold text-forest-deep md:text-3xl">We'd Love to Hear From You.</h2>
			</div>
			<p class="max-w-sm text-sm leading-relaxed text-stone-500 md:text-right">
				Our local island specialists are on hand to tailor custom itineraries, boat transfers, and
				guided expeditions.
			</p>
		</div>

		<div class="grid grid-cols-1 gap-6 md:grid-cols-3">
			{#each contactChannels as channel (channel.title)}
				<a
					class="flex flex-col justify-between rounded-2xl border border-stone-200/80 bg-white p-7 transition-all duration-200 hover:shadow-lg"
					href={channel.href}
				>
					<div>
						<div
							class="mb-5 flex size-11 items-center justify-center rounded-xl border border-stone-100 bg-white text-forest-deep"
						>
							<i class="{channel.icon} text-sm"></i>
						</div>
						<h3 class="mb-2 text-base font-bold text-forest-deep">{channel.title}</h3>
						<p class="mb-5 text-xs leading-relaxed text-stone-500">{channel.text}</p>
					</div>
					<div class="flex items-end justify-between gap-3">
						<div class="text-sm font-semibold text-forest-deep">
							{channel.value}
							{#if channel.extra}
								<span class="block text-xs font-normal text-stone-500">{channel.extra}</span>
							{/if}
						</div>
						<i class="fa-solid fa-arrow-right text-xs text-stone-400"></i>
					</div>
				</a>
			{/each}
		</div>
	</section>

	<!-- Pre-footer banner -->
	<CtaBanner
		title="Ready To Begin Your Next Adventure?"
		text="Let Banggai Escape design your perfect journey today."
		ctaLabel="Book your trip"
		ctaHref="#contact-section"
		image={ctaBackground}
	/>
</div>
