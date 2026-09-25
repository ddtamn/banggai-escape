<script lang="ts">
/**
 * The body of a content form: every field for the kind, plus the validation report.
 *
 * The `<form>` element and its buttons live in the page, because a new entry's buttons are
 * not an existing entry's buttons. This is the part that is the same either way.
 */
import { type ContentKind, fieldSpecs, type MediaOption } from '$lib/content/forms';
import FieldControl from './FieldControl.svelte';

type Props = {
	kind: ContentKind;
	values: Record<string, unknown>;
	counts: Record<string, number>;
	blockKindState: Record<string, string>;
	media: readonly MediaOption[];
	/** `kind → field: message` lines from the last attempt. */
	issues?: readonly string[];
};

let { kind, values, counts, blockKindState, media, issues = [] }: Props = $props();
</script>

{#if issues.length > 0}
	<div class="rounded-md border border-destructive/40 bg-destructive/10 p-3">
		<p class="text-sm font-medium text-destructive">
			Not saved as published content — {issues.length} field{issues.length === 1 ? '' : 's'} to
			fix:
		</p>
		<ul class="mt-1 grid gap-0.5 text-xs text-destructive">
			{#each issues as issue (issue)}
				<li>{issue}</li>
			{/each}
		</ul>
	</div>
{/if}

<div class="grid gap-4">
	{#each fieldSpecs[kind] as spec (spec.name)}
		<FieldControl {spec} path={spec.name} {values} {counts} {blockKindState} {media} />
	{/each}
</div>
