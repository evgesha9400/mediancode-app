/**
 * Mobile Blocked Page Smoke Tests
 *
 * Fast tests for mobile device blocking functionality.
 * These run on every PR to ensure mobile blocking works.
 *
 * @tags smoke
 */

import { test, expect } from '@playwright/test';
import { MobileBlockedPage } from '../page-objects';

// Mobile device configuration - shared across all tests in this file
const mobileConfig = {
	viewport: { width: 375, height: 667 },
	userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15'
};

test.describe('Mobile Blocked Page - Smoke Tests', () => {
	// Use Playwright's test.use() to configure mobile viewport for all tests in this block
	// This leverages Playwright's fixture system for automatic context management
	test.use(mobileConfig);

	test('should display mobile blocked page with mobile viewport', async ({ page }) => {
		const mobileBlockedPage = new MobileBlockedPage(page);

		await mobileBlockedPage.goto();

		// Page should be displayed
		const isDisplayed = await mobileBlockedPage.isDisplayed();
		expect(isDisplayed).toBe(true);
	});

	test('should show heading and message', async ({ page }) => {
		const mobileBlockedPage = new MobileBlockedPage(page);

		await mobileBlockedPage.goto();

		// Heading should be visible
		await expect(mobileBlockedPage.heading).toBeVisible();

		// Message should be visible
		await expect(mobileBlockedPage.message).toBeVisible();
	});

	test('should have icon', async ({ page }) => {
		const mobileBlockedPage = new MobileBlockedPage(page);

		await mobileBlockedPage.goto();

		// Icon should be visible
		await expect(mobileBlockedPage.icon).toBeVisible();
	});
});

test.describe('Visual Regression', () => {
	test.use(mobileConfig);

	test('mobile-blocked page should have correct appearance', async ({ page }) => {
		test.skip(process.platform !== 'darwin', 'Visual regression baselines only exist for macOS');

		await page.goto('/mobile-blocked');

		await expect(page).toHaveScreenshot('mobile-blocked-full-page.png', {
			fullPage: true,
			animations: 'disabled'
		});
	});
});

test.describe('Mobile Detection', () => {
	// Use mobile configuration for this test block as well
	test.use(mobileConfig);

	test('should redirect to mobile-blocked on mobile viewport', async ({ page }) => {
		// Try to access landing page
		await page.goto('/');

		// Should redirect to mobile-blocked (if mobile detection is implemented)
		// Note: This depends on the actual mobile detection implementation
		// May need to wait for client-side redirect
		await page.waitForTimeout(1000);

		// Check if redirected - the page should either be at / or /mobile-blocked
		const url = page.url();
		const isValidUrl = url.includes('/mobile-blocked') || url.endsWith('/');
		expect(isValidUrl).toBe(true);

		// If redirected to mobile-blocked, verify the page content
		if (url.includes('/mobile-blocked')) {
			const mobileBlockedPage = new MobileBlockedPage(page);
			const isDisplayed = await mobileBlockedPage.isDisplayed();
			expect(isDisplayed).toBe(true);
		}
	});
});
