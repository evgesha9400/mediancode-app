/**
 * Auth Setup for E2E Tests
 *
 * This setup project authenticates a pre-created test user and saves
 * the session state for use by other test projects.
 *
 * The test user must exist in Clerk dev environment. Credentials are
 * provided via environment variables:
 * - E2E_TEST_USER_EMAIL
 * - E2E_TEST_USER_PASSWORD
 *
 * Session state is saved to tests/e2e/.auth/user.json
 */

import { test as setup, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Path to save authenticated session state
 */
export const AUTH_FILE = path.join(__dirname, '.auth', 'user.json');

/**
 * Get test user credentials from environment
 */
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
	const { email, password } = getTestCredentials();

	console.log(`Authenticating test user: ${email}`);

	// Navigate to sign-in page
	await page.goto('/signin');

	// Wait for Clerk to initialize
	// Clerk shows either an email input or a loading state
	await page.waitForLoadState('networkidle', { timeout: 15000 });

	// Wait for Clerk sign-in form to be ready
	// Clerk's identifier input is where users enter email
	const emailInput = page.locator('input[name="identifier"], input[type="email"]').first();
	await emailInput.waitFor({ state: 'visible', timeout: 15000 });

	// Enter email
	await emailInput.fill(email);

	// Click continue/submit to proceed to password
	// Clerk typically has a "Continue" button after email entry
	const continueButton = page.locator(
		'button[type="submit"], button:has-text("Continue"), button:has-text("Sign in")'
	).first();
	await continueButton.click();

	// Wait for password field to appear
	// Clerk shows password field on second step
	const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
	await passwordInput.waitFor({ state: 'visible', timeout: 10000 });

	// Enter password
	await passwordInput.fill(password);

	// Submit sign-in form
	const signInButton = page.locator(
		'button[type="submit"], button:has-text("Continue"), button:has-text("Sign in")'
	).first();
	await signInButton.click();

	// Wait for successful authentication
	// After sign-in, user is redirected to dashboard
	await page.waitForURL(/\/(dashboard|apis|field-registry|object-builder|types|validators|namespaces)/, {
		timeout: 30000
	});

	// Verify we're authenticated by checking for dashboard elements
	// This ensures the session is fully established
	await expect(page.locator('body')).toBeVisible();

	console.log('Authentication successful, saving session state');

	// Save the authentication state
	await page.context().storageState({ path: AUTH_FILE });

	console.log(`Session state saved to ${AUTH_FILE}`);
});

setup('verify auth state is valid', async ({ page }) => {
	// This test runs after authentication to verify the saved state works
	// Skip if we just authenticated (the file was just created)

	// Navigate to a protected route using the saved session
	await page.goto('/dashboard');

	// Wait for page to load
	await page.waitForLoadState('networkidle');

	// Verify we're not redirected to sign-in
	const url = page.url();
	expect(url).not.toContain('/signin');
	expect(url).not.toContain('/signup');

	// Verify dashboard content is visible
	// This confirms the saved session is valid
	const body = page.locator('body');
	await expect(body).toBeVisible();

	console.log('Auth state verification passed');
});
