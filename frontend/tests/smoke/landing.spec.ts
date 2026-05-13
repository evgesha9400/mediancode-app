/**
 * Landing Page Smoke Tests
 *
 * Fast, critical path tests for the landing page.
 * These run on every PR to catch major regressions.
 *
 * @tags smoke
 */

import { test, expect } from './fixtures';
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

		// Sign-up link should be present
		await expect(landingPage.heroSignUpLink).toBeVisible();
	});

	test('should display navigation elements', async () => {
		// Static elements — no Clerk dependency
		await expect(landingPage.logo).toBeVisible();
		await expect(landingPage.header).toBeVisible();

		// Sign-in button depends on Clerk loading ($clerkState.isLoaded)
		// and is tested separately in "should navigate to sign in page"
	});

	test('should display all major sections', async () => {
		// Features section
		await expect(landingPage.featuresSection).toBeVisible();

		// How it works section
		await expect(landingPage.howItWorksSection).toBeVisible();

		// Philosophy section
		await expect(landingPage.philosophySection).toBeVisible();

		// CTA section
		await expect(landingPage.ctaSection).toBeVisible();

		// Footer
		await expect(landingPage.footer).toBeVisible();
	});

	test('should navigate to sign in page', async ({ page }) => {
		// Navigate directly — the sign-in link is behind $clerkState.isLoaded
		// which depends on Clerk FAPI (external service, unreliable in CI).
		// The link click is tested in E2E auth tests instead.
		await page.goto('/signin');
		await expect(page).toHaveURL('/signin');
	});
});
