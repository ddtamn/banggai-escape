<script lang="ts">
/**
 * The admin sidebar.
 *
 * The dashboard-01 block's demo data (Lifecycle, Analytics, Projects, Team, navClouds,
 * documents, "Acme Inc.") is replaced with this app's actual sections. Nothing here links
 * to a page that does not exist — a sidebar of dead links is worse than a short one.
 */
import PanelTopIcon from '@lucide/svelte/icons/panel-top';
import { resolve } from '$app/paths';
import * as Sidebar from '$lib/components/ui/sidebar/index.js';
import { sections } from '$lib/navigation';
import NavMain from './nav-main.svelte';
import NavUser from './nav-user.svelte';

let { user }: { user: { email: string; name?: string } } = $props();
</script>

<Sidebar.Root collapsible="offcanvas">
	<Sidebar.Header>
		<Sidebar.Menu>
			<Sidebar.MenuItem>
				<Sidebar.MenuButton size="lg" class="data-[slot=sidebar-menu-button]:!p-1.5">
					{#snippet child({ props })}
						<a href={resolve('/dashboard')} {...props}>
							<PanelTopIcon />
							<span class="text-base font-semibold">Banggai Escape</span>
						</a>
					{/snippet}
				</Sidebar.MenuButton>
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	</Sidebar.Header>

	<Sidebar.Content>
		<NavMain items={sections} />
	</Sidebar.Content>

	<Sidebar.Footer>
		<NavUser {user} />
	</Sidebar.Footer>
</Sidebar.Root>
