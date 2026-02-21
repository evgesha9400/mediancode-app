/**
 * Auth Setup for E2E Tests
 *
 * Uses @clerk/testing's emailAddress-based sign-in which creates a sign-in
 * token via the Clerk Backend API (requires CLERK_SECRET_KEY). This approach
 * bypasses 2FA and device verification, making it reliable for CI/CD.
 *
 * The session state is saved for reuse by other test projects.
 *
 * Required environment variables:
 * - E2E_TEST_USER_EMAIL
 * - E2E_TEST_USER_PASSWORD
 * - PUBLIC_CLERK_PUBLISHABLE_KEY
 * - CLERK_SECRET_KEY (used by @clerk/testing for testing tokens)
 *
 * Session state is saved to tests/e2e/.auth/user.json
 */

import { test as setup, expect } from '../fixtures';
import { clerk } from '@clerk/testing/playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const AUTH_FILE = path.join(__dirname, '..', '.auth', 'user.json');

/**
 * Validate all environment variables required by setup and CRUD tests.
 * Reports each missing variable individually for easy diagnosis.
 * Since the crud project depends on setup (via Playwright dependencies),
 * failing here prevents CRUD tests from running with missing credentials.
 */
function getTestCredentials(): { email: string; password: string } {
	const required: Record<string, string | undefined> = {
		E2E_TEST_USER_EMAIL: process.env.E2E_TEST_USER_EMAIL,
		E2E_TEST_USER_PASSWORD: process.env.E2E_TEST_USER_PASSWORD,
		PUBLIC_API_BASE_URL: process.env.PUBLIC_API_BASE_URL
	};

	const missing = Object.entries(required)
		.filter(([, value]) => !value)
		.map(([key]) => key);

	if (missing.length > 0) {
		const varList = missing.map((v) => `  - ${v}`).join('\n');
		throw new Error(
			`Missing required environment variables for E2E tests:\n${varList}\n\n` +
				`Set these in your .env file (see .env for documentation).\n` +
				`In CI, set them as GitHub Actions secrets/variables.\n\n` +
				`Note: CRUD tests depend on this setup project and will be skipped.`
		);
	}

	return {
		email: required.E2E_TEST_USER_EMAIL!,
		password: required.E2E_TEST_USER_PASSWORD!
	};
}

setup('authenticate test user', async ({ page }) => {
	// clerkSetup() is called in global-setup.ts (sets CLERK_FAPI + CLERK_TESTING_TOKEN)
	const { email } = getTestCredentials();
	console.log(`Authenticating test user: ${email}`);

	// Navigate to landing page (not /signin) to load Clerk without the
	// mounted <SignIn> component, which blocks programmatic sign-in state updates.
	await page.goto('/');
	await page.waitForLoadState('networkidle', { timeout: 15_000 });

	// Sign in using emailAddress-based approach (creates sign-in token via
	// Clerk Backend API, bypasses 2FA and device verification).
	// This matches the authenticatedTest fixture pattern.
	await clerk.signIn({
		page,
		emailAddress: email
	});

	// Wait for Clerk's post-sign-in requests (session sync) to complete
	await page.waitForLoadState('networkidle', { timeout: 15_000 });

	// Navigate to dashboard and verify authenticated session persists
	await page.goto('/dashboard');
	await page.waitForLoadState('networkidle', { timeout: 15_000 });

	// Save session state
	await page.context().storageState({ path: AUTH_FILE });
	expect(page.url()).not.toContain('/signin');

	console.log(`Session state saved and verified: ${AUTH_FILE}`);
});
