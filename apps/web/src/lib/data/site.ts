/** Global site chrome: brand, navigation, contact details and footer link groups. */

import type {
	Language as LanguageModel,
	NavItem as NavItemModel,
	SiteProfile,
	Social,
} from '@banggai/content-model';

export type NavItem = NavItemModel;

export type Language = LanguageModel;

export const site: SiteProfile = {
	name: 'Banggai Escape',
	tagline: 'Connecting Curious Travelers with Authentic Island Life.',
	locale: 'en',
	phone: '(62) 813 5491 1647',
	phoneHref: 'tel:+6281354911647',
	email: 'hello@banggaiescape.com',
	address: ['Jl. Setia Budi, Luwuk Banggai', 'Central Sulawesi, Indonesia'],
	reviewCount: 200,
};

export const nav: NavItem[] = [
	{ label: 'Home', href: '/' },
	{ label: 'Packages', href: '/packages' },
	{ label: 'Destinations', href: '/destinations' },
	{ label: 'About us', href: '/about' },
	{ label: 'Blog', href: '/blog' },
	{ label: 'Contact', href: '/contact' },
];

/** Language options for the header switcher. UI only — no translation is wired up yet. */
export const languages: Language[] = [
	{ code: 'EN', label: 'English', flag: 'https://flagcdn.com/us.svg' },
	{ code: 'ID', label: 'Bahasa Indonesia', flag: 'https://flagcdn.com/id.svg' },
];

export const socials: Social[] = [
	{ label: 'Instagram', icon: 'fa-brands fa-instagram', href: '#' },
	{ label: 'TikTok', icon: 'fa-brands fa-tiktok', href: '#' },
	{ label: 'Facebook', icon: 'fa-brands fa-facebook-f', href: '#' },
	{ label: 'YouTube', icon: 'fa-brands fa-youtube', href: '#' },
];

/** Destination shortcut list shown in the footer. */
export const footerDestinations: NavItem[] = [
	{ label: 'Paisupok Lake', href: '/destinations/paisu-pok-lake' },
	{ label: 'Paisu Batango', href: '/destinations/paisu-batango' },
	{ label: 'Poganda Beach', href: '/destinations/poganda-beach' },
	{ label: 'Mokokawa Waterfall', href: '/destinations/mokokawa-waterfall' },
	{ label: 'Piala Waterfall', href: '/destinations/piala-waterfall' },
	{ label: 'Pulau Dua', href: '/destinations/pulau-dua' },
	{ label: 'Weer Molino', href: '/destinations/weer-molino' },
];
