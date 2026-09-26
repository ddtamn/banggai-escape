<!--
	The overview.

	What an administrator wants before anything else: is the site up to date, what did I
	change last, and is anyone reading it. So — content totals with their publish state, the
	most recent edits across all three kinds, and a 30-day summary that links to the full
	analytics screen rather than trying to be it.

	Every number here comes from the loader. Nothing on this page queries, and nothing is
	computed from a second definition of a rule the content service already owns: the status
	totals are `countStatuses`, and the badge labels are the service's own `statusLabels`,
	which is also what the list and detail screens render — so "changed" cannot mean one
	thing here and another there.
-->
<script lang="ts">
import { analyticsRetentionDays } from '@banggai/content-model';
import { resolve } from '$app/paths';
import StatusBadge from '$lib/components/content/status-badge.svelte';
import * as Card from '$lib/components/ui/card/index.js';
import type { PageData } from './$types';

let { data }: { data: PageData } = $props();

/** The four states, in the order the plan lists them, paired with their filter links. */
const states = [
	{ key: 'published', label: 'Published' },
	{ key: 'changed', label: 'Unpublished changes' },
	{ key: 'draft', label: 'Draft' },
	{ key: 'archived', label: 'Archived' },
] as const;

/** Grand total across the three kinds, for the one-line summary under the heading. */
const published = $derived(data.totals.reduce((sum, kind) => sum + kind.counts.published, 0));
const totalItems = $derived(data.totals.reduce((sum, kind) => sum + kind.counts.all, 0));

const analytics = $derived(data.analytics);

const editHref = (kind: string, slug: string) =>
	resolve('/(dashboard)/content/[kind]/[slug]', { kind, slug });

/** "3 minutes ago" — an edit list is read by someone who just made the edit. */
function since(date: Date): string {
	const minutes = Math.round((Date.now() - date.getTime()) / 60_000);

	if (minutes < 1) return 'just now';
	if (minutes < 60) return `${minutes} min ago`;

	const hours = Math.round(minutes / 60);

	if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;

	const days = Math.round(hours / 24);

	return `${days} day${days === 1 ? '' : 's'} ago`;
}
</script>

<div>
	<h1 class="font-heading text-xl font-semibold text-foreground">Overview</h1>
	<p class="mt-1 max-w-3xl text-sm text-muted-foreground">
		{published} of {totalItems} item{totalItems === 1 ? '' : 's'} published across packages,
		destinations and articles. Editing saves a draft; the public site keeps serving the
		last published version until you publish.
	</p>
</div>

<!-- Content totals, one card per kind, each linking straight to that list. -->
<div class="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
	{#each data.totals as kind (kind.kind)}
		{@const listUrl = resolve('/(dashboard)/content/[kind]', { kind: kind.kind })}
		<Card.Root class="flex flex-col">
			<Card.Header class="pb-3">
				<div class="flex items-start justify-between gap-2">
					<Card.Title>
						<a href={listUrl} class="hover:underline">{kind.label}s</a>
					</Card.Title>
					<a
						href={resolve('/(dashboard)/content/[kind]/new', { kind: kind.kind })}
						class="rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground hover:bg-muted"
					>
						New {kind.label.toLowerCase()}
					</a>
				</div>
				<Card.Description>
					{kind.counts.all} item{kind.counts.all === 1 ? '' : 's'}
				</Card.Description>
			</Card.Header>
			<Card.Content class="mt-auto">
				{#if kind.counts.all === 0}
					<p class="text-sm text-muted-foreground">
						Nothing yet. <a
							href={resolve('/(dashboard)/content/[kind]/new', { kind: kind.kind })}
							class="text-foreground underline">Create the first one</a
						>.
					</p>
				{:else}
					<dl class="grid gap-1.5 text-sm">
						{#each states as state (state.key)}
							{@const count = kind.counts[state.key]}
							<div class="flex items-baseline justify-between gap-2">
								<dt class="text-muted-foreground">
									<a
										href="{listUrl}?status={state.key}"
										class="hover:text-foreground hover:underline"
									>
										{state.label}
									</a>
								</dt>
								<dd class="font-medium tabular-nums text-foreground">{count}</dd>
							</div>
						{/each}
					</dl>
				{/if}
			</Card.Content>
		</Card.Root>
	{/each}
</div>

<!-- Recent edits and the traffic summary, side by side on a wide screen. -->
<div class="mt-4 grid gap-4 xl:grid-cols-3">
	<Card.Root class="xl:col-span-2">
		<Card.Header class="pb-3">
			<Card.Title>Recently edited</Card.Title>
			<Card.Description>The last {data.recent.length} changes, newest first.</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if data.recent.length === 0}
				<p class="text-sm text-muted-foreground">
					Nothing has been edited yet. Create a {data.totals[0]?.label.toLowerCase() ?? 'package'}
					to get started.
				</p>
			{:else}
				<ul class="grid gap-1">
					{#each data.recent as entry (entry.id)}
						<li class="flex flex-wrap items-center gap-x-3 gap-y-1 py-1.5">
							<a
								href={editHref(entry.kind, entry.slug)}
								class="min-w-0 flex-1 truncate text-sm font-medium text-foreground hover:underline"
							>
								{entry.title}
							</a>
							<span class="text-xs text-muted-foreground">{entry.kind}</span>
							<StatusBadge status={entry.status} label={data.labels[entry.status]} />
							<span class="text-xs whitespace-nowrap text-muted-foreground">
								{since(entry.updatedAt)}
							</span>
						</li>
					{/each}
				</ul>
			{/if}
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header class="pb-3">
			<div class="flex items-start justify-between gap-2">
				<Card.Title>Last 30 days</Card.Title>
				<a href={resolve('/analytics')} class="text-xs text-muted-foreground hover:underline">
					All analytics
				</a>
			</div>
			<Card.Description>
				Page views and clicks from the public site, not visitors.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if analytics.state === 'ready'}
				<dl class="grid gap-2 text-sm">
					<div class="flex items-baseline justify-between gap-2">
						<dt class="text-muted-foreground">Page views</dt>
						<dd class="font-heading text-lg font-semibold tabular-nums text-foreground">
							{analytics.summary.totals.pageViews.toLocaleString()}
						</dd>
					</div>
					<div class="flex items-baseline justify-between gap-2">
						<dt class="text-muted-foreground">Booking clicks</dt>
						<dd class="tabular-nums text-foreground">
							{analytics.summary.totals.bookingCtaClicks.toLocaleString()}
						</dd>
					</div>
					<div class="flex items-baseline justify-between gap-2">
						<dt class="text-muted-foreground">Contact clicks</dt>
						<dd class="tabular-nums text-foreground">
							{analytics.summary.totals.contactClicks.toLocaleString()}
						</dd>
					</div>
				</dl>
				<p class="mt-3 text-xs text-muted-foreground">
					{analytics.summary.totals.pageViews === 0
						? `Nothing recorded yet. The public Worker creates the dataset on its first write; Analytics Engine keeps ${analyticsRetentionDays} days of it.`
						: `Analytics Engine keeps ${analyticsRetentionDays} days of history.`}
				</p>
			{:else if analytics.state === 'unconfigured'}
				<p class="text-sm text-muted-foreground">
					Not set up yet — this Worker has no
					<span class="font-mono text-foreground">{analytics.missing.join(', ')}</span>.
					<a href={resolve('/analytics')} class="text-foreground underline">What to set</a>.
				</p>
			{:else}
				<p class="text-sm text-muted-foreground">
					Cloudflare could not answer that.
					<a href={resolve('/analytics')} class="text-foreground underline">See why</a>.
				</p>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
