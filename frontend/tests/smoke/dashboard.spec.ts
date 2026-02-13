/**
 * Dashboard Smoke Tests
 *
 * Verifies dashboard page structure renders correctly.
 * These run without authentication — the dashboard renders with
 * default/empty state (zero stat values, fallback username).
 * Real authenticated dashboard behavior is covered by CRUD tests.
 *
 * @tags smoke
 */

import { test, expect } from '@playwright/test';
import { DashboardPage } from '../page-objects';

test.describe('Dashboard - Smoke Tests', () => {
	let dashboardPage: DashboardPage;

	test.beforeEach(async ({ page }) => {
		dashboardPage = new DashboardPage(page);
		await dashboardPage.goto();
	});

	test('should display dashboard header', async () => {
		await expect(dashboardPage.pageTitle).toBeVisible();
		await expect(dashboardPage.welcomeMessage).toBeVisible();
	});

	test('should display stat cards', async () => {
		await expect(dashboardPage.typesCard).toBeVisible();
		await expect(dashboardPage.fieldsCard).toBeVisible();
		await expect(dashboardPage.generatedApisCard).toBeVisible();
		await expect(dashboardPage.constraintsCard).toBeVisible();
		await expect(dashboardPage.creditsAvailableCard).toBeVisible();
		await expect(dashboardPage.creditsUsedCard).toBeVisible();
	});

	test('should display sidebar navigation', async () => {
		await expect(dashboardPage.sidebar).toBeVisible();
		await expect(dashboardPage.dashboardNavLink).toBeVisible();
		await expect(dashboardPage.fieldsNavLink).toBeVisible();
		await expect(dashboardPage.typesNavLink).toBeVisible();
		await expect(dashboardPage.constraintsNavLink).toBeVisible();
	});
});
