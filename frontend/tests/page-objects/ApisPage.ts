/**
 * APIs Page Object
 *
 * Encapsulates interactions with the APIs page (/apis).
 * Handles search, view details, edit, create, and delete operations for APIs.
 */

import { type Page, type Locator, expect } from '@playwright/test';

export class ApisPage {
	readonly page: Page;

	// Header
	readonly pageTitle: Locator;

	// Actions
	readonly newApiButton: Locator;

	// Search
	readonly searchInput: Locator;
	readonly resultsCount: Locator;

	// Namespace selector
	readonly namespaceSelector: Locator;

	// Table
	readonly table: Locator;
	readonly tableRows: Locator;
	readonly emptyState: Locator;

	// Sortable columns
	readonly nameColumnHeader: Locator;
	readonly versionColumnHeader: Locator;
	readonly baseUrlColumnHeader: Locator;
	readonly endpointsColumnHeader: Locator;
	readonly tagsColumnHeader: Locator;
	readonly namespaceColumnHeader: Locator;

	// Drawer (view/delete details)
	readonly drawer: Locator;
	readonly drawerCloseButton: Locator;
	readonly drawerTitle: Locator;

	// Drawer actions
	readonly editApiButton: Locator;
	readonly deleteApiButton: Locator;
	readonly deleteConfirmButton: Locator;
	readonly deleteCancelButton: Locator;

	constructor(page: Page) {
		this.page = page;

		// Header
		this.pageTitle = page.getByRole('heading', { name: 'APIs', level: 1 });

		// Actions
		this.newApiButton = page.getByRole('button', { name: /New API/i });

		// Search
		this.searchInput = page.getByPlaceholder('Search APIs...');
		this.resultsCount = page.locator('text=/\\d+ API/');

		// Namespace selector
		this.namespaceSelector = page.locator('[data-namespace-selector]');

		// Table
		this.table = page.locator('table');
		this.tableRows = page.locator('tbody tr');
		this.emptyState = page.locator('text=No APIs found');

		// Sortable columns - scoped to table
		this.nameColumnHeader = this.table.locator('thead th').filter({ hasText: 'Name' });
		this.versionColumnHeader = this.table.locator('thead th').filter({ hasText: 'Version' });
		this.baseUrlColumnHeader = this.table.locator('thead th').filter({ hasText: 'Base URL' });
		this.endpointsColumnHeader = this.table.locator('thead th').filter({ hasText: 'Endpoints' });
		this.tagsColumnHeader = this.table.locator('thead th').filter({ hasText: 'Tags' });
		this.namespaceColumnHeader = this.table.locator('thead th').filter({ hasText: 'Namespace' });

		// Drawer
		this.drawer = page
			.locator('[class*="fixed"][class*="right-0"]')
			.filter({ has: page.locator('text=API Details') });
		this.drawerCloseButton = page.locator('button[aria-label="Close drawer"]');
		this.drawerTitle = page.locator('text=API Details');

		// Drawer actions
		this.editApiButton = page.getByRole('button', { name: 'Edit API' });
		this.deleteApiButton = page.getByRole('button').filter({ has: page.locator('span', { hasText: 'Delete' }) });
		this.deleteConfirmButton = page.getByRole('button', { name: 'Yes, Delete' });
		this.deleteCancelButton = page.getByRole('button', { name: 'Cancel' });
	}

	/**
	 * Navigate to the APIs page
	 */
	async goto() {
		await this.page.goto('/apis', { waitUntil: 'networkidle' });
		await this.pageTitle.waitFor({ state: 'visible' });
	}

	/**
	 * Search for APIs
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
	 * Click on a row by API title
	 * Note: Clicking a row navigates to the edit page, not opens a drawer
	 */
	async clickRow(apiTitle: string) {
		const row = this.tableRows.filter({ hasText: apiTitle });
		await row.click();
		await this.page.waitForTimeout(300);
	}

	/**
	 * Get all API titles visible in the table
	 */
	async getVisibleApiTitles(): Promise<string[]> {
		const titles: string[] = [];
		const count = await this.tableRows.count();
		for (let i = 0; i < count; i++) {
			const row = this.tableRows.nth(i);
			const titleCell = row.locator('td').first();
			const titleDiv = titleCell.locator('.text-mono-900.font-medium');
			const title = await titleDiv.textContent();
			if (title) titles.push(title.trim());
		}
		return titles;
	}

	/**
	 * Get all versions visible in the table
	 */
	async getVisibleVersions(): Promise<string[]> {
		const versions: string[] = [];
		const count = await this.tableRows.count();
		for (let i = 0; i < count; i++) {
			const row = this.tableRows.nth(i);
			const versionSpan = row.locator('td').nth(1).locator('span');
			const version = await versionSpan.textContent();
			if (version) versions.push(version.trim());
		}
		return versions;
	}

	/**
	 * Get all base URLs visible in the table
	 */
	async getVisibleBaseUrls(): Promise<string[]> {
		const urls: string[] = [];
		const count = await this.tableRows.count();
		for (let i = 0; i < count; i++) {
			const row = this.tableRows.nth(i);
			const urlCode = row.locator('td').nth(2).locator('code');
			const url = await urlCode.textContent();
			if (url) urls.push(url.trim());
		}
		return urls;
	}

	/**
	 * Get all endpoint counts visible in the table
	 */
	async getVisibleEndpointCounts(): Promise<number[]> {
		const counts: number[] = [];
		const count = await this.tableRows.count();
		for (let i = 0; i < count; i++) {
			const row = this.tableRows.nth(i);
			const countSpan = row.locator('td').nth(3).locator('span').first();
			const text = await countSpan.textContent();
			counts.push(parseInt(text?.trim() ?? '0', 10));
		}
		return counts;
	}

	/**
	 * Check if an API exists in the table
	 */
	async hasApi(apiTitle: string): Promise<boolean> {
		const titles = await this.getVisibleApiTitles();
		return titles.includes(apiTitle);
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
		await this.page.waitForTimeout(500);
	}

	/**
	 * Click the New API button
	 * This navigates to the API creation page
	 */
	async clickNewApi() {
		await this.newApiButton.click();
		// Wait for navigation to complete
		await this.page.waitForURL(/\/apis\/new/);
	}

	/**
	 * Click edit button in drawer (navigates to edit page)
	 */
	async clickEditApi() {
		await this.editApiButton.click();
		// Wait for navigation
		await this.page.waitForURL(/\/apis\/[^/]+$/);
	}

	/**
	 * Click delete button in drawer
	 */
	async clickDelete() {
		await this.deleteApiButton.click();
	}

	/**
	 * Confirm delete
	 */
	async confirmDelete() {
		await this.deleteConfirmButton.click();
		await this.page.waitForTimeout(500);
	}

	/**
	 * Cancel delete
	 */
	async cancelDelete() {
		await this.deleteCancelButton.click();
	}

	/**
	 * Sort by column
	 */
	async sortByColumn(
		column: 'name' | 'version' | 'baseUrl' | 'endpoints' | 'tags' | 'namespace',
		withShift = false
	) {
		const clickOptions = withShift
			? { modifiers: ['Shift'] as ('Shift' | 'Alt' | 'Control' | 'Meta')[] }
			: undefined;

		const headerMap = {
			name: () => this.table.locator('thead th button').filter({ hasText: 'Name' }),
			version: () => this.table.locator('thead th button').filter({ hasText: 'Version' }),
			baseUrl: () => this.table.locator('thead th button').filter({ hasText: 'Base URL' }),
			endpoints: () => this.table.locator('thead th button').filter({ hasText: 'Endpoints' }),
			tags: () => this.table.locator('thead th button').filter({ hasText: 'Tags' }),
			namespace: () => this.table.locator('thead th button').filter({ hasText: 'Namespace' })
		};

		await headerMap[column]().click(clickOptions);
		await this.page.waitForTimeout(300);
	}

	/**
	 * Delete an API by title
	 * Opens the row, opens drawer, and deletes
	 */
	async deleteApi(apiTitle: string) {
		await this.clickRow(apiTitle);

		// If drawer opens (depends on current implementation)
		if (await this.isDrawerOpen()) {
			await this.clickDelete();
			await this.confirmDelete();
		}
		// Otherwise the row click navigated to edit page
	}
}
