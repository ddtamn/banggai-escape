/**
 * The content screens: list, detail, preview, and the save-is-not-publish rule.
 *
 * This is the journey that was verified by hand in Phase 3 and never committed, and it is
 * worth committing for a specific reason: the bug it originally caught was both content
 * forms posting to a `default` action the routes did not define, so "Save draft" returned a
 * 404. Nothing in `svelte-check` sees that — a form's `action` attribute is a string, and
 * the action it names is checked at runtime, by a browser, on a click.
 *
 * So this file is mostly about **wiring**: that a form posts to an action the route really
 * defines, that the guard is in front of all of it, and that a refusal comes back as a
 * refusal rather than as a crash.
 *
 * The last test writes, so it is behind `E2E_WRITE=1` and it deletes what it created. Every
 * other test is read-only apart from one refusal, which by definition writes nothing.
 */
import { expect, type Page, test } from '@playwright/test';
import { credentials, fillUntilStable, signIn } from './helpers';

/**
 * The rows of a content list.
 *
 * Located by what a row *says* rather than by its link, because `resolve()` is relative
 * before hydration and absolute after it — so a selector built on the href matches the list
 * on one render and nothing on the next. Every row carries its position and revision count,
 * which makes that text a stable handle.
 */
function rows(page: Page) {
	return page.locator('li').filter({ hasText: /· position \d+ ·/ });
}

/** The link to one entry, by its position in the list. */
function entryLink(page: Page, index = 0) {
	return rows(page).nth(index).getByRole('link').first();
}

test.describe('content', () => {
	test.skip(() => credentials() === null, 'set ADMIN_EMAIL and ADMIN_PASSWORD to run these');

	test.beforeEach(async ({ page }) => {
		await signIn(page);
	});

	test('the list for each kind opens, with its status filters', async ({ page }) => {
		for (const [kind, heading] of [
			['package', 'Package items'],
			['destination', 'Destination items'],
			['article', 'Article items'],
		]) {
			await page.goto(`/content/${kind}`);

			// Matched by name, not just level: the shell's header is an `h1` too, and the
			// page's own heading is the more specific one.
			await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();

			// Every state the derived status can produce has a filter, and "All" is one of
			// them — a missing key would render a filter with no count beside it.
			for (const filter of ['All', 'Draft', 'Published', 'Unpublished changes', 'Archived']) {
				await expect(page.getByRole('link', { name: new RegExp(`^${filter} \\(`) })).toBeVisible();
			}
		}
	});

	test('a search narrows the list, and a filter is part of the address', async ({ page }) => {
		await page.goto('/content/package');

		const before = await rows(page).count();

		expect(before).toBeGreaterThan(0);

		// `fillUntilStable`, not `fill`: a value typed before hydration is silently restored
		// from the server-rendered attribute, so the search that follows proves nothing.
		expect(await fillUntilStable(page, page.locator('input[name="q"]'), 'paisu')).toBe(true);

		await page.getByRole('button', { name: 'Search' }).click();
		await page.waitForURL(/q=paisu/);

		const after = await rows(page).count();

		expect(after).toBeGreaterThan(0);
		expect(after).toBeLessThan(before);

		// The status filter is a link, so it can be bookmarked and shared — and it says which
		// one is active rather than only looking like it.
		await page.goto('/content/package?status=published');
		await expect(page.getByRole('link', { name: /^Published \(/ })).toHaveAttribute(
			'aria-current',
			'true',
		);
	});

	test('a published item opens, shows its revision, and previews', async ({ page }) => {
		await page.goto('/content/package');

		// Clicked rather than followed by href: `resolve()` is relative before hydration, so
		// reading an href off the server-rendered DOM and resolving it against the page URL
		// drops the `/package` segment. A click is also the journey being checked.
		//
		// `waitForURL` rather than `clickUntil`: this is a navigation, and Playwright already
		// polls for one with the whole test timeout behind it. The retry helper is for
		// *effects on the same page*; using it here spent the entire budget re-clicking a
		// link that had already worked.
		await entryLink(page).click();
		await page.waitForURL(/\/content\/package\/[a-z0-9-]+$/);

		// Scoped to the Publishing section rather than the whole page: a hint elsewhere on
		// the screen also says "visitors see", so a page-wide text match is ambiguous.
		const publishing = page
			.locator('section')
			.filter({ has: page.getByRole('heading', { name: 'Publishing' }) });

		// The screen states, in the service's own words, which version visitors are served.
		await expect(
			publishing.getByText(
				/never been published|which is what visitors see|identical|Archived\. Restore it/,
			),
		).toBeVisible();
		await expect(page.getByRole('button', { name: /^Publish( changes)?$/ })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Unpublish' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Save draft' })).toBeVisible();

		// Revision history is on the same screen, because "what is live" and "what else
		// exists" are one question.
		await expect(page.getByRole('heading', { name: 'Revision history' })).toBeVisible();

		const preview = page.getByRole('link', { name: 'Preview draft' });

		await expect(preview).toBeVisible();
		await preview.click();

		await expect(page).toHaveURL(/\/preview$/);
		// Named, not just "level 1": the shell's header is an `h1` too.
		await expect(page.getByRole('heading', { level: 1, name: 'Draft preview' })).toBeVisible();
	});

	test('an unknown slug 404s by name rather than crashing', async ({ page }) => {
		const response = await page.goto('/content/package/no-such-package');

		expect(response?.status()).toBe(404);
		await expect(page.getByText(/does not exist/i)).toBeVisible();
	});

	test('an unknown kind 404s', async ({ page }) => {
		const response = await page.goto('/content/timetable');

		expect(response?.status()).toBe(404);
	});

	test('the new screen opens empty, with no publish control yet', async ({ page }) => {
		await page.goto('/content/package/new');

		await expect(page.locator('input[name="slug"]')).toHaveValue('');
		await expect(page.locator('input[name="title"]')).toHaveValue('');
		await expect(page.getByRole('button', { name: 'Save draft' })).toBeVisible();

		// There is no publish control here: a draft that does not exist yet cannot be
		// published, and offering the button would only produce an error.
		await expect(page.getByRole('button', { name: /^Publish/ })).toHaveCount(0);
	});

	test('a slug the browser will not accept never leaves the form', async ({ page }) => {
		await page.goto('/content/package/new');

		expect(await fillUntilStable(page, page.locator('input[name="slug"]'), 'Not A Slug')).toBe(
			true,
		);
		expect(
			await fillUntilStable(page, page.locator('input[name="title"]'), 'Should never exist'),
		).toBe(true);

		// The slug field carries the contract's own `pattern`, so the browser refuses the
		// submission itself and the request never leaves. That is the first of two guards and
		// the one a person meets; the server's `slugSchema` check is the second, for a direct
		// post, and it is covered by `forms.spec.ts` and the action rather than from here.
		const slug = page.locator('input[name="slug"]');

		// `checkValidity` rather than `toBeInvalid()`, which this Playwright does not have:
		// the field's own account of whether it would pass, and the reason the submission
		// below never leaves the browser.
		expect(await slug.evaluate((field: HTMLInputElement) => field.checkValidity())).toBe(false);

		await page.getByRole('button', { name: 'Save draft' }).click();

		// Still on the form, with what was typed still in place.
		await expect(page).toHaveURL(/\/content\/package\/new$/);
		await expect(slug).toHaveValue('Not A Slug');

		// And nothing was created.
		await page.goto('/content/package?q=should-never-exist');
		// Not an exact match: the empty state appends "Try another filter." when a search is
		// active, and asserting the whole sentence would pin whichever branch this took.
		await expect(page.getByText('Nothing to show', { exact: false })).toBeVisible();
	});

	test('create, save a draft, be refused a publish, then delete it again', async ({ page }) => {
		// The one check that writes. It creates an entry and deletes it, so it is gated and
		// it runs last.
		test.skip(!process.env.E2E_WRITE, 'set E2E_WRITE=1 to run the write round trip');

		// The longest journey in the suite by some way: sign-in, three form fills that each
		// wait out hydration, a save, a refused publish, a filtered list and a delete. The
		// default 60s budget runs out mid-way and the failure reads as a navigation error
		// rather than as "too slow".
		test.setTimeout(180_000);

		const slug = 'browser-check-draft';

		// A slug and nothing else. This is the rule the whole screen is built around:
		// saving a draft never validates, so a half-finished edit can be parked.
		await page.goto('/content/package/new');
		expect(await fillUntilStable(page, page.locator('input[name="slug"]'), slug)).toBe(true);
		await page.getByRole('button', { name: 'Save draft' }).click();
		await page.waitForURL(new RegExp(`/content/package/${slug}$`));

		// No "Draft saved" notice here: creating redirects to the new entry's page, and a
		// redirect cannot carry an action's message with it. The notice is asserted on the
		// save below, which stays put.
		await expect(page.getByText(/never been published/)).toBeVisible();
		await expect(page.getByRole('heading', { level: 1, name: slug })).toBeVisible();

		// Saving again on the entry's own page is the path that stays put, and it is the one
		// an administrator uses from here on.
		await page.getByRole('button', { name: 'Save draft' }).click();
		await expect(page.getByText(/Draft saved/)).toBeVisible();

		// Publishing is the gate, and it refuses with the fields it wants — named in the
		// `scope → field: message` shape `formatIssues` renders, so a renamed field is the
		// thing the refusal points at.
		await page.getByRole('button', { name: /^Publish( changes)?$/ }).click();
		await expect(page.getByText(/Cannot publish yet/)).toBeVisible();
		await expect(page.getByText(/^package → title:/)).toBeVisible();

		// The refusal wrote nothing: this is still a draft, not a revision.
		await page.reload();
		await expect(page.getByText(/never been published/)).toBeVisible();

		// And the list agrees: one row for the search, and the entry in it. Matched by role
		// because the slug appears twice in a row — as the link's text and in `/{slug} · …`.
		await page.goto(`/content/package?q=${slug}`);
		await expect(rows(page)).toHaveCount(1);
		await expect(page.getByRole('link', { name: slug })).toBeVisible();

		// Clean up, and prove it the direct way: the entry's own page stops existing.
		//
		// Not by counting the list back to zero. A form action revalidates the list, and the
		// revalidated request can come back without the search, at which point a list that
		// "still has rows" is the eight real packages rather than the leftover one — and a
		// retry loop clicking Delete in that state would aim at whichever entry happened to
		// be first. The entry's URL answers the question without either hazard.
		await page.getByRole('button', { name: 'Delete' }).first().click();

		await expect
			.poll(async () => (await page.goto(`/content/package/${slug}`))?.status(), {
				message: 'the deleted entry should stop resolving',
			})
			.toBe(404);
	});
});
