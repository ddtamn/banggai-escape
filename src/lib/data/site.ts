/** Global site chrome: brand, navigation, contact details and footer link groups. */

export const site = {
	name: 'Banggai Escape',
	tagline: 'Connecting Curious Travelers with Authentic Island Life.',
	locale: 'en',
	phone: '(62) 813 5491 1647',
	phoneHref: 'tel:+6281354911647',
	email: 'hello@banggaiescape.com',
	address: ['Jl. Setia Budi, Luwuk Banggai', 'Central Sulawesi, Indonesia'],
	reviewCount: 200
};

export type NavItem = { label: string; href: string };

export const nav: NavItem[] = [
	{ label: 'Home', href: '/' },
	{ label: 'Packages', href: '/packages' },
	{ label: 'Destinations', href: '/destinations' },
	{ label: 'About us', href: '/about' },
	{ label: 'Blog', href: '/blog' },
	{ label: 'Contact', href: '/contact' }
];

export type Language = { code: string; label: string; flag: string };

/** Language options for the header switcher. UI only — no translation is wired up yet. */
export const languages: Language[] = [
	{ code: 'EN', label: 'English', flag: 'https://flagcdn.com/gb.svg' },
	{ code: 'ID', label: 'Bahasa Indonesia', flag: 'https://flagcdn.com/id.svg' }
];

export const socials: { label: string; icon: string; href: string }[] = [
	{ label: 'Instagram', icon: 'fa-brands fa-instagram', href: '#' },
	{ label: 'TikTok', icon: 'fa-brands fa-tiktok', href: '#' },
	{ label: 'Facebook', icon: 'fa-brands fa-facebook-f', href: '#' },
	{ label: 'YouTube', icon: 'fa-brands fa-youtube', href: '#' }
];

/** Destination shortcut list shown in the footer. */
export const footerDestinations: NavItem[] = [
	{ label: 'Paisupok Lake', href: '/destinations/paisu-pok-lake' },
	{ label: 'Paisu Batango', href: '/destinations/paisu-batango' },
	{ label: 'Poganda Beach', href: '/destinations/poganda-beach' },
	{ label: 'Mokokawa Waterfall', href: '/destinations/mokokawa-waterfall' },
	{ label: 'Piala Waterfall', href: '/destinations/piala-waterfall' },
	{ label: 'Pulau Dua', href: '/destinations/pulau-dua' },
	{ label: 'Weer Molino', href: '/destinations/weer-molino' }
];
