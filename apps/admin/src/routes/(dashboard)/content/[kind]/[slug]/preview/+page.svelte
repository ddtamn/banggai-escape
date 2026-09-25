<script lang="ts">
import { resolve } from '$app/paths';
import type { PageData } from './$types';

let { data }: { data: PageData } = $props();
</script>

<p class="text-xs text-muted-foreground">
	<a href={resolve('/(dashboard)/content/[kind]', { kind: data.kind })} class="underline"
		>{data.kindLabel} items</a
	>
	/
	<a
		href={resolve('/(dashboard)/content/[kind]/[slug]', { kind: data.kind, slug: data.entry.slug })}
		class="underline">edit</a
	>
	/
</p>

<h1 class="font-heading text-xl font-semibold text-foreground">Draft preview</h1>
<p class="mt-1 text-sm text-muted-foreground">
	What is stored for <code>/{data.entry.slug}</code>, field by field.
</p>

<div class="mt-4 rounded-md border border-border bg-muted p-3 text-sm text-muted-foreground">
	{#if data.entry.status === 'draft'}
		This has never been published, so this is the only version that exists.
	{:else if data.entry.status === 'changed'}
		This differs from revision {data.entry.published?.revisionNumber}, which is what visitors
		currently see. Publishing is what makes it public.
	{:else}
		This is identical to the published revision — nothing here is pending.
	{/if}
	The layout below is the administrator's field view, not the public page: the marketing
	components live in the other app.
</div>

{#if data.entry.issues.length > 0}
	<div class="mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-3">
		<p class="text-sm font-medium text-destructive">
			This draft cannot be published — {data.entry.issues.length} field{data.entry.issues.length === 1
				? ''
				: 's'} to fix:
		</p>
		<ul class="mt-1 grid gap-0.5 text-xs text-destructive">
			{#each data.entry.issues as issue (issue)}
				<li>{issue}</li>
			{/each}
		</ul>
	</div>
{/if}

<dl class="mt-6 grid gap-3">
	{#each data.rows as row, index (index)}
		<div class="grid gap-1 border-b border-border pb-3 sm:grid-cols-[16rem_1fr] sm:gap-4">
			<dt class="text-xs font-medium tracking-wide text-muted-foreground uppercase">
				{row.label}
			</dt>
			<dd class="text-sm text-foreground">
				{#if row.urls.length > 0}
					<div class="flex flex-wrap gap-2">
						{#each row.urls as url, mediaIndex (mediaIndex)}
							{#if url}
								<img
									src={url}
									alt=""
									loading="lazy"
									class="h-24 w-36 rounded-md border border-border object-cover"
								/>
							{:else}
								<p class="text-xs text-destructive">Missing image (removed from the library)</p>
							{/if}
						{/each}
					</div>
				{:else}
					{row.text}
				{/if}
			</dd>
		</div>
	{/each}
</dl>
