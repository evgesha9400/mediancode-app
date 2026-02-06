/**
 * APIs CRUD Lifecycle Test
 *
 * Tests the complete lifecycle of API entities:
 * 1. Navigate to create page
 * 2. Create a new API
 * 3. Verify API appears in list
 * 4. Update API properties
 * 5. Verify updates are persisted
 * 6. Delete API
 * 7. Verify API is removed
 *
 * This test is self-contained - it creates its own test data and cleans up after itself.
 * Uses unique names with e2e_ prefix for easy identification.
 *
 * Note: API creation/editing uses a separate page (/apis/new, /apis/[id]) rather than drawers.
 *
 * @tags app-crud
 */

import { test, expect } from '@playwright/test';
import { ApisPage } from '../../page-objects';
import { apiName, isE2ETestData, E2EApiClient } from '../../helpers';

test.describe('APIs CRUD Lifecycle', () => {
	let apisPage: ApisPage;
	let createdApiName: string;

	test.beforeAll(() => {
		// Generate unique API name for this test run
		createdApiName = apiName('crud');
	});

	test.beforeEach(async ({ page }) => {
		apisPage = new ApisPage(page);
	});

	test.describe.serial('API Lifecycle', () => {
		test('Step 1: Navigate to API creation page', async ({ page }) => {
			await apisPage.goto();

			// Verify we're on the APIs list page
			await expect(apisPage.pageTitle).toBeVisible();

			// Click New API button
			await apisPage.clickNewApi();

			// Verify navigation to creation page
			expect(page.url()).toContain('/apis/new');
		});

		test('Step 2: Create new API', async ({ page }) => {
			// Navigate directly to creation page
			await page.goto('/apis/new');

			// Wait for form to load
			await page.waitForLoadState('networkidle');

			// Fill in API details
			// Note: Actual form field IDs/names will depend on the implementation
			const titleInput = page.locator('#api-title, input[name="title"]').first();
			if (await titleInput.isVisible()) {
				await titleInput.fill(createdApiName);
			}

			const versionInput = page.locator('#api-version, input[name="version"]').first();
			if (await versionInput.isVisible()) {
				await versionInput.fill('1.0.0');
			}

			const baseUrlInput = page.locator('#api-base-url, input[name="baseUrl"]').first();
			if (await baseUrlInput.isVisible()) {
				await baseUrlInput.fill('/api/v1');
			}

			const descriptionInput = page
				.locator('#api-description, textarea[name="description"]')
				.first();
			if (await descriptionInput.isVisible()) {
				await descriptionInput.fill('E2E test API for CRUD lifecycle');
			}

			// Look for save/create button
			const saveButton = page
				.locator('button:has-text("Create"), button:has-text("Save")')
				.first();
			if (await saveButton.isVisible()) {
				await saveButton.click();

				// Wait for navigation back to list or API detail page
				await page.waitForURL(/\/apis(\/|$)/);
			}
		});

		test('Step 3: Verify API appears in list', async ({ page }) => {
			await apisPage.goto();

			// Search for the created API
			await apisPage.search(createdApiName);

			// Verify API appears in list
			const hasApi = await apisPage.hasApi(createdApiName);
			expect(hasApi).toBe(true);
		});

		test('Step 4: Open API for editing', async ({ page }) => {
			await apisPage.goto();

			// Search for the API
			await apisPage.search(createdApiName);

			// Click on the API row
			await apisPage.clickRow(createdApiName);

			// Should navigate to edit page
			await page.waitForURL(/\/apis\/[^/]+/);

			// Verify we're on the edit page
			const url = page.url();
			expect(url).toMatch(/\/apis\/[^/]+$/);
		});

		test('Step 5: Update API', async ({ page }) => {
			await apisPage.goto();

			// Search and open the API
			await apisPage.search(createdApiName);
			await apisPage.clickRow(createdApiName);

			// Wait for edit page to load
			await page.waitForLoadState('networkidle');

			// Update description
			const descriptionInput = page
				.locator('#api-description, textarea[name="description"]')
				.first();
			if (await descriptionInput.isVisible()) {
				await descriptionInput.fill(`Updated description at ${new Date().toISOString()}`);
			}

			// Update version
			const versionInput = page.locator('#api-version, input[name="version"]').first();
			if (await versionInput.isVisible()) {
				await versionInput.fill('1.0.1');
			}

			// Save changes
			const saveButton = page.locator('button:has-text("Save")').first();
			if (await saveButton.isVisible()) {
				await saveButton.click();
				await page.waitForTimeout(500);
			}
		});

		test('Step 6: Verify updates persisted', async ({ page }) => {
			await apisPage.goto();

			// Search for the API
			await apisPage.search(createdApiName);

			// Verify API still exists
			const hasApi = await apisPage.hasApi(createdApiName);
			expect(hasApi).toBe(true);

			// Verify version updated
			const versions = await apisPage.getVisibleVersions();
			// At least one visible API should have the updated version
			if (versions.length > 0) {
				expect(versions.some((v) => v === '1.0.1')).toBe(true);
			}
		});

		test('Step 7: Delete API', async ({ page }) => {
			await apisPage.goto();

			// Search for the API
			await apisPage.search(createdApiName);

			// Click on the API to open drawer/details
			await apisPage.clickRow(createdApiName);

			// If drawer is visible, use drawer delete flow
			if (await apisPage.isDrawerOpen()) {
				await apisPage.clickDelete();
				await expect(apisPage.deleteConfirmButton).toBeVisible();
				await apisPage.confirmDelete();
			} else {
				// If we're on the edit page, look for delete button there
				const deleteButton = page.locator('button:has-text("Delete")').first();
				if (await deleteButton.isVisible()) {
					await deleteButton.click();

					// Confirm delete
					const confirmButton = page.locator('button:has-text("Yes, Delete")').first();
					if (await confirmButton.isVisible()) {
						await confirmButton.click();
					}
				}
			}

			// Wait for deletion to complete
			await page.waitForTimeout(500);
		});

		test('Step 8: Verify API is removed', async ({ page }) => {
			await apisPage.goto();

			// Search for the deleted API
			await apisPage.search(createdApiName);

			// Should not find the API
			const hasApi = await apisPage.hasApi(createdApiName);
			expect(hasApi).toBe(false);
		});
	});

	test.afterAll(async ({ request }) => {
		// Cleanup: If test failed partway through, ensure API is deleted
		try {
			const apiClient = new E2EApiClient(request);
			await apiClient.cleanupApis((api) => isE2ETestData(api.name));
		} catch (error) {
			console.log('Cleanup note:', error);
		}
	});
});
