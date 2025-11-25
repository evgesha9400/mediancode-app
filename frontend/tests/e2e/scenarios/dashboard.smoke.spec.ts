/**
 * Dashboard Smoke Tests
 *
 * Fast, critical path tests for the dashboard.
 * These run on every PR to catch major regressions.
 *
 * NOTE: These tests assume authentication is handled or mocked.
 * Adjust based on actual Clerk integration strategy.
 *
 * @tags smoke
 */

import { test, expect } from '@playwright/test';
import { DashboardPage } from '../page-objects';

test.describe('Dashboard - Smoke Tests', () => {
	let dashboardPage: DashboardPage;

	test.beforeEach(async ({ page }) => {
		dashboardPage = new DashboardPage(page);

		// TODO: Add authentication setup here
		// For now, navigate directly to dashboard
		// In real implementation, either:
		// 1. Mock Clerk authentication
		// 2. Use Clerk test tokens
		// 3. Set up test user session
		await dashboardPage.goto();
	});

	test('should display dashboard header', async () => {
		// Page title should be visible
		await expect(dashboardPage.pageTitle).toBeVisible();

		// Welcome message should be visible
		await expect(dashboardPage.welcomeMessage).toBeVisible();
	});

	test('should display stat cards', async () => {
		// All stat cards should be visible
		await expect(dashboardPage.totalFieldsCard).toBeVisible();
		await expect(dashboardPage.activeApisCard).toBeVisible();
		await expect(dashboardPage.validatorsCard).toBeVisible();
		await expect(dashboardPage.creditsAvailableCard).toBeVisible();
		await expect(dashboardPage.creditsUsedCard).toBeVisible();
	});

	test('should display sidebar navigation', async () => {
		// Sidebar should be visible
		await expect(dashboardPage.sidebar).toBeVisible();

		// Navigation links should be present
		await expect(dashboardPage.dashboardNavLink).toBeVisible();
		await expect(dashboardPage.fieldsNavLink).toBeVisible();
		await expect(dashboardPage.typesNavLink).toBeVisible();
		await expect(dashboardPage.validatorsNavLink).toBeVisible();
	});
});
