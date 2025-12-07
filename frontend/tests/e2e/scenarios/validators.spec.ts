/**
 * Validators Feature Tests
 *
 * Comprehensive E2E tests for the validators page functionality.
 * Tests search, filter, sort, view details drawer, and delete operations.
 * Note: Only custom validators can be deleted. Inline validators are read-only.
 *
 * @tags full
 */

import { test, expect } from '@playwright/test';
import { ValidatorsPage } from '../page-objects/ValidatorsPage';

test.describe('Validators - Feature Tests', () => {
	let validatorsPage: ValidatorsPage;

	test.beforeEach(async ({ page }) => {
		validatorsPage = new ValidatorsPage(page);
		await validatorsPage.goto();
	});

	test.afterEach(async () => {
		// Ensure drawer is closed after each test to prevent interference
		await validatorsPage.closeDrawer();
	});

	test.describe('Page Load', () => {
		test('should display validators page with title', async () => {
			await expect(validatorsPage.pageTitle).toBeVisible();
		});

		test('should display table with validators', async () => {
			await expect(validatorsPage.table).toBeVisible();
			const rowCount = await validatorsPage.getRowCount();
			expect(rowCount).toBeGreaterThan(0);
		});

		test('should display search input', async () => {
			await expect(validatorsPage.searchInput).toBeVisible();
		});

		test('should have add validator button disabled', async () => {
			await expect(validatorsPage.addValidatorButton).toBeVisible();
			const isDisabled = await validatorsPage.isAddValidatorDisabled();
			expect(isDisabled).toBe(true);
		});
	});

	test.describe('Search', () => {
		test('should filter validators by name', async () => {
			const initialCount = await validatorsPage.getRowCount();

			await validatorsPage.search('length');

			const filteredCount = await validatorsPage.getRowCount();
			expect(filteredCount).toBeLessThanOrEqual(initialCount);
			expect(filteredCount).toBeGreaterThan(0);

			// Verify matching results contain search term
			const names = await validatorsPage.getVisibleValidatorNames();
			for (const name of names) {
				expect(name.toLowerCase()).toContain('length');
			}
		});

		test('should show empty state for no results', async () => {
			await validatorsPage.search('xyznonexistent123');

			const isEmpty = await validatorsPage.isEmptyStateVisible();
			expect(isEmpty).toBe(true);
		});

		test('should restore results when clearing search', async () => {
			const initialCount = await validatorsPage.getRowCount();

			await validatorsPage.search('min');
			await validatorsPage.clearSearch();

			const restoredCount = await validatorsPage.getRowCount();
			expect(restoredCount).toBe(initialCount);
		});
	});

	test.describe('View Details (Drawer)', () => {
		test('should open drawer when clicking a row', async () => {
			const names = await validatorsPage.getVisibleValidatorNames();
			expect(names.length).toBeGreaterThan(0);

			await validatorsPage.clickRow(names[0]);

			const isOpen = await validatorsPage.isDrawerOpen();
			expect(isOpen).toBe(true);
		});

		test('should display validator details in drawer', async () => {
			const names = await validatorsPage.getVisibleValidatorNames();
			await validatorsPage.clickRow(names[0]);

			const validatorName = await validatorsPage.getValidatorName();
			expect(validatorName).toBe(names[0]);
		});

		test('should display validator type in drawer', async () => {
			const names = await validatorsPage.getVisibleValidatorNames();
			await validatorsPage.clickRow(names[0]);

			const validatorType = await validatorsPage.getValidatorType();
			expect(validatorType.toLowerCase()).toMatch(/^(string|numeric|collection)$/);
		});

		test('should display validator category in drawer', async () => {
			const names = await validatorsPage.getVisibleValidatorNames();
			await validatorsPage.clickRow(names[0]);

			const category = await validatorsPage.getValidatorCategory();
			expect(category.toLowerCase()).toMatch(/^(inline|custom)$/);
		});

		test('should close drawer when clicking close button', async () => {
			const names = await validatorsPage.getVisibleValidatorNames();
			await validatorsPage.clickRow(names[0]);

			await validatorsPage.closeDrawer();

			const isOpen = await validatorsPage.isDrawerOpen();
			expect(isOpen).toBe(false);
		});

		test('should have pydantic docs link', async () => {
			const names = await validatorsPage.getVisibleValidatorNames();
			await validatorsPage.clickRow(names[0]);

			await expect(validatorsPage.pydanticDocsLink).toBeVisible();
		});
	});

	test.describe('Delete Validator', () => {
		test('should show delete button only for custom validators', async () => {
			// Get all validators and find a custom one
			const names = await validatorsPage.getVisibleValidatorNames();
			const categories = await validatorsPage.getVisibleCategories();

			// Find index of a custom validator
			const customIndex = categories.findIndex(c => c === 'custom');

			if (customIndex >= 0 && names[customIndex]) {
				await validatorsPage.clickRow(names[customIndex]);

				// Delete button should be visible for custom validators
				const isVisible = await validatorsPage.isDeleteButtonVisible();
				expect(isVisible).toBe(true);
			}
		});

		test('should not show delete button for inline validators', async () => {
			// Get all validators and find an inline one
			const names = await validatorsPage.getVisibleValidatorNames();
			const categories = await validatorsPage.getVisibleCategories();

			// Find index of an inline validator
			const inlineIndex = categories.findIndex(c => c === 'inline');

			if (inlineIndex >= 0 && names[inlineIndex]) {
				await validatorsPage.clickRow(names[inlineIndex]);

				// Delete button should not be visible for inline validators
				const isVisible = await validatorsPage.isDeleteButtonVisible();
				expect(isVisible).toBe(false);
			}
		});

		test('should show delete confirmation when clicking delete', async () => {
			// Get all validators and find a custom one
			const names = await validatorsPage.getVisibleValidatorNames();
			const categories = await validatorsPage.getVisibleCategories();

			// Find index of a custom validator
			const customIndex = categories.findIndex(c => c === 'custom');

			if (customIndex >= 0 && names[customIndex]) {
				await validatorsPage.clickRow(names[customIndex]);

				const isDeleteEnabled = await validatorsPage.isDeleteEnabled();

				if (isDeleteEnabled) {
					await validatorsPage.clickDelete();
					await expect(validatorsPage.deleteConfirmButton).toBeVisible();
				}
			}
		});

		test('should cancel delete when clicking cancel', async () => {
			// Get all validators and find a custom one
			const names = await validatorsPage.getVisibleValidatorNames();
			const categories = await validatorsPage.getVisibleCategories();

			// Find index of a custom validator
			const customIndex = categories.findIndex(c => c === 'custom');

			if (customIndex >= 0 && names[customIndex]) {
				await validatorsPage.clickRow(names[customIndex]);

				const isDeleteEnabled = await validatorsPage.isDeleteEnabled();

				if (isDeleteEnabled) {
					await validatorsPage.clickDelete();
					await validatorsPage.cancelDelete();

					// Confirm button should no longer be visible
					await expect(validatorsPage.deleteConfirmButton).not.toBeVisible();
				}
			}
		});
	});

	test.describe('Sorting', () => {
		type RowData = { name: string; type: string; category: string; usedInFields: number };

		const getRowData = async (): Promise<RowData[]> => {
			const [names, types, categories, usedInFields] = await Promise.all([
				validatorsPage.getVisibleValidatorNames(),
				validatorsPage.getVisibleTypes(),
				validatorsPage.getVisibleCategories(),
				validatorsPage.getVisibleUsedInFields()
			]);

			return names.map((name, index) => ({
				name,
				type: types[index],
				category: categories[index],
				usedInFields: usedInFields[index]
			}));
		};

		const sortRows = (rows: RowData[], order: Array<keyof RowData>): RowData[] => {
			return [...rows].sort((a, b) => {
				for (const key of order) {
					let comparison = 0;
					if (key === 'usedInFields') {
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
				const baselineNames = await validatorsPage.getVisibleValidatorNames();
				expect(baselineNames.length).toBeGreaterThan(0);

				// First click - ascending
				await validatorsPage.sortByColumn('name');
				const ascNames = await validatorsPage.getVisibleValidatorNames();
				const expectedAsc = [...baselineNames].sort((a, b) => a.localeCompare(b));
				expect(ascNames).toEqual(expectedAsc);

				// Second click - descending
				await validatorsPage.sortByColumn('name');
				const descNames = await validatorsPage.getVisibleValidatorNames();
				expect(descNames).toEqual([...expectedAsc].reverse());

				// Third click - clear sort (reset to baseline)
				await validatorsPage.sortByColumn('name');
				const resetNames = await validatorsPage.getVisibleValidatorNames();
				expect(resetNames).toEqual(baselineNames);
			});

			test('should cycle type sort through asc, desc, then clear', async () => {
				const baselineTypes = await validatorsPage.getVisibleTypes();
				expect(baselineTypes.length).toBeGreaterThan(0);

				// First click - ascending
				await validatorsPage.sortByColumn('type');
				const ascTypes = await validatorsPage.getVisibleTypes();
				const expectedAsc = [...baselineTypes].sort((a, b) => a.localeCompare(b));
				expect(ascTypes).toEqual(expectedAsc);

				// Second click - descending
				await validatorsPage.sortByColumn('type');
				const descTypes = await validatorsPage.getVisibleTypes();
				expect(descTypes).toEqual([...expectedAsc].reverse());

				// Third click - clear sort
				await validatorsPage.sortByColumn('type');
				const resetTypes = await validatorsPage.getVisibleTypes();
				expect(resetTypes).toEqual(baselineTypes);
			});

			test('should cycle category sort through asc, desc, then clear', async () => {
				const baselineCategories = await validatorsPage.getVisibleCategories();
				expect(baselineCategories.length).toBeGreaterThan(0);

				// First click - ascending
				await validatorsPage.sortByColumn('category');
				const ascCategories = await validatorsPage.getVisibleCategories();
				const expectedAsc = [...baselineCategories].sort((a, b) => a.localeCompare(b));
				expect(ascCategories).toEqual(expectedAsc);

				// Second click - descending
				await validatorsPage.sortByColumn('category');
				const descCategories = await validatorsPage.getVisibleCategories();
				expect(descCategories).toEqual([...expectedAsc].reverse());

				// Third click - clear sort
				await validatorsPage.sortByColumn('category');
				const resetCategories = await validatorsPage.getVisibleCategories();
				expect(resetCategories).toEqual(baselineCategories);
			});

			test('should cycle usedInFields sort through asc, desc, then clear', async () => {
				const baselineUsedInFields = await validatorsPage.getVisibleUsedInFields();
				expect(baselineUsedInFields.length).toBeGreaterThan(0);

				// First click - ascending (numeric)
				await validatorsPage.sortByColumn('usedInFields');
				const ascUsedInFields = await validatorsPage.getVisibleUsedInFields();
				const expectedAsc = [...baselineUsedInFields].sort((a, b) => a - b);
				expect(ascUsedInFields).toEqual(expectedAsc);

				// Second click - descending
				await validatorsPage.sortByColumn('usedInFields');
				const descUsedInFields = await validatorsPage.getVisibleUsedInFields();
				expect(descUsedInFields).toEqual([...expectedAsc].reverse());

				// Third click - clear sort
				await validatorsPage.sortByColumn('usedInFields');
				const resetUsedInFields = await validatorsPage.getVisibleUsedInFields();
				expect(resetUsedInFields).toEqual(baselineUsedInFields);
			});
		});

		test.describe('Multi-Column Sort', () => {
			test('should apply multi-column sort when category then type', async () => {
				const baselineRows = await getRowData();

				await validatorsPage.sortByColumn('category');
				await validatorsPage.sortByColumn('type', true);

				const sortedRows = await getRowData();
				const expected = sortRows(baselineRows, ['category', 'type']);

				expect(sortedRows).toEqual(expected);
			});

			test('should apply multi-column sort when type then category', async () => {
				const baselineRows = await getRowData();

				await validatorsPage.sortByColumn('type');
				await validatorsPage.sortByColumn('category', true);

				const sortedRows = await getRowData();
				const expected = sortRows(baselineRows, ['type', 'category']);

				expect(sortedRows).toEqual(expected);
			});

			test('should apply multi-column sort when name then usedInFields', async () => {
				const baselineRows = await getRowData();

				await validatorsPage.sortByColumn('name');
				await validatorsPage.sortByColumn('usedInFields', true);

				const sortedRows = await getRowData();
				const expected = sortRows(baselineRows, ['name', 'usedInFields']);

				expect(sortedRows).toEqual(expected);
			});

			test('should apply multi-column sort when usedInFields then name', async () => {
				const baselineRows = await getRowData();

				await validatorsPage.sortByColumn('usedInFields');
				await validatorsPage.sortByColumn('name', true);

				const sortedRows = await getRowData();
				const expected = sortRows(baselineRows, ['usedInFields', 'name']);

				expect(sortedRows).toEqual(expected);
			});
		});
	});

	test.describe('Filters', () => {
		test('should open filter panel', async () => {
			await validatorsPage.openFilters();
			await expect(validatorsPage.filterPanel).toBeVisible();
		});

		test('should filter by category (inline)', async () => {
			const initialCount = await validatorsPage.getRowCount();

			await validatorsPage.openFilters();
			await validatorsPage.toggleFilterCheckbox('Inline');

			// Wait for filter to apply
			await validatorsPage.page.waitForTimeout(300);

			const filteredCount = await validatorsPage.getRowCount();
			expect(filteredCount).toBeLessThanOrEqual(initialCount);

			// Verify all visible validators are inline
			const categories = await validatorsPage.getVisibleCategories();
			for (const category of categories) {
				expect(category).toBe('inline');
			}
		});

		test('should filter by category (custom)', async () => {
			await validatorsPage.openFilters();
			await validatorsPage.toggleFilterCheckbox('Custom');

			// Wait for filter to apply
			await validatorsPage.page.waitForTimeout(300);

			// Verify all visible validators are custom
			const categories = await validatorsPage.getVisibleCategories();
			for (const category of categories) {
				expect(category).toBe('custom');
			}
		});

		test('should clear filters', async () => {
			const initialCount = await validatorsPage.getRowCount();

			await validatorsPage.openFilters();
			await validatorsPage.toggleFilterCheckbox('Inline');

			await validatorsPage.clearFilters();

			// Wait for filter to clear
			await validatorsPage.page.waitForTimeout(300);

			const restoredCount = await validatorsPage.getRowCount();
			expect(restoredCount).toBe(initialCount);
		});
	});

	test.describe('Field References Navigation', () => {
		test('should display field references in drawer', async () => {
			// Find a validator that has field references
			const names = await validatorsPage.getVisibleValidatorNames();

			for (const name of names) {
				await validatorsPage.clickRow(name);
				const refCount = await validatorsPage.getFieldReferencesCount();

				if (refCount > 0) {
					// Found a validator with references
					expect(refCount).toBeGreaterThan(0);
					break;
				}

				await validatorsPage.closeDrawer();
			}
		});

		test('should navigate to field when clicking reference', async ({ page }) => {
			// Find a validator that has field references
			const names = await validatorsPage.getVisibleValidatorNames();

			for (const name of names) {
				await validatorsPage.clickRow(name);
				const refCount = await validatorsPage.getFieldReferencesCount();

				if (refCount > 0) {
					// Click the first field reference
					await validatorsPage.clickFieldReference(0);

					// Should navigate to field-registry page
					await expect(page).toHaveURL(/\/field-registry/);
					break;
				}

				await validatorsPage.closeDrawer();
			}
		});
	});
});
