<script lang="ts">
/**
 * The top bar inside the sidebar inset.
 *
 * The block's version had a hardcoded "Documents" title and a GitHub button. This one
 * shows the section the visitor is in, taken from the layout's own navigation so there is
 * no second list of titles to keep in step, and carries the light/dark switch.
 */

import { Separator } from '$lib/components/ui/separator/index.js';
import * as Sidebar from '$lib/components/ui/sidebar/index.js';
import ModeToggle from './mode-toggle.svelte';

let { title }: { title: string } = $props();
</script>

<header
	class="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)"
>
	<div class="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
		<Sidebar.Trigger class="-ms-1" />
		<Separator orientation="vertical" class="mx-2 data-[orientation=vertical]:h-4" />
		<h1 class="text-base font-medium">{title}</h1>
		<div class="ms-auto flex items-center gap-2">
			<ModeToggle />
		</div>
	</div>
</header>
