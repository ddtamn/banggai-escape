import type { DestinationSource } from '@banggai/content-model';
import { img, media } from './media';

/**
 * Declared once in `@banggai/content-model`; aliased here so callers are unchanged. The
 * `…Source` variant is the authored one, whose media fields hold CDN ids or URLs rather
 * than `media_assets` ids.
 */
export type Destination = DestinationSource;

export type QuickInfo = DestinationSource['quickInfo'];

export type Experience = DestinationSource['experiences'][number];

const gallery = (keys: (keyof typeof media.destinations)[]): string[] =>
	keys.map((key) => img(media.destinations[key]));

export const destinations: Destination[] = [
	{
		slug: 'paisu-pok-lake',
		name: 'Paisu Pok Lake',
		region: 'Luk Panenteng, Banggai Kepulauan',
		tagline: 'The Mirror Lake of Central Sulawesi',
		image: media.destinations['paisu-pok-lake'],
		featured: true,
		overview: [
			'Tucked away amid the lush canopy of Banggai Kepulauan, Danau Paisu Pok is widely revered as one of Indonesia\u2019s most enchanting natural sanctuaries. Its name translates to "Black Lake" in the local dialect, a nod to the dark, rich reflections cast by the surrounding rainforest that contrast beautifully with its glass-like turquoise waters.',
			'Gliding across its tranquil surface on a traditional wooden canoe feels like floating on air. The water is so strikingly transparent that every submerged rock, fallen tree trunk, and aquatic detail on the lake bed is clearly visible. It is a tranquil haven crafted by nature, perfect for slow exploration and deep relaxation.',
		],
		quickInfo: {
			bestTime: 'Early morning for the crispiest reflections',
			duration: '2 - 3 Hours',
			highlights: 'Canoeing, Swimming, Photography',
			accessibility: 'Easy (5-minute walk along a paved timber boardwalk)',
		},
		experiences: [
			{
				title: 'Wooden Canoe Gliding',
				text: 'Paddle through calm, glass-like waters surrounded by pristine jungle greenery.',
			},
			{
				title: 'Refresh in Natural Springs',
				text: 'Swim in cool, clear waters fed directly by natural mountain springs.',
			},
			{
				title: 'Editorial Photography',
				text: 'Capture iconic reflections and panoramic views from scenic wooden boardwalks.',
			},
		],
		gallery: gallery(['paisu-pok-lake', 'piala-waterfall', 'poganda-beach']),
	},
	{
		slug: 'paisu-batango',
		name: 'Paisu Batango',
		region: 'Banggai Kepulauan',
		tagline: 'A Hidden Freshwater Pool in the Forest',
		image: media.destinations['paisu-batango'],
		overview: [
			'Paisu Batango is the quieter sibling of Paisu Pok: a small, spring-fed pool set deep in the forest, reached by a shaded trail that keeps its water cool all year round.',
			'With far fewer visitors than the neighbouring lake, it is the place to swim without an audience and hear nothing but the canopy.',
		],
		quickInfo: {
			bestTime: 'Mid-morning, once the trail has dried',
			duration: '1 - 2 Hours',
			highlights: 'Swimming, Forest Walks, Birdwatching',
			accessibility: 'Moderate (10-minute forest trail)',
		},
		experiences: [
			{
				title: 'Forest Swim',
				text: 'Cool, clear spring water surrounded by old-growth canopy.',
			},
			{
				title: 'Shaded Trail Walk',
				text: 'A short walk in with local birdlife and ferns along the path.',
			},
			{
				title: 'Quiet Picnic',
				text: 'A simple picnic spot away from the main lake crowds.',
			},
		],
		gallery: gallery(['paisu-batango', 'mokokawa-waterfall', 'peleng-highlands']),
	},
	{
		slug: 'piala-waterfall',
		name: 'Piala Waterfall',
		region: 'Banggai Kepulauan',
		tagline: 'Jungle Cascades and an Emerald Plunge Pool',
		image: media.destinations['piala-waterfall'],
		overview: [
			'Piala is a multi-tier cascade that drops through dense rainforest into a wide emerald plunge pool, deep enough to swim and calm enough to float.',
			'The falls run strongest through the wet season, when the curtain of water widens across the full rock face.',
		],
		quickInfo: {
			bestTime: 'After the wet season peak, for the fullest flow',
			duration: '2 - 3 Hours',
			highlights: 'Swimming, Photography, Picnicking',
			accessibility: 'Moderate (stepped trail, some roots)',
		},
		experiences: [
			{
				title: 'Plunge Pool Swim',
				text: 'A broad, deep pool directly beneath the main tier.',
			},
			{
				title: 'Cascade Trail',
				text: 'Follow the stream up to find the smaller upper tiers.',
			},
			{
				title: 'Rainforest Photography',
				text: 'Dappled light through the canopy above the falls.',
			},
		],
		gallery: gallery(['piala-waterfall', 'paisu-pok-lake', 'peleng-highlands']),
	},
	{
		slug: 'poganda-beach',
		name: 'Poganda Beach',
		region: 'Banggai Kepulauan',
		tagline: 'White Sand and Long Shallow Shallows',
		image: media.destinations['poganda-beach'],
		overview: [
			'Poganda is the beach locals choose for a full day out: a long crescent of white sand with a shallow, sandy bottom that stays warm well into the afternoon.',
			'There is no jetty and no development, just shade trees at the treeline and boats pulled up at the western end.',
		],
		quickInfo: {
			bestTime: 'Late afternoon for softer light and lower tide',
			duration: '3 - 5 Hours',
			highlights: 'Swimming, Beachcombing, Sunset',
			accessibility: 'Easy (vehicle to the beach edge)',
		},
		experiences: [
			{
				title: 'Shallow Swimming',
				text: 'A gently shelving sandy bottom that stays calm in most conditions.',
			},
			{
				title: 'Sunset Walk',
				text: 'The crescent faces west, making it the best sunset beach nearby.',
			},
			{
				title: 'Beach Picnic',
				text: 'Shade trees and flat sand make this the easiest picnic stop.',
			},
		],
		gallery: gallery(['poganda-beach', 'paisu-pok-lake', 'pulau-dua']),
	},
	{
		slug: 'pulau-dua',
		name: 'Pulau Dua',
		region: 'Banggai Kepulauan',
		tagline: 'The Twin Islands',
		image: media.destinations['pulau-dua'],
		overview: [
			'Two small islands sit close enough to swim between at slack tide, ringed by reef flats and turtle grass.',
			'It is a classic island-hopping anchor: shallow enough for beginners, with a drop-off on the outer edge for anyone who wants more.',
		],
		quickInfo: {
			bestTime: 'Midday high tide for the clearest water',
			duration: 'Half to Full Day',
			highlights: 'Snorkeling, Island Hopping, Photography',
			accessibility: 'Boat access only',
		},
		experiences: [
			{
				title: 'Reef Flat Snorkel',
				text: 'Calm, shallow reef with coral heads and reef fish in easy reach.',
			},
			{
				title: 'Swim Between Islands',
				text: 'A short channel crossing at slack tide for confident swimmers.',
			},
			{
				title: 'Turtle Grass Beds',
				text: 'Seagrass shallows where green turtles are regularly seen grazing.',
			},
		],
		gallery: gallery(['pulau-dua', 'poganda-beach', 'peleng-highlands']),
	},
	{
		slug: 'weer-molino',
		name: 'Weer Molino',
		region: 'Banggai Kepulauan',
		tagline: 'Karst Cliffs and Deep Turquoise Water',
		image: media.destinations['weer-molino'],
		overview: [
			'Weer Molino is a stretch of limestone coastline where the rock drops straight into deep, saturated turquoise water.',
			'The cliffs give the anchorage natural shelter, which makes it the best stop when the outer islands are too exposed.',
		],
		quickInfo: {
			bestTime: 'Morning, before the afternoon wind builds',
			duration: '2 - 4 Hours',
			highlights: 'Cliff Scenery, Snorkeling, Boat Trips',
			accessibility: 'Boat access only',
		},
		experiences: [
			{
				title: 'Cliff Anchorage',
				text: 'Sheltered water beneath vertical limestone walls.',
			},
			{
				title: 'Deep Water Snorkel',
				text: 'Steep reef that drops away quickly into blue water.',
			},
			{
				title: 'Karst Photography',
				text: 'High-contrast rock and water from the boat or the shallows.',
			},
		],
		gallery: gallery(['weer-molino', 'lalong-harbor', 'pulau-dua']),
	},
	{
		slug: 'mokokawa-waterfall',
		name: 'Mokokawa Waterfall',
		region: 'Banggai Kepulauan',
		tagline: 'A Rainforest Cascade with an Emerald Pool',
		image: media.destinations['mokokawa-waterfall'],
		overview: [
			'Mokokawa falls in a single wide curtain over a mossy rock shelf, landing in an emerald pool that is perfect for a cool swim.',
			'The approach is a short walk through working groves, so you pass smallholdings and forest within a few minutes of each other.',
		],
		quickInfo: {
			bestTime: 'Wet season months for the strongest flow',
			duration: '1 - 2 Hours',
			highlights: 'Swimming, Nature, Picnicking',
			accessibility: 'Easy to Moderate (short trail)',
		},
		experiences: [
			{
				title: 'Emerald Pool Swim',
				text: 'A deep, cool pool directly beneath the falls.',
			},
			{
				title: 'Grove Walk',
				text: 'Pass clove and coffee smallholdings on the way in.',
			},
			{
				title: 'Mossy Rock Amphitheatre',
				text: 'A wide rock shelf that makes the falls feel almost architectural.',
			},
		],
		gallery: gallery(['mokokawa-waterfall', 'piala-waterfall', 'peleng-highlands']),
	},
	{
		slug: 'lalong-harbor',
		name: 'Lalong Harbor',
		region: 'Luwuk, Banggai',
		tagline: 'Where the Crossing Begins',
		image: media.destinations['lalong-harbor'],
		overview: [
			'Lalong Harbor is the working port that most visitors pass through on their way to the islands, and it is worth a look in its own right.',
			'Wooden ferries, ketinting outriggers, and market stalls share the quay, which makes for one of the most photogenic working waterfronts in the region.',
		],
		quickInfo: {
			bestTime: 'Early morning when the ferries load',
			duration: '1 Hour',
			highlights: 'Local Life, Photography, Street Food',
			accessibility: 'Easy (drive-up quay)',
		},
		experiences: [
			{
				title: 'Working Waterfront',
				text: 'Watch cargo, produce, and passengers load for the islands.',
			},
			{
				title: 'Harbor Street Food',
				text: 'Simple warung food at the quay, best in the early morning.',
			},
			{
				title: 'Boat Spotting',
				text: 'Traditional ketinting and modern speedboats side by side.',
			},
		],
		gallery: gallery(['lalong-harbor', 'weer-molino', 'poganda-beach']),
	},
	{
		slug: 'peleng-highlands',
		name: 'Peleng Highlands',
		region: 'Peling Island',
		tagline: 'Ridgelines Above the Archipelago',
		image: media.destinations['peleng-highlands'],
		overview: [
			'The interior of Peling Island rises into a cool highland plateau of ridgelines, groves, and small villages that see very few travellers.',
			'From the high saddle you look back down over the strait to the outer islands, which is the best sense you will get of how large the archipelago really is.',
		],
		quickInfo: {
			bestTime: 'Sunrise or late afternoon for the clearest views',
			duration: 'Half to Full Day',
			highlights: 'Trekking, Panoramas, Village Life',
			accessibility: 'Moderate (vehicle plus walking)',
		},
		experiences: [
			{
				title: 'Ridge Panorama',
				text: 'Wide views across the strait to the outer island chain.',
			},
			{
				title: 'Highland Villages',
				text: 'Coffee, clove, and hospitality in villages off the coastal road.',
			},
			{
				title: 'Birdlife Walks',
				text: 'Early walks with a local spotter for hornbills and kingfishers.',
			},
		],
		gallery: gallery(['peleng-highlands', 'mokokawa-waterfall', 'paisu-pok-lake']),
	},
];

export const getDestination = (slug: string): Destination | undefined =>
	destinations.find((destination) => destination.slug === slug);

export const destinationImage = (destination: Destination, width = 900): string =>
	img(destination.image, width);
