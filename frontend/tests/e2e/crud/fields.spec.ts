/**
 * Fields CRUD Lifecycle Test
 *
 * Single continuous flow following E2E_TESTING_GUIDE.md:
 * Clean slate → Create 4 fields → Search → Filter (checkbox + toggle) → Sort (single + multi) → Read → Update → Delete all → Empty
 */

import { authenticatedTest as test, expect } from '../fixtures';
import { FieldRegistryPage } from '../../page-objects';
import { E2EApiClient } from '../../helpers';

// --- Test data: 4 fields with different types, names that sort distinctly ---
// FIELD_C and FIELD_D share type 'str' so multi-sort has ties to break.

const FIELD_A = {
	name: 'e2e_is_active',
	type: 'bool',
	description: 'Whether the user account is currently active',
	defaultValue: 'true'
};

const FIELD_B = {
	name: 'e2e_retry_count',
	type: 'int',
	description: 'Number of retry attempts for failed operations',
	defaultValue: '3',
	constraints: ['ge']
};

const FIELD_C = {
	name: 'e2e_user_email',
	type: 'str',
	description: 'User email address for account notifications',
	defaultValue: 'user@example.com'
};

const FIELD_D = {
	name: 'e2e_api_key',
	type: 'str',
	description: 'API key for external service authentication',
	defaultValue: 'sk-test-123'
};

// Alphabetical order by name
const SORTED_ASC = [FIELD_D.name, FIELD_A.name, FIELD_B.name, FIELD_C.name];
const SORTED_DESC = [...SORTED_ASC].reverse();

// Multi-column sort: type asc then name asc
// bool(1) < int(1) < str(2) — the two str fields (FIELD_D, FIELD_C) form a tie
// that the secondary sort on name must resolve: e2e_api_key < e2e_user_email
const SORTED_BY_TYPE_THEN_NAME = [FIELD_A.name, FIELD_B.name, FIELD_D.name, FIELD_C.name];

// Updated values for the update step
const UPDATED_DESCRIPTION = 'Primary contact email for all account communications';
const UPDATED_DEFAULT = 'contact@example.com';

test('Field lifecycle: create, search, filter, sort, update, delete', async ({ page }) => {
	// --- Clean slate ---
	const api = await E2EApiClient.fromPage(page);
	await api.deleteAllFields();

	const fields = new FieldRegistryPage(page);
	await fields.goto();

	// --- Verify empty state ---
	expect(await fields.getRowCount()).toBe(0);

	// --- Create 4 fields (C and D share type 'str' for multi-sort testing) ---
	await fields.createNewField(FIELD_A);
	await fields.createNewField(FIELD_B);
	await fields.createNewField(FIELD_C);
	await fields.createNewField(FIELD_D);
	expect(await fields.getRowCount()).toBe(4);

	// --- Search: find one field ---
	await fields.search('retry');
	expect(await fields.getRowCount()).toBe(1);
	expect(await fields.hasField(FIELD_B.name)).toBe(true);

	// --- Clear search: all 4 return ---
	await fields.clearSearch();
	expect(await fields.getRowCount()).toBe(4);

	// --- Filter by type "int": only retry_count ---
	await fields.openFilters();
	await fields.toggleFilterCheckbox('int');
	expect(await fields.getRowCount()).toBe(1);
	expect(await fields.hasField(FIELD_B.name)).toBe(true);

	// --- Clear filter: all 4 return ---
	await fields.clearFilters();
	expect(await fields.getRowCount()).toBe(4);

	// --- Toggle "Has constraints only": only FIELD_B has constraints ---
	await fields.openFilters();
	await fields.toggleFilterSwitch('Has constraints only');
	expect(await fields.getRowCount()).toBe(1);
	expect(await fields.hasField(FIELD_B.name)).toBe(true);

	// --- Clear filters: all 4 return ---
	await fields.clearFilters();
	expect(await fields.getRowCount()).toBe(4);

	// --- Sort by name ascending ---
	await fields.sortByColumn('name');
	expect(await fields.getVisibleFieldNames()).toEqual(SORTED_ASC);

	// --- Sort by name descending (click again) ---
	await fields.sortByColumn('name');
	expect(await fields.getVisibleFieldNames()).toEqual(SORTED_DESC);

	// --- Multi-column sort: type asc, then shift+name asc ---
	// This order differs from both SORTED_ASC and SORTED_DESC, proving the secondary sort
	// resolves the tie between the two 'str' fields (FIELD_D before FIELD_C by name).
	await fields.sortByColumn('type');
	await fields.sortByColumn('name', true);
	expect(await fields.getVisibleFieldNames()).toEqual(SORTED_BY_TYPE_THEN_NAME);
	expect(SORTED_BY_TYPE_THEN_NAME).not.toEqual(SORTED_ASC);

	// --- Read: open field C and verify all values ---
	await fields.clickRow(FIELD_C.name);
	expect(await fields.isDrawerOpen()).toBe(true);
	expect(await fields.getFieldName()).toBe(FIELD_C.name);
	expect(await fields.getFieldType()).toBe(FIELD_C.type);
	expect(await fields.getFieldDescription()).toBe(FIELD_C.description);
	expect(await fields.getDefaultValue()).toBe(FIELD_C.defaultValue);
	await fields.closeDrawer();

	// --- Read: open field B and verify values + constraint ---
	await fields.clickRow(FIELD_B.name);
	expect(await fields.isDrawerOpen()).toBe(true);
	expect(await fields.getFieldName()).toBe(FIELD_B.name);
	expect(await fields.getFieldType()).toBe(FIELD_B.type);
	expect(await fields.getConstraintCount()).toBe(1);
	await fields.closeDrawer();

	// --- Update field C ---
	await fields.clickRow(FIELD_C.name);
	await fields.setFieldDescription(UPDATED_DESCRIPTION);
	await fields.setDefaultValue(UPDATED_DEFAULT);
	expect(await fields.isSaveEnabled()).toBe(true);
	await fields.save();
	expect(await fields.isDrawerOpen()).toBe(false);

	// --- Verify update persisted ---
	await fields.clickRow(FIELD_C.name);
	expect(await fields.getFieldDescription()).toBe(UPDATED_DESCRIPTION);
	expect(await fields.getDefaultValue()).toBe(UPDATED_DEFAULT);
	await fields.closeDrawer();

	// --- Delete all fields one by one ---
	await fields.clickRow(FIELD_C.name);
	expect(await fields.isDeleteEnabled()).toBe(true);
	await fields.clickDelete();
	await expect(fields.deleteConfirmButton).toBeVisible();
	await fields.confirmDelete();
	expect(await fields.getRowCount()).toBe(3);

	await fields.clickRow(FIELD_D.name);
	await fields.clickDelete();
	await fields.confirmDelete();
	expect(await fields.getRowCount()).toBe(2);

	await fields.clickRow(FIELD_B.name);
	await fields.clickDelete();
	await fields.confirmDelete();
	expect(await fields.getRowCount()).toBe(1);

	await fields.clickRow(FIELD_A.name);
	await fields.clickDelete();
	await fields.confirmDelete();

	// --- Verify empty state ---
	expect(await fields.getRowCount()).toBe(0);
});
