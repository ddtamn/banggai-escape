/**
 * Turning a visitor's choices into a message a person can answer.
 *
 * ## Why WhatsApp and not a form post
 *
 * The contact form used to `preventDefault()` and show a thank-you, which sent nothing —
 * a visitor filled in their details and the enquiry was discarded. That is the worst
 * outcome available: it looks like it worked.
 *
 * The number is already in the CMS (`contactChannels` carries a "Call & WhatsApp" entry),
 * the audience books over WhatsApp, and it needs no new credential, no third-party form
 * service, no spam defence and no retention policy. So an enquiry becomes a message the
 * visitor sends themselves, from an app they already have, to a human.
 *
 * ## Why the message stays on screen
 *
 * `wa.me` does nothing at all for a visitor without WhatsApp installed — no error, no
 * fallback, just a dead tap. So the composed message is always shown, with a copy
 * fallback beside the button. That is the whole reason this is a helper and not a bare
 * `window.open` at each call site: the fallback is the point, and it must not be
 * forgotten the second someone adds another enquiry surface.
 */

/** A package, reduced to what the booking bar needs to describe it. */
export type BookingPackage = {
	slug: string;
	title: string;
	days: number;
	nights: number;
	/** Ceiling parsed from the display string, or `null` when it could not be read. */
	maxGuests: number | null;
};

/** What the visitor chose. Every field is optional — a partial enquiry is still useful. */
export type Enquiry = {
	package?: BookingPackage | null;
	/** ISO `YYYY-MM-DD`, or absent when the visitor left the field blank. */
	dateFrom?: string | null;
	dateTo?: string | null;
	guests?: number | null;
	/** Free text, used by the contact form. */
	message?: string | null;
	name?: string | null;
	email?: string | null;
	phone?: string | null;
};

/**
 * The number in the only form `wa.me` accepts: digits and a country code, no `+`, no
 * spaces, no punctuation. Returns `null` for anything else rather than producing a link
 * that silently fails.
 */
export function whatsappNumber(raw: string | null | undefined): string | null {
	if (!raw) return null;

	// Tolerate how people actually type a number in a CMS field: `+62 813-5491-1647`.
	const digits = raw.replace(/\D/g, '');

	// Too short to be a real international number, and `wa.me` would refuse it.
	return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

/** A `wa.me` click-to-chat URL, or `null` when there is no usable number. */
export function whatsappLink(number: string, message: string): string {
	return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

/**
 * The maximum group size, read from the `groupSize` display string.
 *
 * That field is authored prose — `"Min 2, Max 8"` — because it is shown on a card, not
 * queried. This parses it defensively and returns `null` when it cannot, so a caller can
 * fall back to its own ceiling rather than trusting a guess. It is not a substitute for a
 * numeric model, and `docs/16-web-polish-plan.md` says so.
 */
export function maxGuestsFrom(groupSize: string | null | undefined): number | null {
	if (!groupSize) return null;

	const max = /max\D{0,3}(\d{1,2})/i.exec(groupSize);
	if (!max) return null;

	const parsed = Number.parseInt(max[1], 10);

	return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

/** `4D3N`, the shape a Banggai package is sold in. */
export function durationLabel(pkg: Pick<BookingPackage, 'days' | 'nights'>): string {
	return `${pkg.days}D${pkg.nights}N`;
}

/**
 * Format an ISO date for a human without pulling in a date library or drifting into
 * locale-dependent output. Returns the input unchanged if it is not a real date, so a
 * malformed value is visible in the message rather than rendered as "Invalid Date".
 */
function readableDate(iso: string | null | undefined): string | null {
	if (!iso) return null;

	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
	if (!match) return iso;

	const [, year, month, day] = match;
	const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));

	// Rejects 2026-02-31 and friends, which `Date` would silently roll over.
	if (Number.isNaN(parsed.getTime()) || parsed.getUTCDate() !== Number(day)) return iso;

	const monthName = [
		'January',
		'February',
		'March',
		'April',
		'May',
		'June',
		'July',
		'August',
		'September',
		'October',
		'November',
		'December',
	][Number(month) - 1];

	return `${Number(day)} ${monthName} ${year}`;
}

/**
 * The message. Lines for absent choices are omitted rather than sent as "Not specified",
 * because a wall of empty fields makes the operator's job harder, not easier.
 */
export function composeEnquiry(enquiry: Enquiry, origin?: string): string {
	const lines: string[] = [];

	if (enquiry.name?.trim()) lines.push(`Name: ${enquiry.name.trim()}`);
	if (enquiry.email?.trim()) lines.push(`Email: ${enquiry.email.trim()}`);
	if (enquiry.phone?.trim()) lines.push(`Phone: ${enquiry.phone.trim()}`);

	if (enquiry.package) {
		lines.push(`Package: ${enquiry.package.title} (${durationLabel(enquiry.package)})`);
	}

	const from = readableDate(enquiry.dateFrom);
	const to = readableDate(enquiry.dateTo);

	if (from && to) lines.push(`Dates: ${from} to ${to}`);
	else if (from) lines.push(`From: ${from}`);
	else if (to) lines.push(`To: ${to}`);

	if (enquiry.guests) {
		lines.push(`Guests: ${enquiry.guests}`);
	}

	if (enquiry.message?.trim()) {
		lines.push('', enquiry.message.trim());
	}

	// Without a date at all, say so — "flexible" is information, and its absence reads as
	// an oversight to whoever answers.
	if (!from && !to) lines.push('Dates: flexible');

	const body = lines.length > 0 ? lines : ['I would like to ask about a Banggai Escape trip.'];

	// Where the enquiry came from, so a message forwarded to a colleague still says which
	// page produced it. The pathname only: a query string can carry anything.
	const path = origin ? safePathname(origin) : null;
	if (path) body.push('', `Sent from ${path}`);

	return `Hello Banggai Escape, I'd like to ask about:\n\n${body.join('\n')}`;
}

/** The origin reduced to scheme and host, or `null` when it is not a usable absolute URL. */
function safePathname(origin: string): string | null {
	try {
		const url = new URL(origin);
		return `${url.origin}${url.pathname === '/' ? '' : url.pathname}`;
	} catch {
		return null;
	}
}
