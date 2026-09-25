<script lang="ts">
import { page } from '$app/state';
import type { ActionData, PageData } from './$types';

let { data, form }: { data: PageData; form: ActionData } = $props();

const tabs = [
	{ key: 'all', label: 'All' },
	{ key: 'owned', label: 'Uploaded' },
	{ key: 'legacy', label: 'Legacy host' },
	{ key: 'missing-alt', label: 'Missing alt text' },
	{ key: 'archived', label: 'Hidden' },
] as const;

/**
 * The message from whichever action ran. A refusal is as important to show as a
 * success, and the status is the only thing that says which it was — a refused delete
 * and a completed one both return a `message`.
 */
const notice = $derived(form?.message ? { text: form.message, bad: page.status >= 400 } : null);
</script>

<h1 class="font-heading text-xl font-semibold text-foreground">Media</h1>
<p class="mt-1 text-sm text-muted-foreground">
	Images used by packages, destinations, articles, and site settings. Files uploaded here
	live in object storage and are served from a public media host; images imported from the
	old site still point at their original CDN.
</p>

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

<section class="mt-6 rounded-lg border border-border bg-card p-5">
	<h2 class="text-sm font-semibold text-foreground">Upload an image</h2>
	<form
		method="post"
		action="?/upload"
		enctype="multipart/form-data"
		class="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
	>
		<label class="grid gap-1 text-sm">
			<span class="text-muted-foreground">File</span>
			<input
				type="file"
				name="file"
				accept="image/jpeg,image/png,image/webp,image/avif"
				required
				class="rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground file:mr-3 file:rounded file:border-0 file:bg-muted file:px-2 file:py-1 file:text-foreground"
			/>
		</label>

		<label class="grid gap-1 text-sm">
			<span class="text-muted-foreground">Alt text</span>
			<input
				type="text"
				name="altText"
				placeholder="Describe the image for screen readers"
				class="rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground"
			/>
		</label>

		<button
			type="submit"
			class="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
		>
			Upload
		</button>
	</form>
	<p class="mt-2 text-xs text-muted-foreground">
		JPEG, PNG, WebP, or AVIF, up to {data.maxBytes}. The file's type is verified from its
		bytes, not from its name.
	</p>
</section>

<div class="mt-6 flex flex-wrap items-center gap-2">
	{#each tabs as tab (tab.key)}
		<a
			href="?filter={tab.key}"
			class="rounded-md border px-3 py-1.5 text-sm {data.filter === tab.key
				? 'border-foreground bg-foreground text-background'
				: 'border-border text-muted-foreground hover:bg-muted'}"
		>
			{tab.label}
			<span class="text-xs">({data.counts[tab.key]})</span>
		</a>
	{/each}

	<form method="get" class="ml-auto flex items-center gap-2">
		<input type="hidden" name="filter" value={data.filter} />
		<input
			type="search"
			name="q"
			value={data.search}
			placeholder="Filter by file name"
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

{#if data.assets.length === 0}
	<p class="mt-8 rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
		Nothing here. {data.filter === 'all'
			? 'Upload an image to get started.'
			: 'Try another filter.'}
	</p>
{:else}
	<ul class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
		{#each data.assets as asset (asset.id)}
			<li class="flex flex-col overflow-hidden rounded-lg border border-border bg-card">
				<div class="aspect-video bg-muted">
					{#if asset.url}
						<img
							src={asset.url}
							alt={asset.altText ?? ''}
							loading="lazy"
							decoding="async"
							class="size-full object-cover"
						/>
					{:else}
						<p class="grid size-full place-items-center text-xs text-muted-foreground">
							No URL
						</p>
					{/if}
				</div>

				<div class="flex flex-1 flex-col gap-3 p-4">
					<div>
						<p class="truncate text-sm font-medium text-foreground" title={asset.originalName}>
							{asset.originalName}
						</p>
						<p class="mt-0.5 text-xs text-muted-foreground">
							{asset.width && asset.height ? `${asset.width}×${asset.height}` : 'Unknown size'}
							{#if asset.byteSize}· {Math.round(asset.byteSize / 1024)} KiB{/if}
							· {asset.objectKey ? 'Uploaded' : 'Legacy host'}
							{#if asset.archivedAt}· Hidden{/if}
						</p>
						{#if !asset.altText}
							<p class="mt-1 text-xs text-destructive">No alt text</p>
						{/if}
					</div>

					<form method="post" action="?/alt" class="mt-auto grid gap-2">
						<input type="hidden" name="id" value={asset.id} />
						<label class="grid gap-1 text-xs text-muted-foreground">
							Alt text
							<input
								type="text"
								name="altText"
								value={asset.altText ?? ''}
								placeholder="Describe this image"
								class="rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground"
							/>
						</label>
						<div class="flex flex-wrap gap-2">
							<button
								type="submit"
								class="rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
							>
								Save alt text
							</button>
						</div>
					</form>

					<div class="flex flex-wrap gap-2 border-t border-border pt-3">
						<form method="post" action={asset.archivedAt ? '?/restore' : '?/archive'}>
							<input type="hidden" name="id" value={asset.id} />
							<button
								type="submit"
								class="rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
							>
								{asset.archivedAt ? 'Restore' : 'Hide'}
							</button>
						</form>

						<form method="post" action="?/delete" class="ml-auto">
							<input type="hidden" name="id" value={asset.id} />
							<button
								type="submit"
								class="rounded-md border border-destructive/40 px-2.5 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10"
							>
								Delete
							</button>
						</form>
					</div>
				</div>
			</li>
		{/each}
	</ul>
{/if}
