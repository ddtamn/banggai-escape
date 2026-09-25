<script lang="ts">
import { resolve } from '$app/paths';
import { Badge } from '$lib/components/ui/badge/index.js';
import { settingGroups } from '$lib/content/forms';
import type { PageData } from './$types';

let { data }: { data: PageData } = $props();

/** Row lookup, so a group finds its own rows without re-scanning the whole list. */
const byKey = $derived(new Map(data.settings.map((setting) => [setting.key, setting])));

/**
 * `unset` is deliberately quiet rather than alarming: it is work not yet done, not a
 * broken value. Only `invalid` means somebody has to look, so only that one is red.
 */
const badges = {
	unset: { label: 'Not set', variant: 'outline' },
	ok: { label: 'Saved', variant: 'secondary' },
	invalid: { label: 'Out of date', variant: 'destructive' },
} as const;
</script>

<h1 class="font-heading text-xl font-semibold text-foreground">Site settings</h1>
<p class="mt-1 max-w-3xl text-sm text-muted-foreground">
	The copy shared by every page — the brand block, navigation, footer, review counts, and
	the questions and answers. Unlike packages or articles these have no draft: the public
	site reads them directly, so saving is what publishes, and a value that fails its contract
	is refused rather than stored.
</p>

{#each settingGroups as group (group.title)}
	<section class="mt-6">
		<h2 class="text-sm font-semibold text-foreground">{group.title}</h2>

		<ul class="mt-2 divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
			{#each group.keys as key (key)}
				{@const row = byKey.get(key)}
				{#if row}
					<li>
						<a
							href={resolve('/(dashboard)/settings/[key]', { key })}
							class="flex items-start gap-4 p-4 hover:bg-muted"
						>
							<span class="min-w-0 flex-1">
								<span class="flex flex-wrap items-center gap-2">
									<span class="text-sm font-medium text-foreground">{row.label}</span>
									<Badge variant={badges[row.state].variant}>{badges[row.state].label}</Badge>
								</span>
								<span class="mt-1 block text-xs text-muted-foreground">{row.note}</span>
								<span class="mt-1 block text-xs text-muted-foreground">
									{row.summary}{#if row.updatedAt} ·
										{row.updatedAt.toLocaleDateString()}{/if}
								</span>
							</span>
							<span aria-hidden="true" class="text-muted-foreground">→</span>
						</a>
					</li>
				{/if}
			{/each}
		</ul>
	</section>
{/each}
