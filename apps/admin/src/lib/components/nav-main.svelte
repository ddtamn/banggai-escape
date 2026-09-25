<script lang="ts">
/**
 * The sidebar's primary navigation.
 *
 * The dashboard-01 block shipped this with a "Quick Create" button, an inbox button, and
 * `#` hrefs. Those are demo affordances for a product that does not exist here, so they
 * are gone: this is the app's real navigation, and the active item is derived from the
 * URL rather than passed in from each page.
 */
import type { Component } from 'svelte';
import { page } from '$app/state';
import * as Sidebar from '$lib/components/ui/sidebar/index.js';

// Svelte's own `Component` rather than the icon library's `Icon` type: both exist, but
// this keeps the one place that lists the sections free of the icon package.
let { items }: { items: readonly { title: string; url: string; icon?: Component }[] } = $props();

/**
 * The active item is the longest matching prefix, so a detail page (`/content/package/x`)
 * keeps its list item highlighted and two items can never both claim the page.
 */
const activeUrl = $derived(
	items
		.filter(
			(item) => page.url.pathname === item.url || page.url.pathname.startsWith(`${item.url}/`),
		)
		.sort((a, b) => b.url.length - a.url.length)[0]?.url,
);
</script>

<Sidebar.Group>
	<Sidebar.GroupContent>
		<Sidebar.Menu>
			{#each items as item (item.title)}
				<Sidebar.MenuItem>
					<Sidebar.MenuButton isActive={activeUrl === item.url} tooltipContent={item.title}>
						{#snippet child({ props })}
							<a href={item.url} {...props}>
								{#if item.icon}
									<item.icon />
								{/if}
								<span>{item.title}</span>
							</a>
						{/snippet}
					</Sidebar.MenuButton>
				</Sidebar.MenuItem>
			{/each}
		</Sidebar.Menu>
	</Sidebar.GroupContent>
</Sidebar.Group>
