/**
 * Landing Page Smoke Tests
 *
 * Fast, critical path tests for the landing page.
 * These run on every PR to catch major regressions.
 *
 * @tags smoke
 */

import { test, expect } from '@playwright/test';
import { LandingPage } from '../page-objects';

test.describe('Landing Page - Smoke Tests', () => {
	let landingPage: LandingPage;

	test.beforeEach(async ({ page }) => {
		landingPage = new LandingPage(page);
		await landingPage.goto();
	});

	test('should display hero section with CTA', async () => {
		// Hero heading should be visible
		await expect(landingPage.heroHeading).toBeVisible();

		// Email input should be present
		await expect(landingPage.heroEmailInput).toBeVisible();

		// Submit button should be present
		await expect(landingPage.heroSubmitButton).toBeVisible();
	});

	test('should display navigation elements', async () => {
		// Logo should be visible
		await expect(landingPage.logo).toBeVisible();

		// Sign in button should be visible
		await expect(landingPage.signInButton).toBeVisible();
	});

	test('should display all major sections', async () => {
		// Features section
		await expect(landingPage.featuresSection).toBeVisible();

		// How it works section
		await expect(landingPage.howItWorksSection).toBeVisible();

		// Benefits section
		await expect(landingPage.benefitsSection).toBeVisible();

		// CTA section
		await expect(landingPage.ctaSection).toBeVisible();

		// Footer
		await expect(landingPage.footer).toBeVisible();
	});

	test('should navigate to sign in page', async ({ page }) => {
		await landingPage.navigateToSignIn();

		// Should be on sign in page
		await expect(page).toHaveURL('/signin');
	});
});
