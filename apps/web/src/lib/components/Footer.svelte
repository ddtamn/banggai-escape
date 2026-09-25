<script lang="ts">
import type { NavItem, SiteProfile, Social } from '@banggai/content-model';

type Props = {
	site: SiteProfile;
	nav: NavItem[];
	socials: Social[];
	footerDestinations: NavItem[];
};

let { site, nav, socials, footerDestinations }: Props = $props();

const year = 2026;
</script>

<footer class="border-t border-forest-line/40 bg-forest-deep pt-16 pb-8 text-white">
	<div class="mx-auto max-w-7xl px-6">
		<div
			class="grid grid-cols-1 gap-8 border-b border-forest-line/60 pb-12 text-xs sm:grid-cols-2 lg:grid-cols-12 lg:gap-10"
		>
			<div class="space-y-4 sm:col-span-2 lg:col-span-5">
				<img
					class="h-14 w-auto"
					src="/combination-mark.png"
					alt="{site.name} logo"
					width="123"
					height="56"
				/>
				<p class="max-w-xs text-stone-300">{site.tagline}</p>
				<div class="flex items-center space-x-3 pt-2">
					{#each socials as social (social.label)}
						<a
							href={social.href}
							aria-label={social.label}
							class="flex size-8 items-center justify-center rounded-full border border-stone-600 text-stone-300 transition hover:border-white hover:text-white"
						>
							<i class="{social.icon} text-xs"></i>
						</a>
					{/each}
				</div>
			</div>

			<div class="space-y-2.5 sm:col-span-1 lg:col-span-3">
				<h4 class="mb-3 text-xs font-bold tracking-wider text-stone-400 uppercase">
					Destinations
				</h4>
				<ul class="space-y-2 text-stone-300">
					{#each footerDestinations as destination (destination.href)}
						<li>
							<a class="transition hover:text-gold" href={destination.href}>{destination.label}</a>
						</li>
					{/each}
				</ul>
			</div>

			<div class="space-y-2.5 sm:col-span-1 lg:col-span-2">
				<h4 class="mb-3 text-xs font-bold tracking-wider text-stone-400 uppercase">Menu</h4>
				<ul class="space-y-2 text-stone-300">
					{#each nav as item (item.href)}
						<li><a class="transition hover:text-gold" href={item.href}>{item.label}</a></li>
					{/each}
				</ul>
			</div>

			<div class="space-y-3 sm:col-span-2 lg:col-span-2">
				<h4 class="mb-3 text-xs font-bold tracking-wider text-stone-400 uppercase">
					Contact us
				</h4>
				<p class="flex items-center gap-2 text-stone-300">
					<i class="fa-solid fa-phone text-xs text-gold"></i>
					<a class="transition hover:text-gold" href={site.phoneHref} data-track="contact_click"
						>{site.phone}</a
					>
				</p>
				<p class="flex items-center gap-2 text-stone-300">
					<i class="fa-regular fa-envelope text-xs text-gold"></i>
					<a class="transition hover:text-gold" href="mailto:{site.email}" data-track="contact_click"
						>{site.email}</a
					>
				</p>
			</div>
		</div>

		<div class="pt-8 text-center text-[11px] text-stone-400">
			&copy; {year} {site.name}. All rights reserved
		</div>
	</div>
</footer>
