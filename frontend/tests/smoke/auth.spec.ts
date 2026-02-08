/**
 * Authentication Smoke Tests
 *
 * Fast, critical path tests for authentication flows.
 * These run on every PR to catch major regressions.
 *
 * NOTE: Tests verify that auth pages load correctly and render either:
 * - The real Clerk widget (when proper API keys are available)
 * - A loading state (when Clerk is initializing)
 * - A mock component (when running in mock mode)
 *
 * @tags smoke
 */

import { test, expect } from '@playwright/test';
import { AuthPage } from '../page-objects';

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

		test('should display Clerk component or loading state', async ({ page }) => {
			// Wait for page to stabilize and Clerk to attempt initialization
			// The page should either show Clerk widget, mock component, or loading state
			const isLoaded = await authPage.isClerkLoaded();
			expect(isLoaded).toBe(true);

			// Verify page rendered properly (body visible and basic structure present)
			await expect(page.locator('body')).toBeVisible();

			// Verify auth content is present - should show one of:
			// - "Mock Sign In" (mock mode)
			// - "Loading..." (Clerk initializing)
			// - Clerk widget (real mode)
			const hasMockSignIn = await page.locator('text=Mock Sign In').isVisible();
			const hasLoading = await page.locator('text=Loading...').isVisible();
			const hasClerkWidget = await page.locator('.cl-signIn-root, .cl-component').isVisible();

			expect(hasMockSignIn || hasLoading || hasClerkWidget).toBe(true);
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

		test('should display Clerk component or loading state', async ({ page }) => {
			// Wait for page to stabilize and Clerk to attempt initialization
			const isLoaded = await authPage.isClerkLoaded();
			expect(isLoaded).toBe(true);

			// Verify page rendered properly
			await expect(page.locator('body')).toBeVisible();

			// Verify auth content is present - should show one of:
			// - "Mock Sign Up" (mock mode)
			// - "Loading..." (Clerk initializing)
			// - Clerk widget (real mode)
			const hasMockSignUp = await page.locator('text=Mock Sign Up').isVisible();
			const hasLoading = await page.locator('text=Loading...').isVisible();
			const hasClerkWidget = await page.locator('.cl-signUp-root, .cl-component').isVisible();

			expect(hasMockSignUp || hasLoading || hasClerkWidget).toBe(true);
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

	test.describe('Visual Regression', () => {
		test('signin page should have correct appearance', async ({ page }) => {
			test.skip(process.platform !== 'darwin', 'Visual regression baselines only exist for macOS');

			const authPageObj = new AuthPage(page);
			await authPageObj.gotoSignIn();

			// Wait for the Clerk form to be fully loaded with OAuth providers and inputs
			const fullyLoaded = await authPageObj.waitForFullyLoaded();
			expect(fullyLoaded).toBe(true);

			// Additional wait to ensure any animations have completed
			await page.waitForTimeout(500);

			await expect(page).toHaveScreenshot('signin-full-page.png', {
				fullPage: true,
				animations: 'disabled'
			});
		});

		test('signup page should have correct appearance', async ({ page }) => {
			test.skip(process.platform !== 'darwin', 'Visual regression baselines only exist for macOS');

			const authPageObj = new AuthPage(page);
			await authPageObj.gotoSignUp();

			// Wait for the Clerk form to be fully loaded with OAuth providers and inputs
			const fullyLoaded = await authPageObj.waitForFullyLoaded();
			expect(fullyLoaded).toBe(true);

			// Additional wait to ensure any animations have completed
			await page.waitForTimeout(500);

			await expect(page).toHaveScreenshot('signup-full-page.png', {
				fullPage: true,
				animations: 'disabled'
			});
		});
	});
});
