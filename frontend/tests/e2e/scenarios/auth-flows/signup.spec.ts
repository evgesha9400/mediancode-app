/**
 * Signup Flow Test
 *
 * Tests the complete user signup flow:
 * 1. Navigate to signup page
 * 2. Fill in registration form
 * 3. Complete signup process
 * 4. Verify redirect to dashboard
 * 5. Cleanup: Delete test user via Clerk Admin API
 *
 * This test creates a real user in Clerk and cleans it up afterward.
 * Uses unique email with test.mediancode.com domain.
 *
 * Requires CLERK_SECRET_KEY environment variable for cleanup.
 *
 * @tags auth-flows
 */

import { test, expect } from '@playwright/test';
import { AuthPage } from '../../page-objects';
import { testEmail, testPassword, deleteUserByEmail } from '../../helpers';

test.describe('Signup Flow', () => {
	let authPage: AuthPage;
	let testUserEmail: string;
	let testUserPassword: string;

	test.beforeAll(() => {
		// Generate unique credentials for this test run
		testUserEmail = testEmail();
		testUserPassword = testPassword();
	});

	test.beforeEach(async ({ page }) => {
		authPage = new AuthPage(page);
	});

	test('Complete signup flow', async ({ page }) => {
		// Step 1: Navigate to signup page
		await authPage.gotoSignUp();

		// Step 2: Wait for Clerk to load
		const isLoaded = await authPage.isClerkLoaded();
		expect(isLoaded).toBe(true);

		// Wait for form to be fully interactive
		await authPage.waitForFullyLoaded();

		// Step 3: Fill in email
		const emailInput = page.locator('input[name="emailAddress"], input[type="email"]').first();
		if (await emailInput.isVisible()) {
			await emailInput.fill(testUserEmail);
		}

		// Step 4: Fill in password
		const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
		if (await passwordInput.isVisible()) {
			await passwordInput.fill(testUserPassword);
		}

		// Some signup forms have first/last name fields
		const firstNameInput = page.locator('input[name="firstName"]').first();
		if (await firstNameInput.isVisible()) {
			await firstNameInput.fill('E2E');
		}

		const lastNameInput = page.locator('input[name="lastName"]').first();
		if (await lastNameInput.isVisible()) {
			await lastNameInput.fill('TestUser');
		}

		// Step 5: Submit signup form
		const submitButton = page.locator('button[type="submit"]').first();
		if (await submitButton.isVisible()) {
			await submitButton.click();
		}

		// Step 6: Handle email verification if required
		// Clerk may send a verification email - check for verification code input
		const verificationInput = page.locator('input[name="code"]').first();
		const hasVerification = await verificationInput.isVisible({ timeout: 5000 }).catch(() => false);

		if (hasVerification) {
			// In test environment, you might:
			// 1. Use a Clerk test instance with verification disabled
			// 2. Use Clerk's development mode magic codes
			// 3. Skip this test if email verification is required

			// For now, we'll note that verification is required
			console.log('Email verification required - test may need Clerk configuration adjustment');

			// Clerk dev instances often allow '424242' or similar test codes
			await verificationInput.fill('424242');
			await submitButton.click();
			await page.waitForTimeout(1000);
		}

		// Step 7: Wait for redirect to dashboard (or post-signup page)
		// Give Clerk time to process the signup
		try {
			await page.waitForURL(
				/\/(dashboard|apis|field-registry|object-builder|types|validators|namespaces|onboarding)/,
				{ timeout: 30000 }
			);

			// Verify we're authenticated
			const url = page.url();
			expect(url).not.toContain('/signin');
			expect(url).not.toContain('/signup');

			console.log(`Signup successful for ${testUserEmail}`);
		} catch {
			// If we're still on signup page, check for errors
			const hasError = await authPage.hasError();
			if (hasError) {
				const errorText = await authPage.getErrorText();
				console.log(`Signup error: ${errorText}`);
			}

			// Test might fail here if verification is required
			throw new Error('Signup did not complete - check Clerk configuration');
		}
	});

	test.afterAll(async () => {
		// Cleanup: Delete the test user via Clerk Admin API
		try {
			if (process.env.CLERK_SECRET_KEY) {
				const deleted = await deleteUserByEmail(testUserEmail);
				if (deleted) {
					console.log(`Cleaned up test user: ${testUserEmail}`);
				}
			} else {
				console.log('CLERK_SECRET_KEY not set - skipping user cleanup');
				console.log(`Manual cleanup may be required for: ${testUserEmail}`);
			}
		} catch (error) {
			console.error('Failed to cleanup test user:', error);
		}
	});
});
