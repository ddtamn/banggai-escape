/**
 * Shared editorial content: value pillars, testimonials, FAQs and contact
 * channels. Sourced from the Home, About Us and Contact Stitch designs.
 */

import { img, media } from './media';
import { site } from './site';

/** Single CTA banner background shared by every page for a consistent look. */
export const ctaBackground = img(media.contact['turquoise-ocean-water-background'], 2000);

export type Feature = { icon: string; title: string; text: string };

/** "The Reason Travelers Choose Banggai Escape" — reused on Home and About Us. */
export const features: Feature[] = [
	{
		icon: 'fa-regular fa-compass',
		title: 'Local Expertise',
		text: 'Deeply rooted in Banggai, our local team brings intimate destination knowledge and authentic insights to every journey.'
	},
	{
		icon: 'fa-solid fa-sliders',
		title: 'Bespoke Itineraries',
		text: 'Flexible travel packages meticulously customized to suit your personal preferences and travel style.'
	},
	{
		icon: 'fa-regular fa-user',
		title: 'Seasoned Professionals',
		text: 'Warm, professional, and highly experienced guides dedicated to elevating your travel experience.'
	},
	{
		icon: 'fa-regular fa-shield',
		title: 'Uncompromised Safety & Comfort',
		text: 'Impeccably organized trips crafted to guarantee total comfort, ease, and complete peace of mind.'
	},
	{
		icon: 'fa-solid fa-headset',
		title: 'Dedicated Assistance',
		text: 'Attentive end-to-end support, offering guidance before, during, and long after your trip.'
	},
	{
		icon: 'fa-solid fa-heart',
		title: 'Authentic Experiences',
		text: "Thoughtfully curated moments that connect you meaningfully with Banggai's untouched nature and culture."
	}
];

export type Testimonial = {
	quote: string;
	name: string;
	country: string;
	/** Asset id used to build the avatar URL with `img()`. */
	avatar: string;
};

export const testimonials: Testimonial[] = [
	{
		quote:
			'Banggai Escape crafted an itinerary that perfectly matched our pace. Their local insights brought us to hidden spots we would never have found on our own. Absolutely flawless execution!',
		name: 'Elena Rostova',
		country: 'Switzerland',
		avatar: media.home['elena-rostova']
	},
	{
		quote:
			"The trip was an unforgettable experience! Banggai Escape tailored every detail to our interests, and their guide's enthusiasm made all the difference.",
		name: 'Marcus Tan',
		country: 'Japan',
		avatar: media.home['marcus-tan']
	},
	{
		quote:
			"From beginning to end, our journey was seamless. Banggai Escape's attention to detail and ability to adapt to our needs was remarkable. I can't recommend them enough!",
		name: 'Sofia Almeida',
		country: 'Portugal',
		avatar: media.home['sofia-almeida']
	},
	{
		quote:
			'From seamless island transfers to our amazing guide who felt like family, every moment was effortless. Safety and comfort were clearly top priorities throughout our trip.',
		name: 'Marcus & Sarah Chen',
		country: 'Singapore',
		avatar: media.home['marcus-and-sarah-chen']
	},
	{
		quote:
			'The team answered every question before we even boarded our flight and checked in on us daily. You are in the absolute best hands with Banggai Escape.',
		name: 'Hannah & David Miller',
		country: 'United Kingdom',
		avatar: media.home['hannah-and-david-miller']
	}
];

export type FaqItem = { question: string; answer: string };

export const faqs: FaqItem[] = [
	{
		question: 'How do I get to Banggai?',
		answer:
			'You can fly to Syukuran Aminuddin Amir Airport (LUW) in Luwuk, Central Sulawesi. From Luwuk, our team will greet you and manage all onward transfers to the islands via scenic ferry or private boat.'
	},
	{
		question: 'Can I fully customize my tour itinerary?',
		answer:
			'Absolutely. Every package is a starting point rather than a fixed script. Tell us your dates, group size and must-see spots and we will rebuild the itinerary around them — extra nights at Paisu Pok, a longer reef day, or a detour into the Peleng highlands.'
	},
	{
		question: 'What is the best time of year to visit Banggai?',
		answer:
			'April to October brings the calmest seas and the clearest water. Late April through early June is our favourite window: the waterfalls still carry good flow and the islands are noticeably quieter than in the peak months.'
	},
	{
		question: 'Are these trips suitable for beginners or non-swimmers?',
		answer:
			'Yes. The snorkeling sites we use are shallow, current-free reef flats, and life jackets are provided on every boat. Non-swimmers can stay aboard or wade in from the beach while the rest of the group explores.'
	},
	{
		question: 'What is typically included in a Banggai Escape package?',
		answer:
			'Airport and harbour transfers, all land and boat transport, accommodation, scheduled meals, entrance and conservation fees, snorkeling gear, and a dedicated local guide. International and domestic flights are not included.'
	},
	{
		question: 'How do I secure a booking with Banggai Escape?',
		answer:
			'Send us a message through the contact form or WhatsApp. We confirm availability, hold your dates with a deposit, and share the full day-by-day itinerary before the balance is due.'
	}
];

export type Stat = { value: string; label: string };

export const stats: Stat[] = [
	{ value: '5+', label: 'Years of dedicated local service across the archipelago.' },
	{ value: '2,500+', label: 'Travelers who have discovered Banggai with us.' },
	{ value: '15+', label: 'Exclusive destinations brought into custom itineraries.' },
	{ value: '100%', label: 'Born, raised, and operated by Banggai native guides.' }
];

export const visionMission: Feature[] = [
	{
		icon: 'fa-regular fa-compass',
		title: 'Our Vision',
		text: 'To be the premier travel companion in Central Sulawesi, celebrated for authentic hospitality, sustainable tourism, and unforgettable island expeditions.'
	},
	{
		icon: 'fa-solid fa-layer-group',
		title: 'Our Mission',
		text: "To deliver safe, seamless, and deeply enriching travel experiences while preserving Banggai's natural ecosystems and empowering local coastal communities."
	}
];

export type ContactChannel = {
	icon: string;
	title: string;
	text: string;
	value: string;
	/** Second line for multi-line values such as the office address. */
	extra?: string;
	href: string;
};

export const contactChannels: ContactChannel[] = [
	{
		icon: 'fa-regular fa-envelope',
		title: 'Email Support',
		text: 'Our team responds within 2–4 hours during operational hours.',
		value: site.email,
		href: `mailto:${site.email}`
	},
	{
		icon: 'fa-solid fa-phone',
		title: 'Call & WhatsApp',
		text: 'Mon – Sun, 08:00 – 20:00 WITA (GMT+8).',
		value: site.phone,
		href: site.phoneHref
	},
	{
		icon: 'fa-solid fa-location-dot',
		title: 'Visit Our Office',
		text: 'Welcoming travelers & guests by appointment.',
		value: site.address[0],
		extra: site.address[1],
		href: '/contact'
	}
];

/** Article categories used by the blog filter pills. */
export const blogCategories: string[] = [
	'Latest',
	'Destination Guides',
	'Travel Tips',
	'Stories & Experiences'
];
