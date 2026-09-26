/**
 * The home page's content.
 *
 * Selection happens here rather than in the component, because *which* items appear is a
 * content decision: the four packages are the first four the admin ordered, and the four
 * destinations are named. The component renders what it is handed.
 *
 * The featured destinations are looked up by slug, so one that has been archived or
 * unpublished drops out of the row instead of leaving a hole. They are also kept in the order
 * named here rather than in `sort_order` — the home page's mosaic pairs them left-to-right,
 * and that pairing is the reason the list is written out.
 */

import { type BookingPackage, maxGuestsFrom } from '$lib/enquiry';
import { loadPublishedEntries } from '$lib/server/content';
import type { PageServerLoad } from './$types';

const curatedSlugs = ['paisu-pok-lake', 'pulau-dua', 'piala-waterfall', 'mokokawa-waterfall'];

export const load: PageServerLoad = async () => {
	const [packages, destinations, posts] = await Promise.all([
		loadPublishedEntries('package'),
		loadPublishedEntries('destination'),
		loadPublishedEntries('article'),
	]);

	const bySlug = new Map(destinations.map((entry) => [entry.slug, entry.payload]));

	/**
	 * The booking bar's package list, kept deliberately thin.
	 *
	 * The card grid needs full payloads; a `<select>` needs a title and a duration. Handing
	 * the bar every published package with its complete itinerary and inclusions would put
	 * the whole catalogue into the HTML for the sake of three visible strings — and this is
	 * the page every visitor lands on first.
	 */
	const bookingOptions: BookingPackage[] = packages.map((entry) => ({
		slug: entry.payload.slug,
		title: entry.payload.title,
		days: entry.payload.days,
		nights: entry.payload.nights,
		maxGuests: maxGuestsFrom(entry.payload.groupSize),
	}));

	return {
		packages: packages.slice(0, 4).map((entry) => entry.payload),
		bookingOptions,
		destinations: curatedSlugs.flatMap((slug) => bySlug.get(slug) ?? []),
		posts: posts.slice(0, 3).map((entry) => entry.payload),
	};
};
