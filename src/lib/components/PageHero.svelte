<script lang="ts">
	type Crumb = { label: string; href?: string };

	type Props = {
		title: string;
		subtitle?: string;
		image: string;
		crumbs?: Crumb[];
		/** Extra classes controlling the band's height. */
		height?: string;
		align?: 'center' | 'left';
	};

	let {
		title,
		subtitle,
		image,
		crumbs = [],
		height = 'py-24 md:py-32',
		align = 'center'
	}: Props = $props();

	const style = $derived(
		`background-image: linear-gradient(rgba(12, 37, 28, 0.45), rgba(12, 37, 28, 0.55)), url('${image}'); background-size: cover; background-position: center;`
	);
</script>

<section
	class="relative flex items-center px-4 text-white {height} {align === 'center'
		? 'justify-center text-center'
		: ''}"
	{style}
>
	<div class="relative z-10 {align === 'center' ? 'mx-auto max-w-3xl' : 'mx-auto w-full max-w-7xl'}">
		{#if crumbs.length}
			<nav class="mb-4 flex flex-wrap items-center gap-2 text-xs text-stone-300" aria-label="Breadcrumb">
				{#each crumbs as crumb, index (crumb.label)}
					{#if index > 0}<span aria-hidden="true">/</span>{/if}
					{#if crumb.href}
						<a class="transition hover:text-gold" href={crumb.href}>{crumb.label}</a>
					{:else}
						<span class="text-white">{crumb.label}</span>
					{/if}
				{/each}
			</nav>
		{/if}

		<h1 class="text-3xl font-extrabold tracking-tight drop-shadow-md sm:text-4xl md:text-5xl lg:text-6xl">
			{title}
		</h1>

		{#if subtitle}
			<p class="mx-auto mt-4 max-w-2xl text-sm leading-relaxed font-normal text-stone-200 sm:text-base">
				{subtitle}
			</p>
		{/if}
	</div>
</section>
