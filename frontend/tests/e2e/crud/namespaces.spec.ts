/**
 * Namespaces CRUD Lifecycle Test
 *
 * Single continuous flow following E2E_TESTING_GUIDE.md:
 * Clean slate → Create 3 namespaces → Search → Filter → Read → Update → Delete all → Empty
 *
 * Uses authenticatedTest for Clerk auth and E2EApiClient for cleanup.
 *
 * Adaptations for system namespaces:
 * - The "Global" namespace is a system namespace and cannot be deleted.
 * - The "User-created only" filter is applied once at the start and kept active
 *   throughout the test so row counts reflect only test-created data.
 * - The filter step toggles this filter off/on to verify it works.
 *
 * Sort testing is skipped:
 * The 2 sortable columns are Name (always unique) and Entities (always 0 for
 * newly created namespaces). Multi-sort by Entities-then-Name produces the same
 * order as Name-alone. Creating entities to break ties would violate cross-entity
 * isolation. See E2E_TESTING_GUIDE.md "Sort Testing Exceptions".
 *
 * @tags app-crud
 */

import { authenticatedTest as test, expect } from '../fixtures';
import { NamespacesPage } from '../../page-objects';
import { E2EApiClient } from '../../helpers';

// --- Test data: 3 namespaces with domain-relevant names ---

const NS_PAYMENTS = {
	name: 'e2e_payments',
	description: 'Payment processing and billing entities'
};

const NS_NOTIFICATIONS = {
	name: 'e2e_notifications',
	description: 'Email, SMS, and push notification entities'
};

const NS_ANALYTICS = {
	name: 'e2e_analytics',
	description: 'Analytics events and reporting entities'
};

// Updated value for the update step
const UPDATED_DESCRIPTION = 'Payment processing, billing, and subscription management entities';

test('Namespace lifecycle: create, search, filter, update, delete', async ({ page }) => {
	// --- Clean slate ---
	const api = await E2EApiClient.fromPage(page);
	await api.deleteAllNamespaces();

	const namespaces = new NamespacesPage(page);
	await namespaces.goto();

	// Apply "User-created only" filter to isolate test data from system namespaces (Global)
	await namespaces.openFilters();
	await namespaces.toggleFilterSwitch('User-created only');
	await namespaces.closeFilters();

	// --- Verify empty state ---
	expect(await namespaces.getRowCount()).toBe(0);

	// --- Create 3 namespaces ---
	await namespaces.createNewNamespace(NS_PAYMENTS);
	await namespaces.createNewNamespace(NS_NOTIFICATIONS);
	await namespaces.createNewNamespace(NS_ANALYTICS);
	expect(await namespaces.getRowCount()).toBe(3);

	// --- Search: find one namespace ---
	await namespaces.search('payments');
	expect(await namespaces.getRowCount()).toBe(1);
	expect(await namespaces.hasNamespace(NS_PAYMENTS.name)).toBe(true);

	// --- Clear search: all 3 return ---
	await namespaces.clearSearch();
	expect(await namespaces.getRowCount()).toBe(3);

	// --- Filter: clear "User-created only" to show system namespaces ---
	await namespaces.openFilters();
	await namespaces.clearFilters();
	const totalCount = await namespaces.getRowCount();
	expect(totalCount).toBeGreaterThan(3);

	// --- Re-apply filter: only user-created ---
	await namespaces.openFilters();
	await namespaces.toggleFilterSwitch('User-created only');
	await namespaces.closeFilters();
	expect(await namespaces.getRowCount()).toBe(3);

	// --- Read: open payments namespace and verify values ---
	await namespaces.clickRow(NS_PAYMENTS.name);
	expect(await namespaces.isDrawerOpen()).toBe(true);
	expect(await namespaces.getNamespaceName()).toBe(NS_PAYMENTS.name);
	expect(await namespaces.getNamespaceDescription()).toBe(NS_PAYMENTS.description);
	await namespaces.closeDrawer();

	// --- Update payments namespace description ---
	await namespaces.clickRow(NS_PAYMENTS.name);
	await namespaces.setNamespaceDescription(UPDATED_DESCRIPTION);
	expect(await namespaces.isSaveEnabled()).toBe(true);
	await namespaces.save();
	expect(await namespaces.isDrawerOpen()).toBe(false);

	// --- Verify update persisted ---
	await namespaces.clickRow(NS_PAYMENTS.name);
	expect(await namespaces.getNamespaceDescription()).toBe(UPDATED_DESCRIPTION);
	await namespaces.closeDrawer();

	// --- Delete all 3 namespaces one by one ---
	await namespaces.clickRow(NS_PAYMENTS.name);
	expect(await namespaces.isDeleteEnabled()).toBe(true);
	await namespaces.clickDelete();
	await expect(namespaces.deleteConfirmButton).toBeVisible();
	await namespaces.confirmDelete();
	expect(await namespaces.getRowCount()).toBe(2);

	await namespaces.clickRow(NS_NOTIFICATIONS.name);
	await namespaces.clickDelete();
	await namespaces.confirmDelete();
	expect(await namespaces.getRowCount()).toBe(1);

	await namespaces.clickRow(NS_ANALYTICS.name);
	await namespaces.clickDelete();
	await namespaces.confirmDelete();

	// --- Verify empty state ---
	expect(await namespaces.getRowCount()).toBe(0);
});
