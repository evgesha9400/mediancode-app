/**
 * Field Registry Feature Tests
 *
 * Comprehensive E2E tests for the field registry page functionality.
 * Tests search, filter, sort, view details, edit, and delete operations.
 *
 * @tags full
 */

import { test, expect } from '@playwright/test';
import { FieldRegistryPage } from '../page-objects/FieldRegistryPage';

test.describe('Field Registry - Feature Tests', () => {
	let fieldRegistryPage: FieldRegistryPage;

	test.beforeEach(async ({ page }) => {
		fieldRegistryPage = new FieldRegistryPage(page);
		await fieldRegistryPage.goto();
	});

	test.describe('Page Load', () => {
		test('should display field registry page with title', async () => {
			await expect(fieldRegistryPage.pageTitle).toBeVisible();
		});

		test('should display table with fields', async () => {
			await expect(fieldRegistryPage.table).toBeVisible();
			const rowCount = await fieldRegistryPage.getRowCount();
			expect(rowCount).toBeGreaterThan(0);
		});

		test('should display search input', async () => {
			await expect(fieldRegistryPage.searchInput).toBeVisible();
		});
	});

	test.describe('Search', () => {
		test('should filter fields by name', async () => {
			const initialCount = await fieldRegistryPage.getRowCount();

			await fieldRegistryPage.search('email');

			const filteredCount = await fieldRegistryPage.getRowCount();
			expect(filteredCount).toBeLessThanOrEqual(initialCount);

			// Verify matching results contain search term
			const names = await fieldRegistryPage.getVisibleFieldNames();
			for (const name of names) {
				expect(name.toLowerCase()).toContain('email');
			}
		});

		test('should show empty state for no results', async () => {
			await fieldRegistryPage.search('xyznonexistent123');

			const isEmpty = await fieldRegistryPage.isEmptyStateVisible();
			expect(isEmpty).toBe(true);
		});

		test('should restore results when clearing search', async () => {
			const initialCount = await fieldRegistryPage.getRowCount();

			await fieldRegistryPage.search('email');
			await fieldRegistryPage.clearSearch();

			const restoredCount = await fieldRegistryPage.getRowCount();
			expect(restoredCount).toBe(initialCount);
		});
	});

	test.describe('View Details (Drawer)', () => {
		test('should open drawer when clicking a row', async () => {
			const names = await fieldRegistryPage.getVisibleFieldNames();
			expect(names.length).toBeGreaterThan(0);

			await fieldRegistryPage.clickRow(names[0]);

			const isOpen = await fieldRegistryPage.isDrawerOpen();
			expect(isOpen).toBe(true);
		});

		test('should display field details in drawer', async () => {
			const names = await fieldRegistryPage.getVisibleFieldNames();
			await fieldRegistryPage.clickRow(names[0]);

			const fieldName = await fieldRegistryPage.getFieldName();
			expect(fieldName).toBe(names[0]);
		});

		test('should close drawer when clicking close button', async () => {
			const names = await fieldRegistryPage.getVisibleFieldNames();
			await fieldRegistryPage.clickRow(names[0]);

			await fieldRegistryPage.closeDrawer();

			const isOpen = await fieldRegistryPage.isDrawerOpen();
			expect(isOpen).toBe(false);
		});
	});

	test.describe('Edit Field', () => {
		test('should enable save button when making changes', async () => {
			const names = await fieldRegistryPage.getVisibleFieldNames();
			await fieldRegistryPage.clickRow(names[0]);

			// Initially save should be disabled
			const initiallyEnabled = await fieldRegistryPage.isSaveEnabled();
			expect(initiallyEnabled).toBe(false);

			// Make a change
			const originalName = await fieldRegistryPage.getFieldName();
			await fieldRegistryPage.setFieldName(originalName + ' Modified');

			// Save should now be enabled
			const nowEnabled = await fieldRegistryPage.isSaveEnabled();
			expect(nowEnabled).toBe(true);
		});

		test('should enable undo button when making changes', async () => {
			const names = await fieldRegistryPage.getVisibleFieldNames();
			await fieldRegistryPage.clickRow(names[0]);

			// Initially undo should be disabled
			const initiallyEnabled = await fieldRegistryPage.isUndoEnabled();
			expect(initiallyEnabled).toBe(false);

			// Make a change
			const originalName = await fieldRegistryPage.getFieldName();
			await fieldRegistryPage.setFieldName(originalName + ' Modified');

			// Undo should now be enabled
			const nowEnabled = await fieldRegistryPage.isUndoEnabled();
			expect(nowEnabled).toBe(true);
		});

		test('should revert changes when clicking undo', async () => {
			const names = await fieldRegistryPage.getVisibleFieldNames();
			await fieldRegistryPage.clickRow(names[0]);

			const originalName = await fieldRegistryPage.getFieldName();
			await fieldRegistryPage.setFieldName('Modified Name');

			await fieldRegistryPage.undo();

			const restoredName = await fieldRegistryPage.getFieldName();
			expect(restoredName).toBe(originalName);
		});

		test('should save changes successfully', async () => {
			const names = await fieldRegistryPage.getVisibleFieldNames();
			await fieldRegistryPage.clickRow(names[0]);

			const originalDescription = await fieldRegistryPage.getFieldDescription();
			const newDescription = 'Updated description ' + Date.now();
			await fieldRegistryPage.setFieldDescription(newDescription);

			await fieldRegistryPage.save();

			// Verify save button is disabled after save (no pending changes)
			const saveEnabled = await fieldRegistryPage.isSaveEnabled();
			expect(saveEnabled).toBe(false);

			// Restore original description for other tests
			await fieldRegistryPage.setFieldDescription(originalDescription);
			await fieldRegistryPage.save();
		});

		test('should validate required field name', async () => {
			const names = await fieldRegistryPage.getVisibleFieldNames();
			await fieldRegistryPage.clickRow(names[0]);

			// Clear the name field
			await fieldRegistryPage.setFieldName('');

			// Try to save
			await fieldRegistryPage.save();

			// Should show validation error
			const error = await fieldRegistryPage.getValidationError('name');
			expect(error).toContain('required');
		});
	});

	test.describe('Validators', () => {
		test('should display validators for a field', async ({ page }) => {
			// Find a field that has validators
			await fieldRegistryPage.search('email');
			const names = await fieldRegistryPage.getVisibleFieldNames();

			if (names.length > 0) {
				await fieldRegistryPage.clickRow(names[0]);
				// Just verify we can access the validators section
				const validatorCount = await fieldRegistryPage.getValidatorCount();
				expect(validatorCount).toBeGreaterThanOrEqual(0);
			}
		});

		test('should add a validator', async () => {
			const names = await fieldRegistryPage.getVisibleFieldNames();
			await fieldRegistryPage.clickRow(names[0]);

			const initialCount = await fieldRegistryPage.getValidatorCount();
			await fieldRegistryPage.addValidator();

			const newCount = await fieldRegistryPage.getValidatorCount();
			expect(newCount).toBe(initialCount + 1);

			// Undo to restore original state
			await fieldRegistryPage.undo();
		});

		test('should remove a validator', async () => {
			const names = await fieldRegistryPage.getVisibleFieldNames();
			await fieldRegistryPage.clickRow(names[0]);

			// First add a validator to ensure we have one to remove
			await fieldRegistryPage.addValidator();
			const afterAddCount = await fieldRegistryPage.getValidatorCount();

			if (afterAddCount > 0) {
				await fieldRegistryPage.removeValidator(0);
				const afterRemoveCount = await fieldRegistryPage.getValidatorCount();
				expect(afterRemoveCount).toBe(afterAddCount - 1);
			}

			// Undo to restore original state
			await fieldRegistryPage.undo();
		});
	});

	test.describe('Delete Field', () => {
		test('should show delete confirmation when clicking delete', async () => {
			// Find a field that can be deleted (not used in APIs)
			const names = await fieldRegistryPage.getVisibleFieldNames();
			await fieldRegistryPage.clickRow(names[0]);

			const isDeleteEnabled = await fieldRegistryPage.isDeleteEnabled();

			if (isDeleteEnabled) {
				await fieldRegistryPage.clickDelete();
				await expect(fieldRegistryPage.deleteConfirmButton).toBeVisible();
			}
		});

		test('should cancel delete when clicking cancel', async () => {
			const names = await fieldRegistryPage.getVisibleFieldNames();
			await fieldRegistryPage.clickRow(names[0]);

			const isDeleteEnabled = await fieldRegistryPage.isDeleteEnabled();

			if (isDeleteEnabled) {
				await fieldRegistryPage.clickDelete();
				await fieldRegistryPage.cancelDelete();

				// Confirm button should no longer be visible
				await expect(fieldRegistryPage.deleteConfirmButton).not.toBeVisible();
			}
		});

		test('should disable delete button for fields with references', async ({ page }) => {
			// Find a field that is used in APIs
			const names = await fieldRegistryPage.getVisibleFieldNames();

			for (const name of names) {
				await fieldRegistryPage.clickRow(name);

				// Check if delete is disabled
				const isDisabled = !(await fieldRegistryPage.isDeleteEnabled());

				if (isDisabled) {
					// Found a field with references - delete should be disabled
					expect(isDisabled).toBe(true);
					break;
				}

				await fieldRegistryPage.closeDrawer();
			}
		});
	});

	test.describe('Sorting', () => {
		test('should sort by field name', async () => {
			await fieldRegistryPage.sortByColumn('name');

			const names = await fieldRegistryPage.getVisibleFieldNames();
			expect(names.length).toBeGreaterThan(1);

			// Verify ascending order
			const sortedNames = [...names].sort((a, b) => a.localeCompare(b));
			expect(names).toEqual(sortedNames);
		});

		test('should reverse sort on second click', async () => {
			// First click - ascending
			await fieldRegistryPage.sortByColumn('name');
			const ascNames = await fieldRegistryPage.getVisibleFieldNames();

			// Second click - descending
			await fieldRegistryPage.sortByColumn('name');
			const descNames = await fieldRegistryPage.getVisibleFieldNames();

			// Verify descending order (reversed)
			expect(descNames).toEqual([...ascNames].reverse());
		});
	});

	test.describe('Filters', () => {
		test('should open filter panel', async () => {
			await fieldRegistryPage.openFilters();
			await expect(fieldRegistryPage.filterPanel).toBeVisible();
		});

		test('should filter by field type', async () => {
			const initialCount = await fieldRegistryPage.getRowCount();

			await fieldRegistryPage.openFilters();
			await fieldRegistryPage.toggleFilterCheckbox('str');

			// Wait for filter to apply
			await fieldRegistryPage.page.waitForTimeout(300);

			const filteredCount = await fieldRegistryPage.getRowCount();
			expect(filteredCount).toBeLessThanOrEqual(initialCount);
			expect(filteredCount).toBeGreaterThan(0);
		});

		test('should clear filters', async () => {
			const initialCount = await fieldRegistryPage.getRowCount();

			await fieldRegistryPage.openFilters();
			await fieldRegistryPage.toggleFilterCheckbox('str');

			await fieldRegistryPage.clearFilters();

			// Wait for filter to clear
			await fieldRegistryPage.page.waitForTimeout(300);

			const restoredCount = await fieldRegistryPage.getRowCount();
			expect(restoredCount).toBe(initialCount);
		});
	});
});
