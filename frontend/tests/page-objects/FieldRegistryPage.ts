/**
 * Fields Page Object
 *
 * Encapsulates interactions with the fields page (/field-registry).
 * Handles search, filter, sort, view details, edit, and delete operations.
 *
 * Actions that involve API calls or UI transitions (drawer open/close, confirmation
 * dialogs) wait for the actual state change rather than using fixed timeouts.
 * This makes tests reliable regardless of network latency to the backend.
 *
 * Purely client-side operations (form fills, search, filter, sort) use a
 * configurable delay for visual pacing (E2E_ACTION_DELAY env var, default: 300ms).
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

	// Drawer constraints section
	readonly constraintSelectorInput: Locator;
	readonly constraintDropdownOptions: Locator;
	readonly constraintRows: Locator;

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

		// Drawer constraints section - uses ConstraintSelectorDropdown component
		this.constraintSelectorInput = page.getByPlaceholder('Add constraint to field...');
		this.constraintDropdownOptions = page.locator('.absolute.z-10 button');
		// Individual constraint rows - identified by having a "Remove constraint" button
		this.constraintRows = page.locator('.flex.items-center.space-x-2.p-2.bg-white').filter({ has: page.getByRole('button', { name: 'Remove constraint' }) });

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
	 * Click a table row by field name and wait for the edit drawer to open.
	 */
	async clickRow(fieldName: string) {
		const row = this.tableRows.filter({ hasText: fieldName }).first();
		await row.click();
		await this.drawer.waitFor({ state: 'visible', timeout: 5000 });
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
	 * Click save button and wait for drawer to close.
	 * The save triggers an API call, then closes the drawer on success.
	 * We wait for the drawer to actually disappear rather than using fixed timeouts,
	 * since the API round-trip time varies (especially in CI hitting a remote backend).
	 */
	async save() {
		await this.saveButton.click();
		await this.drawer.waitFor({ state: 'hidden', timeout: 10000 });
	}

	/**
	 * Click undo button
	 */
	async undo() {
		await this.undoButton.click();
		await this.delay();
	}

	/**
	 * Click delete button and wait for confirmation UI to appear.
	 */
	async clickDelete() {
		await this.deleteButton.click();
		await this.deleteConfirmButton.waitFor({ state: 'visible', timeout: 5000 });
	}

	/**
	 * Confirm delete and wait for drawer to close.
	 * The delete triggers a DELETE API call, then closes the drawer on success.
	 * We wait for the drawer to actually disappear rather than using fixed timeouts,
	 * since the API round-trip time varies (especially in CI hitting a remote backend).
	 */
	async confirmDelete() {
		await this.deleteConfirmButton.click();
		await this.drawer.waitFor({ state: 'hidden', timeout: 10000 });
	}

	/**
	 * Cancel delete and wait for normal delete button to reappear.
	 */
	async cancelDelete() {
		await this.deleteCancelButton.click();
		await this.deleteButton.waitFor({ state: 'visible', timeout: 5000 });
	}

	/**
	 * Add a constraint using the dropdown selector.
	 * Waits for dropdown options to appear before selecting.
	 * @param constraintName - Optional name of specific constraint to select. If not provided, selects first available.
	 */
	async addConstraint(constraintName?: string) {
		await this.constraintSelectorInput.click();
		await this.constraintDropdownOptions.first().waitFor({ state: 'visible', timeout: 5000 });

		if (constraintName) {
			const option = this.constraintDropdownOptions.filter({ hasText: constraintName });
			await option.first().click();
		} else {
			await this.constraintDropdownOptions.first().click();
		}

		await this.delay();
	}

	/**
	 * Get constraint count
	 */
	async getConstraintCount(): Promise<number> {
		return await this.constraintRows.count();
	}

	/**
	 * Remove constraint by index (0-based)
	 */
	async removeConstraint(index: number) {
		const removeButton = this.constraintRows.nth(index).getByRole('button', { name: 'Remove constraint' });
		await removeButton.click();
		await this.delay();
	}

	/**
	 * Open filter panel and wait for it to appear.
	 */
	async openFilters() {
		await this.filterButton.click();
		await this.filterPanel.waitFor({ state: 'visible', timeout: 5000 });
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
		const toggle = this.page.locator('label').filter({ hasText: label }).locator('input[type="checkbox"]');
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
	 * Click the Add Field button and wait for the creation drawer to open.
	 */
	async openCreateDrawer() {
		await this.addFieldButton.click();
		await this.createDrawer.waitFor({ state: 'visible', timeout: 5000 });
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
	 * Click create button and wait for drawer to close.
	 * The create triggers a POST API call, then closes the drawer on success.
	 * We wait for the drawer to actually disappear rather than using fixed timeouts,
	 * since the API round-trip time varies (especially in CI hitting a remote backend).
	 */
	async create() {
		await this.createButton.click();
		await this.createDrawer.waitFor({ state: 'hidden', timeout: 10000 });
	}

	/**
	 * Cancel creation and wait for drawer to close.
	 */
	async cancelCreate() {
		await this.cancelButton.click();
		await this.createDrawer.waitFor({ state: 'hidden', timeout: 5000 });
	}

	/**
	 * Create a new field with the given properties
	 */
	async createNewField(options: {
		name: string;
		type?: string;
		description?: string;
		defaultValue?: string;
		constraints?: string[];
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

		if (options.constraints) {
			for (const name of options.constraints) {
				await this.addConstraint(name);
			}
		}

		await this.create();
	}
}
