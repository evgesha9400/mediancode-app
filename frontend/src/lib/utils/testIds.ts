/**
 * Test ID Utilities
 *
 * Shared constants and functions for generating consistent test IDs across components and tests.
 * This ensures that E2E selectors and component test IDs never drift.
 */

// Shared component test IDs
export const SEARCH_INPUT_ID = 'search-input';
export const FILTER_PANEL_ID = 'filter-panel';
export const TABLE_ID = 'data-table';
export const EMPTY_STATE_ID = 'empty-state';
export const DRAWER_ID = 'drawer';

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
