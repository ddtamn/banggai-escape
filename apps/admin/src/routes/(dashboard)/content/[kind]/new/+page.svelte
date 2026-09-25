<script lang="ts">
import { untrack } from 'svelte';
import { resolve } from '$app/paths';
import EntryForm from '$lib/components/content/EntryForm.svelte';
import type { ActionData, PageData } from './$types';

let { data, form }: { data: PageData; form: ActionData } = $props();

// Row counts and block kinds are structural, so they live in state rather than in the
// form's values: see the module comment in `$lib/content/forms`. `untrack` is the explicit
// way to say "seed once from the load, then own it" — without it Svelte warns that `data`
// is only read at initialization, which is exactly the intent and not an oversight.
let counts = $state(untrack(() => ({ ...data.counts })));
let blockKindState = $state(untrack(() => ({ ...data.blockKinds })));
</script>

<h1 class="font-heading text-xl font-semibold text-foreground">New {data.kindLabel.toLowerCase()}</h1>
<p class="mt-1 text-sm text-muted-foreground">
	Saving creates a draft. Nothing appears on the public site until you publish, and the slug
	becomes this item's address — changing it later adds a permanent redirect from the old one.
</p>

<form method="post" action="?/save" class="mt-6 grid gap-5">
	<EntryForm
		kind={data.kind}
		values={data.values}
		{counts}
		{blockKindState}
		media={data.media}
		issues={form?.issues ?? []}
	/>

	<div class="flex flex-wrap gap-2 border-t border-border pt-4">
		<button
			type="submit"
			class="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
		>
			Save draft
		</button>
		<a
			href={resolve('/(dashboard)/content/[kind]', { kind: data.kind })}
			class="rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
		>
			Cancel
		</a>
	</div>
</form>
