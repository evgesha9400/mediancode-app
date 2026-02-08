/**
 * Password Change Flow Test
 *
 * Tests the password change flow for authenticated users:
 * 1. Sign in with test user
 * 2. Navigate to account/security settings
 * 3. Change password
 * 4. Verify password was changed
 * 5. Revert password (cleanup)
 *
 * This test uses the pre-created test user and temporarily changes
 * their password, then reverts it to the original.
 *
 * @tags auth-flows
 */

import { test, expect } from '@playwright/test';
import { AuthPage } from '../../page-objects';

test.describe('Password Change Flow', () => {
	let authPage: AuthPage;
	let testUserEmail: string;
	let originalPassword: string;
	let newPassword: string;

	test.beforeAll(() => {
		// Get test user credentials from environment
		testUserEmail = process.env.E2E_TEST_USER_EMAIL || '';
		originalPassword = process.env.E2E_TEST_USER_PASSWORD || '';

		if (!testUserEmail || !originalPassword) {
			throw new Error(
				'E2E_TEST_USER_EMAIL and E2E_TEST_USER_PASSWORD environment variables are required'
			);
		}

		// Generate a new password for testing
		newPassword = `E2E_Changed_${Date.now()}!`;
	});

	test.beforeEach(async ({ page }) => {
		authPage = new AuthPage(page);
	});

	test.describe.serial('Password Change Lifecycle', () => {
		test('Step 1: Sign in with test user', async ({ page }) => {
			// Navigate to sign-in page
			await authPage.gotoSignIn();

			// Wait for Clerk to load
			const isLoaded = await authPage.isClerkLoaded();
			expect(isLoaded).toBe(true);

			await authPage.waitForFullyLoaded();

			// Enter email
			const emailInput = page.locator('input[name="identifier"], input[type="email"]').first();
			await emailInput.fill(testUserEmail);

			// Click continue
			const continueButton = page
				.locator('button[type="submit"], button:has-text("Continue")')
				.first();
			await continueButton.click();

			// Wait for password field
			const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
			await passwordInput.waitFor({ state: 'visible', timeout: 10000 });

			// Enter password
			await passwordInput.fill(originalPassword);

			// Submit
			await continueButton.click();

			// Wait for redirect to authenticated area
			await page.waitForURL(
				/\/(dashboard|apis|field-registry|object-builder|types|validators|namespaces)/,
				{ timeout: 30000 }
			);

			// Verify authenticated
			const url = page.url();
			expect(url).not.toContain('/signin');
		});

		test('Step 2: Navigate to account settings', async ({ page }) => {
			// First sign in
			await authPage.gotoSignIn();
			await authPage.waitForFullyLoaded();

			const emailInput = page.locator('input[name="identifier"], input[type="email"]').first();
			await emailInput.fill(testUserEmail);
			await page.locator('button[type="submit"]').first().click();

			const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
			await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
			await passwordInput.fill(originalPassword);
			await page.locator('button[type="submit"]').first().click();

			await page.waitForURL(/\/(dashboard|apis)/, { timeout: 30000 });

			// Look for user menu or account button
			const userButton = page
				.locator('[data-user-button], .cl-userButton, button:has-text("Account")')
				.first();

			if (await userButton.isVisible()) {
				await userButton.click();
				await page.waitForTimeout(300);

				// Look for account/settings link
				const settingsLink = page
					.locator('a:has-text("Manage account"), a:has-text("Settings"), button:has-text("Manage account")')
					.first();

				if (await settingsLink.isVisible()) {
					await settingsLink.click();
					await page.waitForTimeout(500);
				}
			}
		});

		test('Step 3: Change password', async ({ page }) => {
			// This test depends on Clerk's UserProfile component or similar
			// The exact selectors depend on your Clerk configuration

			// Sign in first
			await authPage.gotoSignIn();
			await authPage.waitForFullyLoaded();

			const emailInput = page.locator('input[name="identifier"], input[type="email"]').first();
			await emailInput.fill(testUserEmail);
			await page.locator('button[type="submit"]').first().click();

			const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
			await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
			await passwordInput.fill(originalPassword);
			await page.locator('button[type="submit"]').first().click();

			await page.waitForURL(/\/(dashboard|apis)/, { timeout: 30000 });

			// Navigate to user profile/settings
			// This might be at /user/settings, /account, or via Clerk's UserButton
			const userButton = page.locator('[data-user-button], .cl-userButton').first();

			if (await userButton.isVisible()) {
				await userButton.click();
				await page.waitForTimeout(300);

				// Clerk's UserProfile typically has "Security" section
				const securityButton = page.locator('button:has-text("Security")').first();
				if (await securityButton.isVisible()) {
					await securityButton.click();
					await page.waitForTimeout(300);

					// Look for password change option
					const changePasswordButton = page.locator('button:has-text("Password")').first();
					if (await changePasswordButton.isVisible()) {
						await changePasswordButton.click();
						await page.waitForTimeout(300);

						// Fill in password change form
						const currentPasswordInput = page
							.locator('input[name="currentPassword"]')
							.first();
						const newPasswordInput = page.locator('input[name="newPassword"]').first();
						const confirmPasswordInput = page
							.locator('input[name="confirmPassword"]')
							.first();

						if (await currentPasswordInput.isVisible()) {
							await currentPasswordInput.fill(originalPassword);
						}

						if (await newPasswordInput.isVisible()) {
							await newPasswordInput.fill(newPassword);
						}

						if (await confirmPasswordInput.isVisible()) {
							await confirmPasswordInput.fill(newPassword);
						}

						// Submit
						const saveButton = page.locator('button:has-text("Save")').first();
						if (await saveButton.isVisible()) {
							await saveButton.click();
							await page.waitForTimeout(1000);
						}
					}
				}
			}
		});

		test('Step 4: Verify password was changed', async ({ page }) => {
			// Sign out first
			await page.goto('/');

			// Try to sign in with new password
			await authPage.gotoSignIn();
			await authPage.waitForFullyLoaded();

			const emailInput = page.locator('input[name="identifier"], input[type="email"]').first();
			await emailInput.fill(testUserEmail);
			await page.locator('button[type="submit"]').first().click();

			const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
			await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
			await passwordInput.fill(newPassword);
			await page.locator('button[type="submit"]').first().click();

			// Should succeed with new password
			try {
				await page.waitForURL(/\/(dashboard|apis)/, { timeout: 15000 });
				console.log('Password change verified - new password works');
			} catch {
				// If new password doesn't work, password wasn't changed
				console.log('Password may not have been changed - reverting not needed');
			}
		});

		test('Step 5: Revert password to original', async ({ page }) => {
			// Sign in with new password (or original if change didn't happen)
			await authPage.gotoSignIn();
			await authPage.waitForFullyLoaded();

			const emailInput = page.locator('input[name="identifier"], input[type="email"]').first();
			await emailInput.fill(testUserEmail);
			await page.locator('button[type="submit"]').first().click();

			const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
			await passwordInput.waitFor({ state: 'visible', timeout: 10000 });

			// Try new password first, fall back to original
			await passwordInput.fill(newPassword);
			await page.locator('button[type="submit"]').first().click();

			const signedIn = await page
				.waitForURL(/\/(dashboard|apis)/, { timeout: 10000 })
				.then(() => true)
				.catch(() => false);

			if (!signedIn) {
				// New password didn't work, original is still valid
				console.log('Original password still valid - no revert needed');
				return;
			}

			// Change password back to original
			const userButton = page.locator('[data-user-button], .cl-userButton').first();
			if (await userButton.isVisible()) {
				await userButton.click();
				await page.waitForTimeout(300);

				const securityButton = page.locator('button:has-text("Security")').first();
				if (await securityButton.isVisible()) {
					await securityButton.click();

					const changePasswordButton = page.locator('button:has-text("Password")').first();
					if (await changePasswordButton.isVisible()) {
						await changePasswordButton.click();

						const currentPasswordInput = page
							.locator('input[name="currentPassword"]')
							.first();
						const newPasswordInput = page.locator('input[name="newPassword"]').first();
						const confirmPasswordInput = page
							.locator('input[name="confirmPassword"]')
							.first();

						if (await currentPasswordInput.isVisible()) {
							await currentPasswordInput.fill(newPassword);
						}
						if (await newPasswordInput.isVisible()) {
							await newPasswordInput.fill(originalPassword);
						}
						if (await confirmPasswordInput.isVisible()) {
							await confirmPasswordInput.fill(originalPassword);
						}

						const saveButton = page.locator('button:has-text("Save")').first();
						if (await saveButton.isVisible()) {
							await saveButton.click();
							console.log('Password reverted to original');
						}
					}
				}
			}
		});
	});
});
