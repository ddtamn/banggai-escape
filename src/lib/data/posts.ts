import { img, media } from './media';

export type Block =
	| { kind: 'p'; text: string }
	| { kind: 'h'; id: string; text: string }
	| { kind: 'steps'; items: { title: string; text: string }[] }
	| { kind: 'callout'; title: string; text: string };

export type Post = {
	slug: string;
	category: string;
	tags: string[];
	title: string;
	excerpt: string;
	image: string;
	date: string;
	updated: string;
	readTime: string;
	author: string;
	authorRole: string;
	hero: string;
	body: Block[];
};

export const author = {
	name: 'Banggai Escape Team',
	role: 'Local Guide',
	bio: 'We are passionate island explorers and certified local guides dedicated to showing curious travelers the breathtaking beauty, culture, and marine wonders of Banggai Kepulauan.'
};

export const posts: Post[] = [
	{
		slug: 'how-to-get-to-banggai-islands',
		category: 'Travel Tips',
		tags: ['Banggai', 'Travel Guide', 'Sulawesi', 'Island Hopping', 'Paisu Pok'],
		title: 'How to Get to Banggai Islands',
		excerpt:
			'Navigate your journey effortlessly with our comprehensive guide covering flight routes, airport transfers, and local ferry schedules to reach the heart of the archipelago.',
		image: media.blog['how-to-get-to-banggai-islands'],
		date: 'March 12, 2026',
		updated: 'Updated 2 hours ago',
		readTime: '5 min read',
		author: author.name,
		authorRole: author.role,
		hero: media['blog-details-how-to-get-to-banggai-islands'][
			'lush-cascades-and-untouched-karst-valleys-across-banggai-kepulauan-central-sulawesi'
		],
		body: [
			{
				kind: 'p',
				text: 'Reaching the Banggai Archipelago in Central Sulawesi is smoother than you might imagine. While it feels like an untouched, off-the-beaten-path paradise, getting here is straightforward once you know the best routes and local transport options. Here is a step-by-step guide to planning your journey to the Banggai Islands.'
			},
			{
				kind: 'steps',
				items: [
					{
						title: 'Step 1: Fly to Luwuk (via Makassar or Manado)',
						text: 'Your main gateway to the archipelago is Syukuran Aminuddin Amir Airport (LUW) in Luwuk, Central Sulawesi. From Jakarta, Bali, or Surabaya, book a domestic flight with a transit in Makassar (UPG) or Manado (MDC). Daily flights operate from Makassar to Luwuk with a flight time of approximately 1 hour 15 minutes, offered by Batik Air and Wings Air.'
					},
					{
						title: 'Step 2: Sea Crossing to Salakan',
						text: 'Upon landing at Luwuk Airport, head to the local harbor (Pelabuhan Rakyat or Pelabuhan Lalong) to catch your water transport across to Peling Island (Salakan Town) or neighboring islands.'
					},
					{
						title: 'Step 3: Island Routes & Local Transport',
						text: 'Once you arrive in Salakan, the central hub of Banggai Kepulauan, you are ready to venture out to iconic spots like Lake Paisu Pok, Luk Panenteng, and Lengkappe Island. Private car rental is the most comfortable way to traverse Peling Island to reach Danau Paisu Pok (approx. 2 to 2.5 hours drive from Salakan), while local motorboats (ketinting) and speedboats are essential for island-hopping, secluded lagoon exploration, and snorkeling trips across outer islets.'
					}
				]
			},
			{ kind: 'h', id: 'essential-tips', text: 'Essential Tips Before You Go' },
			{ kind: 'p', text: 'Two things trip up first-time visitors more than anything else: cash and connectivity.' },
			{
				kind: 'steps',
				items: [
					{
						title: 'Bring Cash',
						text: 'ATMs are strictly located in Luwuk and Salakan. Remote spots operate entirely on cash.'
					},
					{
						title: 'Travel in Season',
						text: 'April to October offers calm waters and ideal crystal-clear sea visibility.'
					},
					{
						title: 'Expect Signal Gaps',
						text: 'Cell service is reliable in Luwuk and Salakan, but signal drops on remote beaches and outer islets.'
					}
				]
			},
			{ kind: 'h', id: 'effortless-route', text: 'The Effortless Route: Let Local Experts Handle It' },
			{
				kind: 'p',
				text: 'Coordinating boat timings, private land transport, and island transfers on your own can take considerable time. With Banggai Escape, every detail, from Luwuk Airport pickup and express boat passes to private ground vehicles, boutique stays, and guided boat charters, is seamlessly organized for you.'
			}
		]
	},
	{
		slug: '10-must-visit-destinations-in-banggai',
		category: 'Destination Guide',
		tags: ['Banggai', 'Destination Guide', 'Island Hopping'],
		title: '10 Must-Visit Destinations in Banggai',
		excerpt:
			'Uncover the breathtaking beauty of Banggai, from crystal-clear jellyfish lakes and dramatic karst formations to untouched turquoise lagoons and pristine white-sand beaches.',
		image: media.blog['10-must-visit-destinations-in-banggai'],
		date: 'March 4, 2026',
		updated: 'Updated 1 week ago',
		readTime: '7 min read',
		author: author.name,
		authorRole: author.role,
		hero: media.home['destinations-in-banggai'],
		body: [
			{
				kind: 'p',
				text: 'Banggal Kepulauan rewards travelers who are willing to trade a little logistics for a lot of emptiness. These are the ten places we send people to most often, in rough order of how far you have to travel to reach them.'
			},
			{ kind: 'h', id: 'the-lakes', text: 'The Lakes' },
			{
				kind: 'p',
				text: 'Danau Paisu Pok is the headline: a glass-clear lake ringed by rainforest, best seen by canoe in the first hour of daylight. Its quieter sibling Paisu Batango hides in the same forest, with a fraction of the visitors.'
			},
			{ kind: 'h', id: 'the-waterfalls', text: 'The Waterfalls' },
			{
				kind: 'p',
				text: 'Piala and Mokokawa both drop into swimmable emerald pools, and both are short walks from the road. Plan them as afternoon stops rather than full days.'
			},
			{ kind: 'h', id: 'the-islands', text: 'The Islands and Reefs' },
			{
				kind: 'p',
				text: 'Pulau Dua and Weer Molino are the two anchorages that most boats will build a day around. The reef flats are shallow enough for beginners, with drop-offs for anyone who wants deeper water.'
			},
			{
				kind: 'callout',
				title: 'Plan around the tide, not the clock',
				text: 'Several of the best sandbars and shallow reef sites only exist at particular tides. We schedule boat days around slack water rather than fixed departure times, which is why two identical itineraries can feel completely different.'
			},
			{ kind: 'h', id: 'the-highlands', text: 'The Highlands' },
			{
				kind: 'p',
				text: 'Finish inland. The Peleng highlands offer ridgeline views back across the whole archipelago, coffee and clove groves, and villages that see very few travellers.'
			}
		]
	},
	{
		slug: 'best-time-to-visit-banggai-islands',
		category: 'Stories & Experiences',
		tags: ['Seasonal Guide', 'Travel Insights'],
		title: 'The Best Time to Visit Banggai Islands',
		excerpt:
			"Plan your ultimate tropical getaway by understanding Banggai's weather patterns, sea conditions, and ideal months for snorkeling, diving, and island exploration.",
		image: media.blog['the-best-time-to-visit-banggai-islands'],
		date: 'February 19, 2026',
		updated: 'Updated 2 weeks ago',
		readTime: '4 min read',
		author: author.name,
		authorRole: author.role,
		hero: media.home['best-time-to-visit'],
		body: [
			{
				kind: 'p',
				text: 'Banggai is a year-round destination, but the experience changes significantly between the dry and wet seasons. Here is how each window actually feels on the water.'
			},
			{ kind: 'h', id: 'dry-season', text: 'April to October: The Dry Season' },
			{
				kind: 'p',
				text: 'This is the window most people should aim for. Winds are lighter, the water is at its clearest, and the crossing to the outer islands is rarely rough. Visibility for snorkeling and diving is at its best.'
			},
			{ kind: 'h', id: 'shoulder', text: 'November and March: The Shoulder Months' },
			{
				kind: 'p',
				text: 'Weather is changeable but the archipelago is noticeably quieter, which matters at Paisu Pok. Expect a few short afternoon showers and be flexible on boat days.'
			},
			{ kind: 'h', id: 'wet-season', text: 'December to February: The Wet Season' },
			{
				kind: 'p',
				text: 'The rainforest is at its greenest and the waterfalls are at full flow, but sea crossings can be uncomfortable and some outer-island trips are not run at all. If you come for the lakes and the highlands rather than the reef, it is still a rewarding window.'
			},
			{
				kind: 'callout',
				title: 'Our recommendation',
				text: 'Late April through early June gives you the clearest water before the busiest period, and the waterfalls still carry enough flow to be worth the walk.'
			}
		]
	}
];

export const getPost = (slug: string): Post | undefined =>
	posts.find((post) => post.slug === slug);

export const relatedPosts = (slug: string, count = 3): Post[] =>
	posts.filter((post) => post.slug !== slug).slice(0, count);

export const postImage = (post: Post, width = 900): string => img(post.image, width);

/** Table of contents derived from the heading blocks in a post body. */
export const tableOfContents = (post: Post): { id: string; text: string }[] =>
	post.body.flatMap((block) => (block.kind === 'h' ? [{ id: block.id, text: block.text }] : []));
