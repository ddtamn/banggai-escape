import type { Block as ArticleBlock, ArticleSource } from '@banggai/content-model';
import { img, media } from './media';

/**
 * Declared once in `@banggai/content-model`; aliased here so callers are unchanged. The
 * `…Source` variant is the authored one, whose media fields hold CDN ids or URLs rather
 * than `media_assets` ids.
 */
export type Post = ArticleSource;

export type Block = ArticleBlock;

export const author = {
	name: 'Banggai Escape Team',
	role: 'Local Guide',
	bio: 'We are passionate island explorers and certified local guides dedicated to showing curious travelers the breathtaking beauty, culture, and marine wonders of Banggai Kepulauan.',
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
		readTime: '14 min read',
		author: author.name,
		authorRole: author.role,
		hero: media['blog-details-how-to-get-to-banggai-islands'][
			'lush-cascades-and-untouched-karst-valleys-across-banggai-kepulauan-central-sulawesi'
		],
		body: [
			{
				kind: 'p',
				text: 'Reaching the Banggai Archipelago in Central Sulawesi is smoother than you might imagine. While it feels like an untouched, off-the-beaten-path paradise, getting here is straightforward once you know the best routes and local transport options. Here is a step-by-step guide to planning your journey to the Banggai Islands.',
			},
			{
				kind: 'steps',
				items: [
					{
						title: 'Step 1: Fly to Luwuk (via Makassar or Manado)',
						text: 'Your main gateway to the archipelago is Syukuran Aminuddin Amir Airport (LUW) in Luwuk, Central Sulawesi. From Jakarta, Bali, or Surabaya, book a domestic flight with a transit in Makassar (UPG) or Manado (MDC). Daily flights operate from Makassar to Luwuk with a flight time of approximately 1 hour 15 minutes, offered by Batik Air and Wings Air.',
					},
					{
						title: 'Step 2: Sea Crossing to Salakan',
						text: 'Upon landing at Luwuk Airport, head to the local harbor (Pelabuhan Rakyat or Pelabuhan Lalong) to catch your water transport across to Peling Island (Salakan Town) or neighboring islands.',
					},
					{
						title: 'Step 3: Island Routes & Local Transport',
						text: 'Once you arrive in Salakan, the central hub of Banggai Kepulauan, you are ready to venture out to iconic spots like Lake Paisu Pok, Luk Panenteng, and Lengkappe Island. Private car rental is the most comfortable way to traverse Peling Island to reach Danau Paisu Pok (approx. 2 to 2.5 hours drive from Salakan), while local motorboats (ketinting) and speedboats are essential for island-hopping, secluded lagoon exploration, and snorkeling trips across outer islets.',
					},
				],
			},
			{ kind: 'h', id: 'essential-tips', text: 'Essential Tips Before You Go' },
			{
				kind: 'p',
				text: 'Two things trip up first-time visitors more than anything else: cash and connectivity.',
			},
			{
				kind: 'steps',
				items: [
					{
						title: 'Bring Cash',
						text: 'ATMs are strictly located in Luwuk and Salakan. Remote spots operate entirely on cash.',
					},
					{
						title: 'Travel in Season',
						text: 'April to October offers calm waters and ideal crystal-clear sea visibility.',
					},
					{
						title: 'Expect Signal Gaps',
						text: 'Cell service is reliable in Luwuk and Salakan, but signal drops on remote beaches and outer islets.',
					},
				],
			},
			{
				kind: 'h',
				id: 'effortless-route',
				text: 'The Effortless Route: Let Local Experts Handle It',
			},
			{
				kind: 'p',
				text: 'Coordinating boat timings, private land transport, and island transfers on your own can take considerable time. With Banggai Escape, every detail, from Luwuk Airport pickup and express boat passes to private ground vehicles, boutique stays, and guided boat charters, is seamlessly organized for you.',
			},
			{
				kind: 'h',
				id: 'understanding-the-geography',
				text: 'Understanding the Geography',
			},
			{
				kind: 'p',
				text: 'Banggai Kepulauan is a scatter of roughly 120 islands in the Banggai Sea, off the eastern arm of Central Sulawesi. Three of them carry almost all of the travelling: Peling, where the capital Salakan sits and where the lake road begins; Banggai itself, ringed by reef flat and mangrove; and the smaller islets north and east that hold the clearest water. Nearly every itinerary you will be offered is really a question of how those three fit together.',
			},
			{
				kind: 'p',
				text: 'The practical consequence is that distances on a map mean very little. Salakan to Danau Paisu Pok is about two hours by road, most of it spent climbing and dropping through clove and coconut groves. A crossing to an outer islet can take forty minutes or two hours depending on where you launch, how the tide is running, and how heavily the boat is loaded. Plan in days, not hours, and always leave slack in the middle of them.',
			},
			{
				kind: 'p',
				text: 'It also helps to think in two separate transport worlds. The first is the land world of Peling and Banggai: roads, motorcycles, cars, and short hops between villages. The second is the water world, where everything depends on weather, tide and fuel. A single day usually borrows from both, and the water world always gets the final say.',
			},
			{
				kind: 'h',
				id: 'booking-flights-without-tears',
				text: 'Booking Flights Without Tears',
			},
			{
				kind: 'p',
				text: 'Luwuk is the only realistic air gateway for a trip of any length, and everything about your first day in the archipelago flows from one decision: which connection you take to get there. Domestic schedules shift with the seasons, aircraft get swapped, and a forty-minute delay in Makassar can quietly turn into a lost afternoon, so the goal is not the cheapest ticket but the most forgiving one.',
			},
			{
				kind: 'steps',
				items: [
					{
						title: 'Take the earliest connection you can bear',
						text: 'Morning flights out of Jakarta, Bali or Surabaya leave room for a missed connection to be repaired the same day. A late-afternoon arrival into Makassar often means the only onward option is tomorrow, which costs you a night and a hotel.',
					},
					{
						title: 'Protect the transit',
						text: 'Aim for at least ninety minutes between flights, two hours if you are checking bags, and book both legs on a single ticket where possible so the airline owns the rebooking if the first flight runs late.',
					},
					{
						title: 'Give yourself a buffer night',
						text: 'If your onward boat or long drive is fixed, spend the night in Luwuk or Salakan rather than pushing straight through. A buffer night is the single cheapest insurance in the whole trip, and Luwuk has decent hotels, a waterfront for sunset, and warungs worth the detour.',
					},
				],
			},
			{
				kind: 'h',
				id: 'the-sea-crossing-explained',
				text: 'The Sea Crossing, Explained',
			},
			{
				kind: 'p',
				text: "The crossing from Luwuk to Salakan is the part of the journey people worry about most and enjoy most, usually in that order. Public boats run on a loose schedule that firms up the day before, loading at the people's harbour and leaving when the boat is full rather than when a clock says so. Sitting on the roof with the crew and a bag of snacks is a normal, comfortable way to spend the ride.",
			},
			{
				kind: 'p',
				text: 'Fast boats shorten the crossing but run less predictably and are more sensitive to swell, which matters most from December to February. Slow boats are steadier, cheaper, and slower in every sense of the word. Neither option is unpleasant in the dry season; both can be wet and long in the wet one.',
			},
			{
				kind: 'callout',
				title: 'Tide first, clock second',
				text: 'Departure times are a conversation between the tide, the swell and the fuel run, not a timetable. Treat any quoted time as a best case, keep the morning flexible, and you will almost never be disappointed.',
			},
			{
				kind: 'h',
				id: 'getting-around-once-you-land',
				text: 'Getting Around Once You Land',
			},
			{
				kind: 'p',
				text: 'Once you are in Salakan, the archipelago opens up quickly. Roads on Peling are good enough for a comfortable car, rough enough that you will be glad you did not rent one yourself, and beautiful enough that the drive becomes part of the trip rather than a means to it.',
			},
			{
				kind: 'steps',
				items: [
					{
						title: 'Private car with a local driver',
						text: 'The most comfortable way to work the lake circuit and the highlands. A full day covers Paisu Pok, a village lunch, and one or two of the waterfalls without anybody sprinting.',
					},
					{
						title: 'Ketinting and speedboat charters',
						text: 'Essential for island-hopping, sandbars and snorkelling. Ketintings are slow, shaded and sociable; speedboats cover more water and get you to outer reefs before the afternoon chop builds.',
					},
					{
						title: 'Ojek and shared cars for short hops',
						text: 'For a village-to-village run or an early-morning market, a motorbike taxi is faster than waiting for a car and cheap enough to feel like a rounding error.',
					},
				],
			},
			{ kind: 'h', id: 'sample-itineraries', text: 'Sample Itineraries' },
			{
				kind: 'p',
				text: 'The right length for a Banggai trip depends on how much water you want under you. Here are the three shapes we build most often, from a long weekend to a proper expedition.',
			},
			{
				kind: 'steps',
				items: [
					{
						title: 'Three days: the essentials',
						text: 'Arrive in Salakan, drive to Danau Paisu Pok early the next morning for the lake at its clearest, then spend the final day on a single island-hopping run with two snorkelling stops. Tight, but genuinely satisfying if the weather cooperates.',
					},
					{
						title: 'Five days: the comfortable middle',
						text: 'Two lake mornings rather than one, both waterfalls on a single afternoon, a full reef day, and a slow half-day in a village with a coffee stop. This is the length most travellers tell us they wish they had booked.',
					},
					{
						title: 'Seven days and beyond',
						text: 'Add the Peleng highlands for ridgeline views back across the whole archipelago, an overnight on an outer islet, and enough slack to wait out a bad day of wind. Longer trips are less about seeing more places and more about seeing the same places properly.',
					},
				],
			},
			{
				kind: 'h',
				id: 'what-a-trip-actually-costs',
				text: 'What a Trip Actually Costs',
			},
			{
				kind: 'p',
				text: 'Banggai is not an expensive destination, but it is a cash-and-boat one, and the difference between a lean trip and a comfortable one is mostly about how much private transport you buy. Rough budgeting is easier in tiers than in exact figures, because fuel, charters and rooms all move with the season.',
			},
			{
				kind: 'steps',
				items: [
					{
						title: 'Lean',
						text: 'Public boats, shared cars, homestays and simple warung meals. Perfectly enjoyable if you are flexible on timings, and the version of the trip where the archipelago feels most like itself.',
					},
					{
						title: 'Comfortable',
						text: 'Private car days, a chartered ketinting, and guesthouses or small boutique stays with hot water and working air conditioning. This is where most travellers land, and where the logistics stay effortless.',
					},
					{
						title: 'Private',
						text: 'Speedboat days, a guide throughout, and the best room in each village. You are paying for the freedom to change plans on the water, which in this archipelago is worth more than any upgrade on land.',
					},
				],
			},
			{
				kind: 'h',
				id: 'packing-for-humidity-salt-and-rain',
				text: 'Packing for Humidity, Salt and Rain',
			},
			{
				kind: 'p',
				text: 'Banggai is hot, humid and frequently wet, and the packing that works here is the packing that dries fast. Merino and quick-dry synthetics beat cotton, a light long-sleeve layer saves you from the sun on the water, and anything you want to keep dry should live in a dry bag rather than a backpack.',
			},
			{
				kind: 'steps',
				items: [
					{
						title: 'Footwear',
						text: 'Sandals that grip wet limestone for the lake decks, plus one pair of closed shoes for the waterfall walks and the highland trails. Leave the heavy hiking boots at home.',
					},
					{
						title: 'Boat day bag',
						text: 'Dry bag, reef-safe sunscreen, a hat with a chin strap, a rash guard, and a spare dry shirt for the ride home. Wind and salt will find every gap you leave.',
					},
					{
						title: 'Power and spares',
						text: 'Bring a power bank and spare camera battery. Solar is common in villages but slow, and shops on the outer islands are not where you want to discover a dead battery.',
					},
				],
			},
			{
				kind: 'h',
				id: 'staying-well-staying-safe',
				text: 'Staying Well, Staying Safe',
			},
			{
				kind: 'p',
				text: 'The archipelago is a safe, welcoming place, and almost everything that goes wrong for travellers is small and preventable: sunburn, a scraped shin from coral, an upset stomach from a meal that sat out too long, or a mild ear infection from too many hours in warm water. Bottled or filtered water, a basic kit, and a hat solve most of it.',
			},
			{
				kind: 'p',
				text: 'The serious consideration is the medical distance. Clinics in Salakan handle routine problems, but anything complicated means a boat and a flight, so travel with insurance that genuinely covers boat transfers and medical evacuation rather than assuming the cheapest policy will do.',
			},
			{
				kind: 'callout',
				title: 'Buy the boring insurance',
				text: 'Read the policy for the words evacuation, watercraft and remote area. If any of them are missing, the policy is not designed for a place like this.',
			},
			{
				kind: 'h',
				id: 'connectivity-power-and-payments',
				text: 'Connectivity, Power and Payments',
			},
			{
				kind: 'p',
				text: 'Signal is reliable in Luwuk and Salakan and disappears on many remote beaches, which is part of the appeal and occasionally part of the problem. Download offline maps, screenshot your bookings, and tell someone at home the outline of your plan before you lose the bars.',
			},
			{
				kind: 'p',
				text: 'Power is plentiful in town and intermittent in villages, so charge everything while you can. Payments are almost entirely cash once you leave Salakan: cards are rare, transfers are unreliable, and mobile money will not help you on a sandbar. Carry more rupiah than you think you need and keep it in two places.',
			},
			{
				kind: 'h',
				id: 'traveling-lightly',
				text: 'Travelling Lightly in a Living Archipelago',
			},
			{
				kind: 'p',
				text: 'These are working islands, not a resort: people fish, farm seaweed, harvest cloves and go to school on the same shorelines you are photographing. Asking before you photograph a village, buying what you need locally, and treating boats and timings as shared rather than hired will change how the trip treats you back.',
			},
			{
				kind: 'p',
				text: 'On the water, the rules are simple and non-negotiable. Do not stand on coral, do not chase anything for a photograph, take everything you carried in back out with you, and let the local crews decide where it is safe to anchor. Reef that is healthy today is the reason people will still be coming here in twenty years.',
			},
			{
				kind: 'h',
				id: 'questions-we-get-every-week',
				text: 'Questions We Get Every Week',
			},
			{
				kind: 'steps',
				items: [
					{
						title: 'Do I need to speak Indonesian?',
						text: 'No, but a dozen words go a very long way. English is common in Salakan tourism and patchy in villages, and a greeting in Indonesian reliably turns a transaction into a conversation.',
					},
					{
						title: 'Can I do this with children?',
						text: 'Yes, from roughly school age, if you keep days short and stay flexible on boat time. The lakes and shallow reef flats are forgiving, and the archipelago is genuinely easy-going with families.',
					},
					{
						title: 'Is it crowded?',
						text: 'Not by any standard. You may share Paisu Pok with three other groups on a busy weekend, and the outer islets with nobody at all. Its reputation as a hidden paradise is still accurate.',
					},
					{
						title: 'How far ahead should I book?',
						text: 'For June to August and long weekends, three to four months is sensible for boats and the best rooms. In the shoulder months a few weeks is usually plenty, and we can be flexible on short notice.',
					},
				],
			},
			{ kind: 'h', id: 'the-bottom-line', text: 'The Bottom Line' },
			{
				kind: 'p',
				text: 'Getting to Banggai is a two-flight day and a boat ride, which is exactly enough friction to keep it unspoiled and not nearly enough to make it hard. Book the early connection, protect the transit, take the buffer night, carry cash, and let the tide set the schedule. Everything else in the archipelago tends to work itself out beautifully.',
			},
		],
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
				text: 'Banggal Kepulauan rewards travelers who are willing to trade a little logistics for a lot of emptiness. These are the ten places we send people to most often, in rough order of how far you have to travel to reach them.',
			},
			{ kind: 'h', id: 'the-lakes', text: 'The Lakes' },
			{
				kind: 'p',
				text: 'Danau Paisu Pok is the headline: a glass-clear lake ringed by rainforest, best seen by canoe in the first hour of daylight. Its quieter sibling Paisu Batango hides in the same forest, with a fraction of the visitors.',
			},
			{ kind: 'h', id: 'the-waterfalls', text: 'The Waterfalls' },
			{
				kind: 'p',
				text: 'Piala and Mokokawa both drop into swimmable emerald pools, and both are short walks from the road. Plan them as afternoon stops rather than full days.',
			},
			{ kind: 'h', id: 'the-islands', text: 'The Islands and Reefs' },
			{
				kind: 'p',
				text: 'Pulau Dua and Weer Molino are the two anchorages that most boats will build a day around. The reef flats are shallow enough for beginners, with drop-offs for anyone who wants deeper water.',
			},
			{
				kind: 'callout',
				title: 'Plan around the tide, not the clock',
				text: 'Several of the best sandbars and shallow reef sites only exist at particular tides. We schedule boat days around slack water rather than fixed departure times, which is why two identical itineraries can feel completely different.',
			},
			{ kind: 'h', id: 'the-highlands', text: 'The Highlands' },
			{
				kind: 'p',
				text: 'Finish inland. The Peleng highlands offer ridgeline views back across the whole archipelago, coffee and clove groves, and villages that see very few travellers.',
			},
		],
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
				text: 'Banggai is a year-round destination, but the experience changes significantly between the dry and wet seasons. Here is how each window actually feels on the water.',
			},
			{ kind: 'h', id: 'dry-season', text: 'April to October: The Dry Season' },
			{
				kind: 'p',
				text: 'This is the window most people should aim for. Winds are lighter, the water is at its clearest, and the crossing to the outer islands is rarely rough. Visibility for snorkeling and diving is at its best.',
			},
			{
				kind: 'h',
				id: 'shoulder',
				text: 'November and March: The Shoulder Months',
			},
			{
				kind: 'p',
				text: 'Weather is changeable but the archipelago is noticeably quieter, which matters at Paisu Pok. Expect a few short afternoon showers and be flexible on boat days.',
			},
			{
				kind: 'h',
				id: 'wet-season',
				text: 'December to February: The Wet Season',
			},
			{
				kind: 'p',
				text: 'The rainforest is at its greenest and the waterfalls are at full flow, but sea crossings can be uncomfortable and some outer-island trips are not run at all. If you come for the lakes and the highlands rather than the reef, it is still a rewarding window.',
			},
			{
				kind: 'callout',
				title: 'Our recommendation',
				text: 'Late April through early June gives you the clearest water before the busiest period, and the waterfalls still carry enough flow to be worth the walk.',
			},
		],
	},
];

export const getPost = (slug: string): Post | undefined => posts.find((post) => post.slug === slug);

export const relatedPosts = (slug: string, count = 3): Post[] =>
	posts.filter((post) => post.slug !== slug).slice(0, count);

export const postImage = (post: Post, width = 900): string => img(post.image, width);

/** Table of contents derived from the heading blocks in a post body. */
export const tableOfContents = (post: Post): { id: string; text: string }[] =>
	post.body.flatMap((block) => (block.kind === 'h' ? [{ id: block.id, text: block.text }] : []));
