<script lang="ts">
/**
 * The signed-in shell, from the dashboard-01 block.
 *
 * `Sidebar.Provider` owns the collapse state (persisted in a cookie, so it survives a
 * navigation) and `SiteHeader` sits inside the inset with the page content — which is the
 * structure the block's own styles assume: `group-has-data-[collapsible=icon]` selectors,
 * `Sidebar.Trigger`, and the mobile sheet all depend on that nesting.
 *
 * The only JavaScript here is the title lookup; `sectionTitle` reads the same list the
 * sidebar renders.
 */
import type { Snippet } from 'svelte';
import { page } from '$app/state';
import AppSidebar from '$lib/components/app-sidebar.svelte';
import SiteHeader from '$lib/components/site-header.svelte';
import * as Sidebar from '$lib/components/ui/sidebar/index.js';
import { sectionTitle } from '$lib/navigation';
import type { LayoutData } from './$types';

let { data, children }: { data: LayoutData; children: Snippet } = $props();

const title = $derived(sectionTitle(page.url.pathname));
</script>

<Sidebar.Provider>
	<AppSidebar user={data.user} />
	<Sidebar.Inset>
		<SiteHeader {title} />
		<div class="flex flex-1 flex-col gap-6 p-4 lg:p-6">
			{@render children()}
		</div>
	</Sidebar.Inset>
</Sidebar.Provider>
