/**
 * Mobile Blocked Page Smoke Tests
 *
 * Verifies mobile device blocking renders correctly and
 * that mobile users accessing dashboard routes are redirected.
 *
 * @tags smoke
 */

import { test, expect } from './fixtures';
import { MobileBlockedPage } from '../page-objects';

const mobileConfig = {
	viewport: { width: 375, height: 667 },
	userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15'
};

test.describe('Mobile Blocked Page - Smoke Tests', () => {
	test.use(mobileConfig);

	test('should display heading, message, and icon', async ({ page }) => {
		const mobileBlockedPage = new MobileBlockedPage(page);
		await mobileBlockedPage.goto();

		await expect(mobileBlockedPage.heading).toBeVisible();
		await expect(mobileBlockedPage.message).toBeVisible();
		await expect(mobileBlockedPage.icon).toBeVisible();
	});
});

test.describe('Mobile Detection', () => {
	test.use(mobileConfig);

	test('should redirect /dashboard to /mobile-blocked on mobile', async ({ page }) => {
		await page.goto('/dashboard');
		await page.waitForURL('**/mobile-blocked');
		await expect(page).toHaveURL('/mobile-blocked');

		const mobileBlockedPage = new MobileBlockedPage(page);
		await expect(mobileBlockedPage.heading).toBeVisible();
	});

	test('should redirect /types to /mobile-blocked on mobile', async ({ page }) => {
		await page.goto('/types');
		await page.waitForURL('**/mobile-blocked');
		await expect(page).toHaveURL('/mobile-blocked');

		const mobileBlockedPage = new MobileBlockedPage(page);
		await expect(mobileBlockedPage.heading).toBeVisible();
	});
});

test.describe('Visual Regression', () => {
	test.use(mobileConfig);

	test('mobile-blocked page should have correct appearance', async ({ page }) => {
		test.skip(process.platform !== 'darwin', 'Visual regression baselines only exist for macOS');

		await page.goto('/mobile-blocked');

		await expect(page).toHaveScreenshot('mobile-blocked-full-page.png', {
			fullPage: true,
			animations: 'disabled',
			maxDiffPixelRatio: 0.01
		});
	});
});
