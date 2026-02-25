/**
 * Namespaces Page Object
 *
 * Encapsulates interactions with the namespaces page (/namespaces).
 * Handles search, filter, sort, create (via drawer), edit (via drawer), and delete.
 *
 * Actions that involve API calls or UI transitions (drawer open/close, confirmation
 * dialogs) wait for the actual state change rather than using fixed timeouts.
 * This makes tests reliable regardless of network latency to the backend.
 *
 * Purely client-side operations (form fills, search, filter, sort) use a
 * configurable delay for visual pacing (E2E_ACTION_DELAY env var, default: 300ms).
 */

import { type Page, type Locator } from '@playwright/test';
import { ACTION_DELAY_MS } from '../helpers/e2e-delays';

export class NamespacesPage {
	readonly page: Page;

	// Header
	readonly pageTitle: Locator;

	// Actions
	readonly addNamespaceButton: Locator;

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
	readonly entitiesColumnHeader: Locator;

	// Drawer (used for both create and edit)
	readonly drawer: Locator;
	readonly createButton: Locator;
	readonly drawerCloseButton: Locator;
	readonly namespaceNameInput: Locator;
	readonly namespaceDescriptionTextarea: Locator;
	readonly defaultCheckbox: Locator;

	// Drawer actions
	readonly saveButton: Locator;
	readonly undoButton: Locator;
	readonly deleteButton: Locator;
	readonly deleteConfirmButton: Locator;
	readonly deleteCancelButton: Locator;

	constructor(page: Page) {
		this.page = page;

		// Header
		this.pageTitle = page.getByRole('heading', { name: 'Namespaces', level: 1 });

		// Actions
		this.addNamespaceButton = page.getByRole('button', { name: /Add Namespace/i });

		// Search
		this.searchInput = page.getByPlaceholder('Search namespaces...');
		this.resultsCount = page.locator('text=/\\d+ namespace/');

		// Filter
		this.filterButton = page.locator('button').filter({ has: page.locator('i.fa-filter') });
		this.filterPanel = page.locator('.bg-white.rounded-lg.shadow-xl.border');
		this.clearFiltersButton = page.getByRole('button', { name: /clear all/i });

		// Table
		this.table = page.locator('table');
		this.tableRows = page.locator('tbody tr');
		this.emptyState = page.locator('text=No namespaces found');

		// Sortable columns
		this.nameColumnHeader = this.table.locator('thead th').filter({ hasText: 'Name' });
		this.entitiesColumnHeader = this.table.locator('thead th').filter({ hasText: 'Entities' });

		// Drawer (handles create, edit, and view)
		this.drawer = page.locator('[class*="fixed"][class*="right-0"]').filter({
			has: page.locator('text=/Create Namespace|Edit Namespace|Namespace Details/')
		});
		this.createButton = page.getByRole('button', { name: 'Create', exact: true });
		this.drawerCloseButton = page.locator('button[aria-label="Close drawer"]');
		this.namespaceNameInput = page.locator('#namespace-name');
		this.namespaceDescriptionTextarea = page.locator('#namespace-description');
		this.defaultCheckbox = page.getByLabel(/set as default namespace/i);

		// Drawer actions (CrudDrawerFooter)
		this.saveButton = page.getByRole('button', { name: 'Save', exact: true });
		this.undoButton = page.getByRole('button', { name: 'Undo' });
		this.deleteButton = page.getByRole('button').filter({ has: page.locator('span', { hasText: 'Delete' }) });
		this.deleteConfirmButton = page.getByRole('button', { name: 'Yes, Delete' });
		this.deleteCancelButton = page.getByRole('button', { name: 'Cancel' });
	}

	private async delay() {
		await this.page.waitForTimeout(ACTION_DELAY_MS);
	}

	/**
	 * Navigate to the namespaces page
	 */
	async goto() {
		await this.page.goto('/namespaces', { waitUntil: 'networkidle' });
		await this.pageTitle.waitFor({ state: 'visible' });
		await this.delay();
	}

	/**
	 * Search for namespaces
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
	 * Click on a row by namespace name (opens edit drawer).
	 * Waits for the drawer shell to appear, then waits for the form content
	 * to render. If the content doesn't appear (race condition with Svelte
	 * reactivity), closes and retries the click once.
	 */
	async clickRow(namespaceName: string) {
		const row = this.tableRows.filter({ hasText: namespaceName });
		await row.click();
		await this.drawer.waitFor({ state: 'visible', timeout: 5000 });

		// Wait for drawer content to render (editedItem may lag behind drawerOpen)
		const contentLoaded = await this.namespaceNameInput.waitFor({ state: 'visible', timeout: 3000 }).then(() => true).catch(() => false);
		if (!contentLoaded) {
			// Retry: close drawer and re-click
			await this.drawerCloseButton.click();
			await this.drawer.waitFor({ state: 'hidden', timeout: 5000 });
			await this.delay();
			await row.click();
			await this.drawer.waitFor({ state: 'visible', timeout: 5000 });
			await this.namespaceNameInput.waitFor({ state: 'visible', timeout: 5000 });
		}
	}

	/**
	 * Get all namespace names visible in the table
	 */
	async getVisibleNamespaceNames(): Promise<string[]> {
		const names: string[] = [];
		const count = await this.tableRows.count();
		for (let i = 0; i < count; i++) {
			const row = this.tableRows.nth(i);
			const nameCell = row.locator('td').first();
			const nameSpan = nameCell.locator('.text-mono-900.font-medium');
			const name = await nameSpan.textContent();
			if (name) names.push(name.trim());
		}
		return names;
	}

	/**
	 * Check if a namespace exists in the table
	 */
	async hasNamespace(namespaceName: string): Promise<boolean> {
		const names = await this.getVisibleNamespaceNames();
		return names.includes(namespaceName);
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
		return await this.drawer.isVisible();
	}

	/**
	 * Close drawer
	 */
	async closeDrawer() {
		await this.drawerCloseButton.click();
		await this.drawer.waitFor({ state: 'hidden' });
	}

	// ============================================================================
	// Filter Methods
	// ============================================================================

	/**
	 * Open filter panel and wait for it to appear.
	 */
	async openFilters() {
		await this.filterButton.click();
		await this.filterPanel.waitFor({ state: 'visible', timeout: 5000 });
	}

	/**
	 * Close filter panel without clearing filter state.
	 * Clicks the backdrop overlay which triggers onClose() in FilterPanel.
	 */
	async closeFilters() {
		const backdrop = this.page.locator('div.fixed.inset-0[role="presentation"]');
		await backdrop.click();
		await this.filterPanel.waitFor({ state: 'hidden', timeout: 5000 });
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
	 * Clear all filters. Note: this also closes the panel via resetFilters().
	 */
	async clearFilters() {
		await this.clearFiltersButton.click();
		await this.filterPanel.waitFor({ state: 'hidden', timeout: 5000 });
	}

	// ============================================================================
	// Sort Methods
	// ============================================================================

	/**
	 * Sort by column (click column header button)
	 */
	async sortByColumn(column: 'name' | 'entities', withShift = false) {
		const clickOptions = withShift ? { modifiers: ['Shift'] as ('Shift' | 'Alt' | 'Control' | 'Meta')[] } : undefined;

		const headerMap = {
			name: () => this.table.locator('thead th button').filter({ hasText: 'Name' }),
			entities: () => this.table.locator('thead th button').filter({ hasText: 'Entities' })
		};

		await headerMap[column]().click(clickOptions);
		await this.delay();
	}

	// ============================================================================
	// Create Drawer Methods
	// ============================================================================

	/**
	 * Open the create namespace drawer
	 */
	async openCreateDrawer() {
		await this.addNamespaceButton.click();
		await this.drawer.waitFor({ state: 'visible', timeout: 5000 });
	}

	/**
	 * Fill the create form in the drawer
	 */
	async fillCreateForm(data: { name: string; description?: string }) {
		await this.namespaceNameInput.fill(data.name);
		await this.delay();
		if (data.description !== undefined) {
			await this.namespaceDescriptionTextarea.fill(data.description);
			await this.delay();
		}
	}

	/**
	 * Submit the create form and wait for the drawer to close.
	 */
	async submitCreate() {
		await this.createButton.click();
		await this.drawer.waitFor({ state: 'hidden', timeout: 10000 });
		await this.delay();
	}

	/**
	 * Create a new namespace (open drawer, fill, submit)
	 */
	async createNewNamespace(data: { name: string; description?: string }) {
		await this.openCreateDrawer();
		await this.fillCreateForm(data);
		await this.submitCreate();
	}

	/**
	 * Check if create button is enabled
	 */
	async isCreateEnabled(): Promise<boolean> {
		return await this.createButton.isEnabled();
	}

	/**
	 * Cancel create and close drawer
	 */
	async cancelCreate() {
		await this.drawerCloseButton.click();
		await this.drawer.waitFor({ state: 'hidden', timeout: 5000 });
	}

	// ============================================================================
	// Edit Drawer Methods
	// ============================================================================

	/**
	 * Get namespace name from edit drawer
	 */
	async getNamespaceName(): Promise<string> {
		return await this.namespaceNameInput.inputValue();
	}

	/**
	 * Get namespace description from edit drawer
	 */
	async getNamespaceDescription(): Promise<string> {
		return await this.namespaceDescriptionTextarea.inputValue();
	}

	/**
	 * Set namespace name in edit drawer
	 */
	async setNamespaceName(name: string) {
		await this.namespaceNameInput.fill(name);
		await this.delay();
	}

	/**
	 * Set namespace description in edit drawer
	 */
	async setNamespaceDescription(description: string) {
		await this.namespaceDescriptionTextarea.fill(description);
		await this.delay();
	}

	/**
	 * Check if save button is enabled
	 */
	async isSaveEnabled(): Promise<boolean> {
		return await this.saveButton.isEnabled();
	}

	/**
	 * Save changes and wait for drawer to close
	 */
	async save() {
		await this.saveButton.click();
		await this.drawer.waitFor({ state: 'hidden', timeout: 10000 });
	}

	/**
	 * Check if undo button is enabled
	 */
	async isUndoEnabled(): Promise<boolean> {
		return await this.undoButton.isEnabled();
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
	 * Confirm delete and wait for drawer to close
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
	 * Check if delete button is enabled
	 */
	async isDeleteEnabled(): Promise<boolean> {
		return await this.deleteButton.isEnabled();
	}

	// ============================================================================
	// Default Checkbox Methods
	// ============================================================================

	/**
	 * Check if the "Set as default" checkbox is visible
	 */
	async isDefaultCheckboxVisible(): Promise<boolean> {
		return await this.defaultCheckbox.isVisible();
	}

	/**
	 * Check if the "Set as default" checkbox is checked
	 */
	async isDefaultChecked(): Promise<boolean> {
		return await this.defaultCheckbox.isChecked();
	}

	/**
	 * Toggle the "Set as default" checkbox
	 */
	async toggleDefault() {
		await this.defaultCheckbox.check();
		await this.delay();
	}
}
