<script lang="ts">
import { resolve } from '$app/paths';
import { page } from '$app/state';
import StatusBadge from '$lib/components/content/status-badge.svelte';
import { Badge } from '$lib/components/ui/badge/index.js';
import type { ActionData, PageData } from './$types';

let { data, form }: { data: PageData; form: ActionData } = $props();

const filters = [
	{ key: 'all', label: 'All' },
	{ key: 'draft', label: 'Draft' },
	{ key: 'published', label: 'Published' },
	{ key: 'changed', label: 'Unpublished changes' },
	{ key: 'archived', label: 'Archived' },
] as const;

const notice = $derived(form?.message ? { text: form.message, bad: page.status >= 400 } : null);
</script>

<div class="flex flex-wrap items-center justify-between gap-3">
	<div>
		<h1 class="font-heading text-xl font-semibold text-foreground">{data.kindLabel} items</h1>
		<p class="mt-1 text-sm text-muted-foreground">
			{data.counts.all} item{data.counts.all === 1 ? '' : 's'}. Editing saves a draft; the
			public site keeps serving the last published version until you publish.
		</p>
	</div>

	<a
		href={resolve('/(dashboard)/content/[kind]/new', { kind: data.kind })}
		class="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
	>
		New {data.kindLabel.toLowerCase()}
	</a>
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

<div class="mt-6 flex flex-wrap items-center gap-2">
	{#each filters as filter (filter.key)}
		<a
			href="?status={filter.key}"
			class="rounded-md border px-3 py-1.5 text-sm {data.status === filter.key
				? 'border-foreground bg-foreground text-background'
				: 'border-border text-muted-foreground hover:bg-muted'}"
		>
			{filter.label} <span class="text-xs">({data.counts[filter.key]})</span>
		</a>
	{/each}

	<form method="get" class="ml-auto flex items-center gap-2">
		<input type="hidden" name="status" value={data.status} />
		<input
			type="search"
			name="q"
			value={data.search}
			placeholder="Filter by slug"
			class="rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground"
		/>
		<button
			type="submit"
			class="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
		>
			Search
		</button>
	</form>
</div>

{#if data.entries.length === 0}
	<p class="mt-8 rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
		Nothing to show. {data.status === 'all' && data.search === ''
			? `Create the first ${data.kindLabel.toLowerCase()}.`
			: 'Try another filter.'}
	</p>
{:else}
	<ul class="mt-6 grid gap-2">
		{#each data.entries as entry, index (entry.id)}
			<li class="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3">
				<div class="flex flex-col gap-1">
					<form method="post" action="?/move">
						<input type="hidden" name="slug" value={entry.slug} />
						<input type="hidden" name="direction" value="up" />
						<button
							type="submit"
							disabled={index === 0}
							aria-label="Move up"
							class="rounded border border-border px-1.5 text-xs text-foreground disabled:opacity-40"
						>
							↑
						</button>
					</form>
					<form method="post" action="?/move">
						<input type="hidden" name="slug" value={entry.slug} />
						<input type="hidden" name="direction" value="down" />
						<button
							type="submit"
							disabled={index === data.entries.length - 1}
							aria-label="Move down"
							class="rounded border border-border px-1.5 text-xs text-foreground disabled:opacity-40"
						>
							↓
						</button>
					</form>
				</div>

				<div class="min-w-0 flex-1">
					<a
						href={resolve('/(dashboard)/content/[kind]/[slug]', {
							kind: data.kind,
							slug: entry.slug
						})}
						class="truncate font-medium text-foreground underline"
					>
						{entry.title}
					</a>
					<p class="mt-0.5 truncate text-xs text-muted-foreground">
						/{entry.slug} · position {entry.sortOrder} · {entry.revisionCount} revision{entry.revisionCount ===
						1
							? ''
							: 's'}
						{#if entry.publishedAt}· last published {entry.publishedAt.toISOString().slice(0, 10)}{/if}
					</p>
				</div>

				<StatusBadge status={entry.status} label={data.labels[entry.status]} />

				{#if !entry.publishable}
					<Badge variant="destructive">Not publishable</Badge>
				{/if}

				<div class="flex flex-wrap items-center gap-2">
					<form method="post" action="?/feature">
						<input type="hidden" name="slug" value={entry.slug} />
						<input type="hidden" name="featured" value={entry.featured ? 'false' : 'true'} />
						<button
							type="submit"
							class="rounded-md border px-2.5 py-1.5 text-xs font-medium {entry.featured
								? 'border-foreground text-foreground'
								: 'border-border text-muted-foreground hover:bg-muted'}"
						>
							{entry.featured ? 'Featured' : 'Feature'}
						</button>
					</form>

					<form method="post" action="?/archive">
						<input type="hidden" name="slug" value={entry.slug} />
						<input type="hidden" name="archived" value={entry.archivedAt ? 'false' : 'true'} />
						<button
							type="submit"
							class="rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
						>
							{entry.archivedAt ? 'Restore' : 'Archive'}
						</button>
					</form>

					<form method="post" action="?/delete">
						<input type="hidden" name="slug" value={entry.slug} />
						<button
							type="submit"
							class="rounded-md border border-destructive/40 px-2.5 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10"
						>
							Delete
						</button>
					</form>
				</div>
			</li>
		{/each}
	</ul>
{/if}

<section class="mt-10 rounded-lg border border-border bg-card p-5">
	<h2 class="text-sm font-semibold text-foreground">Order and the homepage</h2>
	<p class="mt-1 text-sm text-muted-foreground">
		Position is what the public site actually uses today — the homepage takes the first four
		packages by position, not by the featured flag. Moving an item here changes what appears
		on the site's first screens once it is published.
	</p>

	{#if data.redirects.length > 0}
		<h3 class="mt-4 text-sm font-semibold text-foreground">Permanent redirects</h3>
		<ul class="mt-1 grid gap-0.5 text-sm text-muted-foreground">
			{#each data.redirects as redirect (redirect.fromSlug)}
				<li><code>/{redirect.fromSlug}</code> → <code>/{redirect.toSlug}</code></li>
			{/each}
		</ul>
	{/if}
</section>
