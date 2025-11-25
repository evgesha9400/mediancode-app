/**
 * Types Feature Tests
 *
 * Comprehensive E2E tests for the types page functionality.
 * Tests search, filter, sort operations.
 * Note: This is a read-only page with no edit/delete operations.
 *
 * @tags full
 */

import { test, expect } from '@playwright/test';
import { TypesPage } from '../page-objects/TypesPage';

test.describe('Types - Feature Tests', () => {
	let typesPage: TypesPage;

	test.beforeEach(async ({ page }) => {
		typesPage = new TypesPage(page);
		await typesPage.goto();
	});

	test.describe('Page Load', () => {
		test('should display types page with title', async () => {
			await expect(typesPage.pageTitle).toBeVisible();
		});

		test('should display table with types', async () => {
			await expect(typesPage.table).toBeVisible();
			const rowCount = await typesPage.getRowCount();
			expect(rowCount).toBeGreaterThan(0);
		});

		test('should display search input', async () => {
			await expect(typesPage.searchInput).toBeVisible();
		});
	});

	test.describe('Search', () => {
		test('should filter types by search term', async () => {
			const initialCount = await typesPage.getRowCount();

			// Search for 'str' which should match the str type
			await typesPage.search('str');

			const filteredCount = await typesPage.getRowCount();
			expect(filteredCount).toBeLessThanOrEqual(initialCount);
			expect(filteredCount).toBeGreaterThan(0);
		});

		test('should show empty state for no results', async () => {
			await typesPage.search('xyznonexistent123');

			const isEmpty = await typesPage.isEmptyStateVisible();
			expect(isEmpty).toBe(true);
		});

		test('should restore results when clearing search', async () => {
			const initialCount = await typesPage.getRowCount();

			await typesPage.search('string');
			await typesPage.clearSearch();

			const restoredCount = await typesPage.getRowCount();
			expect(restoredCount).toBe(initialCount);
		});
	});

	test.describe('Sorting', () => {
		type RowData = { name: string; category: string; pythonType: string; usedInFields: number };

		const getRowData = async (): Promise<RowData[]> => {
			const [names, categories, pythonTypes, usedInFields] = await Promise.all([
				typesPage.getVisibleTypeNames(),
				typesPage.getVisibleCategories(),
				typesPage.getVisiblePythonTypes(),
				typesPage.getVisibleUsedInFields()
			]);

			return names.map((name, index) => ({
				name,
				category: categories[index],
				pythonType: pythonTypes[index],
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
				const baselineNames = await typesPage.getVisibleTypeNames();
				expect(baselineNames.length).toBeGreaterThan(0);

				// First click - ascending
				await typesPage.sortByColumn('name');
				const ascNames = await typesPage.getVisibleTypeNames();
				const expectedAsc = [...baselineNames].sort((a, b) => a.localeCompare(b));
				expect(ascNames).toEqual(expectedAsc);

				// Second click - descending
				await typesPage.sortByColumn('name');
				const descNames = await typesPage.getVisibleTypeNames();
				expect(descNames).toEqual([...expectedAsc].reverse());

				// Third click - clear sort (reset to baseline)
				await typesPage.sortByColumn('name');
				const resetNames = await typesPage.getVisibleTypeNames();
				expect(resetNames).toEqual(baselineNames);
			});

			test('should cycle category sort through asc, desc, then clear', async () => {
				const baselineCategories = await typesPage.getVisibleCategories();
				expect(baselineCategories.length).toBeGreaterThan(0);

				// First click - ascending
				await typesPage.sortByColumn('category');
				const ascCategories = await typesPage.getVisibleCategories();
				const expectedAsc = [...baselineCategories].sort((a, b) => a.localeCompare(b));
				expect(ascCategories).toEqual(expectedAsc);

				// Second click - descending
				await typesPage.sortByColumn('category');
				const descCategories = await typesPage.getVisibleCategories();
				expect(descCategories).toEqual([...expectedAsc].reverse());

				// Third click - clear sort
				await typesPage.sortByColumn('category');
				const resetCategories = await typesPage.getVisibleCategories();
				expect(resetCategories).toEqual(baselineCategories);
			});

			test('should cycle pythonType sort through asc, desc, then clear', async () => {
				const baselinePythonTypes = await typesPage.getVisiblePythonTypes();
				expect(baselinePythonTypes.length).toBeGreaterThan(0);

				// First click - ascending
				await typesPage.sortByColumn('pythonType');
				const ascPythonTypes = await typesPage.getVisiblePythonTypes();
				const expectedAsc = [...baselinePythonTypes].sort((a, b) => a.localeCompare(b));
				expect(ascPythonTypes).toEqual(expectedAsc);

				// Second click - descending
				await typesPage.sortByColumn('pythonType');
				const descPythonTypes = await typesPage.getVisiblePythonTypes();
				expect(descPythonTypes).toEqual([...expectedAsc].reverse());

				// Third click - clear sort
				await typesPage.sortByColumn('pythonType');
				const resetPythonTypes = await typesPage.getVisiblePythonTypes();
				expect(resetPythonTypes).toEqual(baselinePythonTypes);
			});

			test('should cycle usedInFields sort through asc, desc, then clear', async () => {
				const baselineUsedInFields = await typesPage.getVisibleUsedInFields();
				expect(baselineUsedInFields.length).toBeGreaterThan(0);

				// First click - ascending (numeric)
				await typesPage.sortByColumn('usedInFields');
				const ascUsedInFields = await typesPage.getVisibleUsedInFields();
				const expectedAsc = [...baselineUsedInFields].sort((a, b) => a - b);
				expect(ascUsedInFields).toEqual(expectedAsc);

				// Second click - descending
				await typesPage.sortByColumn('usedInFields');
				const descUsedInFields = await typesPage.getVisibleUsedInFields();
				expect(descUsedInFields).toEqual([...expectedAsc].reverse());

				// Third click - clear sort
				await typesPage.sortByColumn('usedInFields');
				const resetUsedInFields = await typesPage.getVisibleUsedInFields();
				expect(resetUsedInFields).toEqual(baselineUsedInFields);
			});
		});

		test.describe('Multi-Column Sort', () => {
			test('should apply multi-column sort when category then name', async () => {
				const baselineRows = await getRowData();

				await typesPage.sortByColumn('category');
				await typesPage.sortByColumn('name', true);

				const sortedRows = await getRowData();
				const expected = sortRows(baselineRows, ['category', 'name']);

				expect(sortedRows).toEqual(expected);
			});

			test('should apply multi-column sort when name then category', async () => {
				const baselineRows = await getRowData();

				await typesPage.sortByColumn('name');
				await typesPage.sortByColumn('category', true);

				const sortedRows = await getRowData();
				const expected = sortRows(baselineRows, ['name', 'category']);

				expect(sortedRows).toEqual(expected);
			});

			test('should apply multi-column sort when pythonType then usedInFields', async () => {
				const baselineRows = await getRowData();

				await typesPage.sortByColumn('pythonType');
				await typesPage.sortByColumn('usedInFields', true);

				const sortedRows = await getRowData();
				const expected = sortRows(baselineRows, ['pythonType', 'usedInFields']);

				expect(sortedRows).toEqual(expected);
			});

			test('should apply multi-column sort when usedInFields then pythonType', async () => {
				const baselineRows = await getRowData();

				await typesPage.sortByColumn('usedInFields');
				await typesPage.sortByColumn('pythonType', true);

				const sortedRows = await getRowData();
				const expected = sortRows(baselineRows, ['usedInFields', 'pythonType']);

				expect(sortedRows).toEqual(expected);
			});
		});
	});

	test.describe('Filters', () => {
		test('should open filter panel', async () => {
			await typesPage.openFilters();
			await expect(typesPage.filterPanel).toBeVisible();
		});

		test('should filter by category (primitive)', async () => {
			const initialCount = await typesPage.getRowCount();

			await typesPage.openFilters();
			await typesPage.toggleFilterCheckbox('Primitive');

			// Wait for filter to apply
			await typesPage.page.waitForTimeout(300);

			const filteredCount = await typesPage.getRowCount();
			expect(filteredCount).toBeLessThanOrEqual(initialCount);

			// Verify all visible types are primitive
			const categories = await typesPage.getVisibleCategories();
			for (const category of categories) {
				expect(category).toBe('primitive');
			}
		});

		test('should filter by category (abstract)', async () => {
			await typesPage.openFilters();
			await typesPage.toggleFilterCheckbox('Abstract');

			// Wait for filter to apply
			await typesPage.page.waitForTimeout(300);

			// Verify all visible types are abstract
			const categories = await typesPage.getVisibleCategories();
			for (const category of categories) {
				expect(category).toBe('abstract');
			}
		});

		test('should clear filters', async () => {
			const initialCount = await typesPage.getRowCount();

			await typesPage.openFilters();
			await typesPage.toggleFilterCheckbox('Primitive');

			await typesPage.clearFilters();

			// Wait for filter to clear
			await typesPage.page.waitForTimeout(300);

			const restoredCount = await typesPage.getRowCount();
			expect(restoredCount).toBe(initialCount);
		});
	});

	test.describe('Table Display', () => {
		test('should display type name in first column', async () => {
			const names = await typesPage.getVisibleTypeNames();
			expect(names.length).toBeGreaterThan(0);
			expect(names[0]).toBeTruthy();
		});

		test('should display category badges', async () => {
			const categories = await typesPage.getVisibleCategories();
			expect(categories.length).toBeGreaterThan(0);

			// All categories should be either primitive or abstract
			for (const category of categories) {
				expect(['primitive', 'abstract']).toContain(category);
			}
		});

		test('should display Python type column', async () => {
			const pythonType = await typesPage.getPythonType(0);
			expect(pythonType).toBeTruthy();
		});

		test('should display used in fields count', async () => {
			const count = await typesPage.getUsedInFieldsCount(0);
			expect(count).toBeGreaterThanOrEqual(0);
		});
	});
});
