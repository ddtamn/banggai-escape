<script lang="ts">
/**
 * Renders one field from a spec, including the repeatable ones.
 *
 * It imports itself, which is how Svelte 5 replaced `<svelte:self>`: a `rows` field inside
 * a `steps` block is two levels deep, and hand-unrolling that would mean writing the same
 * markup twice and keeping it in step.
 *
 * `counts` and `blockKindState` are `$state` objects owned by the page. Structural changes
 * happen by mutating them, so the hidden `__count` input always agrees with what is on
 * screen — see the module comment in `$lib/content/forms`.
 */
import {
	blockSpecs,
	childPath,
	countName,
	type FieldSpec,
	itemPath,
	type MediaOption,
	readPath,
} from '$lib/content/forms';
import FieldControl from './FieldControl.svelte';

type Props = {
	spec: FieldSpec;
	/** The full input name for this field. */
	path: string;
	/** The payload being edited, for reading current values. */
	values: Record<string, unknown>;
	counts: Record<string, number>;
	blockKindState: Record<string, string>;
	media: readonly MediaOption[];
};

let { spec, path, values, counts, blockKindState, media }: Props = $props();

const value = $derived(readPath(values, path));

/** The number of items to render. The page seeds it; this is the fallback. */
const count = $derived(counts[path] ?? 1);

const inputClass =
	'block w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm text-foreground';

/** The chosen image for a media field, for the inline preview. */
const chosen = $derived(
	spec.type === 'media' && typeof value === 'string'
		? (media.find((option) => option.id === value) ?? null)
		: null,
);

const blockSpec = $derived(
	spec.type === 'blocks'
		? blockSpecs
		: blockSpecs.filter((block) => block.kind === blockKindState[path]),
);
</script>

{#if spec.type === 'text' || spec.type === 'slug'}
	<label class="grid gap-1 text-sm">
		<span class="font-medium text-foreground">{spec.label}</span>
		<input
			type="text"
			name={path}
			value={typeof value === 'string' ? value : ''}
			pattern={spec.type === 'slug' ? '[a-z0-9]+(-[a-z0-9]+)*' : undefined}
			placeholder={spec.type === 'slug' ? 'lowercase-words-with-hyphens' : undefined}
			class={inputClass}
		/>
		{#if spec.type === 'text' && spec.hint}
			<span class="text-xs text-muted-foreground">{spec.hint}</span>
		{/if}
	</label>
{:else if spec.type === 'words'}
	<label class="grid gap-1 text-sm">
		<span class="font-medium text-foreground">{spec.label}</span>
		<textarea name={path} rows="3" class={inputClass}>{typeof value === 'string' ? value : ''}</textarea>
		{#if spec.hint}
			<span class="text-xs text-muted-foreground">{spec.hint}</span>
		{/if}
	</label>
{:else if spec.type === 'number'}
	<label class="grid gap-1 text-sm">
		<span class="font-medium text-foreground">{spec.label}</span>
		<input
			type="number"
			name={path}
			value={typeof value === 'number' ? value : ''}
			min={spec.min}
			class={inputClass}
		/>
		{#if spec.hint}
			<span class="text-xs text-muted-foreground">{spec.hint}</span>
		{/if}
	</label>
{:else if spec.type === 'select'}
	<label class="grid gap-1 text-sm">
		<span class="font-medium text-foreground">{spec.label}</span>
		<select name={path} class={inputClass}>
			{#each spec.options as option (option)}
				<option value={option} selected={value === option}>{option}</option>
			{/each}
		</select>
	</label>
{:else if spec.type === 'boolean'}
	<label class="flex items-center gap-2 text-sm">
		<input type="checkbox" name={path} checked={value === true} class="size-4 rounded border-input" />
		<span class="font-medium text-foreground">{spec.label}</span>
	</label>
{:else if spec.type === 'media'}
	<div class="grid gap-1 text-sm">
		<label class="grid gap-1">
			<span class="font-medium text-foreground">{spec.label}</span>
			<select name={path} class={inputClass}>
				<option value="">— none —</option>
				{#each media as option (option.id)}
					<option value={option.id} selected={value === option.id}>{option.label}</option>
				{/each}
			</select>
		</label>

		{#if chosen?.url}
			<img
				src={chosen.url}
				alt=""
				loading="lazy"
				class="h-20 w-32 rounded-md border border-border object-cover"
			/>
		{:else if value}
			<p class="text-xs text-destructive">The chosen image is no longer in the library.</p>
		{/if}
	</div>
{:else if spec.type === 'object'}
	<fieldset class="grid gap-3 rounded-md border border-border p-3">
		<legend class="px-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
			{spec.label}
		</legend>
		{#each spec.fields as field (field.name)}
			<FieldControl
				spec={field}
				path={childPath(path, field.name)}
				{values}
				{counts}
				{blockKindState}
				{media}
			/>
		{/each}
	</fieldset>
{:else if spec.type === 'list'}
	<div class="grid gap-2 text-sm">
		<span class="font-medium text-foreground">{spec.label}</span>
		<input type="hidden" name={countName(path)} value={count} />

		{#each Array.from({ length: count }, (_, index) => index) as index (index)}
			<div class="flex items-center gap-2">
				{#if spec.item === 'media'}
					<select name={itemPath(path, index)} class={inputClass}>
						<option value="">— none —</option>
						{#each media as option (option.id)}
							<option value={option.id} selected={readPath(values, itemPath(path, index)) === option.id}>
								{option.label}
							</option>
						{/each}
					</select>
				{:else}
					<input
						type="text"
						name={itemPath(path, index)}
						value={String(readPath(values, itemPath(path, index)) ?? '')}
						class={inputClass}
					/>
				{/if}
			</div>
		{/each}

		<div class="flex gap-2">
			<button
				type="button"
				onclick={() => (counts[path] = count + 1)}
				class="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted"
			>
				Add
			</button>
			<button
				type="button"
				onclick={() => (counts[path] = Math.max(0, count - 1))}
				class="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted"
			>
				Remove last
			</button>
			<span class="text-xs text-muted-foreground">
				{count} item{count === 1 ? '' : 's'}{#if spec.atLeastOne} · at least one is required{/if}
			</span>
		</div>
	</div>
{:else if spec.type === 'rows'}
	<div class="grid gap-3 text-sm">
		<span class="font-medium text-foreground">{spec.label}</span>
		<input type="hidden" name={countName(path)} value={count} />

		{#each Array.from({ length: count }, (_, index) => index) as index (index)}
			<fieldset class="grid gap-2 rounded-md border border-border p-3">
				<legend class="px-1 text-xs text-muted-foreground">#{index + 1}</legend>
				{#each spec.fields as field (field.name)}
					<FieldControl
						spec={field}
						path={childPath(itemPath(path, index), field.name)}
						{values}
						{counts}
						{blockKindState}
						{media}
					/>
				{/each}
			</fieldset>
		{/each}

		<div class="flex flex-wrap items-center gap-2">
			<button
				type="button"
				onclick={() => (counts[path] = count + 1)}
				class="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted"
			>
				Add {spec.label.toLowerCase()}
			</button>
			<button
				type="button"
				onclick={() => (counts[path] = Math.max(0, count - 1))}
				class="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted"
			>
				Remove last
			</button>
			<span class="text-xs text-muted-foreground">
				{count} item{count === 1 ? '' : 's'}{#if spec.atLeastOne} · at least one is required{/if}
			</span>
		</div>
	</div>
{:else}
	<div class="grid gap-3 text-sm">
		<span class="font-medium text-foreground">{spec.label}</span>
		<input type="hidden" name={countName(path)} value={count} />

		{#each Array.from({ length: count }, (_, index) => index) as index (index)}
			{@const blockPath = itemPath(path, index)}
			{@const selected = blockKindState[blockPath] ?? 'p'}
			<fieldset class="grid gap-2 rounded-md border border-border p-3">
				<legend class="px-1 text-xs text-muted-foreground">Block {index + 1}</legend>

				<input type="hidden" name={childPath(blockPath, 'kind')} value={selected} />

				<label class="grid gap-1">
					<span class="text-xs text-muted-foreground">Kind</span>
					<select
						class={inputClass}
						onchange={(event) => {
							blockKindState[blockPath] = event.currentTarget.value;
						}}
					>
						{#each blockSpecs as block (block.kind)}
							<option value={block.kind} selected={selected === block.kind}>{block.label}</option>
						{/each}
					</select>
				</label>

				{#each blockSpec.find((block) => block.kind === selected)?.fields ?? [] as field (field.name)}
					<FieldControl
						spec={field}
						path={childPath(blockPath, field.name)}
						{values}
						{counts}
						{blockKindState}
						{media}
					/>
				{/each}
			</fieldset>
		{/each}

		<div class="flex gap-2">
			<button
				type="button"
				onclick={() => {
					blockKindState[itemPath(path, count)] = 'p';
					counts[path] = count + 1;
				}}
				class="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted"
			>
				Add block
			</button>
			<button
				type="button"
				onclick={() => (counts[path] = Math.max(0, count - 1))}
				class="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted"
			>
				Remove last
			</button>
		</div>
	</div>
{/if}
