<script lang="ts">
import '@fontsource-variable/plus-jakarta-sans/wght.css';
import '@fontsource-variable/plus-jakarta-sans/wght-italic.css';
import './layout.css';
import { afterNavigate } from '$app/navigation';
import { page } from '$app/state';
import { trackClick, trackPageView } from '$lib/analytics';
import Footer from '$lib/components/Footer.svelte';
import Header from '$lib/components/Header.svelte';

let { data, children } = $props();

/**
 * Page views are recorded here, and only here.
 *
 * `afterNavigate` is what makes the count honest: it runs once when the layout mounts and
 * again after every client-side navigation, but *not* when SvelteKit prefetches a link's
 * data or when it re-fetches `__data.json`. A prefetch is therefore not a page view, which
 * is the one way this number could otherwise be badly wrong. Every navigation type it can
 * report — `enter`, `goto`, `link`, `form`, `popstate` — is a real one.
 */
afterNavigate(() => {
	trackPageView(page.url.pathname, page.status);
});
</script>

<svelte:head>
	<link rel="icon" href="/favicon.png" type="image/png" />
	<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
	<meta
		name="description"
		content="Banggai Escape designs seamless island journeys across the Banggai Archipelago in Central Sulawesi — mirror lakes, reef sanctuaries, and authentic local hospitality."
	/>
</svelte:head>

<svelte:window onclick={trackClick} />

<!--
	The first thing in the tab order, and invisible until it takes focus. A keyboard user
	arriving on any page would otherwise tab through the whole header — logo, five nav
	links, the language switcher — before reaching the content they came for.

	`sr-only` rather than `hidden`, because `display: none` removes an element from the tab
	order entirely and the link would never be reachable at all. It becomes visible on focus
	via the `focus:not-sr-only` pair.
-->
<a
	class="sr-only rounded-full bg-forest-deep px-5 py-3 text-sm font-bold text-white focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100]"
	href="#main"
>
	Skip to content
</a>

<Header
	site={data.settings.site}
	nav={data.settings.nav}
	languages={data.settings.languages}
/>
<main id="main" tabindex="-1">
	{@render children()}
</main>
<Footer
	site={data.settings.site}
	nav={data.settings.nav}
	socials={data.settings.socials}
	footerDestinations={data.settings.footerDestinations}
/>
