/**
 * Namespaces Page Object
 *
 * Encapsulates interactions with the namespaces page (/namespaces).
 * Handles search, create (via modal), edit (via drawer), and delete.
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

	// Table
	readonly table: Locator;
	readonly tableRows: Locator;
	readonly emptyState: Locator;

	// Sortable columns
	readonly nameColumnHeader: Locator;
	readonly entitiesColumnHeader: Locator;

	// Create modal
	readonly createModal: Locator;
	readonly newNamespaceNameInput: Locator;
	readonly newNamespaceDescriptionInput: Locator;
	readonly createButton: Locator;
	readonly closeModalButton: Locator;

	// Edit drawer
	readonly drawer: Locator;
	readonly drawerCloseButton: Locator;
	readonly namespaceNameInput: Locator;
	readonly namespaceDescriptionTextarea: Locator;

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

		// Table
		this.table = page.locator('table');
		this.tableRows = page.locator('tbody tr');
		this.emptyState = page.locator('text=No namespaces found');

		// Sortable columns
		this.nameColumnHeader = this.table.locator('thead th').filter({ hasText: 'Name' });
		this.entitiesColumnHeader = this.table.locator('thead th').filter({ hasText: 'Entities' });

		// Create modal
		this.createModal = page.locator('.fixed.inset-0').filter({ has: page.locator('text=Create Namespace') });
		this.newNamespaceNameInput = page.locator('#new-namespace-name');
		this.newNamespaceDescriptionInput = page.locator('#new-namespace-description');
		this.createButton = this.createModal.getByRole('button', { name: 'Create' });
		this.closeModalButton = page.locator('button[title="Close modal"]');

		// Edit drawer
		this.drawer = page.locator('[class*="fixed"][class*="right-0"]').filter({
			has: page.locator('text=/Edit Namespace|View Namespace/')
		});
		this.drawerCloseButton = page.locator('button[aria-label="Close drawer"]');
		this.namespaceNameInput = page.locator('#namespace-name');
		this.namespaceDescriptionTextarea = page.locator('#namespace-description');

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
	 * Click on a row by namespace name (opens edit drawer)
	 */
	async clickRow(namespaceName: string) {
		const row = this.tableRows.filter({ hasText: namespaceName });
		await row.click();
		await this.drawer.waitFor({ state: 'visible' });
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
	// Create Modal Methods
	// ============================================================================

	/**
	 * Open the create namespace modal
	 */
	async openCreateModal() {
		await this.addNamespaceButton.click();
		await this.createModal.waitFor({ state: 'visible' });
	}

	/**
	 * Fill the create form
	 */
	async fillCreateForm(data: { name: string; description?: string }) {
		await this.newNamespaceNameInput.fill(data.name);
		if (data.description !== undefined) {
			await this.newNamespaceDescriptionInput.fill(data.description);
		}
	}

	/**
	 * Submit the create form
	 */
	async submitCreate() {
		await this.createButton.click();
		await this.createModal.waitFor({ state: 'hidden', timeout: 10000 });
	}

	/**
	 * Create a new namespace (open modal, fill, submit)
	 */
	async createNewNamespace(data: { name: string; description?: string }) {
		await this.openCreateModal();
		await this.fillCreateForm(data);
		await this.submitCreate();
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
	}

	/**
	 * Set namespace description in edit drawer
	 */
	async setNamespaceDescription(description: string) {
		await this.namespaceDescriptionTextarea.fill(description);
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
	 * Click delete button
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
	 * Check if delete button is enabled
	 */
	async isDeleteEnabled(): Promise<boolean> {
		return await this.deleteButton.isEnabled();
	}
}
