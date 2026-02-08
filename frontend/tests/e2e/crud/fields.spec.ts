/**
 * Fields CRUD Lifecycle Test
 *
 * Tests the complete lifecycle of field entities:
 * 1. Create a new field
 * 2. Verify field appears in list
 * 3. Update field properties
 * 4. Verify updates are persisted
 * 5. Delete field
 * 6. Verify field is removed
 *
 * This test is self-contained - it creates its own test data and cleans up after itself.
 * Uses unique names with e2e_ prefix for easy identification.
 *
 * @tags app-crud
 */

import { test, expect } from '@playwright/test';
import { FieldRegistryPage } from '../../page-objects';
import { fieldName, testFieldData, isE2ETestData, E2EApiClient } from '../../helpers';

test.describe('Fields CRUD Lifecycle', () => {
	let fieldRegistryPage: FieldRegistryPage;
	let createdFieldName: string;

	test.beforeAll(() => {
		// Generate unique field name for this test run
		createdFieldName = fieldName('crud');
	});

	test.beforeEach(async ({ page }) => {
		fieldRegistryPage = new FieldRegistryPage(page);
	});

	test.describe.serial('Field Lifecycle', () => {
		test('Step 1: Create new field', async ({ page }) => {
			await fieldRegistryPage.goto();

			// Get initial count
			const initialCount = await fieldRegistryPage.getRowCount();

			// Create new field
			await fieldRegistryPage.createNewField({
				name: createdFieldName,
				type: 'str',
				description: 'E2E test field for CRUD lifecycle',
				defaultValue: 'test_default_value'
			});

			// Verify drawer closed
			const isDrawerOpen = await fieldRegistryPage.isDrawerOpen();
			expect(isDrawerOpen).toBe(false);

			// Verify field appears in list
			const hasField = await fieldRegistryPage.hasField(createdFieldName);
			expect(hasField).toBe(true);

			// Verify count increased
			const newCount = await fieldRegistryPage.getRowCount();
			expect(newCount).toBe(initialCount + 1);
		});

		test('Step 2: Read and verify field details', async ({ page }) => {
			await fieldRegistryPage.goto();

			// Search for the created field to ensure it's visible
			await fieldRegistryPage.search(createdFieldName);

			// Open the field
			await fieldRegistryPage.clickRow(createdFieldName);

			// Verify drawer opened with correct data
			const isDrawerOpen = await fieldRegistryPage.isDrawerOpen();
			expect(isDrawerOpen).toBe(true);

			// Verify field name
			const name = await fieldRegistryPage.getFieldName();
			expect(name).toBe(createdFieldName);

			// Verify type
			const type = await fieldRegistryPage.getFieldType();
			expect(type).toBe('str');

			// Verify description
			const description = await fieldRegistryPage.getFieldDescription();
			expect(description).toContain('E2E test field');

			// Verify default value
			const defaultValue = await fieldRegistryPage.getDefaultValue();
			expect(defaultValue).toBe('test_default_value');

			// Close drawer
			await fieldRegistryPage.closeDrawer();
		});

		test('Step 3: Update field', async ({ page }) => {
			await fieldRegistryPage.goto();

			// Search for the field
			await fieldRegistryPage.search(createdFieldName);

			// Open the field
			await fieldRegistryPage.clickRow(createdFieldName);
			expect(await fieldRegistryPage.isDrawerOpen()).toBe(true);

			// Update description
			const newDescription = `Updated description at ${new Date().toISOString()}`;
			await fieldRegistryPage.setFieldDescription(newDescription);

			// Update default value
			const newDefaultValue = 'updated_default_value';
			await fieldRegistryPage.setDefaultValue(newDefaultValue);

			// Verify save button is enabled
			const isSaveEnabled = await fieldRegistryPage.isSaveEnabled();
			expect(isSaveEnabled).toBe(true);

			// Save changes
			await fieldRegistryPage.save();

			// Verify drawer closed after save
			const isDrawerOpen = await fieldRegistryPage.isDrawerOpen();
			expect(isDrawerOpen).toBe(false);
		});

		test('Step 4: Verify updates persisted', async ({ page }) => {
			await fieldRegistryPage.goto();

			// Search for the field
			await fieldRegistryPage.search(createdFieldName);

			// Open the field
			await fieldRegistryPage.clickRow(createdFieldName);

			// Verify updated values
			const description = await fieldRegistryPage.getFieldDescription();
			expect(description).toContain('Updated description');

			const defaultValue = await fieldRegistryPage.getDefaultValue();
			expect(defaultValue).toBe('updated_default_value');

			// Close drawer
			await fieldRegistryPage.closeDrawer();
		});

		test('Step 5: Delete field', async ({ page }) => {
			await fieldRegistryPage.goto();

			// Get initial count
			const initialCount = await fieldRegistryPage.getRowCount();

			// Search for the field
			await fieldRegistryPage.search(createdFieldName);

			// Open the field
			await fieldRegistryPage.clickRow(createdFieldName);

			// Check if delete is enabled (field shouldn't have references)
			const isDeleteEnabled = await fieldRegistryPage.isDeleteEnabled();

			if (isDeleteEnabled) {
				// Click delete
				await fieldRegistryPage.clickDelete();

				// Verify confirmation appears
				await expect(fieldRegistryPage.deleteConfirmButton).toBeVisible();

				// Confirm delete
				await fieldRegistryPage.confirmDelete();

				// Wait for deletion to complete
				await page.waitForTimeout(500);

				// Clear search to see full list
				await fieldRegistryPage.clearSearch();

				// Verify field is removed
				const hasField = await fieldRegistryPage.hasField(createdFieldName);
				expect(hasField).toBe(false);
			} else {
				// If delete is disabled, the field has references - skip this step
				test.skip();
			}
		});

		test('Step 6: Verify field is removed', async ({ page }) => {
			await fieldRegistryPage.goto();

			// Search for the deleted field
			await fieldRegistryPage.search(createdFieldName);

			// Should show empty state or no results
			const hasField = await fieldRegistryPage.hasField(createdFieldName);
			expect(hasField).toBe(false);
		});
	});

	test.afterAll(async ({ request }) => {
		// Cleanup: If test failed partway through, ensure field is deleted
		// Use API client to clean up any remaining test data
		try {
			const apiClient = new E2EApiClient(request);
			await apiClient.cleanupFields((field) => isE2ETestData(field.name));
		} catch (error) {
			// Cleanup errors are non-fatal
			console.log('Cleanup note:', error);
		}
	});
});
