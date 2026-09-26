<script lang="ts">
import { untrack } from 'svelte';
import { resolve } from '$app/paths';
import { page } from '$app/state';
import EntryForm from '$lib/components/content/EntryForm.svelte';
import StatusBadge from '$lib/components/content/status-badge.svelte';
import { Badge } from '$lib/components/ui/badge/index.js';
import type { ActionData, PageData } from './$types';

let { data, form }: { data: PageData; form: ActionData } = $props();

// Seeded once from the load and then owned here — see the note in the new-entry page.
let counts = $state(untrack(() => ({ ...data.counts })));
let blockKindState = $state(untrack(() => ({ ...data.blockKinds })));

const notice = $derived(form?.message ? { text: form.message, bad: page.status >= 400 } : null);

/** Problems to show: this attempt's, or whatever is wrong with the stored draft. */
const issues = $derived(form?.issues ?? (form ? [] : data.entry.issues));

const published = $derived(data.entry.published);
</script>

<div class="flex flex-wrap items-start justify-between gap-3">
	<div>
		<p class="text-xs text-muted-foreground">
			<a href={resolve('/(dashboard)/content/[kind]', { kind: data.kind })} class="underline"
				>{data.kindLabel} items</a
			>
			/
		</p>
		<!--
			The entry's own title, or its slug when it has none. `displayTitle` rather than
			`title ?? name ?? slug`: a draft is allowed to be incomplete, and a cleared title is
			an empty string rather than a missing one, so `??` walked straight past it and left
			this heading with no text at all — an unnamed page for exactly the half-finished
			draft this screen exists to hold. The list already used the same rule.
		-->
		<h1 class="font-heading text-xl font-semibold text-foreground">
			{data.title}
		</h1>
		<p class="mt-1 text-sm text-muted-foreground">
			/{data.entry.slug} · position {data.entry.sortOrder}
			{#if published}· revision {published.revisionNumber} live since {published.publishedAt.toISOString().slice(0, 10)}{/if}
		</p>
	</div>

	<div class="flex flex-wrap items-center gap-2">
		<StatusBadge status={data.entry.status} label={data.labels[data.entry.status]} />
		<a
			href={resolve('/(dashboard)/content/[kind]/[slug]/preview', {
				kind: data.kind,
				slug: data.entry.slug
			})}
			class="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
		>
			Preview draft
		</a>
	</div>
</div>

{#if notice}
	<p
		role="status"
		class="mt-4 rounded-md border px-3 py-2 text-sm {notice.bad
			? 'border-destructive/40 bg-destructive/10 text-destructive'
			: 'border-border bg-muted text-foreground'}"
	>
		{notice.text}
	</p>
{/if}

<section class="mt-6 rounded-lg border border-border bg-card p-4">
	<h2 class="text-sm font-semibold text-foreground">Publishing</h2>
	<p class="mt-1 text-sm text-muted-foreground">
		{#if data.entry.status === 'draft'}
			This has never been published, so it is invisible to visitors.
		{:else if data.entry.status === 'changed'}
			The draft differs from revision {published?.revisionNumber}, which is what visitors see.
		{:else if data.entry.status === 'archived'}
			Archived. Restore it before publishing.
		{:else}
			The draft and the published revision are identical.
		{/if}
	</p>

	<div class="mt-3 flex flex-wrap gap-2">
		<form method="post" action="?/publish">
			<button
				type="submit"
				disabled={data.entry.status === 'archived'}
				class="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
			>
				{data.entry.status === 'changed' ? 'Publish changes' : 'Publish'}
			</button>
		</form>

		{#if published}
			<form method="post" action="?/unpublish">
				<button
					type="submit"
					class="rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
				>
					Unpublish
				</button>
			</form>
		{/if}

		{#if data.entry.status === 'archived'}
			<form method="post" action="?/restore">
				<button
					type="submit"
					class="rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
				>
					Restore
				</button>
			</form>
		{:else}
			<form method="post" action="?/archive">
				<button
					type="submit"
					class="rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
				>
					Archive
				</button>
			</form>
		{/if}
	</div>
</section>

<form method="post" action="?/save" class="mt-6 grid gap-5">
	<EntryForm
		kind={data.kind}
		values={data.entry.draft}
		{counts}
		{blockKindState}
		media={data.media}
		{issues}
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
			Back to the list
		</a>
		<span class="self-center text-xs text-muted-foreground">
			Saving never changes what visitors see.
		</span>
	</div>
</form>

<section class="mt-10 rounded-lg border border-border bg-card p-5">
	<h2 class="text-sm font-semibold text-foreground">Revision history</h2>

	{#if data.revisions.length === 0}
		<p class="mt-1 text-sm text-muted-foreground">Nothing has been published yet.</p>
	{:else}
		<p class="mt-1 text-sm text-muted-foreground">
			Immutable. Restoring one makes it the draft, so you can look at it before it goes live.
		</p>
		<ul class="mt-3 grid gap-2">
			{#each data.revisions as revision (revision.id)}
				<li class="flex flex-wrap items-center gap-3 rounded-md border border-border p-2.5 text-sm">
					<span class="font-medium text-foreground">Revision {revision.revisionNumber}</span>
					{#if revision.current}
						<Badge>Live</Badge>
					{/if}
					<span class="text-xs text-muted-foreground">
						{revision.publishedAt.toISOString().slice(0, 16).replace('T', ' ')} · {revision.authorEmail}
						{#if revision.slug !== data.entry.slug}· slug /{revision.slug}{/if}
					</span>

					{#if !revision.current}
						<form method="post" action="?/restoreRevision" class="ml-auto">
							<input type="hidden" name="revisionId" value={revision.id} />
							<button
								type="submit"
								class="rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
							>
								Restore as draft
							</button>
						</form>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}

	{#if data.redirects.length > 0}
		<h3 class="mt-5 text-sm font-semibold text-foreground">Permanent redirects</h3>
		<ul class="mt-1 grid gap-0.5 text-sm text-muted-foreground">
			{#each data.redirects as redirect (redirect.fromSlug)}
				<li><code>/{redirect.fromSlug}</code> → <code>/{redirect.toSlug}</code></li>
			{/each}
		</ul>
	{/if}
</section>
