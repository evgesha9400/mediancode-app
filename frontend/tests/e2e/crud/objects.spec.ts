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
	type: 'str',
	description: 'Helper field for object CRUD test'
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
			if (field.name === HELPER_FIELD.name) {
				await apiClient.deleteField(field.id);
			}
		}
	}

	// --- Create helper field via UI ---
	const fields = new FieldsPage(page);
	await fields.goto();
	await fields.createNewField(HELPER_FIELD);
	expect(await fields.hasField(HELPER_FIELD.name)).toBe(true);

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
		description: OBJ_A.description
	});

	// Verify object appears in list
	expect(await objects.hasObject(OBJ_A.name)).toBe(true);

	// --- Read: open object and verify ---
	await objects.clickRow(OBJ_A.name);
	expect(await objects.isDrawerOpen()).toBe(true);
	expect(await objects.getObjectName()).toBe(OBJ_A.name);
	expect(await objects.getObjectDescription()).toBe(OBJ_A.description);

	// --- Add field to object ---
	const initialFieldCount = await objects.getFieldCount();
	await objects.addField(HELPER_FIELD.name);
	const newFieldCount = await objects.getFieldCount();
	expect(newFieldCount).toBe(initialFieldCount + 1);

	// --- Update description ---
	await objects.setObjectDescription(UPDATED_DESCRIPTION);
	expect(await objects.isSaveEnabled()).toBe(true);

	// --- Save changes ---
	await objects.save();
	expect(await objects.isDrawerOpen()).toBe(false);

	// --- Verify updates persisted ---
	await objects.clickRow(OBJ_A.name);
	expect(await objects.getObjectDescription()).toBe(UPDATED_DESCRIPTION);
	expect(await objects.getFieldCount()).toBeGreaterThan(0);
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

	// --- Cleanup helper field ---
	await fields.goto();
	await fields.search(HELPER_FIELD.name);
	if (await fields.hasField(HELPER_FIELD.name)) {
		await fields.clickRow(HELPER_FIELD.name);
		await fields.clickDelete();
		await fields.confirmDelete();
	}
});
