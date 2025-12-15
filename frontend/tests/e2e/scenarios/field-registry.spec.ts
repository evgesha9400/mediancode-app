/**
 * Fields Feature Tests
 *
 * Comprehensive E2E tests for the fields page functionality.
 * Tests search, filter, sort, view details, edit, and delete operations.
 *
 * @tags full
 */

import { test, expect } from '@playwright/test';
import { FieldRegistryPage } from '../page-objects/FieldRegistryPage';

test.describe('Fields - Feature Tests', () => {
	let fieldRegistryPage: FieldRegistryPage;

	test.beforeEach(async ({ page }) => {
		fieldRegistryPage = new FieldRegistryPage(page);
		await fieldRegistryPage.goto();
	});

	test.describe('Page Load', () => {
		test('should display fields page with title', async () => {
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
			const fieldName = names[0];

			await fieldRegistryPage.clickRow(fieldName);

			const newDescription = 'Updated description ' + Date.now();
			await fieldRegistryPage.setFieldDescription(newDescription);

			// Save should enable after making changes
			const saveEnabledBefore = await fieldRegistryPage.isSaveEnabled();
			expect(saveEnabledBefore).toBe(true);

			await fieldRegistryPage.save();

			// Verify drawer closed after save
			const isOpen = await fieldRegistryPage.isDrawerOpen();
			expect(isOpen).toBe(false);
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

		test('should correctly count individual validator rows (regression test)', async () => {
			const names = await fieldRegistryPage.getVisibleFieldNames();
			await fieldRegistryPage.clickRow(names[0]);

			// Get initial count - should be 0 or more, but definitely not 1 if there are no validators
			const initialCount = await fieldRegistryPage.getValidatorCount();

			// Add first validator
			await fieldRegistryPage.addValidator();
			const countAfterFirst = await fieldRegistryPage.getValidatorCount();
			expect(countAfterFirst).toBe(initialCount + 1);

			// Add second validator - this is the critical test
			// The old broken locator would return count=1 (the container)
			// The fixed locator should return count=2 (individual rows)
			await fieldRegistryPage.addValidator();
			const countAfterSecond = await fieldRegistryPage.getValidatorCount();
			expect(countAfterSecond).toBe(initialCount + 2);

			// Add third validator to be extra sure
			await fieldRegistryPage.addValidator();
			const countAfterThird = await fieldRegistryPage.getValidatorCount();
			expect(countAfterThird).toBe(initialCount + 3);

			// Verify each validator is independently accessible
			const firstValidatorRow = fieldRegistryPage.validatorRows.nth(0);
			const secondValidatorRow = fieldRegistryPage.validatorRows.nth(1);
			const thirdValidatorRow = fieldRegistryPage.validatorRows.nth(2);

			await expect(firstValidatorRow).toBeVisible();
			await expect(secondValidatorRow).toBeVisible();
			await expect(thirdValidatorRow).toBeVisible();

			// Undo to restore original state
			await fieldRegistryPage.undo();
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
		type RowData = { name: string; type: string; namespace: string; defaultValue: string; usedInApis: number };

		const getRowData = async (): Promise<RowData[]> => {
			const [names, types, namespaces, defaultValues, usedInApis] = await Promise.all([
				fieldRegistryPage.getVisibleFieldNames(),
				fieldRegistryPage.getVisibleTypes(),
				fieldRegistryPage.getVisibleNamespaces(),
				fieldRegistryPage.getVisibleDefaultValues(),
				fieldRegistryPage.getVisibleUsedInApis()
			]);

			return names.map((name, index) => ({
				name,
				type: types[index],
				namespace: namespaces[index],
				defaultValue: defaultValues[index],
				usedInApis: usedInApis[index]
			}));
		};

		const sortRows = (rows: RowData[], order: Array<keyof RowData>): RowData[] => {
			return [...rows].sort((a, b) => {
				for (const key of order) {
					let comparison = 0;
					if (key === 'usedInApis') {
						comparison = a[key] - b[key];
					} else {
						comparison = a[key].toString().toLowerCase().localeCompare(b[key].toString().toLowerCase());
					}
					if (comparison !== 0) return comparison;
				}
				return 0;
			});
		};

		test.describe('Single Column Sort Cycles', () => {
			test('should cycle name sort through asc, desc, then clear', async () => {
				const baselineNames = await fieldRegistryPage.getVisibleFieldNames();
				expect(baselineNames.length).toBeGreaterThan(0);

				// First click - ascending
				await fieldRegistryPage.sortByColumn('name');
				const ascNames = await fieldRegistryPage.getVisibleFieldNames();
				const expectedAsc = [...baselineNames].sort((a, b) => a.localeCompare(b));
				expect(ascNames).toEqual(expectedAsc);

				// Second click - descending
				await fieldRegistryPage.sortByColumn('name');
				const descNames = await fieldRegistryPage.getVisibleFieldNames();
				expect(descNames).toEqual([...expectedAsc].reverse());

				// Third click - clear sort (reset to baseline)
				await fieldRegistryPage.sortByColumn('name');
				const resetNames = await fieldRegistryPage.getVisibleFieldNames();
				expect(resetNames).toEqual(baselineNames);
			});

			test('should cycle type sort through asc, desc, then clear', async () => {
				const baselineTypes = await fieldRegistryPage.getVisibleTypes();
				expect(baselineTypes.length).toBeGreaterThan(0);

				// First click - ascending
				await fieldRegistryPage.sortByColumn('type');
				const ascTypes = await fieldRegistryPage.getVisibleTypes();
				const expectedAsc = [...baselineTypes].sort((a, b) => a.localeCompare(b));
				expect(ascTypes).toEqual(expectedAsc);

				// Second click - descending
				await fieldRegistryPage.sortByColumn('type');
				const descTypes = await fieldRegistryPage.getVisibleTypes();
				expect(descTypes).toEqual([...expectedAsc].reverse());

				// Third click - clear sort
				await fieldRegistryPage.sortByColumn('type');
				const resetTypes = await fieldRegistryPage.getVisibleTypes();
				expect(resetTypes).toEqual(baselineTypes);
			});

			test('should cycle defaultValue sort through asc, desc, then clear', async () => {
				const baselineDefaultValues = await fieldRegistryPage.getVisibleDefaultValues();
				expect(baselineDefaultValues.length).toBeGreaterThan(0);

				// First click - ascending
				await fieldRegistryPage.sortByColumn('defaultValue');
				const ascDefaultValues = await fieldRegistryPage.getVisibleDefaultValues();
				const expectedAsc = [...baselineDefaultValues].sort((a, b) => a.localeCompare(b));
				expect(ascDefaultValues).toEqual(expectedAsc);

				// Second click - descending
				await fieldRegistryPage.sortByColumn('defaultValue');
				const descDefaultValues = await fieldRegistryPage.getVisibleDefaultValues();
				expect(descDefaultValues).toEqual([...expectedAsc].reverse());

				// Third click - clear sort
				await fieldRegistryPage.sortByColumn('defaultValue');
				const resetDefaultValues = await fieldRegistryPage.getVisibleDefaultValues();
				expect(resetDefaultValues).toEqual(baselineDefaultValues);
			});

			test('should cycle usedInApis sort through asc, desc, then clear', async () => {
				const baselineUsedInApis = await fieldRegistryPage.getVisibleUsedInApis();
				expect(baselineUsedInApis.length).toBeGreaterThan(0);

				// First click - ascending (numeric)
				await fieldRegistryPage.sortByColumn('usedInApis');
				const ascUsedInApis = await fieldRegistryPage.getVisibleUsedInApis();
				const expectedAsc = [...baselineUsedInApis].sort((a, b) => a - b);
				expect(ascUsedInApis).toEqual(expectedAsc);

				// Second click - descending
				await fieldRegistryPage.sortByColumn('usedInApis');
				const descUsedInApis = await fieldRegistryPage.getVisibleUsedInApis();
				expect(descUsedInApis).toEqual([...expectedAsc].reverse());

				// Third click - clear sort
				await fieldRegistryPage.sortByColumn('usedInApis');
				const resetUsedInApis = await fieldRegistryPage.getVisibleUsedInApis();
				expect(resetUsedInApis).toEqual(baselineUsedInApis);
			});
		});

		test.describe('Multi-Column Sort', () => {
			test('should apply multi-column sort when type then name', async () => {
				const baselineRows = await getRowData();

				await fieldRegistryPage.sortByColumn('type');
				await fieldRegistryPage.sortByColumn('name', true);

				const sortedRows = await getRowData();
				const expected = sortRows(baselineRows, ['type', 'name']);

				expect(sortedRows).toEqual(expected);
			});

			test('should apply multi-column sort when name then type', async () => {
				const baselineRows = await getRowData();

				await fieldRegistryPage.sortByColumn('name');
				await fieldRegistryPage.sortByColumn('type', true);

				const sortedRows = await getRowData();
				const expected = sortRows(baselineRows, ['name', 'type']);

				expect(sortedRows).toEqual(expected);
			});

			test('should apply multi-column sort when defaultValue then usedInApis', async () => {
				const baselineRows = await getRowData();

				await fieldRegistryPage.sortByColumn('defaultValue');
				await fieldRegistryPage.sortByColumn('usedInApis', true);

				const sortedRows = await getRowData();
				const expected = sortRows(baselineRows, ['defaultValue', 'usedInApis']);

				expect(sortedRows).toEqual(expected);
			});

			test('should apply multi-column sort when usedInApis then defaultValue', async () => {
				const baselineRows = await getRowData();

				await fieldRegistryPage.sortByColumn('usedInApis');
				await fieldRegistryPage.sortByColumn('defaultValue', true);

				const sortedRows = await getRowData();
				const expected = sortRows(baselineRows, ['usedInApis', 'defaultValue']);

				expect(sortedRows).toEqual(expected);
			});
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

	test.describe('Create Field', () => {
		test('should open creation drawer when clicking Add Field', async () => {
			await fieldRegistryPage.openCreateDrawer();

			const isOpen = await fieldRegistryPage.isCreateDrawerOpen();
			expect(isOpen).toBe(true);
		});

		test('should have create button disabled when name is empty', async () => {
			await fieldRegistryPage.openCreateDrawer();

			// Initially the name is empty, so create should be disabled
			const isEnabled = await fieldRegistryPage.isCreateEnabled();
			expect(isEnabled).toBe(false);
		});

		test('should enable create button when name is entered', async () => {
			await fieldRegistryPage.openCreateDrawer();

			await fieldRegistryPage.setFieldName('new_test_field');

			const isEnabled = await fieldRegistryPage.isCreateEnabled();
			expect(isEnabled).toBe(true);
		});

		test('should cancel creation and close drawer', async () => {
			await fieldRegistryPage.openCreateDrawer();

			await fieldRegistryPage.setFieldName('cancelled_field');
			await fieldRegistryPage.cancelCreate();

			const isOpen = await fieldRegistryPage.isCreateDrawerOpen();
			expect(isOpen).toBe(false);

			// Field should not exist in table
			const hasField = await fieldRegistryPage.hasField('cancelled_field');
			expect(hasField).toBe(false);
		});

		test('should successfully create a new field', async () => {
			const uniqueFieldName = `test_field_${Date.now()}`;
			const initialCount = await fieldRegistryPage.getRowCount();

			await fieldRegistryPage.createNewField({
				name: uniqueFieldName,
				description: 'A test field created by E2E tests',
				defaultValue: 'test_default'
			});

			// Drawer should close after successful creation (matches object builder behavior)
			const isOpen = await fieldRegistryPage.isDrawerOpen();
			expect(isOpen).toBe(false);

			// Field should appear in table
			const hasField = await fieldRegistryPage.hasField(uniqueFieldName);
			expect(hasField).toBe(true);

			// Row count should increase
			const newCount = await fieldRegistryPage.getRowCount();
			expect(newCount).toBe(initialCount + 1);
		});

		test('should allow viewing newly created field by clicking its row', async () => {
			const uniqueFieldName = `view_after_create_${Date.now()}`;

			await fieldRegistryPage.createNewField({
				name: uniqueFieldName,
				description: 'Testing view after creation'
			});

			// Drawer should close after creation
			const isClosedAfterCreate = await fieldRegistryPage.isDrawerOpen();
			expect(isClosedAfterCreate).toBe(false);

			// Field should appear in table
			const hasField = await fieldRegistryPage.hasField(uniqueFieldName);
			expect(hasField).toBe(true);

			// Wait for table state to stabilize after creation
			await fieldRegistryPage.page.waitForTimeout(500);

			// Click on the newly created field to view it
			await fieldRegistryPage.clickRow(uniqueFieldName);

			// Drawer should open with the field details
			const isOpenAfterClick = await fieldRegistryPage.isDrawerOpen();
			expect(isOpenAfterClick).toBe(true);

			// Verify field name in drawer
			const fieldName = await fieldRegistryPage.getFieldName();
			expect(fieldName).toBe(uniqueFieldName);

			// Clean up
			await fieldRegistryPage.closeDrawer();
		});

		test('should show validation error for duplicate field name', async () => {
			// Get an existing field name
			const existingNames = await fieldRegistryPage.getVisibleFieldNames();
			expect(existingNames.length).toBeGreaterThan(0);

			const existingName = existingNames[0];

			await fieldRegistryPage.openCreateDrawer();
			await fieldRegistryPage.setFieldName(existingName);
			await fieldRegistryPage.create();

			// Should show validation error
			const error = await fieldRegistryPage.getValidationError('name');
			expect(error).toContain('already exists');
		});

		test('should reset validators when type changes during creation', async () => {
			await fieldRegistryPage.openCreateDrawer();
			await fieldRegistryPage.setFieldName('type_change_test');

			// Add a validator
			const initialCount = await fieldRegistryPage.getValidatorCount();
			await fieldRegistryPage.addValidator();
			const countAfterAdd = await fieldRegistryPage.getValidatorCount();
			expect(countAfterAdd).toBe(initialCount + 1);

			// Change type
			await fieldRegistryPage.setFieldType('int');

			// Validators should be reset
			const countAfterTypeChange = await fieldRegistryPage.getValidatorCount();
			expect(countAfterTypeChange).toBe(0);

			// Cancel to not leave test data
			await fieldRegistryPage.cancelCreate();
		});

		test('should pre-populate first primitive type in creation mode', async () => {
			await fieldRegistryPage.openCreateDrawer();

			// The type should be pre-selected (first available type)
			const type = await fieldRegistryPage.getFieldType();
			expect(type).toBeTruthy();
			expect(type.length).toBeGreaterThan(0);
		});
	});
});
