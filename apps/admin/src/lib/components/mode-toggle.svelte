<script lang="ts">
/**
 * The light/dark switch, following the documented `mode-watcher` pattern.
 *
 * Two things worth knowing about how it is wired:
 *
 * - **`ModeWatcher` (in the root layout) owns the state**, including the pre-paint script
 *   that applies the stored class before the first frame. `toggleMode()` is a strict
 *   light↔dark switch — `system` is never selected, which is what was asked for.
 * - **Which icon shows is decided by CSS**, from the `dark` class on `<html>`. The server
 *   cannot know the visitor's preference, so rendering the icon from state would flash the
 *   wrong one and mismatch on hydration. Both icons are always in the DOM and the inactive
 *   one is scaled away, which is also what gives the switch its rotation.
 */
import MoonIcon from '@lucide/svelte/icons/moon';
import SunIcon from '@lucide/svelte/icons/sun';
import { toggleMode } from 'mode-watcher';
import { Button } from '$lib/components/ui/button/index.js';

let { class: className }: { class?: string } = $props();
</script>

<Button variant="ghost" size="icon" class={className} onclick={toggleMode}>
	<SunIcon
		class="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 !transition-all dark:scale-0 dark:-rotate-90"
	/>
	<MoonIcon
		class="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 !transition-all dark:scale-100 dark:rotate-0"
	/>
	<span class="sr-only">Toggle theme</span>
</Button>
