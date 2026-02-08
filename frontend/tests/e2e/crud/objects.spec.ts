/**
 * Objects CRUD Lifecycle Test
 *
 * Tests the complete lifecycle of object entities:
 * 1. Create a new object
 * 2. Verify object appears in list
 * 3. Update object properties (add/remove fields)
 * 4. Verify updates are persisted
 * 5. Delete object
 * 6. Verify object is removed
 *
 * This test is self-contained - it creates its own test data and cleans up after itself.
 * Uses unique names with e2e_ prefix for easy identification.
 *
 * @tags app-crud
 */

import { test, expect } from '@playwright/test';
import { ObjectBuilderPage, FieldRegistryPage } from '../../page-objects';
import { objectName, fieldName, isE2ETestData, E2EApiClient } from '../../helpers';

test.describe('Objects CRUD Lifecycle', () => {
	let objectBuilderPage: ObjectBuilderPage;
	let fieldRegistryPage: FieldRegistryPage;
	let createdObjectName: string;
	let helperFieldName: string;

	test.beforeAll(() => {
		// Generate unique names for this test run
		createdObjectName = objectName('crud');
		helperFieldName = fieldName('object-helper');
	});

	test.beforeEach(async ({ page }) => {
		objectBuilderPage = new ObjectBuilderPage(page);
		fieldRegistryPage = new FieldRegistryPage(page);
	});

	test.describe.serial('Object Lifecycle', () => {
		test('Step 0: Create helper field for object', async ({ page }) => {
			// Objects need fields - create a helper field first
			await fieldRegistryPage.goto();

			await fieldRegistryPage.createNewField({
				name: helperFieldName,
				type: 'str',
				description: 'Helper field for object CRUD test'
			});

			// Verify field was created
			const hasField = await fieldRegistryPage.hasField(helperFieldName);
			expect(hasField).toBe(true);
		});

		test('Step 1: Create new object', async ({ page }) => {
			await objectBuilderPage.goto();

			// Get initial count
			const initialCount = await objectBuilderPage.getRowCount();

			// Create new object
			await objectBuilderPage.createNewObject({
				name: createdObjectName,
				description: 'E2E test object for CRUD lifecycle'
			});

			// Verify drawer closed
			const isDrawerOpen = await objectBuilderPage.isDrawerOpen();
			expect(isDrawerOpen).toBe(false);

			// Verify object appears in list
			const hasObject = await objectBuilderPage.hasObject(createdObjectName);
			expect(hasObject).toBe(true);

			// Verify count increased
			const newCount = await objectBuilderPage.getRowCount();
			expect(newCount).toBe(initialCount + 1);
		});

		test('Step 2: Read and verify object details', async ({ page }) => {
			await objectBuilderPage.goto();

			// Search for the created object
			await objectBuilderPage.search(createdObjectName);

			// Open the object
			await objectBuilderPage.clickRow(createdObjectName);

			// Verify drawer opened with correct data
			const isDrawerOpen = await objectBuilderPage.isDrawerOpen();
			expect(isDrawerOpen).toBe(true);

			// Verify object name
			const name = await objectBuilderPage.getObjectName();
			expect(name).toBe(createdObjectName);

			// Verify description
			const description = await objectBuilderPage.getObjectDescription();
			expect(description).toContain('E2E test object');

			// Close drawer
			await objectBuilderPage.closeDrawer();
		});

		test('Step 3: Update object - add field', async ({ page }) => {
			await objectBuilderPage.goto();

			// Search for the object
			await objectBuilderPage.search(createdObjectName);

			// Open the object
			await objectBuilderPage.clickRow(createdObjectName);
			expect(await objectBuilderPage.isDrawerOpen()).toBe(true);

			// Get initial field count
			const initialFieldCount = await objectBuilderPage.getFieldCount();

			// Add a field to the object
			await objectBuilderPage.addField(helperFieldName);

			// Verify field was added
			const newFieldCount = await objectBuilderPage.getFieldCount();
			expect(newFieldCount).toBe(initialFieldCount + 1);

			// Update description
			const newDescription = `Updated description at ${new Date().toISOString()}`;
			await objectBuilderPage.setObjectDescription(newDescription);

			// Verify save button is enabled
			const isSaveEnabled = await objectBuilderPage.isSaveEnabled();
			expect(isSaveEnabled).toBe(true);

			// Save changes
			await objectBuilderPage.save();

			// Verify drawer closed after save
			const isDrawerOpen = await objectBuilderPage.isDrawerOpen();
			expect(isDrawerOpen).toBe(false);
		});

		test('Step 4: Verify updates persisted', async ({ page }) => {
			await objectBuilderPage.goto();

			// Search for the object
			await objectBuilderPage.search(createdObjectName);

			// Open the object
			await objectBuilderPage.clickRow(createdObjectName);

			// Verify updated description
			const description = await objectBuilderPage.getObjectDescription();
			expect(description).toContain('Updated description');

			// Verify field count (should have the added field)
			const fieldCount = await objectBuilderPage.getFieldCount();
			expect(fieldCount).toBeGreaterThan(0);

			// Close drawer
			await objectBuilderPage.closeDrawer();
		});

		test('Step 5: Delete object', async ({ page }) => {
			await objectBuilderPage.goto();

			// Search for the object
			await objectBuilderPage.search(createdObjectName);

			// Open the object
			await objectBuilderPage.clickRow(createdObjectName);

			// Click delete
			await objectBuilderPage.delete();

			// Verify confirmation appears
			await expect(objectBuilderPage.deleteConfirmButton).toBeVisible();

			// Confirm delete
			await objectBuilderPage.confirmDelete();

			// Wait for deletion to complete
			await page.waitForTimeout(500);

			// Clear search to see full list
			await objectBuilderPage.clearSearch();

			// Verify object is removed
			const hasObject = await objectBuilderPage.hasObject(createdObjectName);
			expect(hasObject).toBe(false);
		});

		test('Step 6: Verify object is removed', async ({ page }) => {
			await objectBuilderPage.goto();

			// Search for the deleted object
			await objectBuilderPage.search(createdObjectName);

			// Should show empty state or no results
			const hasObject = await objectBuilderPage.hasObject(createdObjectName);
			expect(hasObject).toBe(false);
		});

		test('Step 7: Cleanup helper field', async ({ page }) => {
			// Clean up the helper field we created
			await fieldRegistryPage.goto();

			await fieldRegistryPage.search(helperFieldName);

			if (await fieldRegistryPage.hasField(helperFieldName)) {
				await fieldRegistryPage.clickRow(helperFieldName);

				const isDeleteEnabled = await fieldRegistryPage.isDeleteEnabled();
				if (isDeleteEnabled) {
					await fieldRegistryPage.clickDelete();
					await fieldRegistryPage.confirmDelete();
				}
			}
		});
	});

	test.afterAll(async ({ request }) => {
		// Cleanup: If test failed partway through, ensure test data is deleted
		try {
			const apiClient = new E2EApiClient(request);
			await apiClient.cleanupObjects((obj) => isE2ETestData(obj.name));
			await apiClient.cleanupFields((field) => isE2ETestData(field.name));
		} catch (error) {
			console.log('Cleanup note:', error);
		}
	});
});
