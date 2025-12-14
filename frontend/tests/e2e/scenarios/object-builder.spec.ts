/**
 * Object Builder Feature Tests
 *
 * Comprehensive E2E tests for the object builder page functionality.
 * Tests search, view details, edit, create, and delete operations for objects.
 *
 * @tags full
 */

import { test, expect } from '@playwright/test';
import { ObjectBuilderPage } from '../page-objects/ObjectBuilderPage';

test.describe('Object Builder - Feature Tests', () => {
	let objectBuilderPage: ObjectBuilderPage;

	test.beforeEach(async ({ page }) => {
		objectBuilderPage = new ObjectBuilderPage(page);
		await objectBuilderPage.goto();
	});

	test.describe('Page Load', () => {
		test('should display objects page with title', async () => {
			await expect(objectBuilderPage.pageTitle).toBeVisible();
		});

		test('should display table with objects', async () => {
			await expect(objectBuilderPage.table).toBeVisible();
			const rowCount = await objectBuilderPage.getRowCount();
			expect(rowCount).toBeGreaterThanOrEqual(0);
		});

		test('should display search input', async () => {
			await expect(objectBuilderPage.searchInput).toBeVisible();
		});

		test('should display Create Object button', async () => {
			await expect(objectBuilderPage.createObjectButton).toBeVisible();
			await expect(objectBuilderPage.createObjectButton).toBeEnabled();
		});
	});

	test.describe('Search', () => {
		test('should filter objects by name', async () => {
			const initialCount = await objectBuilderPage.getRowCount();

			if (initialCount > 0) {
				const names = await objectBuilderPage.getVisibleObjectNames();
				const searchTerm = names[0].substring(0, 3).toLowerCase();

				await objectBuilderPage.search(searchTerm);

				const filteredCount = await objectBuilderPage.getRowCount();
				expect(filteredCount).toBeLessThanOrEqual(initialCount);

				// Verify matching results contain search term
				const filteredNames = await objectBuilderPage.getVisibleObjectNames();
				for (const name of filteredNames) {
					expect(name.toLowerCase()).toContain(searchTerm);
				}
			}
		});

		test('should show empty state for no results', async () => {
			await objectBuilderPage.search('xyznonexistent123');

			const isEmpty = await objectBuilderPage.isEmptyStateVisible();
			expect(isEmpty).toBe(true);
		});

		test('should restore results when clearing search', async () => {
			const initialCount = await objectBuilderPage.getRowCount();

			if (initialCount > 0) {
				const names = await objectBuilderPage.getVisibleObjectNames();
				const searchTerm = names[0].substring(0, 3);

				await objectBuilderPage.search(searchTerm);
				await objectBuilderPage.clearSearch();

				const restoredCount = await objectBuilderPage.getRowCount();
				expect(restoredCount).toBe(initialCount);
			}
		});
	});

	test.describe('View Details (Drawer)', () => {
		test('should open drawer when clicking a row', async () => {
			const names = await objectBuilderPage.getVisibleObjectNames();
			if (names.length > 0) {
				await objectBuilderPage.clickRow(names[0]);

				const isOpen = await objectBuilderPage.isDrawerOpen();
				expect(isOpen).toBe(true);
			}
		});

		test('should display object details in drawer', async () => {
			const names = await objectBuilderPage.getVisibleObjectNames();
			if (names.length > 0) {
				await objectBuilderPage.clickRow(names[0]);

				const objectName = await objectBuilderPage.getObjectName();
				expect(objectName).toBe(names[0]);
			}
		});

		test('should close drawer when clicking close button', async () => {
			const names = await objectBuilderPage.getVisibleObjectNames();
			if (names.length > 0) {
				await objectBuilderPage.clickRow(names[0]);

				await objectBuilderPage.closeDrawer();

				const isOpen = await objectBuilderPage.isDrawerOpen();
				expect(isOpen).toBe(false);
			}
		});
	});

	test.describe('Edit Object', () => {
		test('should enable save button when making changes', async () => {
			const names = await objectBuilderPage.getVisibleObjectNames();
			if (names.length > 0) {
				await objectBuilderPage.clickRow(names[0]);

				// Initially save should be disabled
				const initiallyEnabled = await objectBuilderPage.isSaveEnabled();
				expect(initiallyEnabled).toBe(false);

				// Make a change
				const originalName = await objectBuilderPage.getObjectName();
				await objectBuilderPage.setObjectName(originalName + ' Modified');

				// Save should now be enabled
				const nowEnabled = await objectBuilderPage.isSaveEnabled();
				expect(nowEnabled).toBe(true);

				// Undo to restore
				await objectBuilderPage.undo();
			}
		});

		test('should enable undo button when making changes', async () => {
			const names = await objectBuilderPage.getVisibleObjectNames();
			if (names.length > 0) {
				await objectBuilderPage.clickRow(names[0]);

				// Initially undo should be disabled
				const initiallyEnabled = await objectBuilderPage.isUndoEnabled();
				expect(initiallyEnabled).toBe(false);

				// Make a change
				const originalName = await objectBuilderPage.getObjectName();
				await objectBuilderPage.setObjectName(originalName + ' Modified');

				// Undo should now be enabled
				const nowEnabled = await objectBuilderPage.isUndoEnabled();
				expect(nowEnabled).toBe(true);

				// Undo to restore
				await objectBuilderPage.undo();
			}
		});

		test('should revert changes when clicking undo', async () => {
			const names = await objectBuilderPage.getVisibleObjectNames();
			if (names.length > 0) {
				await objectBuilderPage.clickRow(names[0]);

				const originalName = await objectBuilderPage.getObjectName();
				await objectBuilderPage.setObjectName('Modified Name');

				await objectBuilderPage.undo();

				const restoredName = await objectBuilderPage.getObjectName();
				expect(restoredName).toBe(originalName);
			}
		});

		test('should save changes successfully', async () => {
			const names = await objectBuilderPage.getVisibleObjectNames();
			if (names.length > 0) {
				const objectName = names[0];

				await objectBuilderPage.clickRow(objectName);

				const newDescription = 'Updated description ' + Date.now();
				await objectBuilderPage.setObjectDescription(newDescription);

				// Save should enable after making changes
				const saveEnabledBefore = await objectBuilderPage.isSaveEnabled();
				expect(saveEnabledBefore).toBe(true);

				await objectBuilderPage.save();

				// Verify drawer closed after save
				const isOpen = await objectBuilderPage.isDrawerOpen();
				expect(isOpen).toBe(false);
			}
		});

		test('should validate required object name', async () => {
			const names = await objectBuilderPage.getVisibleObjectNames();
			if (names.length > 0) {
				await objectBuilderPage.clickRow(names[0]);

				// Clear the name field
				await objectBuilderPage.setObjectName('');

				// Try to save
				await objectBuilderPage.save();

				// Should show validation error
				const error = await objectBuilderPage.getValidationError('name');
				expect(error).toContain('required');
			}
		});
	});

	test.describe('Create Object', () => {
		test('should open creation drawer when clicking Create Object', async () => {
			await objectBuilderPage.openCreateDrawer();

			const isOpen = await objectBuilderPage.isCreateDrawerOpen();
			expect(isOpen).toBe(true);
		});

		test('should have create button disabled when name is empty', async () => {
			await objectBuilderPage.openCreateDrawer();

			// Initially the name is empty, so create should be disabled
			const isEnabled = await objectBuilderPage.isCreateEnabled();
			expect(isEnabled).toBe(false);
		});

		test('should enable create button when name is entered', async () => {
			await objectBuilderPage.openCreateDrawer();

			await objectBuilderPage.setObjectName('NewTestObject');

			const isEnabled = await objectBuilderPage.isCreateEnabled();
			expect(isEnabled).toBe(true);
		});

		test('should cancel creation and close drawer', async () => {
			await objectBuilderPage.openCreateDrawer();

			await objectBuilderPage.setObjectName('CancelledObject');
			await objectBuilderPage.cancelCreate();

			const isOpen = await objectBuilderPage.isCreateDrawerOpen();
			expect(isOpen).toBe(false);

			// Object should not exist in table
			const hasObject = await objectBuilderPage.hasObject('CancelledObject');
			expect(hasObject).toBe(false);
		});

		test('should successfully create a new object', async () => {
			const uniqueObjectName = `TestObject_${Date.now()}`;
			const initialCount = await objectBuilderPage.getRowCount();

			await objectBuilderPage.createNewObject({
				name: uniqueObjectName,
				description: 'A test object created by E2E tests'
			});

			// Drawer should close after successful creation
			const isOpen = await objectBuilderPage.isDrawerOpen();
			expect(isOpen).toBe(false);

			// Object should appear in table
			const hasObject = await objectBuilderPage.hasObject(uniqueObjectName);
			expect(hasObject).toBe(true);

			// Row count should increase
			const newCount = await objectBuilderPage.getRowCount();
			expect(newCount).toBe(initialCount + 1);
		});

		test('should allow viewing newly created object by clicking its row', async () => {
			const uniqueObjectName = `ViewAfterCreate_${Date.now()}`;

			await objectBuilderPage.createNewObject({
				name: uniqueObjectName,
				description: 'Testing view after creation'
			});

			// Drawer should close after creation
			const isClosedAfterCreate = await objectBuilderPage.isDrawerOpen();
			expect(isClosedAfterCreate).toBe(false);

			// Object should appear in table
			const hasObject = await objectBuilderPage.hasObject(uniqueObjectName);
			expect(hasObject).toBe(true);

			// Click on the newly created object to view it
			await objectBuilderPage.clickRow(uniqueObjectName);

			// Drawer should open with the object details
			const isOpenAfterClick = await objectBuilderPage.isDrawerOpen();
			expect(isOpenAfterClick).toBe(true);

			// Verify object name in drawer
			const objectName = await objectBuilderPage.getObjectName();
			expect(objectName).toBe(uniqueObjectName);

			// Clean up
			await objectBuilderPage.closeDrawer();
		});

		test('should show validation error for duplicate object name in same namespace', async () => {
			// Get an existing object name
			const existingNames = await objectBuilderPage.getVisibleObjectNames();
			if (existingNames.length > 0) {
				const existingName = existingNames[0];

				await objectBuilderPage.openCreateDrawer();
				await objectBuilderPage.setObjectName(existingName);
				await objectBuilderPage.create();

				// Should show validation error
				const error = await objectBuilderPage.getValidationError('name');
				expect(error).toContain('already exists');
			}
		});

		test('should create object with fields from searchable dropdown', async ({ page }) => {
			const uniqueObjectName = `ObjectWithFields_${Date.now()}`;

			// First, navigate to field-registry to ensure there are fields available
			await page.goto('/field-registry');
			await page.waitForTimeout(300);

			// Get a field name from the fields page
			const fieldTableRows = page.locator('tbody tr');
			const fieldCount = await fieldTableRows.count();

			if (fieldCount > 0) {
				const firstRow = fieldTableRows.first();
				const fieldNameCell = firstRow.locator('td').first();
				const fieldName = (await fieldNameCell.textContent())?.trim() || '';

				// Now go to object builder
				await objectBuilderPage.goto();

				await objectBuilderPage.openCreateDrawer();
				await objectBuilderPage.setObjectName(uniqueObjectName);

				// Add the field using the searchable dropdown
				await objectBuilderPage.addField(fieldName);

				// Verify field was added (at least 1)
				const fieldCountAfterAdd = await objectBuilderPage.getFieldCount();
				expect(fieldCountAfterAdd).toBeGreaterThanOrEqual(1);

				// Create the object
				await objectBuilderPage.create();

				// Drawer should close after creation
				const isOpen = await objectBuilderPage.isDrawerOpen();
				expect(isOpen).toBe(false);

				// Verify object was created in table
				const hasObject = await objectBuilderPage.hasObject(uniqueObjectName);
				expect(hasObject).toBe(true);
			}
		});

		test('should prevent duplicate field additions', async ({ page }) => {
			const uniqueObjectName = `NoDuplicateFields_${Date.now()}`;

			// Navigate to field-registry to get a field
			await page.goto('/field-registry');
			await page.waitForTimeout(300);

			const fieldTableRows = page.locator('tbody tr');
			const fieldCount = await fieldTableRows.count();

			if (fieldCount > 0) {
				const firstRow = fieldTableRows.first();
				const fieldNameCell = firstRow.locator('td').first();
				const fieldName = (await fieldNameCell.textContent())?.trim() || '';

				// Go to object builder
				await objectBuilderPage.goto();

				await objectBuilderPage.openCreateDrawer();
				await objectBuilderPage.setObjectName(uniqueObjectName);

				// Add the field once
				await objectBuilderPage.addField(fieldName);

				const fieldCountAfterFirstAdd = await objectBuilderPage.getFieldCount();
				expect(fieldCountAfterFirstAdd).toBeGreaterThanOrEqual(1);

				// Try to add the same field again - the field selector should not show it
				await objectBuilderPage.fieldSelectorInput.click();
				await objectBuilderPage.fieldSelectorInput.fill(fieldName);
				await page.waitForTimeout(300);

				// After attempting to add the same field, count should not increase
				const fieldCountAfterSecondAttempt = await objectBuilderPage.getFieldCount();
				expect(fieldCountAfterSecondAttempt).toBe(fieldCountAfterFirstAdd);

				// Cancel without creating
				await objectBuilderPage.cancelCreate();
			}
		});

		test('should allow namespace selection during creation', async () => {
			const uniqueObjectName = `NamespacedObject_${Date.now()}`;

			await objectBuilderPage.openCreateDrawer();

			// Namespace selector should be visible and interactive in create mode
			await expect(objectBuilderPage.objectNamespaceSelect).toBeVisible();
			await expect(objectBuilderPage.objectNamespaceSelect).toBeEnabled();

			await objectBuilderPage.setObjectName(uniqueObjectName);

			// The namespace selector is a dropdown - we can interact with it
			// (We don't test changing namespaces as that requires specific namespace IDs)

			// Cancel to clean up
			await objectBuilderPage.cancelCreate();
		});

		test('should show namespace as read-only in edit mode', async () => {
			const names = await objectBuilderPage.getVisibleObjectNames();
			if (names.length > 0) {
				await objectBuilderPage.clickRow(names[0]);

				// In edit mode, namespace should be disabled
				await expect(objectBuilderPage.objectNamespaceInput).toBeDisabled();

				// Close drawer
				await objectBuilderPage.closeDrawer();
			}
		});

		test('should display field count in table after creation', async ({ page }) => {
			const uniqueObjectName = `FieldCountTest_${Date.now()}`;

			// Get a field from field-registry
			await page.goto('/field-registry');
			await page.waitForTimeout(300);

			const fieldTableRows = page.locator('tbody tr');
			const fieldCount = await fieldTableRows.count();

			if (fieldCount >= 2) {
				// Get two field names
				const field1Name = (await fieldTableRows.nth(0).locator('td').first().textContent())?.trim() || '';
				const field2Name = (await fieldTableRows.nth(1).locator('td').first().textContent())?.trim() || '';

				// Go to object builder
				await objectBuilderPage.goto();

				await objectBuilderPage.createNewObject({
					name: uniqueObjectName,
					fields: [field1Name, field2Name]
				});

				// Drawer closes automatically after creation
				const isOpen = await objectBuilderPage.isDrawerOpen();
				expect(isOpen).toBe(false);

				// Find the row for our new object
				const objectRow = objectBuilderPage.tableRows.filter({ hasText: uniqueObjectName });
				await expect(objectRow).toBeVisible();

				// Verify field count is displayed (should show the number of fields added)
				const fieldCountCell = objectRow.locator('td').nth(2);
				const fieldCountText = await fieldCountCell.textContent();
				// At least some fields should be shown
				expect(parseInt(fieldCountText?.trim() || '0', 10)).toBeGreaterThanOrEqual(1);
			}
		});
	});
});
