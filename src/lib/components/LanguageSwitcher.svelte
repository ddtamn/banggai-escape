<script lang="ts">
	import { languages, type Language } from '$lib/data/site';

	type Props = {
		/** Stretch the control to the container width (used in the mobile drawer). */
		full?: boolean;
	};

	let { full = false }: Props = $props();

	let open = $state(false);
	let current = $state<Language>(languages[0]);

	function select(language: Language) {
		current = language;
		open = false;
	}

	function handleWindowClick(event: MouseEvent) {
		if (!open) return;
		const target = event.target as HTMLElement | null;
		if (!target?.closest('[data-language-switcher]')) open = false;
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') open = false;
	}
</script>

<svelte:window onclick={handleWindowClick} onkeydown={handleKeydown} />

<div class="relative" data-language-switcher>
	<button
		type="button"
		class="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-stone-100 transition hover:bg-white/10 {full
			? 'w-full justify-between'
			: ''}"
		aria-haspopup="listbox"
		aria-expanded={open}
		aria-label="Change language"
		onclick={() => (open = !open)}
	>
		<span class="flex items-center gap-2">
			<img
				class="h-3 w-4 rounded-[2px] object-cover"
				src={current.flag}
				alt=""
				width="16"
				height="12"
			/>
			<span>{current.code}</span>
		</span>
		<i
			class="fa-solid fa-chevron-down text-[10px] text-stone-400 transition-transform {open
				? 'rotate-180'
				: ''}"
		></i>
	</button>

	{#if open}
		<ul
			class="absolute z-50 w-48 overflow-hidden rounded-xl border border-white/10 bg-forest-deep p-1.5 shadow-2xl {full
				? 'inset-x-0 bottom-full mb-2'
				: 'right-0 mt-2'}"
			role="listbox"
		>
			{#each languages as language (language.code)}
				<li>
					<button
						type="button"
						role="option"
						aria-selected={language.code === current.code}
						class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold transition {language.code ===
						current.code
							? 'bg-white/10 text-gold'
							: 'text-stone-200 hover:bg-white/5 hover:text-white'}"
						onclick={() => select(language)}
					>
						<img
							class="h-3.5 w-5 rounded-[3px] object-cover"
							src={language.flag}
							alt=""
							width="20"
							height="15"
						/>
						<span class="flex flex-col">
							<span>{language.label}</span>
							<span class="text-[10px] font-medium text-stone-400">{language.code}</span>
						</span>
						{#if language.code === current.code}
							<i class="fa-solid fa-check ml-auto text-[10px] text-gold"></i>
						{/if}
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>
