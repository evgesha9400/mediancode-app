/**
 * Test ID Utilities
 *
 * Shared functions for generating consistent test IDs across components and tests.
 * This ensures that E2E selectors and component test IDs never drift.
 */

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
