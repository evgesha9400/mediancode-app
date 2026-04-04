/**
 * APIs Page Object
 *
 * Encapsulates interactions with the APIs page (/apis).
 * Handles search, create (via drawer), and navigation to detail page.
 */

import { type Page, type Locator, expect } from '@playwright/test';
import { getTableRowCellSelector } from '$lib/utils/testIds';
import { ACTION_DELAY_MS } from '../helpers/e2e-delays';

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

	// Create drawer
	readonly createDrawer: Locator;
	readonly apiTitleInput: Locator;
	readonly apiVersionInput: Locator;
	readonly apiDescriptionInput: Locator;
	readonly apiServerUrlInput: Locator;
	readonly apiBaseUrlInput: Locator;
	readonly createButton: Locator;

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

		// Create drawer
		this.createDrawer = page
			.locator('[class*="fixed"][class*="right-0"]')
			.filter({ has: page.locator('text=Create API') });
		this.apiTitleInput = page.locator('#api-title');
		this.apiVersionInput = page.locator('#api-version');
		this.apiDescriptionInput = page.locator('#api-description');
		this.apiServerUrlInput = page.locator('#api-server-url');
		this.apiBaseUrlInput = page.locator('#api-base-url');
		this.createButton = page.getByRole('button', { name: 'Create' });
	}

	private async delay() {
		await this.page.waitForTimeout(ACTION_DELAY_MS);
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
	 * Click on a row by API title (navigates to detail page)
	 */
	async clickRow(apiTitle: string) {
		const row = this.tableRows.filter({ hasText: apiTitle });
		await row.click();
		await this.page.waitForURL(/\/apis\/[^/]+$/);
	}

	/**
	 * Get all API titles visible in the table
	 */
	async getVisibleApiTitles(): Promise<string[]> {
		const titles: string[] = [];
		const count = await this.tableRows.count();
		for (let i = 0; i < count; i++) {
			const row = this.tableRows.nth(i);
			const titleCell = row.locator(getTableRowCellSelector('title'));
			const titleDiv = titleCell.locator('div').first();
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
			const versionSpan = row.locator(getTableRowCellSelector('version')).locator('span');
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
			const urlCode = row.locator(getTableRowCellSelector('baseUrl')).locator('code');
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
			const countSpan = row.locator(getTableRowCellSelector('endpoints')).locator('span').first();
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
	 * Click the New API button (opens create drawer)
	 */
	async clickNewApi() {
		await this.newApiButton.click();
		await this.createDrawer.waitFor({ state: 'visible' });
	}

	/**
	 * Fill the create API form
	 */
	async fillCreateForm(data: {
		title: string;
		version?: string;
		description?: string;
		serverUrl?: string;
		baseUrl?: string;
	}) {
		await this.apiTitleInput.fill(data.title);
		if (data.version !== undefined) await this.apiVersionInput.fill(data.version);
		if (data.description !== undefined) await this.apiDescriptionInput.fill(data.description);
		if (data.serverUrl !== undefined) await this.apiServerUrlInput.fill(data.serverUrl);
		if (data.baseUrl !== undefined) await this.apiBaseUrlInput.fill(data.baseUrl);
	}

	/**
	 * Submit the create form (clicks Create, waits for navigation to detail page)
	 */
	async submitCreate() {
		await this.createButton.click();
		await this.page.waitForURL(/\/apis\/[^/]+$/);
	}

	/**
	 * Close the create drawer
	 */
	async closeCreateDrawer() {
		const closeButton = this.page.locator('button[aria-label="Close drawer"]');
		await closeButton.click();
		await this.createDrawer.waitFor({ state: 'hidden' });
	}

	/**
	 * Sort by column
	 */
	async sortByColumn(
		column: 'name' | 'version' | 'baseUrl' | 'endpoints',
		withShift = false
	) {
		const clickOptions = withShift
			? { modifiers: ['Shift'] as ('Shift' | 'Alt' | 'Control' | 'Meta')[] }
			: undefined;

		const headerMap = {
			name: () => this.table.locator('thead th button').filter({ hasText: 'Name' }),
			version: () => this.table.locator('thead th button').filter({ hasText: 'Version' }),
			baseUrl: () => this.table.locator('thead th button').filter({ hasText: 'Base URL' }),
			endpoints: () => this.table.locator('thead th button').filter({ hasText: 'Endpoints' })
		};

		await headerMap[column]().click(clickOptions);
		await this.delay();
	}
}
