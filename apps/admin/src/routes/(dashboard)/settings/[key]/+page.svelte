<script lang="ts">
import { untrack } from 'svelte';
import { resolve } from '$app/paths';
import FieldControl from '$lib/components/content/FieldControl.svelte';
import { settingSpecs } from '$lib/content/forms';
import type { ActionData, PageData } from './$types';

let { data, form }: { data: PageData; form: ActionData } = $props();

// Seeded once from the load and then owned by the page, exactly as in the content
// editors: row counts change by the administrator adding and removing rows, and a failed
// save must not collapse the rows they just added. `untrack` states that intent.
let counts = $state(untrack(() => ({ ...data.counts })));

/**
 * No setting has a repeatable *block* — blocks are an article-body concept — so there is
 * nothing to track. The controls still take the prop.
 */
const blockKindState: Record<string, string> = {};

const spec = $derived(settingSpecs[data.key]);

/**
 * The submission when one was refused, otherwise what is stored. Read through the same
 * wrapper the parser produced, so the fields show what was typed rather than the value
 * that is still live.
 */
const values = $derived((form?.values ?? data.values) as Record<string, unknown>);

const issues = $derived(form?.issues ?? []);
</script>

<nav class="text-sm text-muted-foreground">
	<a href={resolve('/(dashboard)/settings')} class="hover:text-foreground">Site settings</a>
	<span aria-hidden="true">/</span>
	<span class="text-foreground">{spec.label}</span>
</nav>

<h1 class="mt-2 font-heading text-xl font-semibold text-foreground">{spec.label}</h1>
<p class="mt-1 max-w-3xl text-sm text-muted-foreground">{data.note}</p>

{#if data.valid === false}
	<p
		class="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
	>
		The stored value no longer satisfies its contract — the public site is still reading it.
		Saving will be refused until the fields below are corrected.
	</p>
{/if}

{#if issues.length > 0}
	<div
		class="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
	>
		<p class="font-medium">Nothing was saved.</p>
		<ul class="mt-1 list-inside list-disc">
			{#each issues as issue (issue)}
				<li>{issue}</li>
			{/each}
		</ul>
	</div>
{:else if form?.message}
	<p role="status" class="mt-4 rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground">
		{form.message}
	</p>
{/if}

<form method="post" action="?/save" class="mt-6 grid gap-5">
	<div class="rounded-lg border border-border bg-card p-5">
		<FieldControl
			{spec}
			path={data.key}
			{values}
			{counts}
			{blockKindState}
			media={data.media}
		/>
	</div>

	<div class="flex flex-wrap items-center gap-2 border-t border-border pt-4">
		<button
			type="submit"
			class="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
		>
			Save
		</button>
		<a
			href={resolve('/(dashboard)/settings')}
			class="rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
		>
			Back to settings
		</a>
	</div>
</form>

<p class="mt-3 text-xs text-muted-foreground">
	{#if data.updatedAt}
		Last saved {data.updatedAt.toLocaleString()}{#if data.updatedBy}
			by {data.updatedBy}{/if}. Saving here goes live immediately — there is no draft step
		and no preview.
	{:else}
		Never saved. The public site is still using the value that shipped with the site.
	{/if}
</p>
