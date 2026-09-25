/**
 * The admin's browser checks.
 *
 * These drive a real Chromium against `vite dev` and a real database, which is the only way
 * to cover the things `svelte-check` and Vitest cannot see: that a form posts to an action
 * the route actually defines, that the guard redirects, and that the theme toggle flips
 * without a reload. The suite that shipped in Phase 3 was thrown away after each run, and
 * the one bug it caught — both content forms posting to a `default` action the routes did
 * not define, so "Save draft" 404'd — was exactly the kind that only shows up here.
 *
 * It needs a database and an administrator, so it is **not** part of `pnpm test`. Set
 * `ADMIN_EMAIL` and `ADMIN_PASSWORD` to run it; without them every signed-in check is
 * skipped rather than failed, and the anonymous ones still run:
 *
 *   ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=… pnpm --filter @banggai/admin test:e2e
 *
 * It is intended for a development database. The suite is read-only apart from one refusal
 * (a save that must be rejected, so nothing is written), and it never deletes anything.
 */
import { defineConfig, devices } from '@playwright/test';

const PORT = 5173;

export default defineConfig({
	testDir: './e2e',
	// One worker: the checks share a database and a dev server, and a UI action in one file
	// must not land between the load and the assertion of another.
	workers: 1,
	fullyParallel: false,
	forbidOnly: Boolean(process.env.CI),
	retries: 0,
	reporter: process.env.CI ? 'github' : 'list',
	timeout: 60_000,
	expect: { timeout: 10_000 },

	use: {
		baseURL: `http://127.0.0.1:${PORT}`,
		trace: 'retain-on-failure',
		// `/dev/shm` is 64 MB in the container this was written in, and Chromium's renderer
		// crashes with "Page crashed" when it runs out — which looks like a test bug.
		launchOptions: { args: ['--disable-dev-shm-usage'] },
	},

	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

	webServer: {
		command: `pnpm exec vite dev --port ${PORT} --strictPort --host 127.0.0.1`,
		url: `http://127.0.0.1:${PORT}/login`,
		reuseExistingServer: !process.env.CI,
		timeout: 120_000,
	},
});
