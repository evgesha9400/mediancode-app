/**
 * Smoke Test Fixtures
 *
 * Extends the base Playwright test with Clerk testing token injection.
 * All smoke tests should import { test, expect } from this file
 * instead of from '@playwright/test'.
 *
 * Without setupClerkTestingToken, the Clerk JS SDK in the browser does
 * not enter testing mode. This causes:
 * - $clerkState.isLoaded stays false (sign-in link hidden on landing page)
 * - Auth pages show "Loading..." instead of rendering the Clerk form
 * - Pages never reach networkidle due to Clerk polling
 *
 * The global setup (tests/e2e/global-setup.ts) calls clerkSetup() which
 * obtains the testing token. This fixture injects that token into each
 * browser page so Clerk initializes instantly in testing mode.
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
