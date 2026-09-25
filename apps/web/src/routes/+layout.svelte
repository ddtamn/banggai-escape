<script lang="ts">
import './layout.css';
import Footer from '$lib/components/Footer.svelte';
import Header from '$lib/components/Header.svelte';

let { data, children } = $props();
</script>

<svelte:head>
	<link rel="icon" href="/favicon.png" type="image/png" />
	<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
	<meta
		name="description"
		content="Banggai Escape designs seamless island journeys across the Banggai Archipelago in Central Sulawesi — mirror lakes, reef sanctuaries, and authentic local hospitality."
	/>
</svelte:head>

<Header
	site={data.settings.site}
	nav={data.settings.nav}
	languages={data.settings.languages}
/>
<main>
	{@render children()}
</main>
<Footer
	site={data.settings.site}
	nav={data.settings.nav}
	socials={data.settings.socials}
	footerDestinations={data.settings.footerDestinations}
/>
