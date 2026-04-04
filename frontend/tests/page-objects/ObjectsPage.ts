/**
 * Objects Page Object
 *
 * Encapsulates interactions with the objects page (/objects).
 * Handles search, view details, edit, create, and delete operations for objects.
 */

import { type Page, type Locator, expect } from '@playwright/test';
import { getTableRowCellSelector } from '$lib/utils/testIds';
import { ACTION_DELAY_MS } from '../helpers/e2e-delays';

export class ObjectsPage {
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
	readonly fieldGripHandles: Locator;

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
		this.fieldsColumnHeader = this.table.locator('thead th').filter({ hasText: /^Members$/i });
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
		this.fieldGripHandles = page.locator('.fa-grip-vertical').locator('..');

		// Drawer actions
		this.saveButton = page.getByRole('button', { name: 'Save', exact: true });
		this.undoButton = page.getByRole('button', { name: 'Undo' });
		this.deleteButton = page.getByRole('button').filter({ has: page.locator('span', { hasText: 'Delete' }) });
		this.deleteConfirmButton = page.getByRole('button', { name: 'Yes, Delete' });
		this.deleteCancelButton = page.getByRole('button', { name: 'Cancel' });

		// Creation mode
		this.createObjectButton = page.getByRole('button', { name: /Create Object/i });
		this.createButton = page.getByRole('button', { name: 'Create', exact: true });
		this.cancelButton = page.getByRole('button', { name: 'Cancel' });
		this.createDrawer = page.locator('[class*="fixed"][class*="right-0"]').filter({ has: page.locator('text=Create Object') });

		// Namespace selector
		this.namespaceSelector = page.locator('[data-namespace-selector]');
	}

	private async delay() {
		await this.page.waitForTimeout(ACTION_DELAY_MS);
	}

	/**
	 * Navigate to the object builder page
	 */
	async goto() {
		await this.page.goto('/objects', { waitUntil: 'networkidle' });
		await this.pageTitle.waitFor({ state: 'visible' });
	}

	/**
	 * Search for objects
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
	 * Click on a row by object name (opens edit drawer).
	 * Waits for the drawer shell to appear, then waits for the form content
	 * to render. If the content doesn't appear (race condition with Svelte
	 * reactivity), closes and retries the click once.
	 */
	async clickRow(objectName: string) {
		const row = this.tableRows.filter({ hasText: objectName });
		await row.click();
		await this.drawer.waitFor({ state: 'visible', timeout: 5000 });

		// Wait for drawer content to render (editedItem may lag behind drawerOpen)
		const contentLoaded = await this.objectNameInput.waitFor({ state: 'visible', timeout: 3000 }).then(() => true).catch(() => false);
		if (!contentLoaded) {
			// Retry: close drawer and re-click
			await this.drawerCloseButton.click();
			await this.drawer.waitFor({ state: 'hidden', timeout: 5000 });
			await this.page.waitForTimeout(ACTION_DELAY_MS);
			await row.click();
			await this.drawer.waitFor({ state: 'visible', timeout: 5000 });
			await this.objectNameInput.waitFor({ state: 'visible', timeout: 5000 });
		}
	}

	/**
	 * Get all object names visible in the table
	 */
	async getVisibleObjectNames(): Promise<string[]> {
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
	 * Get all field counts visible in the table
	 */
	async getVisibleFieldCounts(): Promise<number[]> {
		const counts: number[] = [];
		const count = await this.tableRows.count();
		for (let i = 0; i < count; i++) {
			const row = this.tableRows.nth(i);
			const countSpan = row.locator(getTableRowCellSelector('members')).locator('span').first();
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
		await this.delay();
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
		await this.delay();

		// Click the matching field option
		const option = this.fieldDropdownOptions.filter({ hasText: fieldName }).first();
		await option.click();
		await this.delay();
	}

	/**
	 * Remove a field from the object
	 */
	async removeField(fieldName: string) {
		const fieldRow = this.page.locator('.flex.items-center.space-x-2').filter({ hasText: fieldName });
		const removeButton = fieldRow.locator('button[title="Remove member"]');
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
	 * Get number of members (scalar + relationship) in the object
	 */
	async getFieldCount(): Promise<number> {
		// Target the outer member row container which has space-y-1.5
		const memberRows = this.page.locator('.p-2.bg-mono-900.rounded.border.space-y-1\\.5');
		return await memberRows.count();
	}

	/**
	 * Get ordered list of member names in the drawer
	 */
	async getFieldNames(): Promise<string[]> {
		const memberRows = this.page.locator('.p-2.bg-mono-900.rounded.border.space-y-1\\.5');
		const count = await memberRows.count();
		const names: string[] = [];
		for (let i = 0; i < count; i++) {
			// Use .font-mono.text-sm to match member name inputs/spans
			const nameInput = memberRows.nth(i).locator('.font-mono.text-sm');
			const text = await nameInput.inputValue().catch(() => nameInput.textContent());
			if (text) names.push(text.trim());
		}
		return names;
	}

	/**
	 * Reorder a field by dragging its grip handle to another field's grip handle position.
	 * svelte-dnd-action's dragHandleZone works as follows:
	 * 1. mousedown on the handle sets isItemsDragDisabled=false (synchronous)
	 * 2. The zone updates, registering mousedown listeners on item elements
	 * 3. The mousedown event bubbles from handle to item, triggering the zone's listener
	 * 4. On mousemove (>= 3px), the drag actually starts
	 * We use Playwright's low-level mouse API to simulate this sequence.
	 * @param fromIndex - 0-based index of the field to drag
	 * @param toIndex - 0-based index of the target position
	 */
	async reorderField(fromIndex: number, toIndex: number) {
		const sourceHandle = this.fieldGripHandles.nth(fromIndex);
		const targetHandle = this.fieldGripHandles.nth(toIndex);

		const sourceBox = await sourceHandle.boundingBox();
		const targetBox = await targetHandle.boundingBox();
		if (!sourceBox || !targetBox) throw new Error('Could not get bounding boxes for drag handles');

		const sourceX = sourceBox.x + sourceBox.width / 2;
		const sourceY = sourceBox.y + sourceBox.height / 2;
		const targetX = targetBox.x + targetBox.width / 2;
		const targetY = targetBox.y + targetBox.height / 2;

		// Move to the source handle and press down
		await this.page.mouse.move(sourceX, sourceY);
		await this.page.mouse.down();
		// Small pause to let the store update and zone re-register listeners
		await this.page.waitForTimeout(100);

		// Move past the MIN_MOVEMENT_BEFORE_DRAG_START_PX threshold (3px in svelte-dnd-action)
		// then continue to the target position in steps
		const steps = 20;
		for (let i = 1; i <= steps; i++) {
			await this.page.mouse.move(
				sourceX + (targetX - sourceX) * (i / steps),
				sourceY + (targetY - sourceY) * (i / steps)
			);
		}
		// Hold at the target briefly so the library can finalize the position
		await this.page.waitForTimeout(200);
		await this.page.mouse.up();
		await this.delay();
	}

	/**
	 * Close drawer
	 */
	async closeDrawer() {
		await this.drawerCloseButton.click();
		await this.drawer.waitFor({ state: 'hidden' });
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
		await this.drawer.waitFor({ state: 'hidden', timeout: 10000 });
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
		await this.drawer.waitFor({ state: 'hidden', timeout: 10000 });
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
		await this.createDrawer.waitFor({ state: 'visible' });
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
		await this.createDrawer.waitFor({ state: 'hidden', timeout: 10000 });
	}

	/**
	 * Cancel creation (close drawer without creating)
	 */
	async cancelCreate() {
		await this.cancelButton.click();
		await this.createDrawer.waitFor({ state: 'hidden' });
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
