import { img, media } from './media';

export type TripType = 'Open Trip' | 'Private Trip';

export type ItineraryDay = {
	label: string;
	title: string;
	text: string;
};

export type Package = {
	slug: string;
	title: string;
	subtitle: string;
	region: string;
	days: number;
	nights: number;
	tripType: TripType;
	/** Price per person in IDR. */
	price: number;
	image: string;
	groupSize: string;
	accommodation: string;
	overview: string;
	highlights: { title: string; text: string }[];
	included: string[];
	itinerary: ItineraryDay[];
	featured?: boolean;
};

/** Formats a number as an Indonesian rupiah amount: 2850000 -> "IDR 2.850.000". */
export const formatPrice = (price: number): string =>
	`IDR ${price.toLocaleString('id-ID')}`;

export const durationLabel = (pkg: Package): string =>
	pkg.days === 1
		? `1 Day`
		: `${pkg.days} Days ${pkg.nights} ${pkg.nights === 1 ? 'Night' : 'Nights'}`;

/** "03 days" badge, matching the design's zero-padded duration. */
export const badgeDays = (pkg: Package): string =>
	`${String(pkg.days).padStart(2, '0')} ${pkg.days === 1 ? 'day' : 'days'}`;

export const packages: Package[] = [
	{
		slug: 'untouched-banggai-discovery',
		title: 'Untouched Banggai Discovery',
		subtitle: '3D2N',
		region: 'Luwuk - Banggai Kepulauan',
		days: 3,
		nights: 2,
		tripType: 'Open Trip',
		price: 2850000,
		image: media.packages['banggai-lagoon-with-boats'],
		groupSize: 'Min 8, Max 25',
		accommodation: 'Hotels (2 Nights)',
		featured: true,
		overview:
			'Designed for travelers seeking a quick yet deeply immersive tropical retreat, this 3-day expedition highlights the quintessential wonders of the Banggai Archipelago. From drifting over the mirror-like waters of Danau Paisu Pok to exploring pristine turquoise coves, experience an effortless blend of adventure, comfort, and authentic local hospitality.',
		highlights: [
			{
				title: 'Danau Paisu Pok',
				text: 'Swim and paddle across the world-famous glass-like lake surrounded by lush green canopy.'
			},
			{
				title: 'Island Hopping Expedition',
				text: 'Discover pristine white-sand sanctuaries and hidden coastal gems.'
			},
			{
				title: 'Underwater Exploration',
				text: 'Snorkel through vibrant coral gardens and calm, crystal-clear lagoons.'
			},
			{
				title: 'Tailored Local Care',
				text: 'Enjoy private boat transfers, fresh seafood, and seamless guidance from our native team.'
			}
		],
		included: [
			'2 Nights accommodation (Boutique Lodge / Waterfront Resort)',
			'Private land and sea transfers (Speedboat & ground transport)',
			'All scheduled meals, daily refreshments, and mineral water',
			'High-quality snorkeling gear and safety equipment',
			'All entrance fees, conservation permits, and dedicated local guide service'
		],
		itinerary: [
			{
				label: 'Day 1',
				title: 'Arrival & Coastal Welcome',
				text: 'Meet and greet at Luwuk or Banggai, private transfer to accommodation, sunset leisure and welcome dinner.'
			},
			{
				label: 'Day 2',
				title: 'The Wonders of Paisu Pok & Lagoon Hopping',
				text: 'Morning canoe ride across mirror lake Paisu Pok, cliff-jumping into crystalline pools, afternoon snorkeling along untouched offshore barrier reefs, and a fresh local BBQ lunch.'
			},
			{
				label: 'Day 3',
				title: 'Farewell Banggai',
				text: 'Scenic breakfast at the lodge, souvenir shopping for authentic Banggai handicrafts, and departure transfer back to Luwuk Airport or Harbor.'
			}
		]
	},
	{
		slug: 'banggai-ultimate-expedition',
		title: 'Banggai Ultimate Expedition',
		subtitle: '5D4N',
		region: 'Luwuk & Banggai Laut',
		days: 5,
		nights: 4,
		tripType: 'Open Trip',
		price: 4250000,
		image: media.packages['mountain-with-scenic-lake'],
		groupSize: 'Min 8, Max 22',
		accommodation: 'Boutique Lodges (4 Nights)',
		overview:
			'A complete loop covering Paisu Pok, hidden lagoon waterfalls, and remote sea nomadic settlements. Five unhurried days let you cross between island groups, sleep to the sound of the reef, and see parts of Central Sulawesi that rarely appear on an itinerary.',
		highlights: [
			{
				title: 'Cross-Island Loop',
				text: 'Travel between Banggai Kepulauan and Banggai Laut by scenic ferry and private speedboat.'
			},
			{
				title: 'Sea Nomad Encounters',
				text: 'Spend an afternoon with the Bajo communities who still live and work on the water.'
			},
			{
				title: 'Hidden Lagoon Waterfalls',
				text: 'Trek to jungle cascades that feed straight into emerald, spring-fed pools.'
			},
			{
				title: 'Reef Dawn Dives',
				text: 'Two guided snorkel sessions on barrier reefs that see almost no other visitors.'
			}
		],
		included: [
			'4 Nights accommodation across three island bases',
			'Ferry tickets plus private speedboat and ground transfers',
			'All meals, daily refreshments, and mineral water',
			'Full snorkeling kit, safety equipment, and life jackets',
			'Entrance fees, conservation permits, and a dedicated local guide'
		],
		itinerary: [
			{
				label: 'Day 1',
				title: 'Fly In, Slow Down',
				text: 'Airport pickup in Luwuk, crossing briefing over lunch, and an afternoon ferry to Salakan.'
			},
			{
				label: 'Day 2',
				title: 'Paisu Pok & the Mirror Lake',
				text: 'Early canoe session before the day-trippers arrive, then the boardwalk viewpoints and a lakeside picnic.'
			},
			{
				label: 'Day 3',
				title: 'Lagoon Waterfalls',
				text: 'Jungle walk to Mokokawa and Piala falls with a swim stop in the spring-fed pool beneath.'
			},
			{
				label: 'Day 4',
				title: 'Sea Nomad Settlements',
				text: 'Speedboat to a Bajo village, reef snorkeling, and a sunset return across the strait.'
			},
			{
				label: 'Day 5',
				title: 'Farewell Harbor',
				text: 'Craft market stop, farewell lunch in Luwuk, and airport transfer.'
			}
		]
	},
	{
		slug: 'island-hopping-coral-sanctuary',
		title: 'Island Hopping & Coral Sanctuary',
		subtitle: '4D3N',
		region: 'Banggai Kepulauan',
		days: 4,
		nights: 3,
		tripType: 'Open Trip',
		price: 3450000,
		image: media.packages['forest-and-trail'],
		groupSize: 'Min 6, Max 20',
		accommodation: 'Waterfront Resort (3 Nights)',
		overview:
			'Snorkel untouched reefs, relax on powder sands, and drift on reflective waters at peaceful sunrise hours. A calm-water itinerary built around the reef rather than the road.',
		highlights: [
			{
				title: 'Coral Garden Snorkeling',
				text: 'Three guided sessions over barrier reefs with healthy hard and soft coral cover.'
			},
			{
				title: 'Powder-Sand Sandbars',
				text: 'Anchor at sandbars that only appear at low tide, with a horizon of nothing but blue.'
			},
			{
				title: 'Sunrise on the Water',
				text: 'Leave before dawn to catch the mirror-calm hour on the lagoon.'
			},
			{
				title: 'Seafood Beach Dinners',
				text: 'Grilled catch-of-the-day served on the sand as the boats are hauled up.'
			}
		],
		included: [
			'3 Nights waterfront accommodation',
			'Private boat charters for all island hops',
			'All meals and refreshments, including two beach dinners',
			'Snorkeling gear and certified safety equipment',
			'Marine park fees and local guide service'
		],
		itinerary: [
			{
				label: 'Day 1',
				title: 'Arrival & Reef Briefing',
				text: 'Transfer to the resort, snorkel briefing, and a shallow first swim to get comfortable in the water.'
			},
			{
				label: 'Day 2',
				title: 'Outer Reef Circuit',
				text: 'Full day of boat hops across three reef sites with a sandbar lunch and an afternoon lagoon drift.'
			},
			{
				label: 'Day 3',
				title: 'Pulau Dua & Weer Molino',
				text: 'Sunrise departure, turtle-grass shallows, and an afternoon exploring the twin-island channel.'
			},
			{
				label: 'Day 4',
				title: 'Slow Morning, Smooth Exit',
				text: 'Optional dawn swim, late breakfast, and the return transfer to Luwuk.'
			}
		]
	},
	{
		slug: 'paisu-pok-lake-day-trip',
		title: 'Paisu Pok Lake Day Trip',
		subtitle: '1D',
		region: 'Luk Panenteng',
		days: 1,
		nights: 0,
		tripType: 'Private Trip',
		price: 950000,
		image: media.packages['cascading-tropical-waterfall'],
		groupSize: 'Min 2, Max 12',
		accommodation: 'Not included',
		overview:
			'A single, perfectly paced day at Danau Paisu Pok with a private vehicle and boat, timed to reach the lake before the crowds and stay through the best light.',
		highlights: [
			{
				title: 'Early Lake Arrival',
				text: 'Reach the boardwalk before the day-trippers for the crispest reflections of the day.'
			},
			{
				title: 'Traditional Canoe',
				text: 'Paddle a wooden canoe across glass-clear water with a local boatman.'
			},
			{
				title: 'Spring-Fed Swim',
				text: 'Swim in cool water fed directly by mountain springs.'
			}
		],
		included: [
			'Private air-conditioned vehicle and driver',
			'Wooden canoe hire with a local boatman',
			'Lunch box and mineral water',
			'Entry fees and conservation permits',
			'Accompanying local guide'
		],
		itinerary: [
			{
				label: 'Morning',
				title: 'Pickup & Drive to the Lake',
				text: 'Hotel pickup in Luwuk or Salakan and the scenic drive across Peling Island to Luk Panenteng.'
			},
			{
				label: 'Midday',
				title: 'Canoe & Boardwalk',
				text: 'Canoe session on the lake, boardwalk circuit, and a picnic lunch at the viewpoint.'
			},
			{
				label: 'Afternoon',
				title: 'Springs & Return',
				text: 'Final swim in the spring-fed pool before the return transfer.'
			}
		]
	},
	{
		slug: 'peleng-highlands-trek',
		title: 'Peleng Highlands Trek',
		subtitle: '4D3N',
		region: 'Peling Island',
		days: 4,
		nights: 3,
		tripType: 'Private Trip',
		price: 3150000,
		image: media.packages['green-hills-and-pastoral-landscape'],
		groupSize: 'Min 4, Max 12',
		accommodation: 'Ridge Guesthouse (3 Nights)',
		overview:
			'Trade the coastline for ridgelines. A moderate trek through the Peleng highlands with village homestays, forest birdlife, and panoramic views back down over the archipelago.',
		highlights: [
			{
				title: 'Ridge Panorama',
				text: 'Sunrise from the high saddle looking out across the strait to the outer islands.'
			},
			{
				title: 'Village Hospitality',
				text: 'Two nights with highland families, sharing meals and stories.'
			},
			{
				title: 'Endemic Birdlife',
				text: 'Early walks with a local spotter for hornbills and kingfishers.'
			},
			{
				title: 'Coffee & Clove Groves',
				text: 'Walk through working smallholder groves on the descent.'
			}
		],
		included: [
			'3 Nights guesthouse and homestay accommodation',
			'Local trekking guide and porter team',
			'All meals during the trek and drinking water',
			'Ground transfers from Salakan',
			'Park fees and village contributions'
		],
		itinerary: [
			{
				label: 'Day 1',
				title: 'Salakan to the Foothills',
				text: 'Transfer to the trailhead, an easy introductory walk, and the first night at a ridge guesthouse.'
			},
			{
				label: 'Day 2',
				title: 'Into the Highlands',
				text: 'Five to six hours of walking through forest and grove, arriving at a highland village by late afternoon.'
			},
			{
				label: 'Day 3',
				title: 'Summit Saddle & Descent',
				text: 'Pre-dawn start for the panorama, then the descent to a second village.'
			},
			{
				label: 'Day 4',
				title: 'Return to the Coast',
				text: 'Morning bird walk, final descent, and transfer back to Salakan.'
			}
		]
	},
	{
		slug: 'luwuk-cultural-discovery',
		title: 'Luwuk Cultural Discovery',
		subtitle: '2D1N',
		region: 'Luwuk & Surrounds',
		days: 2,
		nights: 1,
		tripType: 'Open Trip',
		price: 1750000,
		image: media.packages['piala-waterfall-in-lush-green-setting'],
		groupSize: 'Min 6, Max 24',
		accommodation: 'City Hotel (1 Night)',
		overview:
			'A short, low-effort introduction to the Banggai mainland: markets, weaving workshops, coastal viewpoints, and the food that locals actually queue for.',
		highlights: [
			{
				title: 'Market Mornings',
				text: 'Walk the produce and fish market with a guide who knows every stall.'
			},
			{
				title: 'Weaving Workshop',
				text: 'Hands-on session with weavers keeping traditional Banggai textiles alive.'
			},
			{
				title: 'Coastal Sunset Point',
				text: 'End the day at the headland with the best view over the bay.'
			}
		],
		included: [
			'1 Night city hotel accommodation',
			'Air-conditioned vehicle and driver',
			'All meals including one local dinner',
			'Workshop fees and entrance charges',
			'English-speaking local guide'
		],
		itinerary: [
			{
				label: 'Day 1',
				title: 'Markets & Workshops',
				text: 'Morning market walk, weaving workshop, and an afternoon at the coastal viewpoints.'
			},
			{
				label: 'Day 2',
				title: 'Waterfalls & Farewell',
				text: 'Half-day trip to the nearest cascade, lunch, and the airport or harbor transfer.'
			}
		]
	},
	{
		slug: 'banggai-diving-expedition',
		title: 'Banggai Diving Expedition',
		subtitle: '5D4N',
		region: 'Outer Banggai Islands',
		days: 5,
		nights: 4,
		tripType: 'Private Trip',
		price: 5450000,
		image: media.packages['crashing-sea-waves-along-rocky-coast'],
		groupSize: 'Min 4, Max 8',
		accommodation: 'Liveaboard + Resort (4 Nights)',
		overview:
			'A small-group expedition to wall, drift, and muck sites across the outer Banggai islands. Limited to eight divers so every site gets a full, unhurried pass.',
		highlights: [
			{
				title: 'Wall & Drift Sites',
				text: 'Current-swept walls covered in soft coral and schooling fish.'
			},
			{
				title: 'Muck Diving',
				text: 'Black-sand sites for critter hunters, with a spotter on every dive.'
			},
			{
				title: 'Two Nights Afloat',
				text: 'Stay out on the outer islands instead of commuting from the mainland.'
			},
			{
				title: 'Max 8 Divers',
				text: 'Small groups, one guide per four divers, no site sharing.'
			}
		],
		included: [
			'2 Nights liveaboard and 2 Nights resort accommodation',
			'Up to 12 guided dives with tanks and weights',
			'All meals, drinking water, and refreshments',
			'Dedicated dive guide and safety support',
			'Marine park permits and dive site fees'
		],
		itinerary: [
			{
				label: 'Day 1',
				title: 'Arrival & Check Dive',
				text: 'Equipment fitting, a shallow check dive in sheltered water, and an evening briefing on the site plan.'
			},
			{
				label: 'Day 2',
				title: 'Board the Liveaboard',
				text: 'Two dives en route to the outer islands and a night crossing at anchor.'
			},
			{
				label: 'Day 3',
				title: 'Walls & Drifts',
				text: 'Three dives on the outer wall systems, including one at dusk.'
			},
			{
				label: 'Day 4',
				title: 'Muck & Macro',
				text: 'Two black-sand sites in the morning, then the return crossing and a resort night.'
			},
			{
				label: 'Day 5',
				title: 'Surface Interval',
				text: 'No-fly interval spend at the lake and market, then the airport transfer.'
			}
		]
	},
	{
		slug: 'sunset-island-cruise',
		title: 'Sunset Island Cruise',
		subtitle: '1D',
		region: 'Salakan Bay',
		days: 1,
		nights: 0,
		tripType: 'Private Trip',
		price: 1250000,
		image: media.packages['banggai-coastal-cliffs-and-turquoise-sea'],
		groupSize: 'Min 2, Max 10',
		accommodation: 'Not included',
		overview:
			'A slow afternoon on the water, finishing with the sun dropping behind the karst islands. Built for the day you would rather not spend in a vehicle.',
		highlights: [
			{
				title: 'Karst Island Hop',
				text: 'Cruise the channel between the limestone islets offshore from Salakan.'
			},
			{
				title: 'Golden Hour Anchor',
				text: 'Drop anchor at the best western-facing bay for sunset.'
			},
			{
				title: 'Onboard Refreshments',
				text: 'Fresh fruit, local snacks, and cold drinks served as you drift.'
			}
		],
		included: [
			'Private boat and crew for the afternoon',
			'Snorkeling stop with gear',
			'Refreshments and light snacks on board',
			'Life jackets and safety equipment',
			'Local guide for the cruise'
		],
		itinerary: [
			{
				label: 'Afternoon',
				title: 'Set Sail',
				text: 'Board at Salakan and cruise out through the islet channel with a snorkel stop along the way.'
			},
			{
				label: 'Golden Hour',
				title: 'Sunset Anchor',
				text: 'Anchor in the western bay for sunset with refreshments on deck.'
			},
			{
				label: 'Evening',
				title: 'Return to Salakan',
				text: 'Cruise back after dusk and transfer to your accommodation.'
			}
		]
	}
];

export const getPackage = (slug: string): Package | undefined =>
	packages.find((pkg) => pkg.slug === slug);

/** The highlighted package used on the home page. */
export const featuredPackages = packages.slice(0, 4);

/** Other journeys to cross-sell on a package detail page. */
export const relatedPackages = (slug: string, count = 2): Package[] =>
	packages.filter((pkg) => pkg.slug !== slug).slice(0, count);

/** Resolves a package's card image to a full URL. */
export const packageImage = (pkg: Package, width = 900): string => img(pkg.image, width);
