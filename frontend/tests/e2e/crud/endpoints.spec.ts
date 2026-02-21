/**
 * Endpoints CRUD Lifecycle Test
 *
 * Tests endpoint management on the API detail page (/apis/[id]):
 * Create helper API -> Navigate to detail -> Add endpoint ->
 * Verify endpoint appears -> Delete endpoint -> Cleanup
 *
 * Uses authenticatedTest for Clerk auth and E2EApiClient for API cleanup.
 * The helper API uses a unique name prefix to avoid conflicts with parallel tests.
 *
 * @tags app-crud
 */

import { authenticatedTest as test, expect } from '../fixtures';
import { ApisPage } from '../../page-objects';
import { E2EApiClient } from '../../helpers';

const HELPER_API = {
	title: 'e2e_ep_host_api',
	version: '1.0.0',
	description: 'Helper API for endpoint CRUD test',
	baseUrl: '/api/v1'
};

test('Endpoint lifecycle: create, verify, delete', async ({ page }) => {
	// --- Clean slate: delete any leftover APIs from this test ---
	const apiClient = await E2EApiClient.fromPage(page);
	const { data: existing } = await apiClient.listApis();
	if (existing) {
		for (const api of existing) {
			if (api.title === HELPER_API.title) {
				await apiClient.deleteApi(api.id);
			}
		}
	}

	// --- Create helper API via drawer ---
	const apis = new ApisPage(page);
	await apis.goto();
	await apis.clickNewApi();
	await apis.fillCreateForm(HELPER_API);
	await apis.submitCreate();

	// Should be on API detail page now
	expect(page.url()).toMatch(/\/apis\/[^/]+$/);

	// --- Add endpoint ---
	const addEndpointButton = page.getByRole('button', { name: /Add Endpoint/i });
	await addEndpointButton.click();

	// Wait for endpoint drawer to open
	const endpointDrawer = page.locator('[class*="fixed"][class*="right-0"]');
	await endpointDrawer.waitFor({ state: 'visible' });

	// Fill in path - find the path text input in the drawer
	// The endpoint form has a path field with a "/" prefix
	const pathInput = endpointDrawer.locator('input[type="text"]').first();
	await pathInput.fill('test-endpoint');

	// Save endpoint - button has icon prefix, use regex match
	const saveEndpointButton = endpointDrawer.getByRole('button', { name: /Save/ }).first();
	await saveEndpointButton.click();
	await endpointDrawer.waitFor({ state: 'hidden', timeout: 10000 });

	// --- Verify endpoint appears on the detail page ---
	const endpointText = page.locator('text=test-endpoint').first();
	await expect(endpointText).toBeVisible();

	// --- Delete endpoint: click to open, then delete ---
	await endpointText.click();
	await endpointDrawer.waitFor({ state: 'visible' });

	const deleteButton = endpointDrawer.getByRole('button', { name: /Delete/ }).first();
	await deleteButton.click();
	const confirmButton = page.getByRole('button', { name: 'Yes, Delete' });
	await confirmButton.click();
	await endpointDrawer.waitFor({ state: 'hidden', timeout: 10000 });

	// --- Cleanup: delete the helper API via API client ---
	const { data: remaining } = await apiClient.listApis();
	if (remaining) {
		for (const api of remaining) {
			if (api.title === HELPER_API.title) {
				await apiClient.deleteApi(api.id);
			}
		}
	}

	// --- Verify helper API is gone ---
	await apis.goto();
	await apis.search(HELPER_API.title);
	expect(await apis.hasApi(HELPER_API.title)).toBe(false);
});
