/**
 * Namespaces CRUD Lifecycle Test
 *
 * Single continuous flow:
 * Create namespace via modal -> Verify in list -> Search ->
 * Edit via drawer -> Verify update -> Delete -> Verify removed
 *
 * Uses authenticatedTest for Clerk auth and E2EApiClient for cleanup.
 * Note: System namespaces (global, user) are locked and cannot be deleted,
 * so this test creates and manages only user-created namespaces.
 *
 * @tags app-crud
 */

import { authenticatedTest as test, expect } from '../fixtures';
import { NamespacesPage } from '../../page-objects';
import { E2EApiClient } from '../../helpers';

const NS_A = {
	name: 'e2e_alpha_ns',
	description: 'E2E test namespace alpha for CRUD lifecycle'
};

const NS_B = {
	name: 'e2e_beta_ns',
	description: 'E2E test namespace beta for CRUD lifecycle'
};

const UPDATED_DESCRIPTION = 'Updated alpha namespace description for E2E testing';

test('Namespace lifecycle: create, search, edit, delete', async ({ page }) => {
	// --- Clean slate: delete any leftover e2e namespaces via API ---
	const apiClient = await E2EApiClient.fromPage(page);
	const { data: existingNamespaces } = await apiClient.listNamespaces();
	if (existingNamespaces) {
		for (const ns of existingNamespaces) {
			if (ns.name.startsWith('e2e_')) {
				await apiClient.deleteNamespace(ns.id);
			}
		}
	}

	const namespaces = new NamespacesPage(page);
	await namespaces.goto();

	// System namespaces (at least Global) should already exist
	const initialCount = await namespaces.getRowCount();
	expect(initialCount).toBeGreaterThanOrEqual(1);

	// --- Create namespace A via modal ---
	await namespaces.createNewNamespace(NS_A);

	// Verify namespace A appears in list
	expect(await namespaces.hasNamespace(NS_A.name)).toBe(true);
	expect(await namespaces.getRowCount()).toBe(initialCount + 1);

	// --- Create namespace B via modal ---
	await namespaces.createNewNamespace(NS_B);

	expect(await namespaces.hasNamespace(NS_B.name)).toBe(true);
	expect(await namespaces.getRowCount()).toBe(initialCount + 2);

	// --- Search for namespace A ---
	await namespaces.search('alpha');
	expect(await namespaces.getRowCount()).toBe(1);
	expect(await namespaces.hasNamespace(NS_A.name)).toBe(true);

	// --- Clear search ---
	await namespaces.clearSearch();
	expect(await namespaces.getRowCount()).toBe(initialCount + 2);

	// --- Read: open namespace A and verify ---
	await namespaces.clickRow(NS_A.name);
	expect(await namespaces.isDrawerOpen()).toBe(true);
	expect(await namespaces.getNamespaceName()).toBe(NS_A.name);
	expect(await namespaces.getNamespaceDescription()).toBe(NS_A.description);
	await namespaces.closeDrawer();

	// --- Update namespace A description ---
	await namespaces.clickRow(NS_A.name);
	await namespaces.setNamespaceDescription(UPDATED_DESCRIPTION);
	expect(await namespaces.isSaveEnabled()).toBe(true);
	await namespaces.save();
	expect(await namespaces.isDrawerOpen()).toBe(false);

	// --- Verify update persisted ---
	await namespaces.clickRow(NS_A.name);
	expect(await namespaces.getNamespaceDescription()).toBe(UPDATED_DESCRIPTION);
	await namespaces.closeDrawer();

	// --- Delete namespace A ---
	await namespaces.clickRow(NS_A.name);
	expect(await namespaces.isDeleteEnabled()).toBe(true);
	await namespaces.clickDelete();
	await expect(namespaces.deleteConfirmButton).toBeVisible();
	await namespaces.confirmDelete();
	expect(await namespaces.getRowCount()).toBe(initialCount + 1);

	// --- Delete namespace B ---
	await namespaces.clickRow(NS_B.name);
	await namespaces.clickDelete();
	await namespaces.confirmDelete();
	expect(await namespaces.getRowCount()).toBe(initialCount);

	// --- Verify e2e namespaces are removed ---
	await namespaces.search('e2e_');
	expect(await namespaces.getRowCount()).toBe(0);
	await namespaces.clearSearch();
});
