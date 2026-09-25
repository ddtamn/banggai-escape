/**
 * The admin's sections, declared once.
 *
 * The sidebar renders this list and the page header titles itself from it. Two lists — one
 * of links, one of names — is how a header ends up reading "Documents" while the sidebar
 * says something else, so there is only one.
 *
 * `resolve` is given **group-qualified** route ids (`/(dashboard)/…`): that is what this
 * Kit version keys its generated `RouteParams` by, and a bare `/content/[kind]` loses the
 * params argument without it.
 */

import FileTextIcon from '@lucide/svelte/icons/file-text';
import ImageIcon from '@lucide/svelte/icons/image';
import LayoutDashboardIcon from '@lucide/svelte/icons/layout-dashboard';
import MapPinIcon from '@lucide/svelte/icons/map-pin';
import PackageIcon from '@lucide/svelte/icons/package';
import SettingsIcon from '@lucide/svelte/icons/settings';
import type { Component } from 'svelte';
import { resolve } from '$app/paths';

export type Section = { readonly title: string; readonly url: string; readonly icon: Component };

export const sections: readonly Section[] = [
	{ title: 'Overview', url: resolve('/dashboard'), icon: LayoutDashboardIcon },
	{
		title: 'Packages',
		url: resolve('/(dashboard)/content/[kind]', { kind: 'package' }),
		icon: PackageIcon,
	},
	{
		title: 'Destinations',
		url: resolve('/(dashboard)/content/[kind]', { kind: 'destination' }),
		icon: MapPinIcon,
	},
	{
		title: 'Articles',
		url: resolve('/(dashboard)/content/[kind]', { kind: 'article' }),
		icon: FileTextIcon,
	},
	{ title: 'Media', url: resolve('/media'), icon: ImageIcon },
	{ title: 'Settings', url: resolve('/settings'), icon: SettingsIcon },
];

/**
 * The section a path belongs to, matched by longest prefix so `/content/package/x` reports
 * Packages rather than nothing, and two sections can never both claim a page.
 */
export function sectionFor(pathname: string): Section | undefined {
	return sections
		.filter((section) => pathname === section.url || pathname.startsWith(`${section.url}/`))
		.sort((a, b) => b.url.length - a.url.length)[0];
}

/** The header title for a path. */
export function sectionTitle(pathname: string): string {
	return sectionFor(pathname)?.title ?? 'Banggai Escape Admin';
}
