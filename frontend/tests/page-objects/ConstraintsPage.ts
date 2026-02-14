/**
 * Field Constraints Page Object
 *
 * Encapsulates interactions with the field constraints page (/validators/field-constraints).
 * Handles search, filter, sort, view details drawer, and delete operations.
 *
 * The field constraints page is a standalone page nested under /validators/ in the sidebar.
 */

import { type Page, type Locator } from '@playwright/test';

export class FieldConstraintsPage {
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
	readonly parameterTypeColumnHeader: Locator;
	readonly usedInFieldsColumnHeader: Locator;

	// Drawer
	readonly drawer: Locator;
	readonly drawerCloseButton: Locator;

	// Drawer details
	readonly fieldConstraintNameDisplay: Locator;
	readonly fieldConstraintDescriptionDisplay: Locator;
	readonly fieldConstraintParameterTypeDisplay: Locator;
	readonly fieldConstraintDocsLink: Locator;
	readonly fieldReferenceButtons: Locator;

	// Drawer actions
	readonly deleteButton: Locator;
	readonly deleteConfirmButton: Locator;
	readonly deleteCancelButton: Locator;

	constructor(page: Page) {
		this.page = page;

		// Header
		this.pageTitle = page.getByRole('heading', { name: 'Field Constraints', level: 1 });

		// Search
		this.searchInput = page.getByPlaceholder('Search field constraints...');
		this.resultsCount = page.locator('text=/\\d+ field constraint/');

		// Filter
		this.filterButton = page.locator('button').filter({ has: page.locator('i.fa-filter') });
		this.filterPanel = page.locator('.bg-white.rounded-lg.shadow-xl.border');
		this.clearFiltersButton = page.getByRole('button', { name: /clear all/i });

		// Table
		this.table = page.locator('table');
		this.tableRows = page.locator('tbody tr');
		this.emptyState = page.locator('text=No field constraints found');

		// Sortable columns - scoped to table to avoid conflicts with drawer/filter panel
		this.nameColumnHeader = this.table.locator('thead th').filter({ hasText: 'Name' });
		this.parameterTypeColumnHeader = this.table.locator('thead th').filter({ hasText: 'Parameter Type' });
		this.usedInFieldsColumnHeader = this.table.locator('thead th').filter({ hasText: 'Used in Fields' });

		// Drawer
		this.drawer = page.locator('[class*="fixed"][class*="right-0"]').filter({ has: page.locator('text=Field Constraint Details') });
		this.drawerCloseButton = page.locator('button[aria-label="Close drawer"]');

		// Drawer details (read-only display elements)
		this.fieldConstraintNameDisplay = page.locator('h3:has-text("Name") + p');
		this.fieldConstraintDescriptionDisplay = page.locator('h3:has-text("Description") + p');
		this.fieldConstraintParameterTypeDisplay = page.locator('h3:has-text("Parameter Type") + code');
		this.fieldConstraintDocsLink = page.locator('a').filter({ hasText: 'View Docs' });
		this.fieldReferenceButtons = page.locator('button').filter({ has: page.locator('i.fa-table-list') });

		// Drawer actions
		this.deleteButton = page.getByRole('button', { name: 'Delete Field Constraint' });
		this.deleteConfirmButton = page.getByRole('button', { name: 'Yes, Delete' });
		this.deleteCancelButton = page.getByRole('button', { name: 'Cancel' });
	}

	/**
	 * Navigate to the field constraints page
	 */
	async goto() {
		await this.page.goto('/validators/field-constraints', { waitUntil: 'networkidle' });
		await this.pageTitle.waitFor({ state: 'visible' });
	}

	/**
	 * Search for field constraints
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
	 * Click a table row by field constraint name
	 */
	async clickRow(fieldConstraintName: string) {
		const row = this.tableRows.filter({ hasText: fieldConstraintName }).first();
		await row.click();
		await this.page.waitForTimeout(300);
	}

	/**
	 * Check if drawer is open
	 */
	async isDrawerOpen(): Promise<boolean> {
		return await this.fieldConstraintNameDisplay.isVisible();
	}

	/**
	 * Close the drawer
	 */
	async closeDrawer() {
		if (await this.isDrawerOpen()) {
			await this.drawerCloseButton.click();
			await this.page.waitForTimeout(500);
			await this.fieldConstraintNameDisplay.waitFor({ state: 'hidden', timeout: 5000 });
		}
	}

	/**
	 * Get field constraint name from drawer
	 */
	async getFieldConstraintName(): Promise<string> {
		const text = await this.fieldConstraintNameDisplay.textContent();
		return text?.trim() ?? '';
	}

	/**
	 * Get field constraint description from drawer
	 */
	async getFieldConstraintDescription(): Promise<string> {
		const text = await this.fieldConstraintDescriptionDisplay.textContent();
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
	 * Check if delete button is visible
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
	async sortByColumn(column: 'name' | 'parameterType' | 'usedInFields', withShift = false) {
		const clickOptions = withShift ? { modifiers: ['Shift'] as ('Shift' | 'Alt' | 'Control' | 'Meta')[] } : undefined;

		const headerMap = {
			name: () => this.table.locator('thead th button').filter({ hasText: 'Name' }),
			parameterType: () => this.table.locator('thead th button').filter({ hasText: 'Parameter Type' }),
			usedInFields: () => this.table.locator('thead th button').filter({ hasText: 'Used in Fields' })
		};

		await headerMap[column]().click(clickOptions);
		await this.page.waitForTimeout(300);
	}

	/**
	 * Get all field constraint names visible in the table
	 */
	async getVisibleFieldConstraintNames(): Promise<string[]> {
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
	 * Check if a field constraint exists in the table
	 */
	async hasFieldConstraint(fieldConstraintName: string): Promise<boolean> {
		const names = await this.getVisibleFieldConstraintNames();
		return names.includes(fieldConstraintName);
	}

	/**
	 * Check if empty state is visible
	 */
	async isEmptyStateVisible(): Promise<boolean> {
		return await this.emptyState.isVisible();
	}
}

// Legacy alias for backward compatibility
export const ConstraintsPage = FieldConstraintsPage;
