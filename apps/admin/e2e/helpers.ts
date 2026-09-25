/**
 * Shared helpers for the browser checks.
 *
 * Three SvelteKit and Svelte behaviours cost real debugging time when this suite was
 * written, and all three are load-bearing here:
 *
 * 1. `resolve()` returns a **relative** href during SSR (`./settings/site`) and an absolute
 *    one once the client has hydrated. So nothing matches on `href^="/…"`; hrefs are read
 *    from the DOM and resolved against the base URL instead.
 * 2. A click that lands before hydration is not handled by the client router — the browser
 *    does its own navigation instead — so clicking is retried until its effect is
 *    observable rather than assumed.
 * 3. A field filled before hydration has its value restored from the server-rendered
 *    attribute when Svelte takes over, which silently leaves the *old* value in place and
 *    makes the save that follows prove nothing.
 */
import { expect, type Locator, type Page } from '@playwright/test';

/** The administrator to sign in as, or null when the environment does not provide one. */
export function credentials(): { email: string; password: string } | null {
	const email = process.env.ADMIN_EMAIL;
	const password = process.env.ADMIN_PASSWORD;

	return email && password ? { email, password } : null;
}

/** Signs in through the real form, then waits for the dashboard shell to be interactive. */
export async function signIn(page: Page): Promise<void> {
	const who = credentials();

	if (!who) throw new Error('signIn() was called without ADMIN_EMAIL/ADMIN_PASSWORD');

	await page.goto('/login');
	await page.fill('input[name="email"]', who.email);
	await page.fill('input[name="password"]', who.password);
	await page.click('button[type="submit"]');
	await page.waitForURL((url) => !url.pathname.startsWith('/login'));
	await expect(page.locator('a[href="/settings"]').first()).toBeAttached();
}

/**
 * The absolute path a link on the page actually points at.
 *
 * Read from the DOM rather than matched in a selector, because the same link is relative
 * before hydration and absolute after.
 */
export async function hrefs(page: Page): Promise<string[]> {
	const raw = await page
		.locator('a[href]')
		.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href') ?? ''));

	return raw.filter(Boolean).map((href) => new URL(href, page.url()).pathname);
}

/** Clicks until the effect is observable, so hydration lag is not a test failure. */
export async function clickUntil(
	page: Page,
	target: Locator,
	effect: () => Promise<boolean>,
	attempts = 25,
): Promise<boolean> {
	for (let attempt = 0; attempt < attempts; attempt += 1) {
		await target.click({ noWaitAfter: true }).catch(() => {});

		if (await effect()) return true;
		await page.waitForTimeout(200);
	}

	return false;
}

/** Types a value and keeps it typed. See note 3 at the top of this file. */
export async function fillUntilStable(
	page: Page,
	target: Locator,
	value: string,
): Promise<boolean> {
	for (let attempt = 0; attempt < 10; attempt += 1) {
		await target.fill(value);

		const deadline = Date.now() + 1200;
		let stable = true;

		while (Date.now() < deadline) {
			await page.waitForTimeout(150);

			if ((await target.inputValue()) !== value) {
				stable = false;
				break;
			}
		}

		if (stable) return true;
	}

	return false;
}
