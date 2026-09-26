<script lang="ts">
import type { Language, NavItem, SiteProfile } from '@banggai/content-model';
import { page } from '$app/state';
import Icon from '$lib/components/Icon.svelte';
import LanguageSwitcher from '$lib/components/LanguageSwitcher.svelte';

type Props = {
	site: SiteProfile;
	nav: NavItem[];
	languages: Language[];
};

let { site, nav, languages }: Props = $props();

let open = $state(false);

const isActive = (href: string) =>
	href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href);

function handleKeydown(event: KeyboardEvent) {
	if (event.key === 'Escape') open = false;
}

// Lock body scroll while the mobile drawer is open.
$effect(() => {
	document.body.style.overflow = open ? 'hidden' : '';
	return () => {
		document.body.style.overflow = '';
	};
});
</script>

<svelte:window onkeydown={handleKeydown} />

<header
	class="sticky top-0 z-50 border-b border-forest-line/40 bg-forest-deep text-white shadow-sm"
>
	<div class="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
		<a
			class="group flex items-center gap-3"
			href="/"
			aria-label="{site.name} home"
		>
			<img
				class="size-12"
				src="/logomark.png"
				alt="{site.name} logo"
				width="48"
				height="48"
			/>
		</a>

		<nav class="hidden items-center space-x-8 text-sm font-medium lg:flex">
			{#each nav as item (item.href)}
				<a
					href={item.href}
					aria-current={isActive(item.href) ? "page" : undefined}
					class="transition-colors duration-200 {isActive(item.href)
						? 'text-gold'
						: 'text-stone-300 hover:text-white'}"
				>
					{item.label}
				</a>
			{/each}
		</nav>

		<div class="flex items-center space-x-2 sm:space-x-5">
			<LanguageSwitcher {languages} />

			<a class="btn-gold hidden lg:inline-flex" href="/contact" data-track="contact_click"
				>Contact us</a
			>

			<button
				type="button"
				class="rounded-lg p-2 text-white transition hover:bg-white/10 lg:hidden"
				aria-label="Toggle menu"
				aria-expanded={open}
				onclick={() => (open = !open)}
			>
				<Icon icon="fa-solid fa-bars" size={18} />
			</button>
		</div>
	</div>
</header>

{#if open}
	<div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm">
		<button
			type="button"
			class="absolute inset-0 h-full w-full cursor-default"
			aria-label="Close menu"
			onclick={() => (open = false)}
		></button>

		<div
			class="relative flex h-full w-full flex-col justify-between overflow-y-auto bg-forest-deep px-6 py-6 text-white shadow-2xl"
		>
			<div class="space-y-8">
				<div
					class="flex items-center justify-between border-b border-forest-line/60 pb-5"
				>
					<div class="flex items-center gap-3">
						<img
							class="size-11"
							src="/logomark.png"
							alt="{site.name} logo"
							width="44"
							height="44"
						/>
					</div>
					<button
						type="button"
						class="rounded-lg p-2 text-stone-300 transition hover:bg-white/10 hover:text-white"
						aria-label="Close menu"
						onclick={() => (open = false)}
					>
						<Icon icon="fa-solid fa-xmark" size={18} />
					</button>
				</div>

				<nav
					class="flex flex-col items-center space-y-3 text-center text-2xl font-bold"
				>
					{#each nav as item (item.href)}
						<a
							href={item.href}
							onclick={() => (open = false)}
							class="w-full py-2 transition {isActive(item.href)
								? 'text-gold'
								: 'text-stone-200 hover:text-white'}"
						>
							{item.label}
						</a>
					{/each}
				</nav>
			</div>

			<div class="border-t border-forest-line/60 pt-6">
				<a
					class="btn-gold block w-full text-center"
					href="/contact"
					data-track="contact_click"
					onclick={() => (open = false)}>Contact us</a
				>
			</div>
		</div>
	</div>
{/if}
