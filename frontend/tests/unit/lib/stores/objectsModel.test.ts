// tests/unit/lib/stores/objectsModel.test.ts
//
// Unit tests for the Objects per-entity CRUD model.
// Tests entity-specific logic: validation, draft creation, payload mapping,
// deletion guard, and CRUD action flows (save, create, delete).

import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import type { Field, FieldMember, ObjectDefinition } from '$lib/types';

// ---------------------------------------------------------------------------
// Mocks -- must be declared before imports that use them
// ---------------------------------------------------------------------------

vi.mock('$app/environment', () => ({ browser: false }));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
vi.mock('$app/state', () => ({
	page: {
		url: new URL('http://localhost/objects'),
		params: {},
		route: { id: '/objects' },
		status: 200,
		error: null,
		data: {},
		form: null,
		state: {}
	}
}));

// Mock API transport
vi.mock('$lib/api/objects', () => ({
	createObjectApi: vi.fn(),
	updateObjectApi: vi.fn(),
	deleteObjectApi: vi.fn()
}));

// Mock error mapping
vi.mock('$lib/domain/errorMap', () => ({
	mapApiError: vi.fn((_err: unknown, context: string) => `Failed to ${context}`)
}));

// Mock toast notifications
vi.mock('$lib/stores/toasts', () => ({
	showToast: vi.fn()
}));

// Mock references utility
vi.mock('$lib/utils/references', () => ({
	buildDeletionTooltip: vi.fn(
		(entityType: string, refType: string, refs: Array<{ name: string }>) =>
			`Cannot delete: Used in ${refs.length} ${refType}${refs.length > 1 ? 's' : ''}`
	),
	checkObjectDeletion: vi.fn(() => ({ success: true }))
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { createCrudModel, type CrudModelState } from '$lib/stores/crudModel.svelte';
import { createObjectsContract } from '$lib/stores/objectsConfig.svelte';
import { createObjectApi, updateObjectApi, deleteObjectApi } from '$lib/api/objects';
import { mapApiError } from '$lib/domain/errorMap';
import { showToast } from '$lib/stores/toasts';
import { page } from '$app/state';
import { goto } from '$app/navigation';
import { effect_root } from 'svelte/internal/client';
import { flushSync } from 'svelte';
import { fieldsStore, objectsStore } from '$lib/stores/stores';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ID_FIELD: Field = {
	id: 'field-id',
	namespaceId: 'ns-1',
	name: 'id',
	type: 'uuid',
	container: null,
	constraints: [],
	validators: [],
	usedInApis: []
};

const NAME_FIELD: Field = {
	id: 'field-name',
	namespaceId: 'ns-1',
	name: 'name',
	type: 'str',
	container: null,
	constraints: [],
	validators: [],
	usedInApis: []
};

function primaryMember(overrides: Partial<FieldMember> = {}): FieldMember {
	return {
		memberType: 'field',
		id: 'member-id',
		name: 'id',
		fieldId: ID_FIELD.id,
		role: 'pk',
		isNullable: false,
		...overrides
	};
}

function makeObject(overrides: Partial<ObjectDefinition> & { id: string; name: string }): ObjectDefinition {
	return {
		namespaceId: 'ns-1',
		description: '',
		members: [primaryMember()],
		derivedRelationships: [],
		validators: [],
		usedInApis: [],
		...overrides
	};
}

beforeEach(() => {
	fieldsStore.set([ID_FIELD, NAME_FIELD]);
	objectsStore.set([]);
});

function createTestModel(
	overrides: {
		itemsStore?: () => ObjectDefinition[];
		getActiveNamespaceId?: () => string;
		afterCreate?: (object: ObjectDefinition) => void;
	} = {}
): {
	model: CrudModelState<ObjectDefinition>;
	cleanup: () => void;
} {
	let model!: CrudModelState<ObjectDefinition>;

	const cleanup = effect_root(() => {
		const contract = createObjectsContract({
			getActiveNamespaceId: overrides.getActiveNamespaceId ?? (() => 'ns-1'),
			afterCreate: overrides.afterCreate
		});
		model = createCrudModel(contract, {
			itemsStore: overrides.itemsStore ?? (() => []),
			searchFn: (items, query) => {
				if (!query) return items;
				return items.filter((i) => i.name.toLowerCase().includes(query.toLowerCase()));
			},
			filterSections: () => [],
			urlScope: { page: page as any, goto: goto as any }
		});
	});

	return { model, cleanup };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('objectsModel - Initial State', () => {
	let model: CrudModelState<ObjectDefinition>;
	let cleanup: () => void;

	afterEach(() => cleanup?.());

	it('should start with default values', () => {
		({ model, cleanup } = createTestModel());

		expect(model.isSaving).toBe(false);
		expect(model.isDeleting).toBe(false);
		expect(model.isFormValid).toBe(false);
		expect(model.visibleErrors).toEqual({});
		expect(model.canDelete).toBe(true);
		expect(model.deleteTooltip).toBe('');
		expect(model.drawerOpen).toBe(false);
		expect(model.selectedItem).toBeNull();
		expect(model.editedItem).toBeNull();
	});
});

describe('objectsModel - Validation', () => {
	let model: CrudModelState<ObjectDefinition>;
	let cleanup: () => void;

	afterEach(() => cleanup?.());

	it('should require object name', () => {
		({ model, cleanup } = createTestModel());

		model.openCreate();
		flushSync();

		expect(model.editedItem).not.toBeNull();
		expect(model.editedItem!.name).toBe('');
		expect(model.isFormValid).toBe(false);
	});

	it('should be valid when name and one primary Field Member are provided', () => {
		({ model, cleanup } = createTestModel());

		model.openCreate();
		flushSync();

		model.editedItem!.name = 'User';
		model.editedItem!.members = [primaryMember()];
		flushSync();

		expect(model.isFormValid).toBe(true);
	});

	it('should be invalid when name is whitespace only', () => {
		({ model, cleanup } = createTestModel());

		model.openCreate();
		flushSync();

		model.editedItem!.name = '   ';
		flushSync();

		expect(model.isFormValid).toBe(false);
	});

	it('should show PascalCase error immediately when name is invalid (before save)', () => {
		({ model, cleanup } = createTestModel());

		model.openCreate();
		flushSync();

		model.editedItem!.name = 'invalid_name';
		flushSync();

		// Case error should be visible immediately (no save attempt needed)
		expect(model.visibleErrors).toEqual(expect.objectContaining({ name: 'Must be PascalCase (e.g. UserEmail)' }));
	});

	it('should NOT show required error before save attempt', () => {
		({ model, cleanup } = createTestModel());

		model.openCreate();
		flushSync();

		// Name is empty, but no save attempt yet — no visible error
		expect(model.visibleErrors).toEqual({});
	});

	it('should clear immediate error when name becomes valid', () => {
		({ model, cleanup } = createTestModel());

		model.openCreate();
		flushSync();

		model.editedItem!.name = 'invalid_name';
		flushSync();
		expect(model.visibleErrors).toHaveProperty('name');

		model.editedItem!.name = 'ValidName';
		flushSync();
		expect(model.visibleErrors).not.toHaveProperty('name');
	});
});

describe('objectsModel - Draft Creation', () => {
	let model: CrudModelState<ObjectDefinition>;
	let cleanup: () => void;

	afterEach(() => cleanup?.());

	it('should create draft with active namespace', () => {
		({ model, cleanup } = createTestModel({
			getActiveNamespaceId: () => 'custom-ns'
		}));

		model.openCreate();
		flushSync();

		expect(model.editedItem).not.toBeNull();
		expect(model.editedItem!.id).toBe('');
		expect(model.editedItem!.namespaceId).toBe('custom-ns');
		expect(model.editedItem!.name).toBe('');
		expect(model.editedItem!.description).toBe('');
		expect(model.editedItem!.members).toEqual([]);
		expect(model.editedItem!.derivedRelationships).toEqual([]);
		expect(model.editedItem!.usedInApis).toEqual([]);
	});

	it('should set drawer mode to creating', () => {
		({ model, cleanup } = createTestModel());

		model.openCreate();
		flushSync();

		expect(model.mode).toBe('creating');
		expect(model.drawerOpen).toBe(true);
	});
});

describe('objectsModel - Deletion Guard', () => {
	let model: CrudModelState<ObjectDefinition>;
	let cleanup: () => void;

	afterEach(() => cleanup?.());

	it('should allow deletion when object has no API references', () => {
		const items = [makeObject({ id: 'o-1', name: 'User', usedInApis: [] })];
		({ model, cleanup } = createTestModel({
			itemsStore: () => items
		}));

		model.selectItem(items[0]);
		flushSync();

		expect(model.canDelete).toBe(true);
		expect(model.deleteTooltip).toBe('');
	});

	it('should allow deletion when object is used in only one API', () => {
		const items = [makeObject({ id: 'o-1', name: 'User', usedInApis: ['api-1'] })];
		({ model, cleanup } = createTestModel({
			itemsStore: () => items
		}));

		model.selectItem(items[0]);
		flushSync();

		expect(model.canDelete).toBe(true);
		expect(model.deleteTooltip).toBe('');
	});

	it('should block deletion when object is used in multiple APIs', () => {
		const items = [makeObject({ id: 'o-1', name: 'User', usedInApis: ['api-1', 'api-2'] })];
		({ model, cleanup } = createTestModel({
			itemsStore: () => items
		}));

		model.selectItem(items[0]);
		flushSync();

		expect(model.canDelete).toBe(false);
		expect(model.deleteTooltip).toContain('Cannot delete');
	});
});

describe('objectsModel - Save (Update)', () => {
	let model: CrudModelState<ObjectDefinition>;
	let cleanup: () => void;

	beforeEach(() => vi.clearAllMocks());
	afterEach(() => cleanup?.());

	it('should not save when form is invalid', async () => {
		const items = [makeObject({ id: 'o-1', name: 'User' })];
		({ model, cleanup } = createTestModel({
			itemsStore: () => items
		}));

		model.selectItem(items[0]);
		flushSync();
		model.editedItem!.name = '';
		flushSync();

		await model.handleSave();

		expect(updateObjectApi).not.toHaveBeenCalled();
	});

	it('should call updateObjectApi on successful save', async () => {
		const items = [makeObject({ id: 'o-1', name: 'User' })];
		({ model, cleanup } = createTestModel({
			itemsStore: () => items
		}));

		const updated = makeObject({ id: 'o-1', name: 'UserV2' });
		(updateObjectApi as Mock).mockResolvedValue(updated);

		model.selectItem(items[0]);
		flushSync();
		model.editedItem!.name = 'UserV2';
		flushSync();

		await model.handleSave();

		expect(updateObjectApi).toHaveBeenCalledWith(
			'o-1',
			expect.objectContaining({
				name: 'UserV2'
			})
		);
		expect(showToast).toHaveBeenCalledWith(expect.stringContaining('updated successfully'), 'success', 3000);
	});

	it('should strip derived properties from update payload', async () => {
		// Objects get memberCount, usedInApisCount added by deriveExtra.
		// The toUpdatePayload function must strip these before sending.
		const items = [makeObject({ id: 'o-1', name: 'User' })];
		({ model, cleanup } = createTestModel({
			itemsStore: () => items
		}));

		const updated = makeObject({ id: 'o-1', name: 'User' });
		(updateObjectApi as Mock).mockResolvedValue(updated);

		model.selectItem(items[0]);
		flushSync();

		await model.handleSave();

		// Verify the payload does not contain derived properties
		const payload = (updateObjectApi as Mock).mock.calls[0][1];
		expect(payload).not.toHaveProperty('memberCount');
		expect(payload).not.toHaveProperty('usedInApisCount');
		expect(payload).not.toHaveProperty('namespaceName');
	});

	it('should show error toast on save failure', async () => {
		const items = [makeObject({ id: 'o-1', name: 'User' })];
		({ model, cleanup } = createTestModel({
			itemsStore: () => items
		}));

		(updateObjectApi as Mock).mockRejectedValue(new Error('Server error'));
		(mapApiError as Mock).mockReturnValue('Server error');

		model.selectItem(items[0]);
		flushSync();
		model.editedItem!.name = 'UserV2';
		flushSync();

		await model.handleSave();

		expect(showToast).toHaveBeenCalledWith('Server error', 'error', 5000);
	});

	it('should set server error when name already exists', async () => {
		const items = [makeObject({ id: 'o-1', name: 'User' })];
		({ model, cleanup } = createTestModel({
			itemsStore: () => items
		}));

		(updateObjectApi as Mock).mockRejectedValue(new Error('conflict'));
		(mapApiError as Mock).mockReturnValue('Object name already exists');

		model.selectItem(items[0]);
		flushSync();
		model.editedItem!.name = 'Duplicate';
		flushSync();

		await model.handleSave();
		flushSync();

		expect(model.visibleErrors).toEqual(expect.objectContaining({ name: 'Object name already exists' }));
	});
});

describe('objectsModel - Create', () => {
	let model: CrudModelState<ObjectDefinition>;
	let cleanup: () => void;

	beforeEach(() => vi.clearAllMocks());
	afterEach(() => cleanup?.());

	it('should call createObjectApi with correct payload', async () => {
		({ model, cleanup } = createTestModel());
		const created = makeObject({ id: 'o-new', name: 'NewObj' });
		(createObjectApi as Mock).mockResolvedValue(created);

		model.openCreate();
		flushSync();
		model.editedItem!.name = 'NewObj';
		model.editedItem!.members = [primaryMember()];
		flushSync();

		await model.handleCreate();

		expect(createObjectApi).toHaveBeenCalledWith(
			expect.objectContaining({
				namespaceId: 'ns-1',
				name: 'NewObj'
			})
		);
		expect(showToast).toHaveBeenCalledWith(expect.stringContaining('created successfully'), 'success', 3000);
	});

	it('should not create when form is invalid', async () => {
		({ model, cleanup } = createTestModel());

		model.openCreate();
		flushSync();

		await model.handleCreate();

		expect(createObjectApi).not.toHaveBeenCalled();
	});

	it('should map validators to template-based payload', async () => {
		({ model, cleanup } = createTestModel());
		const created = makeObject({ id: 'o-new', name: 'NewObj' });
		(createObjectApi as Mock).mockResolvedValue(created);

		model.openCreate();
		flushSync();
		model.editedItem!.name = 'NewObj';
		model.editedItem!.members = [primaryMember()];
		model.editedItem!.validators = [
			{
				id: '',
				templateId: 'tmpl-pwd',
				parameters: null,
				fieldMappings: { password_field: 'password', confirm_field: 'confirm' }
			}
		];
		flushSync();

		await model.handleCreate();

		const payload = (createObjectApi as Mock).mock.calls[0][0];
		expect(payload.validators).toEqual([
			{
				templateId: 'tmpl-pwd',
				parameters: undefined,
				fieldMappings: { password_field: 'password', confirm_field: 'confirm' }
			}
		]);
	});

	it('should handle create failure', async () => {
		({ model, cleanup } = createTestModel());
		(createObjectApi as Mock).mockRejectedValue(new Error('Create failed'));
		(mapApiError as Mock).mockReturnValue('Create failed');

		model.openCreate();
		flushSync();
		model.editedItem!.name = 'NewObj';
		model.editedItem!.members = [primaryMember()];
		flushSync();

		await model.handleCreate();

		expect(showToast).toHaveBeenCalledWith('Create failed', 'error', 5000);
	});

	it('should call afterCreate hook with the created object', async () => {
		const afterCreate = vi.fn();
		({ model, cleanup } = createTestModel({ afterCreate }));
		const newObject = makeObject({ id: 'o-new', name: 'User' });
		(createObjectApi as Mock).mockResolvedValue(newObject);

		model.openCreate();
		flushSync();
		model.editedItem!.name = 'User';
		model.editedItem!.members = [primaryMember()];
		flushSync();

		await model.handleCreate();

		expect(afterCreate).toHaveBeenCalledWith(newObject);
	});
});

describe('objectsModel - Delete', () => {
	let model: CrudModelState<ObjectDefinition>;
	let cleanup: () => void;

	beforeEach(() => vi.clearAllMocks());
	afterEach(() => cleanup?.());

	it('should call deleteObjectApi on delete', async () => {
		const items = [makeObject({ id: 'o-1', name: 'User' })];
		({ model, cleanup } = createTestModel({
			itemsStore: () => items
		}));

		(deleteObjectApi as Mock).mockResolvedValue(undefined);

		model.selectItem(items[0]);
		flushSync();
		await model.handleDelete();

		expect(deleteObjectApi).toHaveBeenCalledWith('o-1');
		expect(showToast).toHaveBeenCalledWith(expect.stringContaining('deleted successfully'), 'success', 3000);
	});

	it('should show error toast on delete failure', async () => {
		const items = [makeObject({ id: 'o-1', name: 'User' })];
		({ model, cleanup } = createTestModel({
			itemsStore: () => items
		}));

		(deleteObjectApi as Mock).mockRejectedValue(new Error('Delete failed'));
		(mapApiError as Mock).mockReturnValue('Delete failed');

		model.selectItem(items[0]);
		flushSync();
		await model.handleDelete();

		expect(showToast).toHaveBeenCalledWith('Delete failed', 'error', 5000);
	});
});

describe('objectsModel - Undo', () => {
	let model: CrudModelState<ObjectDefinition>;
	let cleanup: () => void;

	afterEach(() => cleanup?.());

	it('should restore editedItem from originalItem', () => {
		const items = [makeObject({ id: 'o-1', name: 'User' })];
		({ model, cleanup } = createTestModel({
			itemsStore: () => items
		}));

		model.selectItem(items[0]);
		flushSync();

		model.editedItem!.name = 'ChangedName';
		flushSync();
		expect(model.editedItem!.name).toBe('ChangedName');

		model.handleUndo();
		flushSync();

		expect(model.editedItem!.name).toBe('User');
	});
});

describe('objectsModel - isSelected', () => {
	let model: CrudModelState<ObjectDefinition>;
	let cleanup: () => void;

	afterEach(() => cleanup?.());

	it('should return true for the selected item', () => {
		const items = [makeObject({ id: 'o-1', name: 'User' }), makeObject({ id: 'o-2', name: 'Product' })];
		({ model, cleanup } = createTestModel({
			itemsStore: () => items
		}));

		model.selectItem(items[0]);
		flushSync();

		expect(model.isSelected(items[0])).toBe(true);
		expect(model.isSelected(items[1])).toBe(false);
	});
});
