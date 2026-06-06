/**
 * Objects CRUD Lifecycle Test
 *
 * Single continuous flow:
 * Setup helper field -> Create object -> Add field -> Save ->
 * Verify -> Update description -> Delete -> Cleanup helper field
 *
 * Uses authenticatedTest for Clerk auth and E2EApiClient for setup/cleanup.
 * Assertions use name-based checks to tolerate parallel tests.
 *
 * @tags app-crud
 */

import { authenticatedTest as test, expect } from '../fixtures';
import { ObjectsPage, FieldsPage } from '../../page-objects';
import { E2EApiClient } from '../../helpers';

const HELPER_FIELD = {
	name: 'e2e_obj_helper_field',
	type: 'uuid',
	description: 'Helper field for object CRUD test'
};

const HELPER_FIELD_2 = {
	name: 'e2e_obj_helper_field_2',
	type: 'int',
	description: 'Second helper field for object reorder test'
};

const OBJ_A = {
	name: 'E2eAlphaObject',
	description: 'E2E test object alpha for CRUD lifecycle'
};

const UPDATED_DESCRIPTION = 'Updated alpha object description for E2E testing';

test('Object lifecycle: create, add field, update, delete', async ({ page }) => {
	// --- Clean slate: delete any leftover e2e objects and fields ---
	const apiClient = await E2EApiClient.fromPage(page);
	const { data: existingObjects } = await apiClient.listObjects();
	if (existingObjects) {
		for (const obj of existingObjects) {
			if (obj.name.startsWith('e2e_') || obj.name.startsWith('E2e')) {
				await apiClient.deleteObject(obj.id);
			}
		}
	}
	const { data: existingFields } = await apiClient.listFields();
	if (existingFields) {
		for (const field of existingFields) {
			if (field.name === HELPER_FIELD.name || field.name === HELPER_FIELD_2.name) {
				await apiClient.deleteField(field.id);
			}
		}
	}

	// --- Create helper field via UI ---
	const fields = new FieldsPage(page);
	await fields.goto();
	await fields.createNewField(HELPER_FIELD);
	expect(await fields.hasField(HELPER_FIELD.name)).toBe(true);
	await fields.createNewField(HELPER_FIELD_2);
	expect(await fields.hasField(HELPER_FIELD_2.name)).toBe(true);

	// --- Navigate to objects page ---
	const objects = new ObjectsPage(page);
	await objects.goto();

	// --- Verify test object doesn't exist ---
	await objects.search(OBJ_A.name);
	expect(await objects.hasObject(OBJ_A.name)).toBe(false);
	await objects.clearSearch();

	// --- Create object A ---
	await objects.createNewObject({
		name: OBJ_A.name,
		description: OBJ_A.description,
		fields: [HELPER_FIELD.name]
	});

	// Verify object appears in list
	expect(await objects.hasObject(OBJ_A.name)).toBe(true);

	// --- Read: open object and verify ---
	await objects.clickRow(OBJ_A.name);
	expect(await objects.isDrawerOpen()).toBe(true);
	expect(await objects.getObjectName()).toBe(OBJ_A.name);
	expect(await objects.getObjectDescription()).toBe(OBJ_A.description);

	// --- Add fields to object ---
	const initialFieldCount = await objects.getFieldCount();
	await objects.addField(HELPER_FIELD_2.name);
	const newFieldCount = await objects.getFieldCount();
	expect(newFieldCount).toBe(initialFieldCount + 1);

	// --- Reorder fields via drag-and-drop ---
	const namesBefore = await objects.getFieldNames();
	expect(namesBefore).toContain(HELPER_FIELD.name);
	expect(namesBefore).toContain(HELPER_FIELD_2.name);

	// Find the indices of our two helper fields
	const idx1 = namesBefore.indexOf(HELPER_FIELD.name);
	const idx2 = namesBefore.indexOf(HELPER_FIELD_2.name);

	// Drag second helper field to first helper field's position (swap)
	await objects.reorderField(idx2, idx1);

	const namesAfter = await objects.getFieldNames();
	// After reorder, the second field should now appear before the first
	const newIdx1 = namesAfter.indexOf(HELPER_FIELD.name);
	const newIdx2 = namesAfter.indexOf(HELPER_FIELD_2.name);
	expect(newIdx2).toBeLessThan(newIdx1);

	// --- Update description ---
	await objects.setObjectDescription(UPDATED_DESCRIPTION);
	expect(await objects.isSaveEnabled()).toBe(true);

	// --- Save changes ---
	await objects.save();
	expect(await objects.isDrawerOpen()).toBe(false);

	// --- Verify updates persisted ---
	await objects.clickRow(OBJ_A.name);
	expect(await objects.getObjectDescription()).toBe(UPDATED_DESCRIPTION);
	expect(await objects.getFieldCount()).toBeGreaterThanOrEqual(2);
	await objects.closeDrawer();

	// --- Delete object ---
	await objects.clickRow(OBJ_A.name);
	expect(await objects.isDrawerOpen()).toBe(true);
	await objects.delete();
	await expect(objects.deleteConfirmButton).toBeVisible();
	await objects.confirmDelete();

	// --- Verify object removed ---
	await objects.search(OBJ_A.name);
	expect(await objects.hasObject(OBJ_A.name)).toBe(false);
	await objects.clearSearch();

	// --- Cleanup helper fields ---
	await fields.goto();
	await fields.search(HELPER_FIELD.name);
	if (await fields.hasField(HELPER_FIELD.name)) {
		await fields.clickRow(HELPER_FIELD.name);
		await fields.clickDelete();
		await fields.confirmDelete();
	}
	await fields.clearSearch();
	await fields.search(HELPER_FIELD_2.name);
	if (await fields.hasField(HELPER_FIELD_2.name)) {
		await fields.clickRow(HELPER_FIELD_2.name);
		await fields.clickDelete();
		await fields.confirmDelete();
	}
});
