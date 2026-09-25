/**
 * Browser-side tracking: one page view per navigation, one event per tracked click.
 *
 * Two rules shape this module.
 *
 * **It never speaks to Analytics Engine.** It posts to `/api/events`, which validates and
 * writes. That keeps the dataset binding on the server, keeps the vocabulary in one place,
 * and means a visitor's browser never holds anything that could be used to write directly.
 *
 * **It never breaks a page.** A failed request is not retried and not reported; the response
 * is ignored, including a rejection. There is no queue and no beacon on unload — the only
 * events are the ones this code deliberately sends.
 */
import { type AnalyticsEvent, analyticsEvents, pageViewEvent } from '@banggai/content-model';
import { browser, dev } from '$app/environment';

const endpoint = '/api/events';

/**
 * The names this module is willing to send. `data-track` is a plain HTML attribute, so a
 * typo in markup cannot be caught by the compiler; dropping an unknown name here — with a
 * warning in development — is what keeps one visible as a console line instead of a silent
 * gap in the dashboard.
 */
const trackable = new Set<string>(analyticsEvents);

/**
 * Sends one event for the page the visitor is on.
 *
 * `keepalive` is deliberate: a click on a link is followed by a navigation, and without it
 * the browser is free to cancel the request in flight and lose the click we just recorded.
 */
export function track(event: AnalyticsEvent, path: string = location.pathname): void {
	if (!browser) return;

	if (!trackable.has(event)) {
		if (dev) console.warn(`Unknown analytics event "${event}"; nothing was sent.`);

		return;
	}

	try {
		void fetch(endpoint, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ event, path }),
			keepalive: true,
		}).catch(() => {});
	} catch {
		// `fetch` itself throwing (a sandboxed frame, a memory-starved phone) must not
		// interrupt the navigation it was called from.
	}
}

/**
 * Records a page view, unless the page is an error.
 *
 * A 404 is not a page view worth counting: the paths behind them are mostly typos and
 * broken inbound links, and "top pages" is a list of pages people meant to open. This is
 * also why the endpoint never sees a crawler — one that does not run JavaScript never
 * reaches it.
 */
export function trackPageView(path: string, status: number): void {
	if (status >= 400) return;

	track(pageViewEvent, path);
}

/**
 * Records a click on anything carrying `data-track`.
 *
 * One listener on the window rather than a handler per call to action: the markup then
 * only says *what* a control reports, and this module stays the single place that decides
 * how, when, and whether it is reported. Delegation also means a component does not have
 * to import browser-only code to be measurable.
 */
export function trackClick(event: MouseEvent): void {
	const target = event.target as Element | null;
	const value = target?.closest('[data-track]')?.getAttribute('data-track');

	if (!value) return;

	// The attribute is untyped, so the cast is guarded by `track`'s own vocabulary check.
	track(value as AnalyticsEvent);
}
