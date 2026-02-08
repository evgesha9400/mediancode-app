/**
 * Object Builder Page Object
 *
 * Encapsulates interactions with the object builder page (/object-builder).
 * Handles search, view details, edit, create, and delete operations for objects.
 */

import { type Page, type Locator, expect } from '@playwright/test';

export class ObjectBuilderPage {
	readonly page: Page;

	// Header
	readonly pageTitle: Locator;

	// Search
	readonly searchInput: Locator;
	readonly resultsCount: Locator;

	// Table
	readonly table: Locator;
	readonly tableRows: Locator;
	readonly emptyState: Locator;

	// Sortable columns
	readonly nameColumnHeader: Locator;
	readonly namespaceColumnHeader: Locator;
	readonly fieldsColumnHeader: Locator;
	readonly usedInApisColumnHeader: Locator;

	// Drawer
	readonly drawer: Locator;
	readonly drawerCloseButton: Locator;

	// Drawer form fields
	readonly objectNameInput: Locator;
	readonly objectNamespaceInput: Locator;
	readonly objectNamespaceSelect: Locator;
	readonly objectDescriptionTextarea: Locator;

	// Field selector dropdown
	readonly fieldSelectorInput: Locator;
	readonly fieldDropdownOptions: Locator;

	// Drawer actions
	readonly saveButton: Locator;
	readonly undoButton: Locator;
	readonly deleteButton: Locator;
	readonly deleteConfirmButton: Locator;
	readonly deleteCancelButton: Locator;

	// Creation mode
	readonly createObjectButton: Locator;
	readonly createButton: Locator;
	readonly cancelButton: Locator;
	readonly createDrawer: Locator;

	// Namespace selector
	readonly namespaceSelector: Locator;

	constructor(page: Page) {
		this.page = page;

		// Header
		this.pageTitle = page.getByRole('heading', { name: 'Objects', level: 1 });

		// Search
		this.searchInput = page.getByPlaceholder('Search objects...');
		this.resultsCount = page.locator('text=/\\d+ object/');

		// Table
		this.table = page.locator('table');
		this.tableRows = page.locator('tbody tr');
		this.emptyState = page.locator('text=No objects found');

		// Sortable columns - scoped to table
		this.nameColumnHeader = this.table.locator('thead th').filter({ hasText: 'Object Name' });
		this.namespaceColumnHeader = this.table.locator('thead th').filter({ hasText: 'Namespace' });
		this.fieldsColumnHeader = this.table.locator('thead th').filter({ hasText: /^Fields$/i });
		this.usedInApisColumnHeader = this.table.locator('thead th').filter({ hasText: 'Used In APIs' });

		// Drawer
		this.drawer = page.locator('[class*="fixed"][class*="right-0"]').filter({ has: page.locator('text=Edit Object') });
		this.drawerCloseButton = page.locator('button[aria-label="Close drawer"]');

		// Drawer form fields
		this.objectNameInput = page.locator('#object-name');
		this.objectNamespaceInput = page.locator('#object-namespace');
		this.objectNamespaceSelect = page.locator('#object-namespace');
		this.objectDescriptionTextarea = page.locator('#object-description');

		// Field selector dropdown
		this.fieldSelectorInput = page.getByPlaceholder('Add field to object...');
		this.fieldDropdownOptions = page.locator('.absolute.z-10.w-full button');

		// Drawer actions
		this.saveButton = page.getByRole('button', { name: 'Save Changes' });
		this.undoButton = page.getByRole('button', { name: 'Undo' });
		this.deleteButton = page.getByRole('button', { name: 'Delete Object' });
		this.deleteConfirmButton = page.getByRole('button', { name: 'Yes, Delete' });
		this.deleteCancelButton = page.getByRole('button', { name: 'Cancel' });

		// Creation mode
		this.createObjectButton = page.getByRole('button', { name: /Create Object/i });
		this.createButton = page.locator('button').filter({ hasText: /^Create Object$/i });
		this.cancelButton = page.getByRole('button', { name: 'Cancel' });
		this.createDrawer = page.locator('[class*="fixed"][class*="right-0"]').filter({ has: page.locator('text=Create Object') });

		// Namespace selector
		this.namespaceSelector = page.locator('[data-namespace-selector]');
	}

	/**
	 * Navigate to the object builder page
	 */
	async goto() {
		await this.page.goto('/object-builder');
		await this.pageTitle.waitFor({ state: 'visible' });
	}

	/**
	 * Search for objects
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
	 * Click on a row by object name
	 */
	async clickRow(objectName: string) {
		const row = this.tableRows.filter({ hasText: objectName });
		await row.click();
		await this.page.waitForTimeout(300);
	}

	/**
	 * Get all object names visible in the table
	 */
	async getVisibleObjectNames(): Promise<string[]> {
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
	 * Get all namespaces visible in the table
	 */
	async getVisibleNamespaces(): Promise<string[]> {
		const namespaces: string[] = [];
		const count = await this.tableRows.count();
		for (let i = 0; i < count; i++) {
			const row = this.tableRows.nth(i);
			const namespaceCell = row.locator('td').nth(1);
			const namespace = await namespaceCell.textContent();
			if (namespace) namespaces.push(namespace.trim());
		}
		return namespaces;
	}

	/**
	 * Get all field counts visible in the table
	 */
	async getVisibleFieldCounts(): Promise<number[]> {
		const counts: number[] = [];
		const count = await this.tableRows.count();
		for (let i = 0; i < count; i++) {
			const row = this.tableRows.nth(i);
			const countSpan = row.locator('td').nth(2).locator('span').first();
			const text = await countSpan.textContent();
			counts.push(parseInt(text?.trim() ?? '0', 10));
		}
		return counts;
	}

	/**
	 * Check if an object exists in the table
	 */
	async hasObject(objectName: string): Promise<boolean> {
		const names = await this.getVisibleObjectNames();
		return names.includes(objectName);
	}

	/**
	 * Check if empty state is visible
	 */
	async isEmptyStateVisible(): Promise<boolean> {
		return await this.emptyState.isVisible();
	}

	/**
	 * Check if drawer is open
	 */
	async isDrawerOpen(): Promise<boolean> {
		return await this.drawer.isVisible() || await this.createDrawer.isVisible();
	}

	/**
	 * Get object name from drawer
	 */
	async getObjectName(): Promise<string> {
		return await this.objectNameInput.inputValue();
	}

	/**
	 * Get object namespace from drawer
	 */
	async getObjectNamespace(): Promise<string> {
		return await this.objectNamespaceInput.inputValue();
	}

	/**
	 * Get object description from drawer
	 */
	async getObjectDescription(): Promise<string> {
		return await this.objectDescriptionTextarea.inputValue();
	}

	/**
	 * Set object name
	 */
	async setObjectName(name: string) {
		await this.objectNameInput.fill(name);
	}

	/**
	 * Set object namespace (only in create mode)
	 */
	async setObjectNamespace(namespaceId: string) {
		await this.objectNamespaceSelect.selectOption(namespaceId);
		// Wait for namespace change to propagate (clears fields from other namespaces)
		await this.page.waitForTimeout(200);
	}

	/**
	 * Set object description
	 */
	async setObjectDescription(description: string) {
		await this.objectDescriptionTextarea.fill(description);
	}

	/**
	 * Add a field by searching and selecting
	 */
	async addField(fieldName: string) {
		await this.fieldSelectorInput.click();
		await this.fieldSelectorInput.fill(fieldName);
		await this.page.waitForTimeout(200);

		// Click the matching field option
		const option = this.fieldDropdownOptions.filter({ hasText: fieldName }).first();
		await option.click();
		await this.page.waitForTimeout(200);
	}

	/**
	 * Remove a field from the object
	 */
	async removeField(fieldName: string) {
		const fieldRow = this.page.locator('.flex.items-center.space-x-2').filter({ hasText: fieldName });
		const removeButton = fieldRow.locator('button[title="Remove field"]');
		await removeButton.click();
	}

	/**
	 * Toggle required flag for a field
	 */
	async toggleFieldRequired(fieldName: string) {
		const fieldRow = this.page.locator('.flex.items-center.space-x-2').filter({ hasText: fieldName });
		const checkbox = fieldRow.locator('input[type="checkbox"]');
		await checkbox.click();
	}

	/**
	 * Get number of fields in the object
	 */
	async getFieldCount(): Promise<number> {
		// Use more specific locator to match only the outer field row container
		// (not the nested label which also has .flex.items-center.space-x-2)
		const fieldRows = this.page.locator('.flex.items-center.space-x-2.p-2.bg-white.rounded.border');
		return await fieldRows.count();
	}

	/**
	 * Close drawer
	 */
	async closeDrawer() {
		await this.drawerCloseButton.click();
		await this.page.waitForTimeout(500);
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
	 * Save changes
	 */
	async save() {
		await this.saveButton.click();
		await this.page.waitForTimeout(500);
	}

	/**
	 * Undo changes
	 */
	async undo() {
		await this.undoButton.click();
	}

	/**
	 * Delete object
	 */
	async delete() {
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
	 * Get validation error message
	 */
	async getValidationError(field: 'name'): Promise<string | null> {
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
	 * Click the Create Object button to open creation drawer
	 */
	async openCreateDrawer() {
		await this.createObjectButton.click();
		// Wait for drawer to open
		await this.page.waitForTimeout(300);
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
		// Wait for create to complete and drawer to close
		await this.page.waitForTimeout(600);
	}

	/**
	 * Cancel creation (close drawer without creating)
	 */
	async cancelCreate() {
		await this.cancelButton.click();
		// Wait for drawer close animation
		await this.page.waitForTimeout(500);
	}

	/**
	 * Create a new object with the given properties
	 */
	async createNewObject(options: {
		name: string;
		namespaceId?: string;
		description?: string;
		fields?: string[];
	}) {
		await this.openCreateDrawer();

		if (options.namespaceId) {
			await this.setObjectNamespace(options.namespaceId);
		}

		await this.setObjectName(options.name);

		if (options.description) {
			await this.setObjectDescription(options.description);
		}

		if (options.fields && options.fields.length > 0) {
			for (const fieldName of options.fields) {
				await this.addField(fieldName);
			}
		}

		await this.create();
	}
}
