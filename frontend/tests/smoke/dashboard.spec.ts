/**
 * Dashboard Smoke Tests
 *
 * Verifies that unauthenticated access to dashboard routes
 * redirects to /signin with a return URL.
 * Real authenticated dashboard behavior is covered by CRUD tests.
 *
 * @tags smoke
 */

import { test, expect } from './fixtures';

test.describe('Dashboard - Auth Redirect', () => {
	test('should redirect unauthenticated /dashboard to /signin', async ({ page }) => {
		await page.goto('/dashboard');
		await page.waitForURL('**/signin?redirect=**');
		expect(page.url()).toContain('/signin');
		expect(page.url()).toContain('redirect=%2Fdashboard');
	});

	test('should redirect unauthenticated /types to /signin', async ({ page }) => {
		await page.goto('/types');
		await page.waitForURL('**/signin?redirect=**');
		expect(page.url()).toContain('/signin');
		expect(page.url()).toContain('redirect=%2Ftypes');
	});

	test('should redirect unauthenticated /fields to /signin', async ({ page }) => {
		await page.goto('/fields');
		await page.waitForURL('**/signin?redirect=**');
		expect(page.url()).toContain('/signin');
		expect(page.url()).toContain('redirect=%2Ffields');
	});
});
