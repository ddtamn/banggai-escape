<script lang="ts">
/**
 * The analytics dashboard.
 *
 * Four things this page is careful about.
 *
 * **It labels the number honestly.** The headline is *page views*. There is no visitor id
 * anywhere in the pipeline, so there is no such thing as a unique visitor to report, and a
 * KPI card saying "visitors" would be a lie an editor would repeat.
 *
 * **Three states, all of them first-class.** Unconfigured (no credential yet), error
 * (Cloudflare said no), and ready — with an empty *window* still rendering as ready, since
 * "no traffic in the last seven days" is a fact and not a failure. An empty chart with no
 * explanation is the thing that makes people distrust a dashboard.
 *
 * **Refreshing is a button, not a timer.** Analytics Engine is read on load and on demand;
 * `invalidateAll()` re-runs this page's loader. Nothing polls — a dashboard left open
 * overnight should cost nothing and should not make the free allowance a question.
 *
 * **The chart has a text alternative.** The same series is rendered as a screen-reader-only
 * table, so the numbers are available to someone who cannot see or hover the bars.
 */

import { analyticsRanges, analyticsRetentionDays } from '@banggai/content-model';
import { BarChart } from 'layerchart';
import { invalidateAll } from '$app/navigation';
import { resolve } from '$app/paths';
import { navigating } from '$app/state';
import * as Card from '$lib/components/ui/card/index.js';
import { ChartContainer, ChartTooltip } from '$lib/components/ui/chart/index.js';
import type { PageData } from './$types';

let { data }: { data: PageData } = $props();

const view = $derived(data.view);
const busy = $derived(navigating !== null);

/** What the bars mean. `--chart-2` is the admin theme's neutral mid tone. */
const chartConfig = {
	views: { label: 'Page views', color: 'var(--chart-2)' },
};

const rangeLabel: Record<number, string> = {
	7: 'Last 7 days',
	30: 'Last 30 days',
	90: 'Last 90 days',
};

const number = (value: number) => value.toLocaleString();

/** The KPI row: one headline and the two tracked actions. */
const kpis = $derived(
	view.state === 'ready'
		? [
				{
					label: 'Page views',
					value: view.summary.totals.pageViews,
					note: 'Every navigation, once',
				},
				{
					label: 'Booking CTA clicks',
					value: view.summary.totals.bookingCtaClicks,
					note: '"Book Now" and the closing banner',
				},
				{
					label: 'Contact clicks',
					value: view.summary.totals.contactClicks,
					note: 'Header, footer phone and email',
				},
			]
		: [],
);

const hasTraffic = $derived(
	view.state === 'ready' && view.summary.eventTotals.some((row) => row.count > 0),
);
</script>

<div class="flex flex-wrap items-start justify-between gap-4">
	<div>
		<h1 class="font-heading text-xl font-semibold text-foreground">Analytics</h1>
		<p class="mt-1 max-w-3xl text-sm text-muted-foreground">
			What the public site recorded, read from Cloudflare Workers Analytics Engine. Counts
			are page views and clicks, not visitors: nothing in this system identifies a person,
			so there is nothing to count people with.
		</p>
	</div>

	<button
		type="button"
		class="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
		onclick={() => invalidateAll()}
		disabled={busy}
	>
		{busy ? 'Refreshing…' : 'Refresh'}
	</button>
</div>

{#if view.state === 'unconfigured'}
	<Card.Root class="mt-6">
		<Card.Header>
			<Card.Title>Not configured yet</Card.Title>
			<Card.Description>
				The dashboard reads Analytics Engine through Cloudflare's SQL API, which needs an
				account id and a read-only token. This Worker does not have {view.missing.length === 1
					? 'it'
					: 'them'} yet{view.missing.length > 1 ? 's' : ''}:
				<span class="font-mono text-foreground">{view.missing.join(', ')}</span>.
			</Card.Description>
		</Card.Header>
		<Card.Content class="text-sm text-muted-foreground">
			<ol class="grid list-decimal gap-1 pl-4">
				<li>
					Create a token with <span class="font-mono text-foreground"
						>Account → Account Analytics → Read</span
					>, scoped to this account.
				</li>
				<li>
					Set it once:
					<span class="font-mono text-foreground"
						>pnpm --filter @banggai/admin exec wrangler secret put
						CLOUDFLARE_ANALYTICS_TOKEN</span
					>.
				</li>
				<li>
					<span class="font-mono text-foreground">CLOUDFLARE_ACCOUNT_ID</span> is a var in
					<code>wrangler.jsonc</code>; set it there for a deployment, or in <code>.env</code> for
					local work.
				</li>
			</ol>
			<p class="mt-3">
				Until the public Worker is deployed and writing events there is nothing to show even
				with a working token — the dataset is created by its first write.
			</p>
		</Card.Content>
	</Card.Root>
{:else if view.state === 'error'}
	<Card.Root class="mt-6">
		<Card.Header>
			<Card.Title>Cloudflare could not answer that</Card.Title>
			<Card.Description>{view.message}</Card.Description>
		</Card.Header>
		<Card.Content class="text-sm text-muted-foreground">
			The rest of the admin is unaffected. Content and media do not go through Analytics
			Engine.
		</Card.Content>
	</Card.Root>
{:else}
	<div class="mt-6 flex flex-wrap items-center gap-2">
		{#each analyticsRanges as range (range)}
			<a
				href="?range={range}"
				aria-current={data.range === range ? 'true' : undefined}
				class="rounded-md border px-3 py-1.5 text-sm {data.range === range
					? 'border-foreground bg-foreground text-background'
					: 'border-border text-muted-foreground hover:bg-muted'}"
			>
				{rangeLabel[range]}
			</a>
		{/each}
		<span class="text-xs text-muted-foreground">
			Read at {new Date(view.summary.readAt).toLocaleTimeString()}{#if data.range ===
				analyticsRetentionDays}, the edge of the three-month window Analytics Engine keeps{/if}.
		</span>
	</div>

	{#if !hasTraffic}
		<p
			class="mt-6 rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground"
		>
			No events in this window. {data.range === analyticsRetentionDays
				? 'Nothing has been recorded in the last three months — check that the public site is deployed and reaching /api/events.'
				: 'Try a longer range, or check the event endpoint is being called.'}
		</p>
	{:else}
		<ul class="mt-6 grid gap-4 sm:grid-cols-3">
			{#each kpis as kpi (kpi.label)}
				<li>
					<Card.Root>
						<Card.Header>
							<Card.Description>{kpi.label}</Card.Description>
							<Card.Title class="text-2xl tabular-nums">{number(kpi.value)}</Card.Title>
						</Card.Header>
						<Card.Content class="text-xs text-muted-foreground">{kpi.note}</Card.Content>
					</Card.Root>
				</li>
			{/each}
		</ul>

		<Card.Root class="mt-4">
			<Card.Header>
				<Card.Title>Page views per day</Card.Title>
				<Card.Description>
					Days with no traffic are drawn as zero rather than left out, so the gaps are real.
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<ChartContainer config={chartConfig} class="h-64 w-full">
					<BarChart
						data={view.summary.dailyViews}
						x="day"
						y="views"
						props={{ bars: { radius: 2 } }}
					>
						<ChartTooltip />
					</BarChart>
				</ChartContainer>

				<table class="sr-only">
					<caption>{rangeLabel[data.range]} of page views, one row per day</caption>
					<thead>
						<tr><th scope="col">Day</th><th scope="col">Page views</th></tr>
					</thead>
					<tbody>
						{#each view.summary.dailyViews as day (day.day)}
							<tr><th scope="row">{day.day}</th><td>{day.views}</td></tr>
						{/each}
					</tbody>
				</table>
			</Card.Content>
		</Card.Root>

		<div class="mt-4 grid gap-4 lg:grid-cols-3">
			<Card.Root>
				<Card.Header>
					<Card.Title>Most-read pages</Card.Title>
				</Card.Header>
				<Card.Content>
					<ul class="grid gap-2 text-sm">
						{#each view.summary.topPages as page (page.path)}
							<li class="flex items-baseline justify-between gap-3">
								<span class="min-w-0 truncate font-mono text-xs text-muted-foreground"
									>{page.path}</span
								>
								<span class="tabular-nums text-foreground">{number(page.views)}</span>
							</li>
						{/each}
					</ul>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title>Most-read content</Card.Title>
					<Card.Description>Package, destination and article pages.</Card.Description>
				</Card.Header>
				<Card.Content>
					<ul class="grid gap-2 text-sm">
						{#each view.summary.contentViews as item (`${item.kind}/${item.slug}`)}
							<li class="flex items-baseline justify-between gap-3">
								<a
									class="min-w-0 truncate underline decoration-dotted"
									href={resolve('/(dashboard)/content/[kind]/[slug]', {
										kind: item.kind,
										slug: item.slug,
									})}
								>
									{item.slug}
								</a>
								<span class="tabular-nums text-muted-foreground">{number(item.views)}</span>
							</li>
						{/each}
					</ul>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title>Call-to-action clicks</Card.Title>
					<Card.Description>Which page the click came from.</Card.Description>
				</Card.Header>
				<Card.Content>
					<ul class="grid gap-2 text-sm">
						{#each view.summary.ctaClicks as click (`${click.event}/${click.path}`)}
							<li class="flex items-baseline justify-between gap-3">
								<span class="min-w-0 truncate">
									<span class="text-foreground"
										>{click.event === 'booking_cta_click' ? 'Book Now' : 'Contact'}</span
									>
									<span class="font-mono text-xs text-muted-foreground">{click.path}</span>
								</span>
								<span class="tabular-nums text-muted-foreground">{number(click.count)}</span>
							</li>
						{/each}
					</ul>
				</Card.Content>
			</Card.Root>
		</div>

		<p class="mt-4 text-xs text-muted-foreground">
			Counts use each row's sample interval, so a busy day that Analytics Engine sampled is
			estimated rather than exact. Analytics Engine keeps three months of data; a page view
			on the public site may itself be up to five minutes old, because that is how long the
			edge may cache a page.
		</p>
	{/if}
{/if}
