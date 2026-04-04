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

/**
 * HTML attribute on list `<td>` cells (via `TableList*Cell` components).
 * Value must match the `SortableColumn` `column` key for that column (E2E + sort alignment).
 */
export const TABLE_COL_ATTR = 'data-col';

/**
 * Playwright/CSS selector for a cell in a row given a column key.
 *
 * @example
 * row.locator(getTableRowCellSelector('defaultValue'))
 */
export function getTableRowCellSelector(column: string): string {
	return `td[${TABLE_COL_ATTR}="${column}"]`;
}

/**
 * Stable `data-testid` for a data row. Set on `<tr>` in entity list tables (not header).
 */
export function getTableRowId(id: string): string {
	return `table-row-${id}`;
}

export function getSortColumnId(column: string): string {
	return `sort-${column}`;
}

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
