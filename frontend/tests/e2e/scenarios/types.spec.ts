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
		test('should sort by type name', async () => {
			await typesPage.sortByColumn('name');

			const names = await typesPage.getVisibleTypeNames();
			expect(names.length).toBeGreaterThan(1);

			// Verify ascending order
			const sortedNames = [...names].sort((a, b) => a.localeCompare(b));
			expect(names).toEqual(sortedNames);
		});

		test('should reverse sort on second click', async () => {
			// First click - ascending
			await typesPage.sortByColumn('name');
			const ascNames = await typesPage.getVisibleTypeNames();

			// Second click - descending
			await typesPage.sortByColumn('name');
			const descNames = await typesPage.getVisibleTypeNames();

			// Verify descending order (reversed)
			expect(descNames).toEqual([...ascNames].reverse());
		});

		test('should sort by category', async () => {
			await typesPage.sortByColumn('category');

			const categories = await typesPage.getVisibleCategories();
			expect(categories.length).toBeGreaterThan(0);

			// Verify ascending order
			const sortedCategories = [...categories].sort((a, b) => a.localeCompare(b));
			expect(categories).toEqual(sortedCategories);
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
