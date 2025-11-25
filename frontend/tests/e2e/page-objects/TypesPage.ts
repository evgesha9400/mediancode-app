/**
 * Types Page Object
 *
 * Encapsulates interactions with the types page (/types).
 * Handles search, filter, sort, and table operations.
 * Note: This is a read-only page with no drawer/edit functionality.
 */

import { type Page, type Locator } from '@playwright/test';

export class TypesPage {
	readonly page: Page;

	// Header
	readonly pageTitle: Locator;

	// Search
	readonly searchInput: Locator;
	readonly resultsCount: Locator;

	// Filter
	readonly filterButton: Locator;
	readonly filterPanel: Locator;
	readonly clearFiltersButton: Locator;

	// Table
	readonly table: Locator;
	readonly tableRows: Locator;
	readonly emptyState: Locator;

	// Sortable columns
	readonly nameColumnHeader: Locator;
	readonly categoryColumnHeader: Locator;
	readonly pythonTypeColumnHeader: Locator;
	readonly usedInFieldsColumnHeader: Locator;

	constructor(page: Page) {
		this.page = page;

		// Header
		this.pageTitle = page.getByRole('heading', { name: 'Types', level: 1 });

		// Search
		this.searchInput = page.getByPlaceholder('Search types...');
		this.resultsCount = page.locator('text=/\\d+ type/');

		// Filter
		this.filterButton = page.locator('button').filter({ has: page.locator('i.fa-filter') });
		this.filterPanel = page.locator('.bg-white.rounded-lg.shadow-xl.border');
		this.clearFiltersButton = page.getByRole('button', { name: /clear all/i });

		// Table
		this.table = page.locator('table');
		this.tableRows = page.locator('tbody tr');
		this.emptyState = page.locator('text=No types found');

		// Sortable columns
		this.nameColumnHeader = page.locator('th').filter({ hasText: 'Type Name' });
		this.categoryColumnHeader = page.locator('th').filter({ hasText: 'Category' }).first();
		this.pythonTypeColumnHeader = page.locator('th').filter({ hasText: 'Type' }).nth(1);
		this.usedInFieldsColumnHeader = page.locator('th').filter({ hasText: 'Used In Fields' });
	}

	/**
	 * Navigate to the types page
	 */
	async goto() {
		await this.page.goto('/types');
		await this.pageTitle.waitFor({ state: 'visible' });
	}

	/**
	 * Search for types
	 */
	async search(query: string) {
		await this.searchInput.fill(query);
		await this.page.waitForTimeout(300);
	}

	/**
	 * Clear search
	 */
	async clearSearch() {
		await this.searchInput.clear();
		await this.page.waitForTimeout(300);
	}

	/**
	 * Get the number of visible table rows
	 */
	async getRowCount(): Promise<number> {
		return await this.tableRows.count();
	}

	/**
	 * Open filter panel
	 */
	async openFilters() {
		await this.filterButton.click();
		await this.page.waitForTimeout(200);
	}

	/**
	 * Toggle a filter checkbox by label
	 */
	async toggleFilterCheckbox(label: string) {
		const checkbox = this.page.locator('label').filter({ hasText: label }).locator('input[type="checkbox"]');
		await checkbox.click();
	}

	/**
	 * Toggle a filter switch by label
	 */
	async toggleFilterSwitch(label: string) {
		const toggle = this.page.locator('label').filter({ hasText: label }).locator('button[role="switch"]');
		await toggle.click();
	}

	/**
	 * Clear all filters
	 */
	async clearFilters() {
		await this.clearFiltersButton.click();
	}

	/**
	 * Sort by column (click column header)
	 */
	async sortByColumn(column: 'name' | 'category' | 'pythonType' | 'usedInFields') {
		const headers = {
			name: this.nameColumnHeader,
			category: this.categoryColumnHeader,
			pythonType: this.pythonTypeColumnHeader,
			usedInFields: this.usedInFieldsColumnHeader
		};
		await headers[column].click();
		await this.page.waitForTimeout(200);
	}

	/**
	 * Get all type names visible in the table
	 */
	async getVisibleTypeNames(): Promise<string[]> {
		const names: string[] = [];
		const count = await this.tableRows.count();
		for (let i = 0; i < count; i++) {
			const row = this.tableRows.nth(i);
			const nameCell = row.locator('td').first();
			const name = await nameCell.textContent();
			if (name) names.push(name.trim());
		}
		return names;
	}

	/**
	 * Get type categories visible in the table
	 */
	async getVisibleCategories(): Promise<string[]> {
		const categories: string[] = [];
		const count = await this.tableRows.count();
		for (let i = 0; i < count; i++) {
			const row = this.tableRows.nth(i);
			const categoryCell = row.locator('td').nth(1);
			const category = await categoryCell.textContent();
			if (category) categories.push(category.trim().toLowerCase());
		}
		return categories;
	}

	/**
	 * Check if a type exists in the table
	 */
	async hasType(typeName: string): Promise<boolean> {
		const names = await this.getVisibleTypeNames();
		return names.includes(typeName);
	}

	/**
	 * Check if empty state is visible
	 */
	async isEmptyStateVisible(): Promise<boolean> {
		return await this.emptyState.isVisible();
	}

	/**
	 * Get Python type for a specific row by index
	 */
	async getPythonType(rowIndex: number): Promise<string> {
		const row = this.tableRows.nth(rowIndex);
		const typeCell = row.locator('td').nth(2);
		const text = await typeCell.textContent();
		return text?.trim() ?? '';
	}

	/**
	 * Get used in fields count for a specific row by index
	 */
	async getUsedInFieldsCount(rowIndex: number): Promise<number> {
		const row = this.tableRows.nth(rowIndex);
		const countSpan = row.locator('td').nth(4).locator('span').first();
		const text = await countSpan.textContent();
		return parseInt(text?.trim() ?? '0', 10);
	}
}
