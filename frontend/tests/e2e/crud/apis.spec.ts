/**
 * APIs CRUD Lifecycle Test
 *
 * Single continuous flow:
 * Clean test APIs -> Create 2 APIs -> Search -> Navigate to detail ->
 * Edit via drawer -> Verify update -> Delete both -> Verify gone
 *
 * Uses authenticatedTest for Clerk auth and E2EApiClient for cleanup.
 * Assertions use name-based checks (not row counts) to tolerate parallel tests.
 *
 * @tags app-crud
 */

import { authenticatedTest as test, expect } from '../fixtures';
import { ApisPage } from '../../page-objects';
import { E2EApiClient } from '../../helpers';

const API_A = {
	title: 'AlphaTestApi',
	version: '1.0.0',
	description: 'E2E test API alpha for CRUD lifecycle',
	baseUrl: '/api/v1'
};

const API_B = {
	title: 'BetaTestApi',
	version: '2.0.0',
	description: 'E2E test API beta for CRUD lifecycle',
	baseUrl: '/api/v2'
};

const UPDATED_DESCRIPTION = 'Updated alpha API description for E2E testing';

test('API lifecycle: create, search, edit, delete', async ({ page }) => {
	// --- Clean slate: delete any leftover e2e APIs ---
	const apiClient = await E2EApiClient.fromPage(page);
	const { data: existing } = await apiClient.listApis();
	if (existing) {
		for (const api of existing) {
			if (api.title === 'AlphaTestApi' || api.title === 'BetaTestApi' || api.title?.startsWith('e2e_')) {
				await apiClient.deleteApi(api.id);
			}
		}
	}

	const apis = new ApisPage(page);
	await apis.goto();

	// --- Verify our test APIs don't exist ---
	await apis.search('TestApi');
	expect(await apis.hasApi(API_A.title)).toBe(false);
	expect(await apis.hasApi(API_B.title)).toBe(false);
	await apis.clearSearch();

	// --- Create API A via drawer ---
	await apis.clickNewApi();
	await apis.fillCreateForm(API_A);
	await apis.submitCreate();
	// Should navigate to detail page
	expect(page.url()).toMatch(/\/apis\/[^/]+$/);

	// --- Create API B via drawer ---
	await apis.goto();
	await apis.clickNewApi();
	await apis.fillCreateForm(API_B);
	await apis.submitCreate();
	expect(page.url()).toMatch(/\/apis\/[^/]+$/);

	// --- Verify both APIs in list ---
	await apis.goto();
	expect(await apis.hasApi(API_A.title)).toBe(true);
	expect(await apis.hasApi(API_B.title)).toBe(true);

	// --- Search for API A ---
	await apis.search('Alpha');
	expect(await apis.hasApi(API_A.title)).toBe(true);
	expect(await apis.hasApi(API_B.title)).toBe(false);

	// --- Clear search: both should be back ---
	await apis.clearSearch();
	expect(await apis.hasApi(API_A.title)).toBe(true);
	expect(await apis.hasApi(API_B.title)).toBe(true);

	// --- Navigate to API A detail page ---
	await apis.search(API_A.title);
	await apis.clickRow(API_A.title);
	expect(page.url()).toMatch(/\/apis\/[^/]+$/);

	// --- Edit API via drawer on detail page ---
	const editButton = page.getByRole('button', { name: /Edit/i }).first();
	await editButton.click();
	const editDrawer = page
		.locator('[class*="fixed"][class*="right-0"]')
		.filter({ hasText: 'Edit API' });
	await editDrawer.waitFor({ state: 'visible' });

	// Update description
	const descInput = page.locator('#edit-description');
	await descInput.fill(UPDATED_DESCRIPTION);

	// Save changes
	const saveButton = page.getByRole('button', { name: /Save Changes/i }).first();
	await saveButton.click();
	await editDrawer.waitFor({ state: 'hidden', timeout: 10000 });

	// --- Verify update persisted on detail page ---
	await expect(page.locator(`text=${UPDATED_DESCRIPTION}`)).toBeVisible();

	// --- Delete API A from detail page ---
	const editButton2 = page.getByRole('button', { name: /Edit/i }).first();
	await editButton2.click();
	await editDrawer.waitFor({ state: 'visible' });
	const deleteApiButton = page.getByRole('button', { name: /Delete API/i }).first();
	await deleteApiButton.click();
	const confirmDeleteButton = page.getByRole('button', { name: 'Yes, Delete' });
	await confirmDeleteButton.click();
	await page.waitForURL(/\/apis\/?$/);

	// --- Verify API A is gone ---
	await apis.search(API_A.title);
	expect(await apis.hasApi(API_A.title)).toBe(false);

	// --- Delete API B from detail page ---
	await apis.clearSearch();
	await apis.search(API_B.title);
	await apis.clickRow(API_B.title);
	const editButton3 = page.getByRole('button', { name: /Edit/i }).first();
	await editButton3.click();
	await editDrawer.waitFor({ state: 'visible' });
	const deleteApiButton2 = page.getByRole('button', { name: /Delete API/i }).first();
	await deleteApiButton2.click();
	const confirmDeleteButton2 = page.getByRole('button', { name: 'Yes, Delete' });
	await confirmDeleteButton2.click();
	await page.waitForURL(/\/apis\/?$/);

	// --- Verify API B is gone ---
	await apis.search(API_B.title);
	expect(await apis.hasApi(API_B.title)).toBe(false);
	await apis.clearSearch();
});
