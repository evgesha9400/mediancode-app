/**
 * Namespaces CRUD Lifecycle Test
 *
 * Single continuous flow following E2E_TESTING_GUIDE.md:
 * Clean slate → Create 4 namespaces → Filter (User-created only) → Search →
 * Sort (name ASC/DESC) → Read → Update → Delete all → Empty
 *
 * Uses authenticatedTest for Clerk auth and E2EApiClient for cleanup.
 *
 * Adaptations for system namespaces:
 * - System namespaces (Global, etc.) are locked and cannot be deleted.
 *   `deleteAllNamespaces()` silently skips them (backend rejects deletion).
 * - The "User-created only" filter toggle is used for empty-state assertions
 *   so system namespaces don't interfere with absolute row counts.
 * - Filter stays active during sort testing to exclude system namespaces
 *   from order verification.
 *
 * Multi-sort is skipped:
 * The 2 sortable columns are Name (always unique) and Entities (always 0 for
 * newly created namespaces). Multi-sort by Entities-then-Name produces the same
 * order as Name-alone. Creating entities to break ties would violate cross-entity
 * isolation. Single-column sort ASC/DESC on Name is fully tested.
 *
 * @tags app-crud
 */

import { authenticatedTest as test, expect } from '../fixtures';
import { NamespacesPage } from '../../page-objects';
import { E2EApiClient } from '../../helpers';

// --- Test data: 4 namespaces with names that sort distinctly ---

const NS_A = {
	name: 'e2e_alpha_ns',
	description: 'E2E test namespace alpha for CRUD lifecycle'
};

const NS_B = {
	name: 'e2e_beta_ns',
	description: 'E2E test namespace beta for CRUD lifecycle'
};

const NS_C = {
	name: 'e2e_gamma_ns',
	description: 'E2E test namespace gamma for CRUD lifecycle'
};

const NS_D = {
	name: 'e2e_delta_ns',
	description: 'E2E test namespace delta for CRUD lifecycle'
};

// Alphabetical order by name
const SORTED_ASC = [NS_A.name, NS_B.name, NS_D.name, NS_C.name];
const SORTED_DESC = [...SORTED_ASC].reverse();

// Updated value for the update step
const UPDATED_DESCRIPTION = 'Updated alpha namespace description for E2E testing';

test('Namespace lifecycle: create, filter, search, sort, update, delete', async ({ page }) => {
	// --- Step 1: Clean slate via API ---
	const api = await E2EApiClient.fromPage(page);
	await api.deleteAllNamespaces();

	const namespaces = new NamespacesPage(page);

	// --- Step 2: Navigate to namespaces page ---
	await namespaces.goto();

	// --- Step 3: Verify empty user-created state ---
	await namespaces.openFilters();
	await namespaces.toggleFilterSwitch('User-created only');
	await namespaces.closeFilters();
	expect(await namespaces.getRowCount()).toBe(0);

	// Clear filters before creation
	await namespaces.openFilters();
	await namespaces.clearFilters();

	// --- Step 4: Create 4 namespaces ---
	await namespaces.createNewNamespace(NS_A);
	await namespaces.createNewNamespace(NS_B);
	await namespaces.createNewNamespace(NS_C);
	await namespaces.createNewNamespace(NS_D);

	// --- Step 5: Filter to user-created only, verify count ---
	await namespaces.openFilters();
	await namespaces.toggleFilterSwitch('User-created only');
	await namespaces.closeFilters();
	expect(await namespaces.getRowCount()).toBe(4);

	// --- Step 6: Search for one namespace ---
	await namespaces.search('alpha');
	expect(await namespaces.getRowCount()).toBe(1);
	expect(await namespaces.hasNamespace(NS_A.name)).toBe(true);

	// --- Step 7: Clear search, all 4 return ---
	await namespaces.clearSearch();
	expect(await namespaces.getRowCount()).toBe(4);

	// --- Step 8: Verify filter works by toggling off and on ---
	await namespaces.openFilters();
	await namespaces.clearFilters();
	const totalCount = await namespaces.getRowCount();
	expect(totalCount).toBeGreaterThan(4);

	// Re-apply filter
	await namespaces.openFilters();
	await namespaces.toggleFilterSwitch('User-created only');
	await namespaces.closeFilters();
	expect(await namespaces.getRowCount()).toBe(4);

	// --- Step 9: Clear and re-apply filter for sort setup ---
	await namespaces.openFilters();
	await namespaces.clearFilters();
	expect(await namespaces.getRowCount()).toBe(totalCount);

	// Re-apply filter for sort testing (exclude system namespaces)
	await namespaces.openFilters();
	await namespaces.toggleFilterSwitch('User-created only');
	await namespaces.closeFilters();
	expect(await namespaces.getRowCount()).toBe(4);

	// --- Step 10: Sort by name ascending ---
	await namespaces.sortByColumn('name');
	expect(await namespaces.getVisibleNamespaceNames()).toEqual(SORTED_ASC);

	// --- Step 11: Sort by name descending (click again) ---
	await namespaces.sortByColumn('name');
	expect(await namespaces.getVisibleNamespaceNames()).toEqual(SORTED_DESC);

	// --- Step 12: Multi-sort — SKIPPED (see file header for rationale) ---

	// --- Step 13: Read — open namespace A and verify values ---
	await namespaces.clickRow(NS_A.name);
	expect(await namespaces.isDrawerOpen()).toBe(true);
	expect(await namespaces.getNamespaceName()).toBe(NS_A.name);
	expect(await namespaces.getNamespaceDescription()).toBe(NS_A.description);

	// --- Step 14: Close drawer ---
	await namespaces.closeDrawer();

	// --- Step 15: Update namespace A description ---
	await namespaces.clickRow(NS_A.name);
	await namespaces.setNamespaceDescription(UPDATED_DESCRIPTION);
	expect(await namespaces.isSaveEnabled()).toBe(true);
	await namespaces.save();
	expect(await namespaces.isDrawerOpen()).toBe(false);

	// --- Step 16: Verify update persisted ---
	await namespaces.clickRow(NS_A.name);
	expect(await namespaces.getNamespaceDescription()).toBe(UPDATED_DESCRIPTION);

	// --- Step 17: Close drawer ---
	await namespaces.closeDrawer();

	// --- Step 18: Delete all 4 namespaces one by one ---
	await namespaces.clickRow(NS_A.name);
	expect(await namespaces.isDeleteEnabled()).toBe(true);
	await namespaces.clickDelete();
	await expect(namespaces.deleteConfirmButton).toBeVisible();
	await namespaces.confirmDelete();
	expect(await namespaces.getRowCount()).toBe(3);

	await namespaces.clickRow(NS_B.name);
	await namespaces.clickDelete();
	await namespaces.confirmDelete();
	expect(await namespaces.getRowCount()).toBe(2);

	await namespaces.clickRow(NS_C.name);
	await namespaces.clickDelete();
	await namespaces.confirmDelete();
	expect(await namespaces.getRowCount()).toBe(1);

	await namespaces.clickRow(NS_D.name);
	await namespaces.clickDelete();
	await namespaces.confirmDelete();

	// --- Step 19: Verify empty state (filter still active, only user-created) ---
	expect(await namespaces.getRowCount()).toBe(0);
});
