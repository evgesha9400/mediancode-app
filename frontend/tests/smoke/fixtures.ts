/**
 * Smoke Test Fixtures — Clerk Testing Token Injection
 *
 * Extends the base Playwright test with Clerk testing token injection.
 * Import from this file ONLY for tests that require Clerk to operate in
 * testing mode (e.g., programmatic sign-in). Smoke tests should import
 * directly from '@playwright/test' and use state-based waits for
 * Clerk-dependent elements (waitFor({ state: 'visible' })).
 *
 * The testing token adds network overhead and can cause Clerk
 * initialization to hang in CI, especially under parallel workers.
 *
 * Currently unused by smoke tests — kept for future auth-dependent tests.
 */

import { test as base, expect } from '@playwright/test';
import { setupClerkTestingToken } from '@clerk/testing/playwright';

export const test = base.extend({
	page: async ({ page }, use) => {
		await setupClerkTestingToken({ page });
		await use(page);
	}
});

export { expect };
