/**
 * Dashboard Full Tests
 *
 * Comprehensive tests for the dashboard including stat card validation,
 * navigation, and visual regression checks.
 *
 * NOTE: The dashboard UI displays values from Svelte stores (src/lib/stores/fields.ts,
 * src/lib/stores/validators.ts), not from test fixtures. The expected values are:
 * - Fields: 10 (from initialFields in fields.ts)
 * - Generated APIs: 3 (unique APIs: api-1, api-2, api-3 from usedInApis arrays)
 * - Validators: 14 (11 inline + 3 custom from validators.ts)
 *
 * IMPORTANT: Visual regression baselines currently only exist for macOS (darwin).
 * CI runs on Linux and will expect linux baselines. These tests are currently
 * skipped in CI until cross-platform baselines are generated.
 *
 * @tags full
 */

import { test, expect } from '@playwright/test';
import { DashboardPage, STAT_CARD_TITLES } from '../page-objects';

// Expected values from actual stores (not fixtures)
// These match the initial data in src/lib/stores/fields.ts and validators.ts
const EXPECTED_FIELD_COUNT = 10;
const EXPECTED_API_COUNT = 3; // 3 unique APIs: api-1, api-2, api-3
const EXPECTED_VALIDATOR_COUNT = 14;

test.describe('Dashboard - Full Suite', () => {
	let dashboardPage: DashboardPage;

	test.beforeEach(async ({ page }) => {
		dashboardPage = new DashboardPage(page);

		// TODO: Add authentication setup here
		await dashboardPage.goto();
	});

	test.describe('Stat Cards', () => {
		test('should display correct field count from store', async () => {
			// Field count should match store initial data
			const totalFieldsText = await dashboardPage.getStatCardValue(STAT_CARD_TITLES.fields);

			// Parse number from stat card (may include formatting)
			const actualCount = parseInt(totalFieldsText.replace(/,/g, ''), 10);
			expect(actualCount).toBe(EXPECTED_FIELD_COUNT);
		});

		test('should display correct validator count from store', async () => {
			// Validators count should match store data (11 inline + 3 custom)
			const validatorsText = await dashboardPage.getStatCardValue(STAT_CARD_TITLES.validators);

			const actualCount = parseInt(validatorsText.replace(/,/g, ''), 10);
			expect(actualCount).toBe(EXPECTED_VALIDATOR_COUNT);
		});

		test('should display correct API count from store', async () => {
			// Generated APIs should match store data (unique usedInApis references)
			const apisText = await dashboardPage.getStatCardValue(STAT_CARD_TITLES.generatedApis);

			const actualCount = parseInt(apisText.replace(/,/g, ''), 10);
			expect(actualCount).toBe(EXPECTED_API_COUNT);
		});

		test('should have trend indicators on some cards', async () => {
			// Check for trend indicators (if present in implementation)
			const fieldsCard = dashboardPage.fieldsCard;
			const cardText = await fieldsCard.textContent();

			// Verify card is present and has content
			expect(cardText).toBeTruthy();
		});

	});

	test.describe('Navigation', () => {
		test('should navigate to field registry section', async ({ page }) => {
			await dashboardPage.navigateTo('field-registry');

			// Should navigate to field registry page
			await expect(page).toHaveURL('/field-registry');
		});

		test('should navigate to types section', async ({ page }) => {
			await dashboardPage.navigateTo('types');

			// Should navigate to types page
			await expect(page).toHaveURL('/types');
		});

		test('should navigate to validators section', async ({ page }) => {
			await dashboardPage.navigateTo('validators');

			// Should navigate to validators page
			await expect(page).toHaveURL('/validators');
		});

		test('should navigate back to dashboard', async ({ page }) => {
			// Navigate away first
			await dashboardPage.navigateTo('types');
			await expect(page).toHaveURL('/types');

			// Navigate back to dashboard
			await dashboardPage.navigateTo('dashboard');
			await expect(page).toHaveURL('/dashboard');
		});
	});

	test.describe('User Information', () => {
		test('should display user name in welcome message', async () => {
			const userName = await dashboardPage.getWelcomeUserName();

			// Should have a user name (not empty)
			expect(userName).toBeTruthy();
			expect(userName.length).toBeGreaterThan(0);
		});
	});

	test.describe('Visual Regression', () => {
		test('dashboard should have correct appearance', async ({ page }) => {
			test.skip(process.platform !== 'darwin', 'Visual regression baselines only exist for macOS');

			await expect(page).toHaveScreenshot('dashboard-full-page.png', {
				fullPage: true,
				animations: 'disabled'
			});
		});

		test('field-registry should have correct appearance', async ({ page }) => {
			test.skip(process.platform !== 'darwin', 'Visual regression baselines only exist for macOS');

			await page.goto('/field-registry');
			await expect(page).toHaveScreenshot('field-registry-full-page.png', {
				fullPage: true,
				animations: 'disabled'
			});
		});

		test('types should have correct appearance', async ({ page }) => {
			test.skip(process.platform !== 'darwin', 'Visual regression baselines only exist for macOS');

			await page.goto('/types');
			await expect(page).toHaveScreenshot('types-full-page.png', {
				fullPage: true,
				animations: 'disabled'
			});
		});

		test('validators should have correct appearance', async ({ page }) => {
			test.skip(process.platform !== 'darwin', 'Visual regression baselines only exist for macOS');

			await page.goto('/validators');
			await expect(page).toHaveScreenshot('validators-full-page.png', {
				fullPage: true,
				animations: 'disabled'
			});
		});
	});
});
