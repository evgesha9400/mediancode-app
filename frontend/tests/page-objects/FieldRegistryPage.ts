/**
 * Fields Page Object
 *
 * Encapsulates interactions with the fields page (/field-registry).
 * Handles search, filter, sort, view details, edit, and delete operations.
 *
 * All inter-action delays are controlled by E2E_ACTION_DELAY env var (default: 300ms).
 */

import { type Page, type Locator, expect } from '@playwright/test';
import { ACTION_DELAY_MS } from '../helpers/e2e-delays';

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
	readonly validatorSelectorInput: Locator;
	readonly validatorDropdownOptions: Locator;
	readonly validatorRows: Locator;

	// Drawer actions
	readonly saveButton: Locator;
	readonly undoButton: Locator;
	readonly deleteButton: Locator;
	readonly deleteConfirmButton: Locator;
	readonly deleteCancelButton: Locator;

	// Creation mode
	readonly addFieldButton: Locator;
	readonly createButton: Locator;
	readonly cancelButton: Locator;
	readonly createDrawer: Locator;

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

		// Drawer form fields (using prefixed IDs to avoid conflicts)
		this.fieldNameInput = page.locator('#field-registry-name');
		this.fieldTypeSelect = page.locator('#field-registry-type');
		this.fieldDescriptionTextarea = page.locator('#field-registry-description');
		this.fieldDefaultValueInput = page.locator('#field-registry-default-value');

		// Drawer validators section - uses ValidatorSelectorDropdown component
		this.validatorSelectorInput = page.getByPlaceholder('Add validator to field...');
		this.validatorDropdownOptions = page.locator('.absolute.z-10 button');
		// Individual validator rows - identified by having a "Remove validator" button
		this.validatorRows = page.locator('.flex.items-center.space-x-2.p-2.bg-white').filter({ has: page.getByRole('button', { name: 'Remove validator' }) });

		// Drawer actions
		this.saveButton = page.getByRole('button', { name: 'Save Changes' });
		this.undoButton = page.getByRole('button', { name: 'Undo' });
		this.deleteButton = page.getByRole('button', { name: 'Delete Field' });
		this.deleteConfirmButton = page.getByRole('button', { name: 'Yes, Delete' });
		this.deleteCancelButton = page.getByRole('button', { name: 'Cancel' });

		// Creation mode
		this.addFieldButton = page.getByRole('button', { name: 'Add Field' });
		this.createButton = page.getByRole('button', { name: 'Create Field' });
		this.cancelButton = page.getByRole('button', { name: 'Cancel' });
		this.createDrawer = page.locator('[class*="fixed"][class*="right-0"]').filter({ has: page.locator('text=Create Field') });
	}

	/** Single configurable delay used after every action. */
	private async delay() {
		await this.page.waitForTimeout(ACTION_DELAY_MS);
	}

	/**
	 * Navigate to the fields page
	 */
	async goto() {
		await this.page.goto('/field-registry', { waitUntil: 'networkidle' });
		await this.pageTitle.waitFor({ state: 'visible' });
		await this.delay();
	}

	/**
	 * Search for fields
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
	 * Click a table row by field name
	 */
	async clickRow(fieldName: string) {
		const row = this.tableRows.filter({ hasText: fieldName }).first();
		await row.click();
		await this.delay();
	}

	/**
	 * Check if drawer is open (either edit or create drawer)
	 */
	async isDrawerOpen(): Promise<boolean> {
		return await this.drawer.isVisible() || await this.createDrawer.isVisible();
	}

	/**
	 * Close the drawer
	 */
	async closeDrawer() {
		if (await this.isDrawerOpen()) {
			await this.drawerCloseButton.click();
			await this.delay();
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
		await this.delay();
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
		await this.delay();
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
		await this.delay();
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
		await this.delay();
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
		// Double delay: save triggers close animation which takes longer
		await this.delay();
		await this.delay();
	}

	/**
	 * Click undo button
	 */
	async undo() {
		await this.undoButton.click();
		await this.delay();
	}

	/**
	 * Click delete button (first step)
	 */
	async clickDelete() {
		await this.deleteButton.click();
		await this.delay();
	}

	/**
	 * Confirm delete
	 */
	async confirmDelete() {
		await this.deleteConfirmButton.click();
		await this.delay();
	}

	/**
	 * Cancel delete
	 */
	async cancelDelete() {
		await this.deleteCancelButton.click();
		await this.delay();
	}

	/**
	 * Add a validator using the dropdown selector
	 * @param validatorName - Optional name of specific validator to select. If not provided, selects first available.
	 */
	async addValidator(validatorName?: string) {
		await this.validatorSelectorInput.click();
		await this.delay();

		if (validatorName) {
			const option = this.validatorDropdownOptions.filter({ hasText: validatorName });
			await option.first().click();
		} else {
			await this.validatorDropdownOptions.first().click();
		}

		await this.delay();
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
		await this.delay();
	}

	/**
	 * Open filter panel
	 */
	async openFilters() {
		await this.filterButton.click();
		await this.delay();
	}

	/**
	 * Toggle a filter checkbox by label
	 */
	async toggleFilterCheckbox(label: string) {
		const checkbox = this.page.locator('label').filter({ hasText: label }).locator('input[type="checkbox"]');
		await checkbox.click();
		await this.delay();
	}

	/**
	 * Toggle a filter switch by label
	 */
	async toggleFilterSwitch(label: string) {
		const toggle = this.page.locator('label').filter({ hasText: label }).locator('button[role="switch"]');
		await toggle.click();
		await this.delay();
	}

	/**
	 * Clear all filters
	 */
	async clearFilters() {
		await this.clearFiltersButton.click();
		await this.delay();
	}

	/**
	 * Sort by column (click column header)
	 */
	async sortByColumn(column: 'name' | 'type' | 'defaultValue' | 'usedInApis', withShift = false) {
		const clickOptions = withShift ? { modifiers: ['Shift'] as ('Shift' | 'Alt' | 'Control' | 'Meta')[] } : undefined;

		const headerMap = {
			name: () => this.table.locator('thead th button').filter({ hasText: 'Field Name' }),
			type: () => this.table.locator('thead th button').filter({ hasText: 'Type' }),
			defaultValue: () => this.table.locator('thead th button').filter({ hasText: 'Default Value' }),
			usedInApis: () => this.table.locator('thead th button').filter({ hasText: 'Used In APIs' })
		};

		await headerMap[column]().click(clickOptions);
		await this.delay();
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

	// ============================================================================
	// Creation Mode Methods
	// ============================================================================

	/**
	 * Click the Add Field button to open creation drawer
	 */
	async openCreateDrawer() {
		await this.addFieldButton.click();
		await this.delay();
	}

	/**
	 * Check if creation drawer is open
	 */
	async isCreateDrawerOpen(): Promise<boolean> {
		return await this.createButton.isVisible();
	}

	/**
	 * Check if create button is enabled
	 */
	async isCreateEnabled(): Promise<boolean> {
		return await this.createButton.isEnabled();
	}

	/**
	 * Click create button
	 */
	async create() {
		await this.createButton.click();
		// Double delay: create triggers close animation which takes longer
		await this.delay();
		await this.createDrawer.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
		await this.delay();
	}

	/**
	 * Cancel creation (close drawer without creating)
	 */
	async cancelCreate() {
		await this.cancelButton.click();
		await this.delay();
	}

	/**
	 * Create a new field with the given properties
	 */
	async createNewField(options: {
		name: string;
		type?: string;
		description?: string;
		defaultValue?: string;
	}) {
		await this.openCreateDrawer();

		await this.setFieldName(options.name);

		if (options.type) {
			await this.setFieldType(options.type);
		}

		if (options.description) {
			await this.setFieldDescription(options.description);
		}

		if (options.defaultValue) {
			await this.setDefaultValue(options.defaultValue);
		}

		await this.create();
	}
}
