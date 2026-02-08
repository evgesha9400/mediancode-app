/**
 * Authentication Smoke Tests
 *
 * Verifies auth pages render and visual regression baselines match.
 * Real Clerk authentication is validated by the CRUD setup project.
 *
 * @tags smoke
 */

import { test, expect } from '@playwright/test';
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

	test.describe('Visual Regression', () => {
		test('signin page should have correct appearance', async ({ page }) => {
			test.skip(process.platform !== 'darwin', 'Visual regression baselines only exist for macOS');

			const authPage = new AuthPage(page);
			await authPage.gotoSignIn();
			await authPage.waitForFullyLoaded();

			await expect(page).toHaveScreenshot('signin-full-page.png', {
				fullPage: true,
				animations: 'disabled',
				maxDiffPixelRatio: 0.01
			});
		});

		test('signup page should have correct appearance', async ({ page }) => {
			test.skip(process.platform !== 'darwin', 'Visual regression baselines only exist for macOS');

			const authPage = new AuthPage(page);
			await authPage.gotoSignUp();
			await authPage.waitForFullyLoaded();

			await expect(page).toHaveScreenshot('signup-full-page.png', {
				fullPage: true,
				animations: 'disabled',
				maxDiffPixelRatio: 0.01
			});
		});
	});
});
