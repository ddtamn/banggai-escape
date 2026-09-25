/**
 * The guard, and signing in.
 *
 * The anonymous check needs nothing but a dev server, so it always runs; the signed-in ones
 * are skipped without credentials rather than failed.
 */
import { expect, test } from '@playwright/test';
import { credentials, signIn } from './helpers';

test('an anonymous visitor is sent to the sign-in page, which says where they were going', async ({
	page,
}) => {
	await page.goto('/dashboard');

	await expect(page).toHaveURL(/\/login(\?|$)/);
	await expect(page.locator('input[name="email"]')).toBeVisible();

	// The redirect target is preserved so signing in returns you to what you asked for.
	// `searchParams` decodes it; the raw URL carries `%2Fdashboard`.
	expect(new URL(page.url()).searchParams.get('redirectTo')).toBe('/dashboard');
});

test('the admin index redirects into the dashboard', async ({ page }) => {
	await page.goto('/');

	// `/` is a server redirect to `/dashboard`, which is itself guarded — so landing on the
	// sign-in page is the correct end state for an anonymous visitor.
	await expect(page).toHaveURL(/\/(login|dashboard)/);
});

test.describe('signed in', () => {
	test.skip(() => credentials() === null, 'set ADMIN_EMAIL and ADMIN_PASSWORD to run these');

	test('signs in and reaches the dashboard shell', async ({ page }) => {
		await signIn(page);

		await expect(page.locator('h1').first()).toHaveText('Overview');

		// Every section in the sidebar, which is the one list the header also titles from.
		for (const title of ['Packages', 'Destinations', 'Articles', 'Media', 'Settings']) {
			await expect(page.getByRole('link', { name: title }).first()).toBeAttached();
		}
	});
});
