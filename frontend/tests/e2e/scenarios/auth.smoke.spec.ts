/**
 * Authentication Smoke Tests
 *
 * Fast, critical path tests for authentication flows.
 * These run on every PR to catch major regressions.
 *
 * NOTE: Clerk widget tests are skipped in CI when using placeholder key.
 * Page load and navigation tests still run to catch routing issues.
 *
 * @tags smoke
 */

import { test, expect } from '@playwright/test';
import { AuthPage } from '../page-objects';

// Check if we're running with a real Clerk key or placeholder
const hasRealClerkKey =
	process.env.PUBLIC_CLERK_PUBLISHABLE_KEY &&
	!process.env.PUBLIC_CLERK_PUBLISHABLE_KEY.includes('placeholder');

test.describe('Authentication - Smoke Tests', () => {
	let authPage: AuthPage;

	test.describe('Sign In Page', () => {
		test.beforeEach(async ({ page }) => {
			authPage = new AuthPage(page);
			await authPage.gotoSignIn();
		});

		test('should load sign in page', async ({ page }) => {
			// Should be on sign in page
			await expect(page).toHaveURL('/signin');
		});

		test('should display Clerk component', async ({ page }) => {
			// Skip Clerk widget test if using placeholder key
			test.skip(!hasRealClerkKey, 'Clerk widget test requires real API key');

			// Clerk container should be visible
			const isLoaded = await authPage.isClerkLoaded();

			// Assert Clerk loaded successfully
			expect(isLoaded).toBe(true);

			// Verify page title or heading is present
			await expect(page.locator('body')).toBeVisible();
		});
	});

	test.describe('Sign Up Page', () => {
		test.beforeEach(async ({ page }) => {
			authPage = new AuthPage(page);
			await authPage.gotoSignUp();
		});

		test('should load sign up page', async ({ page }) => {
			// Should be on sign up page
			await expect(page).toHaveURL('/signup');
		});

		test('should display Clerk component', async ({ page }) => {
			// Skip Clerk widget test if using placeholder key
			test.skip(!hasRealClerkKey, 'Clerk widget test requires real API key');

			// Verify Clerk loads on signup page
			const isLoaded = await authPage.isClerkLoaded();

			// Assert Clerk loaded successfully
			expect(isLoaded).toBe(true);

			// Verify page body is visible
			await expect(page.locator('body')).toBeVisible();
		});
	});

	test.describe('Navigation Between Auth Pages', () => {
		test('should navigate from sign in to sign up', async ({ page }) => {
			authPage = new AuthPage(page);
			await authPage.gotoSignIn();

			// Verify we start on sign in page
			await expect(page).toHaveURL('/signin');

			// Navigate to sign up
			await page.goto('/signup');

			// Verify we're now on sign up page
			await expect(page).toHaveURL('/signup');
		});
	});
});
