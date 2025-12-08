/**
 * Fields Page Object
 *
 * Encapsulates interactions with the fields page (/field-registry).
 * Handles search, filter, sort, view details, edit, and delete operations.
 */

import { type Page, type Locator, expect } from '@playwright/test';

export class FieldRegistryPage {
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
	readonly defaultValueColumnHeader: Locator;
	readonly usedInApisColumnHeader: Locator;

	// Drawer
	readonly drawer: Locator;
	readonly drawerCloseButton: Locator;

	// Drawer form fields
	readonly fieldNameInput: Locator;
	readonly fieldTypeSelect: Locator;
	readonly fieldDescriptionTextarea: Locator;
	readonly fieldDefaultValueInput: Locator;

	// Drawer validators section
	readonly addValidatorButton: Locator;
	readonly validatorRows: Locator;
	readonly validatorsContainer: Locator;

	// Drawer actions
	readonly saveButton: Locator;
	readonly undoButton: Locator;
	readonly deleteButton: Locator;
	readonly deleteConfirmButton: Locator;
	readonly deleteCancelButton: Locator;

	constructor(page: Page) {
		this.page = page;

		// Header
		this.pageTitle = page.getByRole('heading', { name: 'Fields', level: 1 });

		// Search
		this.searchInput = page.getByPlaceholder('Search fields...');
		this.resultsCount = page.locator('text=/\\d+ field/');

		// Filter
		this.filterButton = page.locator('button').filter({ has: page.locator('i.fa-filter') });
		this.filterPanel = page.locator('.bg-white.rounded-lg.shadow-xl.border');
		this.clearFiltersButton = page.getByRole('button', { name: /clear all/i });

		// Table
		this.table = page.locator('table');
		this.tableRows = page.locator('tbody tr');
		this.emptyState = page.locator('text=No fields found');

		// Sortable columns - scoped to table to avoid conflicts with drawer/filter panel
		this.nameColumnHeader = this.table.locator('thead th').filter({ hasText: 'Field Name' });
		this.typeColumnHeader = this.table.locator('thead th').filter({ hasText: /^Type$/i });
		this.defaultValueColumnHeader = this.table.locator('thead th').filter({ hasText: 'Default Value' });
		this.usedInApisColumnHeader = this.table.locator('thead th').filter({ hasText: 'Used In APIs' });

		// Drawer
		this.drawer = page.locator('[class*="fixed"][class*="right-0"]').filter({ has: page.locator('text=Edit Field') });
		this.drawerCloseButton = page.locator('button[aria-label="Close drawer"]');

		// Drawer form fields
		this.fieldNameInput = page.locator('#field-name');
		this.fieldTypeSelect = page.locator('#field-type');
		this.fieldDescriptionTextarea = page.locator('#field-description');
		this.fieldDefaultValueInput = page.locator('#field-default-value');

		// Drawer validators section
		this.addValidatorButton = page.getByRole('button', { name: '+ Add', exact: true });
		// Select the validators container div, then get individual validator rows
		this.validatorsContainer = page.locator('.bg-mono-50.rounded-md').filter({ has: page.locator('select') });
		this.validatorRows = this.validatorsContainer.locator('.flex.items-center.space-x-2').filter({ has: page.locator('select') });

		// Drawer actions
		this.saveButton = page.getByRole('button', { name: 'Save Changes' });
		this.undoButton = page.getByRole('button', { name: 'Undo' });
		this.deleteButton = page.getByRole('button', { name: 'Delete Field' });
		this.deleteConfirmButton = page.getByRole('button', { name: 'Yes, Delete' });
		this.deleteCancelButton = page.getByRole('button', { name: 'Cancel' });
	}

	/**
	 * Navigate to the fields page
	 */
	async goto() {
		await this.page.goto('/field-registry');
		await this.pageTitle.waitFor({ state: 'visible' });
	}

	/**
	 * Search for fields
	 */
	async search(query: string) {
		await this.searchInput.fill(query);
		// Wait for results to update
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
	 * Click a table row by field name
	 */
	async clickRow(fieldName: string) {
		const row = this.tableRows.filter({ hasText: fieldName }).first();
		await row.click();
		// Wait for drawer to open
		await this.page.waitForTimeout(300);
	}

	/**
	 * Check if drawer is open
	 */
	async isDrawerOpen(): Promise<boolean> {
		return await this.fieldNameInput.isVisible();
	}

	/**
	 * Close the drawer
	 */
	async closeDrawer() {
		if (await this.isDrawerOpen()) {
			await this.drawerCloseButton.click();
			// Wait for drawer close animation to complete
			await this.page.waitForTimeout(500);
			// Wait for the form input to be hidden
			await this.fieldNameInput.waitFor({ state: 'hidden', timeout: 5000 });
		}
	}

	/**
	 * Get field name from drawer
	 */
	async getFieldName(): Promise<string> {
		return await this.fieldNameInput.inputValue();
	}

	/**
	 * Set field name in drawer
	 */
	async setFieldName(name: string) {
		await this.fieldNameInput.fill(name);
	}

	/**
	 * Get field type from drawer
	 */
	async getFieldType(): Promise<string> {
		return await this.fieldTypeSelect.inputValue();
	}

	/**
	 * Set field type in drawer
	 */
	async setFieldType(type: string) {
		await this.fieldTypeSelect.selectOption(type);
	}

	/**
	 * Get field description from drawer
	 */
	async getFieldDescription(): Promise<string> {
		return await this.fieldDescriptionTextarea.inputValue();
	}

	/**
	 * Set field description in drawer
	 */
	async setFieldDescription(description: string) {
		await this.fieldDescriptionTextarea.fill(description);
	}

	/**
	 * Get default value from drawer
	 */
	async getDefaultValue(): Promise<string> {
		return await this.fieldDefaultValueInput.inputValue();
	}

	/**
	 * Set default value in drawer
	 */
	async setDefaultValue(value: string) {
		await this.fieldDefaultValueInput.fill(value);
	}

	/**
	 * Check if save button is enabled
	 */
	async isSaveEnabled(): Promise<boolean> {
		return await this.saveButton.isEnabled();
	}

	/**
	 * Check if undo button is enabled
	 */
	async isUndoEnabled(): Promise<boolean> {
		return await this.undoButton.isEnabled();
	}

	/**
	 * Check if delete button is enabled
	 */
	async isDeleteEnabled(): Promise<boolean> {
		return await this.deleteButton.isEnabled();
	}

	/**
	 * Click save button
	 */
	async save() {
		await this.saveButton.click();
		// Wait for save to complete and drawer to close (closeDelay is 300ms + animation time)
		await this.page.waitForTimeout(600);
	}

	/**
	 * Click undo button
	 */
	async undo() {
		await this.undoButton.click();
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
	 * Add a validator
	 */
	async addValidator() {
		await this.addValidatorButton.click();
	}

	/**
	 * Get validator count
	 */
	async getValidatorCount(): Promise<number> {
		return await this.validatorRows.count();
	}

	/**
	 * Remove validator by index (0-based)
	 */
	async removeValidator(index: number) {
		const removeButton = this.validatorRows.nth(index).getByRole('button', { name: 'Remove validator' });
		await removeButton.click();
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
	async sortByColumn(column: 'name' | 'type' | 'defaultValue' | 'usedInApis', withShift = false) {
		const clickOptions = withShift ? { modifiers: ['Shift'] as ('Shift' | 'Alt' | 'Control' | 'Meta')[] } : undefined;

		// Get fresh locator each time to avoid stale elements
		// Click the button inside the th, which contains the label text
		const headerMap = {
			name: () => this.table.locator('thead th button').filter({ hasText: 'Field Name' }),
			type: () => this.table.locator('thead th button').filter({ hasText: 'Type' }),
			defaultValue: () => this.table.locator('thead th button').filter({ hasText: 'Default Value' }),
			usedInApis: () => this.table.locator('thead th button').filter({ hasText: 'Used In APIs' })
		};

		await headerMap[column]().click(clickOptions);
		await this.page.waitForTimeout(300);
	}

	/**
	 * Get all field names visible in the table
	 */
	async getVisibleFieldNames(): Promise<string[]> {
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
	 * Get all field types visible in the table
	 */
	async getVisibleTypes(): Promise<string[]> {
		const types: string[] = [];
		const count = await this.tableRows.count();
		for (let i = 0; i < count; i++) {
			const row = this.tableRows.nth(i);
			const typeCell = row.locator('td').nth(1);
			const type = await typeCell.textContent();
			if (type) types.push(type.trim());
		}
		return types;
	}

	/**
	 * Get all namespaces visible in the table
	 */
	async getVisibleNamespaces(): Promise<string[]> {
		const namespaces: string[] = [];
		const count = await this.tableRows.count();
		for (let i = 0; i < count; i++) {
			const row = this.tableRows.nth(i);
			const namespaceCell = row.locator('td').nth(2);
			const namespace = await namespaceCell.textContent();
			if (namespace) namespaces.push(namespace.trim());
		}
		return namespaces;
	}

	/**
	 * Get all default values visible in the table
	 */
	async getVisibleDefaultValues(): Promise<string[]> {
		const defaultValues: string[] = [];
		const count = await this.tableRows.count();
		for (let i = 0; i < count; i++) {
			const row = this.tableRows.nth(i);
			const defaultValueCell = row.locator('td').nth(4);
			const value = await defaultValueCell.textContent();
			if (value) defaultValues.push(value.trim());
		}
		return defaultValues;
	}

	/**
	 * Get all usedInApis counts visible in the table
	 */
	async getVisibleUsedInApis(): Promise<number[]> {
		const counts: number[] = [];
		const count = await this.tableRows.count();
		for (let i = 0; i < count; i++) {
			const row = this.tableRows.nth(i);
			const countSpan = row.locator('td').nth(5).locator('span').first();
			const text = await countSpan.textContent();
			counts.push(parseInt(text?.trim() ?? '0', 10));
		}
		return counts;
	}

	/**
	 * Check if a field exists in the table
	 */
	async hasField(fieldName: string): Promise<boolean> {
		const names = await this.getVisibleFieldNames();
		return names.includes(fieldName);
	}

	/**
	 * Check if empty state is visible
	 */
	async isEmptyStateVisible(): Promise<boolean> {
		return await this.emptyState.isVisible();
	}

	/**
	 * Get validation error message
	 */
	async getValidationError(field: 'name' | 'type'): Promise<string | null> {
		const errorLocator = this.page.locator('.text-red-500.text-xs');
		if (await errorLocator.isVisible()) {
			return await errorLocator.textContent();
		}
		return null;
	}
}
