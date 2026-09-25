/**
 * Presenters for content payloads.
 *
 * These are the pieces of the old static modules that were never data: formatting a price in
 * rupiah, naming a duration, deriving an article's table of contents from its heading blocks.
 * They take a payload and return a string or a list, so they belong with the components that
 * use them rather than behind a database read — a card can format whatever it is handed.
 *
 * Every payload here has already been through the read layer, which means its media fields
 * hold URLs. Nothing in this file touches media, deliberately: a component renders the URL it
 * was given, and the width arguments the CDN used to take are gone, because an object in R2
 * has one size.
 *
 * `authorBio` is the one piece of copy in here. It is not in the content model — an article
 * carries its byline (`author`, `authorRole`) but not a biography, and inventing a field for a
 * single shared string would put a form in the admin that nobody needs to edit yet. It lives
 * here so that when it does get a field, there is exactly one place to delete.
 */
import type { ArticlePayload, PackagePayload } from '@banggai/content-model';

/** Formats a number as an Indonesian rupiah amount: 2850000 -> "IDR 2.850.000". */
export const formatPrice = (price: number): string => `IDR ${price.toLocaleString('id-ID')}`;

export const durationLabel = (pkg: Pick<PackagePayload, 'days' | 'nights'>): string =>
	pkg.days === 1
		? `1 Day`
		: `${pkg.days} Days ${pkg.nights} ${pkg.nights === 1 ? 'Night' : 'Nights'}`;

/** "03 days" badge, matching the design's zero-padded duration. */
export const badgeDays = (pkg: Pick<PackagePayload, 'days'>): string =>
	`${String(pkg.days).padStart(2, '0')} ${pkg.days === 1 ? 'day' : 'days'}`;

/** Table of contents derived from the heading blocks in an article body. */
export const tableOfContents = (
	post: Pick<ArticlePayload, 'body'>,
): { id: string; text: string }[] =>
	post.body.flatMap((block) => (block.kind === 'h' ? [{ id: block.id, text: block.text }] : []));

export const authorBio =
	'We are passionate island explorers and certified local guides dedicated to showing curious travelers the breathtaking beauty, culture, and marine wonders of Banggai Kepulauan.';
