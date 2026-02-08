/**
 * Auth Setup for E2E Tests
 *
 * Uses @clerk/testing to sign in programmatically via clerk.signIn(),
 * bypassing the UI form flow and device verification. The session
 * state is saved for reuse by other test projects.
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

function getTestCredentials(): { email: string; password: string } {
	const email = process.env.E2E_TEST_USER_EMAIL;
	const password = process.env.E2E_TEST_USER_PASSWORD;

	if (!email || !password) {
		throw new Error(
			'E2E_TEST_USER_EMAIL and E2E_TEST_USER_PASSWORD environment variables are required.\n' +
				'These should be set to credentials of a pre-created test user in Clerk dev environment.'
		);
	}

	return { email, password };
}

setup('authenticate test user', async ({ page }) => {
	// clerkSetup() is called in global-setup.ts (sets CLERK_FAPI + CLERK_TESTING_TOKEN)
	const { email, password } = getTestCredentials();
	console.log(`Authenticating test user: ${email}`);

	// Navigate to signin page so Clerk JS loads (signin page redirects on auth)
	await page.goto('/signin');
	await page.waitForLoadState('networkidle', { timeout: 15_000 });

	// Sign in programmatically via Clerk SDK (not the UI form)
	await clerk.signIn({
		page,
		signInParams: {
			strategy: 'password',
			identifier: email,
			password: password
		}
	});

	// Navigate to dashboard and verify authenticated session
	await page.goto('/dashboard');
	await page.waitForLoadState('networkidle', { timeout: 15_000 });

	// Save session state
	await page.context().storageState({ path: AUTH_FILE });
	expect(page.url()).not.toContain('/signin');

	console.log(`Session state saved and verified: ${AUTH_FILE}`);
});
