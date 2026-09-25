<script lang="ts">
import { page } from '$app/state';

/**
 * The brand name is written out here rather than read from the settings, and this is the
 * only place in the site that does so. The error page has to render when the layout's own
 * loader failed — a missing database, an unreadable setting — and reaching for the settings
 * that could not be loaded is how a helpful 500 turns into a blank page. The name is also a
 * string that does not change; the layout already states the site's description in the same
 * way.
 */
const siteName = 'Banggai Escape';

const isNotFound = $derived(page.status === 404);

/**
 * The dynamic routes throw descriptive 404s ("We could not find an article
 * called …"), but an unmatched URL carries SvelteKit's bare "Not Found". Only
 * show the message when it actually adds something.
 */
const detail = $derived(
	page.error && page.error.message !== 'Not Found' ? page.error.message : null,
);

const shortcuts = [
	{ label: 'Tour Packages', href: '/packages' },
	{ label: 'Destinations', href: '/destinations' },
	{ label: 'Travel Blog', href: '/blog' },
	{ label: 'Contact Us', href: '/contact' },
];
</script>

<svelte:head>
	<title>{page.status} — {siteName}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<!--
	Rendered inside +layout.svelte, so the fixed header and footer come along for
	free — no extra <main>, the layout already provides one.
-->
<section class="section-wide">
	<div class="shell">
		<div class="mx-auto max-w-2xl text-center">
			<span
				class="inline-flex items-center gap-2 rounded-full border border-hairline bg-white px-3.5 py-1 text-[11px] font-bold tracking-wider text-gold-deep uppercase"
			>
				<span class="size-1.5 rounded-full bg-gold"></span>
				Error {page.status}
			</span>

			<p
				class="mt-6 text-[64px] leading-none font-black tracking-tight text-forest-deep sm:text-[88px]"
			>
				{page.status}
			</p>

			<h1 class="mt-4 text-2xl font-extrabold tracking-tight text-stone-900 sm:text-3xl">
				{isNotFound ? 'This page drifted off the map' : 'Something went wrong at sea'}
			</h1>

			<p class="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-stone-600 sm:text-base">
				{#if detail}
					{detail}
				{:else if isNotFound}
					The page you are looking for may have moved, been renamed, or never existed. Let us
					point you back toward the islands.
				{:else}
					An unexpected error stopped this page from loading. Please try again, or head back to
					safer waters.
				{/if}
			</p>

			<div class="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
				<a class="btn-gold" href="/">Back to home</a>
				<a class="btn-forest" href="/packages">
					<span>Browse packages</span>
					<i class="fa-solid fa-arrow-right text-[10px]"></i>
				</a>
			</div>
		</div>

		<nav class="mx-auto mt-14 max-w-3xl border-t border-hairline pt-8" aria-label="Popular pages">
			<h2 class="mb-4 text-center text-[11px] font-bold tracking-widest text-stone-400 uppercase">
				Popular pages
			</h2>
			<ul class="grid grid-cols-2 gap-3 sm:grid-cols-4">
				{#each shortcuts as item (item.href)}
					<li>
						<a
							class="flex h-full items-center justify-center gap-2 rounded-xl border border-hairline bg-white px-4 py-3 text-xs font-semibold text-stone-800 transition-colors hover:border-gold hover:text-gold-deep"
							href={item.href}
						>
							{item.label}
						</a>
					</li>
				{/each}
			</ul>
		</nav>
	</div>
</section>
