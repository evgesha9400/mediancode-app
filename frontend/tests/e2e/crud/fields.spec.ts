/**
 * Fields CRUD Lifecycle Test
 *
 * Single continuous flow following TESTING_PHILOSOPHY.md:
 * Clean slate → Create 3 fields → Search → Filter (checkbox + toggle) → Sort (single + multi) → Read → Update → Delete all → Empty
 */

import { authenticatedTest as test, expect } from '../fixtures';
import { FieldRegistryPage } from '../../page-objects';
import { E2EApiClient } from '../../helpers';

// --- Test data: 3 fields with different types, names that sort distinctly ---

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
	validators: ['ge']
};

const FIELD_C = {
	name: 'e2e_user_email',
	type: 'str',
	description: 'User email address for account notifications',
	defaultValue: 'user@example.com'
};

// Alphabetical order by name
const SORTED_ASC = [FIELD_A.name, FIELD_B.name, FIELD_C.name];
const SORTED_DESC = [...SORTED_ASC].reverse();

// Multi-column sort: type asc then name asc
// bool < int < str (alphabetical), and each type has one field so secondary sort doesn't reorder
const SORTED_BY_TYPE_THEN_NAME = [FIELD_A.name, FIELD_B.name, FIELD_C.name];

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

	// --- Create 3 fields ---
	await fields.createNewField(FIELD_A);
	await fields.createNewField(FIELD_B);
	await fields.createNewField(FIELD_C);
	expect(await fields.getRowCount()).toBe(3);

	// --- Search: find one field ---
	await fields.search('retry');
	expect(await fields.getRowCount()).toBe(1);
	expect(await fields.hasField(FIELD_B.name)).toBe(true);

	// --- Clear search: all 3 return ---
	await fields.clearSearch();
	expect(await fields.getRowCount()).toBe(3);

	// --- Filter by type "int": only retry_count ---
	await fields.openFilters();
	await fields.toggleFilterCheckbox('int');
	expect(await fields.getRowCount()).toBe(1);
	expect(await fields.hasField(FIELD_B.name)).toBe(true);

	// --- Clear filter: all 3 return ---
	await fields.clearFilters();
	expect(await fields.getRowCount()).toBe(3);

	// --- Toggle "Has validators only": only FIELD_B has validators ---
	await fields.openFilters();
	await fields.toggleFilterSwitch('Has validators only');
	expect(await fields.getRowCount()).toBe(1);
	expect(await fields.hasField(FIELD_B.name)).toBe(true);

	// --- Clear filters: all 3 return ---
	await fields.clearFilters();
	expect(await fields.getRowCount()).toBe(3);

	// --- Sort by name ascending ---
	await fields.sortByColumn('name');
	expect(await fields.getVisibleFieldNames()).toEqual(SORTED_ASC);

	// --- Sort by name descending (click again) ---
	await fields.sortByColumn('name');
	expect(await fields.getVisibleFieldNames()).toEqual(SORTED_DESC);

	// --- Multi-column sort: type asc, then shift+name asc ---
	await fields.sortByColumn('type');
	await fields.sortByColumn('name', true);
	expect(await fields.getVisibleFieldNames()).toEqual(SORTED_BY_TYPE_THEN_NAME);

	// --- Read: open field C and verify all values ---
	await fields.clickRow(FIELD_C.name);
	expect(await fields.isDrawerOpen()).toBe(true);
	expect(await fields.getFieldName()).toBe(FIELD_C.name);
	expect(await fields.getFieldType()).toBe(FIELD_C.type);
	expect(await fields.getFieldDescription()).toBe(FIELD_C.description);
	expect(await fields.getDefaultValue()).toBe(FIELD_C.defaultValue);
	await fields.closeDrawer();

	// --- Read: open field B and verify values + validator ---
	await fields.clickRow(FIELD_B.name);
	expect(await fields.isDrawerOpen()).toBe(true);
	expect(await fields.getFieldName()).toBe(FIELD_B.name);
	expect(await fields.getFieldType()).toBe(FIELD_B.type);
	expect(await fields.getValidatorCount()).toBe(1);
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
