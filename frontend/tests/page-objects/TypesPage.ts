/**
 * Types Page Object
 *
 * Encapsulates interactions with the types page (/types).
 * Handles search, filter, sort, and table operations.
 * Note: This is a read-only page with no drawer/edit functionality.
 */

import { type Page, type Locator } from '@playwright/test';
import { FILTER_PANEL_ID, getTableRowCellSelector } from '$lib/utils/testIds';
import { ACTION_DELAY_MS } from '../helpers/e2e-delays';

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
		this.filterPanel = page.getByTestId(FILTER_PANEL_ID);
		this.clearFiltersButton = page.getByRole('button', { name: /clear all/i });

		// Table
		this.table = page.locator('table');
		this.tableRows = page.locator('tbody tr');
		this.emptyState = page.locator('text=No types found');

		// Sortable columns - scoped to table to avoid conflicts with filter panel
		this.nameColumnHeader = this.table.locator('thead th').filter({ hasText: /^Name$/i });
		this.pythonTypeColumnHeader = this.table.locator('thead th').filter({ hasText: 'Python Type' });
		this.usedInFieldsColumnHeader = this.table.locator('thead th').filter({ hasText: 'Used in Fields' });
	}

	private async delay() {
		await this.page.waitForTimeout(ACTION_DELAY_MS);
	}

	/**
	 * Navigate to the types page
	 */
	async goto() {
		await this.page.goto('/types', { waitUntil: 'networkidle' });
		await this.pageTitle.waitFor({ state: 'visible' });
	}

	/**
	 * Search for types
	 */
	async search(query: string) {
		await this.searchInput.fill(query);
		await this.delay();
	}

	/**
	 * Clear search
	 */
	async clearSearch() {
		await this.searchInput.clear();
		await this.delay();
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
		await this.filterPanel.waitFor({ state: 'visible' });
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
	async sortByColumn(column: 'name' | 'pythonType' | 'usedInFields', withShift = false) {
		const clickOptions = withShift ? { modifiers: ['Shift'] as ('Shift' | 'Alt' | 'Control' | 'Meta')[] } : undefined;

		// Get fresh locator each time to avoid stale elements
		// Click the button inside the th, which contains the label text
		const headerMap = {
			name: () => this.table.locator('thead th button').filter({ hasText: /^Name$/i }),
			pythonType: () => this.table.locator('thead th button').filter({ hasText: 'Python Type' }),
			usedInFields: () => this.table.locator('thead th button').filter({ hasText: 'Used in Fields' })
		};

		await headerMap[column]().click(clickOptions);
		await this.delay();
	}

	/**
	 * Get all type names visible in the table
	 */
	async getVisibleTypeNames(): Promise<string[]> {
		const names: string[] = [];
		const count = await this.tableRows.count();
		for (let i = 0; i < count; i++) {
			const row = this.tableRows.nth(i);
			const nameCell = row.locator(getTableRowCellSelector('name'));
			const name = await nameCell.textContent();
			if (name) names.push(name.trim());
		}
		return names;
	}

	/**
	 * Get Python types visible in the table
	 */
	async getVisiblePythonTypes(): Promise<string[]> {
		const pythonTypes: string[] = [];
		const count = await this.tableRows.count();
		for (let i = 0; i < count; i++) {
			const row = this.tableRows.nth(i);
			const typeCell = row.locator(getTableRowCellSelector('pythonType'));
			const text = await typeCell.textContent();
			if (text) pythonTypes.push(text.trim());
		}
		return pythonTypes;
	}

	/**
	 * Get usedInFields counts visible in the table
	 */
	async getVisibleUsedInFields(): Promise<number[]> {
		const counts: number[] = [];
		const count = await this.tableRows.count();
		for (let i = 0; i < count; i++) {
			const row = this.tableRows.nth(i);
			const countSpan = row.locator(getTableRowCellSelector('usedInFields')).locator('span').first();
			const text = await countSpan.textContent();
			counts.push(parseInt(text?.trim() ?? '0', 10));
		}
		return counts;
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
		const typeCell = row.locator(getTableRowCellSelector('pythonType'));
		const text = await typeCell.textContent();
		return text?.trim() ?? '';
	}

	/**
	 * Get used in fields count for a specific row by index
	 */
	async getUsedInFieldsCount(rowIndex: number): Promise<number> {
		const row = this.tableRows.nth(rowIndex);
		const countSpan = row.locator(getTableRowCellSelector('usedInFields')).locator('span').first();
		const text = await countSpan.textContent();
		return parseInt(text?.trim() ?? '0', 10);
	}
}
