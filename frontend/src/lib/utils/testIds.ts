/**
 * Test ID Utilities
 *
 * Shared constants and functions for generating consistent test IDs across components and tests.
 * This ensures that E2E selectors and component test IDs never drift.
 */

// Search
export const SEARCH_INPUT_ID = 'search-input';
export const SEARCH_CLEAR_ID = 'search-clear';

// Filters
export const FILTER_TOGGLE_ID = 'filter-toggle';
export const FILTER_PANEL_ID = 'filter-panel';
export function getFilterCheckboxId(section: string, value: string): string {
	return `filter-${section}-${value}`.toLowerCase().replace(/\s+/g, '-');
}

// Table
export const TABLE_ID = 'data-table';
export function getTableRowId(id: string): string {
	return `table-row-${id}`;
}
export function getSortColumnId(column: string): string {
	return `sort-${column}`;
}

// Drawer
export const DRAWER_ID = 'drawer';
export const DRAWER_SAVE_ID = 'drawer-save';
export const DRAWER_CANCEL_ID = 'drawer-cancel';
export const DRAWER_DELETE_ID = 'drawer-delete';

// Empty state
export const EMPTY_STATE_ID = 'empty-state';

// Error / retry
export const ERROR_STATE_ID = 'error-state';
export const RETRY_BUTTON_ID = 'retry-button';

/**
 * Generate a test ID for a StatCard component based on its title.
 *
 * @param title - The title of the stat card (e.g., "Total Fields", "Credits Available")
 * @returns A slugified test ID (e.g., "stat-card-total-fields", "stat-card-credits-available")
 *
 * @example
 * getStatCardTestId("Total Fields") // "stat-card-total-fields"
 * getStatCardTestId("Credits Available") // "stat-card-credits-available"
 */
export function getStatCardTestId(title: string): string {
	return `stat-card-${title.toLowerCase().replace(/\s+/g, '-')}`;
}
