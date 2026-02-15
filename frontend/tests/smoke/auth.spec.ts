/**
 * Authentication Smoke Tests
 *
 * Verifies auth pages render correctly with structural assertions.
 * Real Clerk authentication is validated by the CRUD setup project.
 *
 * Visual regression is NOT used for auth pages because the entire visible
 * content is rendered by Clerk's third-party SDK. Clerk can update their
 * component rendering (fonts, icons, spacing, "Development mode" badge)
 * at any time, causing pixel-comparison failures unrelated to app changes.
 * Structural assertions provide more reliable and meaningful coverage.
 *
 * @tags smoke
 */

import { test, expect } from './fixtures';
import { AuthPage } from '../page-objects';

test.describe('Authentication - Smoke Tests', () => {
	test('signin page renders', async ({ page }) => {
		await page.goto('/signin');
		await expect(page).toHaveURL('/signin');
		await expect(page.locator('body')).toBeVisible();
	});

	test('signup page renders', async ({ page }) => {
		await page.goto('/signup');
		await expect(page).toHaveURL('/signup');
		await expect(page.locator('body')).toBeVisible();
	});

	test.describe('Clerk Component Structure', () => {
		test('signin page loads Clerk form with expected elements', async ({ page }) => {
			const authPage = new AuthPage(page);
			await authPage.gotoSignIn();
			await authPage.waitForFullyLoaded();

			// When real Clerk loads, verify key form elements
			if (await authPage.isRealClerk()) {
				// Email input is present and interactive
				await expect(authPage.emailInput).toBeEnabled();

				// Continue button exists
				await expect(authPage.continueButton).toBeVisible();

				// Sign-up link exists for navigation
				const signUpLink = page.getByText('Sign up');
				await expect(signUpLink).toBeVisible();
			} else {
				// Mock fallback rendered — still a valid loaded state
				await expect(authPage.mockComponent).toBeVisible();
			}
		});

		test('signup page loads Clerk form with expected elements', async ({ page }) => {
			const authPage = new AuthPage(page);
			await authPage.gotoSignUp();
			await authPage.waitForFullyLoaded();

			// When real Clerk loads, verify key form elements
			if (await authPage.isRealClerk()) {
				// Email input is present and interactive
				await expect(authPage.emailInput).toBeEnabled();

				// Continue button exists
				await expect(authPage.continueButton).toBeVisible();

				// Sign-in link exists for navigation
				const signInLink = page.getByText('Sign in');
				await expect(signInLink).toBeVisible();
			} else {
				// Mock fallback rendered — still a valid loaded state
				await expect(authPage.mockComponent).toBeVisible();
			}
		});

		test('signin page has correct page structure', async ({ page }) => {
			const authPage = new AuthPage(page);
			await authPage.gotoSignIn();
			await authPage.waitForFullyLoaded();

			// Page uses full-height centered layout
			const wrapper = page.locator('.min-h-screen');
			await expect(wrapper).toBeVisible();

			// No loading state visible (Clerk finished initializing)
			await expect(page.getByText('Loading...')).not.toBeVisible();

			// No redirect state visible (user is not signed in)
			await expect(page.getByText('Redirecting to dashboard...')).not.toBeVisible();
		});

		test('signup page has correct page structure', async ({ page }) => {
			const authPage = new AuthPage(page);
			await authPage.gotoSignUp();
			await authPage.waitForFullyLoaded();

			// Page uses full-height centered layout
			const wrapper = page.locator('.min-h-screen');
			await expect(wrapper).toBeVisible();

			// No loading state visible (Clerk finished initializing)
			await expect(page.getByText('Loading...')).not.toBeVisible();

			// No redirect state visible (user is not signed in)
			await expect(page.getByText('Redirecting to dashboard...')).not.toBeVisible();
		});
	});
});
