/**
 * Validators Page Object
 *
 * Encapsulates interactions with the validators page (/validators).
 * Handles search, filter, sort, view details drawer, and delete operations.
 * Note: Only custom validators can be deleted. Inline validators are read-only.
 */

import { type Page, type Locator } from '@playwright/test';

export class ValidatorsPage {
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
	readonly typeColumnHeader: Locator;
	readonly categoryColumnHeader: Locator;
	readonly usedInFieldsColumnHeader: Locator;

	// Drawer
	readonly drawer: Locator;
	readonly drawerCloseButton: Locator;

	// Drawer details
	readonly validatorNameDisplay: Locator;
	readonly validatorTypeDisplay: Locator;
	readonly validatorCategoryDisplay: Locator;
	readonly validatorDescriptionDisplay: Locator;
	readonly validatorParameterTypeDisplay: Locator;
	readonly validatorExampleUsageDisplay: Locator;
	readonly pydanticDocsLink: Locator;
	readonly fieldReferenceButtons: Locator;

	// Drawer actions
	readonly deleteButton: Locator;
	readonly deleteConfirmButton: Locator;
	readonly deleteCancelButton: Locator;

	constructor(page: Page) {
		this.page = page;

		// Header
		this.pageTitle = page.getByRole('heading', { name: 'Validators', level: 1 });

		// Search
		this.searchInput = page.getByPlaceholder('Search validators...');
		this.resultsCount = page.locator('text=/\\d+ validator/');

		// Filter
		this.filterButton = page.locator('button').filter({ has: page.locator('i.fa-filter') });
		this.filterPanel = page.locator('.bg-white.rounded-lg.shadow-xl.border');
		this.clearFiltersButton = page.getByRole('button', { name: /clear all/i });

		// Table
		this.table = page.locator('table');
		this.tableRows = page.locator('tbody tr');
		this.emptyState = page.locator('text=No validators found');

		// Sortable columns - scoped to table to avoid conflicts with drawer/filter panel
		this.nameColumnHeader = this.table.locator('thead th').filter({ hasText: 'Validator Name' });
		this.typeColumnHeader = this.table.locator('thead th').filter({ hasText: /^Type$/i });
		this.categoryColumnHeader = this.table.locator('thead th').filter({ hasText: /^Category$/i });
		this.usedInFieldsColumnHeader = this.table.locator('thead th').filter({ hasText: 'Used In Fields' });

		// Drawer
		this.drawer = page.locator('[class*="fixed"][class*="right-0"]').filter({ has: page.locator('text=Validator Details') });
		this.drawerCloseButton = page.locator('button[aria-label="Close drawer"]');

		// Drawer details (read-only display elements)
		this.validatorNameDisplay = page.locator('h3:has-text("Validator Name") + p');
		this.validatorTypeDisplay = page.locator('h3:has-text("Type") + span');
		this.validatorCategoryDisplay = page.locator('h3:has-text("Category") + span');
		this.validatorDescriptionDisplay = page.locator('h3:has-text("Description") + p');
		this.validatorParameterTypeDisplay = page.locator('h3:has-text("Parameter Type") + p');
		this.validatorExampleUsageDisplay = page.locator('h3:has-text("Example Usage") + div code');
		this.pydanticDocsLink = page.locator('a[href*="pydantic"]');
		this.fieldReferenceButtons = page.locator('button').filter({ has: page.locator('i.fa-table-list') });

		// Drawer actions (only for custom validators)
		this.deleteButton = page.getByRole('button', { name: 'Delete Validator' });
		this.deleteConfirmButton = page.getByRole('button', { name: 'Yes, Delete' });
		this.deleteCancelButton = page.getByRole('button', { name: 'Cancel' });
	}

	/**
	 * Navigate to the validators page
	 */
	async goto() {
		await this.page.goto('/validators');
		await this.pageTitle.waitFor({ state: 'visible' });
	}

	/**
	 * Search for validators
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
	 * Click a table row by validator name
	 */
	async clickRow(validatorName: string) {
		const row = this.tableRows.filter({ hasText: validatorName }).first();
		await row.click();
		await this.page.waitForTimeout(300);
	}

	/**
	 * Check if drawer is open
	 */
	async isDrawerOpen(): Promise<boolean> {
		return await this.validatorNameDisplay.isVisible();
	}

	/**
	 * Close the drawer
	 */
	async closeDrawer() {
		if (await this.isDrawerOpen()) {
			await this.drawerCloseButton.click();
			// Wait for drawer close animation to complete
			await this.page.waitForTimeout(500);
			// Wait for the validator name to be hidden
			await this.validatorNameDisplay.waitFor({ state: 'hidden', timeout: 5000 });
		}
	}

	/**
	 * Get validator name from drawer
	 */
	async getValidatorName(): Promise<string> {
		const text = await this.validatorNameDisplay.textContent();
		return text?.trim() ?? '';
	}

	/**
	 * Get validator type from drawer
	 */
	async getValidatorType(): Promise<string> {
		const text = await this.validatorTypeDisplay.textContent();
		return text?.trim() ?? '';
	}

	/**
	 * Get validator category from drawer
	 */
	async getValidatorCategory(): Promise<string> {
		const text = await this.validatorCategoryDisplay.textContent();
		return text?.trim() ?? '';
	}

	/**
	 * Get validator description from drawer
	 */
	async getValidatorDescription(): Promise<string> {
		const text = await this.validatorDescriptionDisplay.textContent();
		return text?.trim() ?? '';
	}

	/**
	 * Get field references count from drawer
	 */
	async getFieldReferencesCount(): Promise<number> {
		return await this.fieldReferenceButtons.count();
	}

	/**
	 * Click a field reference to navigate
	 */
	async clickFieldReference(index: number) {
		await this.fieldReferenceButtons.nth(index).click();
	}

	/**
	 * Check if delete button is visible (only for custom validators)
	 */
	async isDeleteButtonVisible(): Promise<boolean> {
		return await this.deleteButton.isVisible();
	}

	/**
	 * Check if delete button is enabled
	 */
	async isDeleteEnabled(): Promise<boolean> {
		return await this.deleteButton.isEnabled();
	}

	/**
	 * Click delete button (first step)
	 */
	async clickDelete() {
		await this.deleteButton.click();
	}

	/**
	 * Confirm delete
	 */
	async confirmDelete() {
		await this.deleteConfirmButton.click();
		await this.page.waitForTimeout(300);
	}

	/**
	 * Cancel delete
	 */
	async cancelDelete() {
		await this.deleteCancelButton.click();
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
	async sortByColumn(column: 'name' | 'type' | 'category' | 'usedInFields', withShift = false) {
		const clickOptions = withShift ? { modifiers: ['Shift'] as ('Shift' | 'Alt' | 'Control' | 'Meta')[] } : undefined;

		// Get fresh locator each time to avoid stale elements
		// Click the button inside the th, which contains the label text
		const headerMap = {
			name: () => this.table.locator('thead th button').filter({ hasText: 'Validator Name' }),
			type: () => this.table.locator('thead th button').filter({ hasText: 'Type' }),
			category: () => this.table.locator('thead th button').filter({ hasText: 'Category' }),
			usedInFields: () => this.table.locator('thead th button').filter({ hasText: 'Used In Fields' })
		};

		await headerMap[column]().click(clickOptions);
		await this.page.waitForTimeout(300);
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
	 * Get validator types visible in the table (column 1: string, numeric, collection)
	 */
	async getVisibleTypes(): Promise<string[]> {
		const types: string[] = [];
		const count = await this.tableRows.count();
		for (let i = 0; i < count; i++) {
			const row = this.tableRows.nth(i);
			const typeCell = row.locator('td').nth(1);
			const type = await typeCell.textContent();
			if (type) types.push(type.trim().toLowerCase());
		}
		return types;
	}

	/**
	 * Get validator categories visible in the table (column 2: inline, custom)
	 */
	async getVisibleCategories(): Promise<string[]> {
		const categories: string[] = [];
		const count = await this.tableRows.count();
		for (let i = 0; i < count; i++) {
			const row = this.tableRows.nth(i);
			const categoryCell = row.locator('td').nth(2);
			const category = await categoryCell.textContent();
			if (category) categories.push(category.trim().toLowerCase());
		}
		return categories;
	}

	/**
	 * Get all namespaces visible in the table
	 */
	async getVisibleNamespaces(): Promise<string[]> {
		const namespaces: string[] = [];
		const count = await this.tableRows.count();
		for (let i = 0; i < count; i++) {
			const row = this.tableRows.nth(i);
			const namespaceCell = row.locator('td').nth(3);
			const namespace = await namespaceCell.textContent();
			if (namespace) namespaces.push(namespace.trim());
		}
		return namespaces;
	}

	/**
	 * Get usedInFields counts visible in the table
	 */
	async getVisibleUsedInFields(): Promise<number[]> {
		const counts: number[] = [];
		const count = await this.tableRows.count();
		for (let i = 0; i < count; i++) {
			const row = this.tableRows.nth(i);
			const countCell = row.locator('td').nth(5).locator('span').first();
			const text = await countCell.textContent();
			counts.push(parseInt(text?.trim() ?? '0', 10));
		}
		return counts;
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
