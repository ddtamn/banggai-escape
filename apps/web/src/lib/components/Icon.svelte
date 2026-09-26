<script lang="ts">
import { dev } from '$app/environment';
import { icons } from '$lib/icons';

type Props = {
	/**
	 * A Font Awesome class pair, exactly as the database stores it: `fa-brands fa-instagram`.
	 *
	 * The name is not a new convention — it is the same string the admin has always stored,
	 * so nothing in the database changes. What changes is that the glyph is inlined SVG from
	 * `$lib/icons` rather than a codepoint in a 154 KB webfont.
	 *
	 * It is a prop named `icon` rather than `class` so that `class` stays free for Tailwind,
	 * which is what a caller expects of any Svelte component.
	 */
	icon: string;
	/**
	 * Rendered width and height in pixels.
	 *
	 * This replaces the `text-[Npx]` classes the font-based icons used, where a font-size set
	 * the glyph's size as a side effect of the font. An SVG has no font-size, so the size is
	 * stated outright. Icons are sized, not read, so this may sit below the type floor.
	 */
	size?: number;
	/** Accessible name. Omit for a decorative icon, which is then hidden from assistive tech. */
	label?: string;
	class?: string;
};

let { icon, size = 14, label, class: className = '' }: Props = $props();

/** `fa-brands fa-instagram` -> `fa-instagram`. The style prefix carries no information. */
const STYLES = ['fa-solid', 'fa-regular', 'fa-brands'];

const name = $derived(
	icon
		.trim()
		.split(/\s+/)
		.find((part) => part.startsWith('fa-') && !STYLES.includes(part)),
);

const glyph = $derived(name ? icons[name] : undefined);

/**
 * A name with no glyph is a real state, not a hypothetical one: the `icon` fields are free
 * strings an editor fills in, and a newly added social profile can name an icon the build
 * has never seen.
 *
 * Development says so loudly, because someone is looking at the page and can fix it.
 * Production draws a neutral placeholder and says nothing on screen — but never an empty
 * box, because an icon that silently disappears is the exact failure mode this component
 * exists to prevent.
 */
const missing = $derived(Boolean(name) && !glyph);

$effect(() => {
	if (!dev || !missing || !name) return;

	console.warn(
		`[icons] "${name}" is not in src/lib/icons.ts, so it cannot render. Add it in the ` +
			'admin, then run: pnpm --filter @banggai/web exec tsx scripts/generate-icons.ts',
	);
});
</script>

{#if glyph}
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox={glyph.viewBox}
		width={size}
		height={size}
		fill="currentColor"
		class={className}
		role={label ? 'img' : undefined}
		aria-label={label}
		aria-hidden={label ? undefined : 'true'}
	>
		<!--
			A plain attribute, not `{@html}`. The path data is generated from the Font Awesome
			package at build time, but interpolating it as a string attribute keeps the site's
			"no `{@html}` anywhere" property true — which is what lets the CSP ship without
			`script-src 'unsafe-inline'`.
		-->
		<path d={glyph.path} />
	</svg>
{:else if missing && dev}
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 16 16"
		width={size}
		height={size}
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		aria-hidden="true"
		class="text-alert {className}"
	>
		<rect x="1" y="1" width="14" height="14" rx="2" />
		<path d="M5 5l6 6M11 5l-6 6" />
	</svg>
{:else}
	<span
		class={className}
		style="display:inline-block;width:{size}px;height:{size}px"
		role={label ? 'img' : undefined}
		aria-label={label}
		aria-hidden={label ? undefined : 'true'}
	></span>
{/if}
