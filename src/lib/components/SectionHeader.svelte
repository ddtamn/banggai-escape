<script lang="ts">
	type Props = {
		title: string;
		subtitle?: string;
		action?: { label: string; href: string };
		dark?: boolean;
	};

	let { title, subtitle, action, dark = false }: Props = $props();

	const split = $derived(title.split('\n'));
</script>

<div class="mb-8 flex flex-col justify-between gap-4 pb-2 sm:mb-10 sm:flex-row sm:items-end">
	<div>
		<h2
			class="text-2xl font-extrabold tracking-tight md:text-3xl {dark
				? 'text-white'
				: 'text-stone-900'}"
		>
			{#each split as line, index (line)}
				{#if index > 0}<br />{/if}{line}
			{/each}
		</h2>
		{#if subtitle}
			<p class="mt-1 text-xs sm:text-sm {dark ? 'text-stone-300' : 'text-stone-500'}">
				{subtitle}
			</p>
		{/if}
	</div>

	{#if action}
		<a
			class="self-start sm:self-auto {dark
				? 'inline-flex items-center justify-center gap-2 rounded-full bg-white/10 px-4 py-2.5 text-xs font-semibold text-white transition-colors duration-200 hover:bg-white/20'
				: 'btn-forest'}"
			href={action.href}
		>
			<span>{action.label}</span>
			<i class="fa-solid fa-arrow-right text-[10px]"></i>
		</a>
	{/if}
</div>
