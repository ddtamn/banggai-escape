/**
 * The site-settings screen.
 *
 * Two of these are regression checks for bugs that shipped and were found by driving a
 * browser rather than by reading code:
 *
 * - A save that fails validation must keep the submission on screen instead of quietly
 *   restoring the stored value, and must not write anything.
 * - The form must open with as many rows as are stored. A setting's value *is* its single
 *   root field's value, so handing the walker an unwrapped value read `array['faqs']`, found
 *   nothing, and opened every form with one blank row.
 */
import { expect, test } from '@playwright/test';
import { clickUntil, credentials, fillUntilStable, hrefs, signIn } from './helpers';

/** The keys the contract declares. Spelled out so the screen cannot agree with itself alone. */
const KEYS = [
	'site',
	'nav',
	'languages',
	'socials',
	'footerDestinations',
	'features',
	'testimonials',
	'faqs',
	'stats',
	'visionMission',
	'contactChannels',
	'blogCategories',
	'ctaBackground',
	'siteCta',
	'cards',
	'homePage',
	'packagesPage',
	'destinationsPage',
	'blogPage',
	'aboutPage',
	'contactPage',
	'packageDetail',
	'destinationDetail',
	'articleDetail',
];

test.describe('settings', () => {
	test.skip(() => credentials() === null, 'set ADMIN_EMAIL and ADMIN_PASSWORD to run these');

	test.beforeEach(async ({ page }) => {
		await signIn(page);
	});

	test('the index links every key in the contract exactly once', async ({ page }) => {
		await page.goto('/settings');

		const linked = (await hrefs(page))
			.filter((path) => path.startsWith('/settings/'))
			.map((path) => path.replace('/settings/', ''));

		expect([...new Set(linked)].sort()).toEqual([...KEYS].sort());
		expect(linked).toHaveLength(KEYS.length);
	});

	test('groups them, and reports each one as saved', async ({ page }) => {
		await page.goto('/settings');
		const body = await page.locator('body').innerText();

		for (const group of [
			'Brand and contact',
			'Navigation and chrome',
			'Shared blocks',
			'Contact page',
			'Blog',
			'Page copy — shared, home, and the closing banner',
			'Page copy — listing pages',
			'Page copy — detail pages',
		]) {
			expect(body).toContain(group);
		}

		// Every key, so none should read as unset or stale.
		expect(body).not.toContain('Not set');
		expect(body).not.toContain('Out of date');
	});

	test('every setting opens a form, and an unknown key 404s', async ({ page }) => {
		for (const key of KEYS) {
			const response = await page.goto(`/settings/${key}`);

			expect(response?.status(), `/settings/${key}`).toBe(200);
			await expect(page.locator('h1').first()).not.toBeEmpty();
			expect(await page.locator('form').count()).toBeGreaterThan(0);
		}

		expect((await page.goto('/settings/not-a-setting'))?.status()).toBe(404);
	});

	test('the header and the sidebar agree about which section this is', async ({ page }) => {
		await page.goto('/settings/faqs');

		// Both read the one section list, which is what stops them disagreeing.
		await expect(page.locator('h1').first()).toHaveText('Settings');
		await expect(page.locator('a[href="/settings"]').first()).toHaveAttribute(
			'data-active',
			'true',
		);
	});

	test('the form opens with every stored row', async ({ page }) => {
		await page.goto('/settings');

		const card = page.locator('a[href$="/settings/faqs"]').first();
		const stored = Number.parseInt(
			(await card.innerText()).match(/(\d+)\s+items?/)?.[1] ?? '-1',
			10,
		);

		expect(stored).toBeGreaterThan(0);

		await page.goto('/settings/faqs');

		await expect(page.locator('input[name^="faqs["][name$=".question"]')).toHaveCount(stored);
	});

	test('a value that fails its contract is refused, and nothing is written', async ({ page }) => {
		await page.goto('/settings/site');

		const name = page.locator('input[name="site.name"]');
		const stored = await name.inputValue();

		expect(stored.length).toBeGreaterThan(0);

		// `site.name` is `.min(1)`, so an empty name is refused by the contract rather than by
		// the browser — the input carries no `required`.
		expect(await fillUntilStable(page, name, '')).toBe(true);

		await page.getByRole('button', { name: 'Save' }).click();

		await expect(page.getByText('Nothing was saved.')).toBeVisible();
		// Naming the field is the difference between a refusal that can be acted on and one
		// that looks like a bug.
		await expect(page.getByText(/site_settings\.site → name/)).toBeVisible();

		// The refused submission stays on screen rather than reverting to the stored value.
		await expect(name).toHaveValue('');

		await page.reload();
		await expect(page.locator('input[name="site.name"]')).toHaveValue(stored);
	});

	test('a row can be added, saved and removed again', async ({ page }) => {
		// The one check that writes. It restores what it touched, and runs last.
		test.skip(!process.env.E2E_WRITE, 'set E2E_WRITE=1 to run the write round trip');

		await page.goto('/settings/faqs');

		const questions = page.locator('input[name^="faqs["][name$=".question"]');
		// `answer` is a `words` field, so it renders a `<textarea>`; the contract requires it,
		// and an empty one makes the save a refusal rather than a success.
		const answers = page.locator('[name^="faqs["][name$=".answer"]');
		const before = await questions.count();
		const marker = 'Added by the browser check — safe to delete';

		const added = await clickUntil(
			page,
			page.getByRole('button', { name: /^Add faqs$/ }),
			async () => (await questions.count()) > before,
		);

		expect(added).toBe(true);

		await fillUntilStable(page, questions.last(), marker);
		await fillUntilStable(page, answers.last(), 'It is safe to delete this.');

		await page.getByRole('button', { name: 'Save' }).click();
		await expect(page.getByText(/Saved\. The public site reads this/)).toBeVisible();

		await page.reload();
		await expect(questions).toHaveCount(before + 1);
		await expect(questions.last()).toHaveValue(marker);

		const removed = await clickUntil(
			page,
			page.getByRole('button', { name: /^Remove last$/ }),
			async () => (await questions.count()) === before,
		);

		expect(removed).toBe(true);

		await page.getByRole('button', { name: 'Save' }).click();
		// Wait for the action's response before reloading: a reload issued while the POST is
		// still in flight aborts it, which looks like a failure of the save.
		await expect(page.getByText(/Saved\. The public site reads this/)).toBeVisible();
		await page.reload();

		await expect(questions).toHaveCount(before);
	});
});
