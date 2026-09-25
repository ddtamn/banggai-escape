<script lang="ts">
import './layout.css';
import { ModeWatcher } from 'mode-watcher';
import favicon from '$lib/assets/favicon.svg';

let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<!--
	`defaultMode="light"`: a visitor who has never chosen gets light rather than the operating
	system's preference, because the admin is only meant to switch between light and dark.
	ModeWatcher also injects the pre-paint script that applies the stored class, which is what
	stops a dark-mode administrator seeing a white flash on every navigation.
-->
<ModeWatcher defaultMode="light" />

{@render children()}
