<script lang="ts">
import { page } from '$app/state';
import { CARD_SIZES } from '$lib/card-sizes';
import CtaBanner from '$lib/components/CtaBanner.svelte';
import EnquiryPanel from '$lib/components/EnquiryPanel.svelte';
import Icon from '$lib/components/Icon.svelte';
import Seo from '$lib/components/Seo.svelte';
import { img, media } from '$lib/data/media';
import { imageSrcset } from '$lib/images';
import { breadcrumbList } from '$lib/seo';
import { siteAgency, siteCrumbs } from '$lib/site-seo';

let { data } = $props();

const contactChannels = $derived(data.settings.contactChannels);
const ctaBackground = $derived(data.settings.ctaBackground);
const site = $derived(data.settings.site);

/**
 * The lake photograph beside the form, and the resized variants the edge can produce.
 *
 * Lazy-loaded: it sits below the fold on every viewport, and it is decorative framing for a
 * form, so it must never compete with the controls above it for bandwidth.
 */
const lakeImage = img(media.contact['paisu-pok-lake-with-canoe-floating-on-clear-water'], 1400);
const lakeSrcset = $derived(imageSrcset(lakeImage, data.imageTransforms));

let name = $state('');
let email = $state('');
let phone = $state('');
let message = $state('');

const enquiry = $derived({
	name,
	email,
	phone,
	message,
});

/**
 * The form has no submit button, because there is nothing to submit to: the enquiry is
 * handed to WhatsApp by the panel below, which is visible and is the real action. This
 * `preventDefault` is therefore not the old bug — the old bug was swallowing a submit and
 * then claiming a message had been received. Nothing here claims anything.
 *
 * It is here so that pressing Enter in a field cannot submit the form to its own URL and
 * reload the page with the visitor's half-typed enquiry in the query string.
 */
function keepOnPage(event: SubmitEvent) {
	event.preventDefault();
}
/**
 * This page's identity for crawlers and share cards.
 *
 * The canonical URL is built from `page.url`, so it is correct during SSR, identical to what a
 * crawler resolves, and carries no hardcoded domain — behind Cloudflare the request already
 * knows the public host. Query and fragment are dropped, because `?utm_source=…` is how a link
 * arrives rather than where it points.
 */
const canonicalUrl = $derived(new URL(page.url.pathname, page.url.origin).href);
const structuredData = $derived([
	siteAgency(site, page.url.origin),
	breadcrumbList(page.url.origin, siteCrumbs({ name: 'Contact', path: '/contact' })),
]);
</script>

<Seo
	title="Contact Us — {site.name}"
	description="Plan your bespoke island journey with Banggai Escape — our local island specialists are on hand to tailor custom itineraries, boat transfers, and guided expeditions."
	canonical={canonicalUrl}
	siteName={site.name}
	locale={site.locale}
	image={{ url: lakeImage, alt: 'A canoe floating on the still water of Paisu Pok lake' }}
	structuredData={structuredData}
/>
<div>
	<!-- Top: image + form -->
	<section class="mx-auto max-w-7xl px-6 pt-12 pb-20">
		<div class="grid grid-cols-1 items-start gap-12 lg:grid-cols-12">
			<div class="relative lg:col-span-6">
				<div class="relative h-[480px] w-full overflow-hidden rounded-3xl bg-white shadow-2xl sm:h-[640px]">
					<img
						class="size-full object-cover object-center"
						src={lakeImage}
						srcset={lakeSrcset}
						sizes={CARD_SIZES.sixTwelfths}
						alt="Paisu Pok Lake with canoe floating on clear water"
						width="1400"
						height="1400"
						loading="lazy"
						decoding="async"
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
					<form class="space-y-5" onsubmit={keepOnPage} autocomplete="on">
						<div>
							<label class="field-label" for="name">Full Name</label>
							<input
								id="name"
								name="name"
								class="field"
								type="text"
								placeholder="Your full name"
								autocomplete="name"
								bind:value={name}
							/>
						</div>

						<div>
							<label class="field-label" for="email">Email Address</label>
							<input
								id="email"
								name="email"
								class="field"
								type="email"
								placeholder="you@example.com"
								autocomplete="email"
								bind:value={email}
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
									autocomplete="tel"
									bind:value={phone}
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
								bind:value={message}
							></textarea>
						</div>
					</form>

					<!--
						There is no submit button above, and that is the point. The old form had one
						that set a flag and rendered "Thank you — message received" while sending
						nothing at all, which is worse than having no form: a visitor who trusted it
						believed an island specialist had their details.

						What is here instead composes the enquiry as they type and shows it, so what
						leaves the site is visible before it leaves. Nothing is claimed to have been
						received until it genuinely has.
					-->
					<div class="mt-6">
						<EnquiryPanel
							whatsapp={site.whatsapp}
							{enquiry}
							label="Send this message to us"
						/>
					</div>

					<p class="mt-5 text-xs leading-relaxed text-stone-500">
						Prefer email? Write to
						<a class="font-semibold text-forest-deep underline" href="mailto:{site.email}"
							>{site.email}</a
						>. For anything urgent, call
						<a class="font-semibold text-forest-deep" href={site.phoneHref}>{site.phone}</a>.
					</p>
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
							<Icon icon={channel.icon} size={16} class="text-forest-deep" />
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
						<Icon icon="fa-solid fa-arrow-right" size={14} class="text-stone-400" />
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
