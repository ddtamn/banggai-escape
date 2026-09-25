/**
 * The dashboard shell: navigation, and the theme toggle.
 *
 * The toggle is checked as a *no-reload* behaviour, because a reload would also flip the
 * colours and would hide the mistake of shipping a link instead of a control.
 */
import { expect, test } from '@playwright/test';
import { clickUntil, credentials, hrefs, signIn } from './helpers';

test.describe('the shell', () => {
	test.skip(() => credentials() === null, 'set ADMIN_EMAIL and ADMIN_PASSWORD to run these');

	test.beforeEach(async ({ page }) => {
		await signIn(page);
	});

	test('every destination in the sidebar answers', async ({ page }) => {
		const destinations = (await hrefs(page)).filter((path) =>
			[/^\/dashboard$/, /^\/content\//, /^\/media$/, /^\/settings$/].some((pattern) =>
				pattern.test(path),
			),
		);

		// Five sections: Overview, three content kinds, Media and Settings.
		expect(destinations.length).toBeGreaterThanOrEqual(6);

		for (const path of destinations) {
			expect((await page.goto(path))?.status(), path).toBe(200);
		}
	});

	test('the theme toggle flips to dark without reloading, and stays flipped', async ({ page }) => {
		const root = page.locator('html');
		const toggle = page.getByRole('button', { name: /theme|dark|light/i }).first();

		// `<html>` carries no `class` at all until something adds one, so read it defensively.
		const classes = async () => (await root.getAttribute('class')) ?? '';

		expect(await classes()).not.toContain('dark');

		// Mark the document: if toggling reloaded the page, the mark would be gone.
		await page.evaluate(() => {
			document.documentElement.dataset.probe = 'kept';
		});

		expect(await clickUntil(page, toggle, async () => (await classes()).includes('dark'))).toBe(
			true,
		);

		expect(await root.getAttribute('data-probe')).toBe('kept');

		// The choice is remembered, and never becomes "system" — this build offers two states.
		await page.reload();
		expect(await classes()).toContain('dark');
		expect(await page.evaluate(() => localStorage.getItem('mode-watcher-mode'))).toBe('dark');

		// Put it back, so a re-run starts from the same place.
		expect(await clickUntil(page, toggle, async () => !(await classes()).includes('dark'))).toBe(
			true,
		);
	});
});
