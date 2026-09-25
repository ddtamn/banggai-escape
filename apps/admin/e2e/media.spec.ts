/**
 * The media library.
 *
 * Read-only: uploading and deleting are covered by the server-side rules and their unit
 * tests, and doing either from a check would mutate the library or the bucket.
 */
import { expect, test } from '@playwright/test';
import { credentials, signIn } from './helpers';

test.describe('media', () => {
	test.skip(() => credentials() === null, 'set ADMIN_EMAIL and ADMIN_PASSWORD to run these');

	test.beforeEach(async ({ page }) => {
		await signIn(page);
	});

	test('lists assets and offers every filter', async ({ page }) => {
		await page.goto('/media');

		for (const filter of ['All', 'Uploaded', 'Legacy host', 'Missing alt text', 'Hidden']) {
			await expect(page.getByRole('link', { name: filter })).toBeAttached();
		}

		await expect(page.getByRole('heading', { name: 'Upload an image' })).toBeVisible();
		await expect(page.locator('input[type="file"]')).toBeAttached();

		// Each filter is a real query, and each one has to answer.
		for (const key of ['all', 'owned', 'legacy', 'missing-alt', 'archived']) {
			expect((await page.goto(`/media?filter=${key}`))?.status(), key).toBe(200);
		}
	});

	test('an asset that does not exist 404s rather than crashing', async ({ page }) => {
		const response = await page.goto('/media/00000000-0000-4000-8000-000000000000.jpg');

		expect(response?.status()).toBe(404);
	});

	test('a card offers the reversible action and the destructive one', async ({ page }) => {
		await page.goto('/media');

		// Hiding is the cheap action; deletion is the one behind the reference guard. A check
		// must not click Delete: an asset nothing references would really be removed, and its
		// bytes cannot be put back.
		await expect(page.getByRole('button', { name: 'Hide' }).first()).toBeAttached();
		await expect(page.getByRole('button', { name: 'Delete' }).first()).toBeAttached();
	});

	test('an upload that is not an image is refused before anything is stored', async ({ page }) => {
		// Covers the upload action end to end — including that the form posts to an action the
		// route defines — without writing to the library or the bucket, because validation runs
		// before anything is stored. The action-name mistake that shipped in Phase 3 (a bare
		// `method="post"` reaching a `default` action nobody defined) is exactly what this catches.
		await page.goto('/media');

		await page.locator('input[type="file"]').setInputFiles({
			name: 'notes.txt',
			mimeType: 'text/plain',
			buffer: Buffer.from('this is not an image'),
		});

		await page.getByRole('button', { name: 'Upload' }).click();

		await expect(page.getByText(/Unsupported image format/)).toBeVisible();
	});
});
