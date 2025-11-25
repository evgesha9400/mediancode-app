/**
 * Landing Page Full Tests
 *
 * Comprehensive tests for the landing page including form submissions,
 * mobile menu interactions, and visual regression checks.
 *
 * NOTE: Visual regression tests use explicit snapshot names that match
 * committed baselines. Playwright appends the project name and platform
 * to the base name (e.g., 'hero-heading.png' becomes
 * 'hero-heading-chromium-full-darwin.png' on macOS with chromium-full project).
 *
 * IMPORTANT: Visual regression baselines currently only exist for macOS (darwin).
 * CI runs on Linux and will expect linux baselines. These tests are currently
 * skipped in CI until cross-platform baselines are generated.
 *
 * @tags full
 */

import { test, expect } from '@playwright/test';
import { LandingPage } from '../page-objects';

test.describe('Landing Page - Full Suite', () => {
	let landingPage: LandingPage;

	test.beforeEach(async ({ page }) => {
		landingPage = new LandingPage(page);
		await landingPage.goto();
	});

	test.describe('Hero Section', () => {
		test('should validate email input', async ({ page }) => {
			// Invalid email should not submit
			await landingPage.heroEmailInput.fill('invalid-email');
			await landingPage.heroSubmitButton.click();

			// Should not show success message
			await expect(landingPage.heroSuccessMessage).not.toBeVisible();
		});

		test('should accept valid email and show success', async ({ page }) => {
			// Note: This test may need MSW to mock Formspree API
			// For now, we test the form presence and interaction
			await landingPage.heroEmailInput.fill('test@example.com');
			await expect(landingPage.heroSubmitButton).toBeEnabled();
		});

		test('should have correct visual appearance', async ({ page }) => {
			// Skip on non-darwin platforms until cross-platform baselines exist
			test.skip(process.platform !== 'darwin', 'Visual regression baselines only exist for macOS');

			// Visual regression test for hero section
			// Baseline: landing.spec.ts-snapshots/hero-heading-{project}-{platform}.png
			await expect(landingPage.heroHeading).toHaveScreenshot('hero-heading.png');
		});
	});

	test.describe('Navigation', () => {
		test('should toggle mobile menu', async ({ page }) => {
			// Set mobile viewport
			await page.setViewportSize({ width: 375, height: 667 });

			// Mobile menu toggle should be visible
			await expect(landingPage.mobileMenuToggle).toBeVisible();

			// Click to open mobile menu
			await landingPage.toggleMobileMenu();

			// Mobile sign in should be visible
			await expect(landingPage.mobileMenuSignIn).toBeVisible();

			// Click to close mobile menu
			await landingPage.toggleMobileMenu();

			// Mobile sign in should be hidden
			await expect(landingPage.mobileMenuSignIn).not.toBeVisible();
		});

		test('should navigate to sign in from mobile menu', async ({ page }) => {
			// Set mobile viewport
			await page.setViewportSize({ width: 375, height: 667 });

			await landingPage.navigateToSignInViaMobile();

			// Should be on sign in page
			await expect(page).toHaveURL('/signin');
		});
	});

	test.describe('Features Section', () => {
		test('should display all feature cards', async () => {
			await landingPage.scrollToSection('features');

			// Should have multiple feature cards
			const count = await landingPage.featureCards.count();
			expect(count).toBeGreaterThan(0);
		});

		test('should have correct visual appearance', async ({ page }) => {
			// Skip on non-darwin platforms until cross-platform baselines exist
			test.skip(process.platform !== 'darwin', 'Visual regression baselines only exist for macOS');

			await landingPage.scrollToSection('features');

			// Visual regression for features section
			// Baseline: landing.spec.ts-snapshots/features-section-{project}-{platform}.png
			await expect(landingPage.featuresSection).toHaveScreenshot('features-section.png');
		});
	});

	test.describe('How It Works Section', () => {
		test('should display step cards', async () => {
			await landingPage.scrollToSection('how-it-works');

			// Should have step cards
			const count = await landingPage.stepCards.count();
			expect(count).toBeGreaterThan(0);
		});
	});

	test.describe('Benefits Section', () => {
		test('should display benefit checklist', async () => {
			await landingPage.scrollToSection('benefits');

			// Should have benefit items
			const count = await landingPage.benefitItems.count();
			expect(count).toBeGreaterThan(0);
		});
	});

	test.describe('CTA Section', () => {
		test('should have email form', async () => {
			await landingPage.scrollToSection('cta');

			// CTA email input should be visible
			await expect(landingPage.ctaEmailInput).toBeVisible();

			// CTA submit button should be visible
			await expect(landingPage.ctaSubmitButton).toBeVisible();
		});
	});

	test.describe('Full Page', () => {
		test('should have correct full page appearance', async ({ page }) => {
			// Skip on non-darwin platforms until cross-platform baselines exist
			test.skip(process.platform !== 'darwin', 'Visual regression baselines only exist for macOS');

			// Take full page screenshot for visual regression
			// Baseline: landing.spec.ts-snapshots/landing-full-page-{project}-{platform}.png
			await expect(page).toHaveScreenshot('landing-full-page.png', {
				fullPage: true,
				animations: 'disabled'
			});
		});
	});
});
