<script lang="ts">
/**
 * Who is signed in, and the way out.
 *
 * Two deliberate departures from the block. The demo dropdown (Account, Billing,
 * Notifications) linked nowhere, so it is gone rather than left as a dead menu. And sign
 * out is a **form post**, not a menu item with a click handler: it is a state-changing
 * request, and it has to work with JavaScript still loading — the same reason the login
 * form is a real form.
 */
import LogOutIcon from '@lucide/svelte/icons/log-out';
import { resolve } from '$app/paths';
import * as Avatar from '$lib/components/ui/avatar/index.js';
import * as Sidebar from '$lib/components/ui/sidebar/index.js';

let { user }: { user: { email: string; name?: string } } = $props();

/** The email's first letter: an administrator may have no display name. */
const initial = $derived((user.name ?? user.email).slice(0, 1).toUpperCase());
</script>

<Sidebar.Menu>
	<Sidebar.MenuItem>
		<Sidebar.MenuButton size="lg" class="pointer-events-none">
			<Avatar.Root class="size-8 rounded-lg">
				<Avatar.Fallback class="rounded-lg">{initial}</Avatar.Fallback>
			</Avatar.Root>
			<div class="grid flex-1 text-start text-sm leading-tight">
				<span class="truncate font-medium">{user.name ?? 'Administrator'}</span>
				<span class="truncate text-xs text-muted-foreground">{user.email}</span>
			</div>
		</Sidebar.MenuButton>
	</Sidebar.MenuItem>

	<Sidebar.MenuItem>
		<form method="post" action={resolve('/logout')}>
			<Sidebar.MenuButton tooltipContent="Sign out">
				{#snippet child({ props })}
					<button type="submit" {...props}>
						<LogOutIcon />
						<span>Sign out</span>
					</button>
				{/snippet}
			</Sidebar.MenuButton>
		</form>
	</Sidebar.MenuItem>
</Sidebar.Menu>
