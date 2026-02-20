/**
 * Field Validators Page Object
 *
 * Encapsulates interactions with the field validators page (/validators/field-validators).
 * Handles search, filter, sort, navigation to new/edit pages.
 */

import { type Page, type Locator } from '@playwright/test';

export class FieldValidatorsPage {
	readonly page: Page;

	// Header
	readonly pageTitle: Locator;
	readonly addButton: Locator;

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
	readonly modeColumnHeader: Locator;
	readonly usedInFieldsColumnHeader: Locator;

	constructor(page: Page) {
		this.page = page;

		// Header
		this.pageTitle = page.getByRole('heading', { name: 'Field Validators', level: 1 });
		this.addButton = page.getByRole('button', { name: 'Add Field Validator' });

		// Search
		this.searchInput = page.getByPlaceholder('Search field validators...');
		this.resultsCount = page.locator('text=/\\d+ field validator/');

		// Filter
		this.filterButton = page.locator('button').filter({ has: page.locator('i.fa-filter') });
		this.filterPanel = page.locator('.bg-white.rounded-lg.shadow-xl.border');
		this.clearFiltersButton = page.getByRole('button', { name: /clear all/i });

		// Table
		this.table = page.locator('table');
		this.tableRows = page.locator('tbody tr');
		this.emptyState = page.locator('text=No field validators found');

		// Sortable columns
		this.nameColumnHeader = this.table.locator('thead th button').filter({ hasText: 'Name' });
		this.modeColumnHeader = this.table.locator('thead th button').filter({ hasText: 'Mode' });
		this.usedInFieldsColumnHeader = this.table.locator('thead th button').filter({ hasText: 'Used In Fields' });
	}

	/**
	 * Navigate to the field validators page
	 */
	async goto() {
		await this.page.goto('/validators/field-validators', { waitUntil: 'networkidle' });
		await this.pageTitle.waitFor({ state: 'visible' });
	}

	/**
	 * Search for field validators
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
	 * Click a table row by validator name (navigates to edit page)
	 */
	async clickRow(validatorName: string) {
		const row = this.tableRows.filter({ hasText: validatorName }).first();
		await row.click();
	}

	/**
	 * Click the "Add Field Validator" button (navigates to new page)
	 */
	async clickAdd() {
		await this.addButton.click();
	}

	/**
	 * Get all validator names visible in the table
	 */
	async getVisibleValidatorNames(): Promise<string[]> {
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
	 * Check if a validator exists in the table
	 */
	async hasValidator(validatorName: string): Promise<boolean> {
		const names = await this.getVisibleValidatorNames();
		return names.includes(validatorName);
	}

	/**
	 * Check if empty state is visible
	 */
	async isEmptyStateVisible(): Promise<boolean> {
		return await this.emptyState.isVisible();
	}
}
