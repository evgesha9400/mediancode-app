// tests/unit/lib/stores/objectsModel.test.ts
//
// Unit tests for the Objects per-entity CRUD model.
// Tests entity-specific logic: validation, draft creation, payload mapping,
// deletion guard, and CRUD action flows (save, create, delete).

import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import type { ObjectDefinition } from '$lib/stores/objects';

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

vi.mock('$lib/domain/mutations', () => ({
  createObjectAction: vi.fn(),
  updateObjectAction: vi.fn(),
  deleteObjectAction: vi.fn()
}));

vi.mock('$lib/stores/toasts', () => ({
  showToast: vi.fn()
}));

vi.mock('$lib/utils/references', () => ({
  buildDeletionTooltip: vi.fn(
    (entityType: string, refType: string, refs: Array<{ name: string }>) =>
      `Cannot delete: Used in ${refs.length} ${refType}${refs.length > 1 ? 's' : ''}`
  )
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { createObjectsModel, type ObjectsModelConfig, type ObjectsModelState } from '$lib/stores/objectsModel.svelte';
import { createObjectAction, updateObjectAction, deleteObjectAction } from '$lib/domain/mutations';
import { showToast } from '$lib/stores/toasts';
import { page } from '$app/state';
import { goto } from '$app/navigation';
import { effect_root } from 'svelte/internal/client';
import { flushSync } from 'svelte';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeObject(overrides: Partial<ObjectDefinition> & { id: string; name: string }): ObjectDefinition {
  return {
    namespaceId: 'ns-1',
    description: '',
    fields: [],
    validators: [],
    usedInApis: [],
    ...overrides
  };
}

function createTestModel(overrides: Partial<ObjectsModelConfig> = {}): {
  model: ObjectsModelState;
  cleanup: () => void;
} {
  let model!: ObjectsModelState;

  const cleanup = effect_root(() => {
    model = createObjectsModel({
      itemsStore: () => [],
      searchFn: (items, query) => {
        if (!query) return items;
        return items.filter(i => i.name.toLowerCase().includes(query.toLowerCase()));
      },
      filterSections: () => [],
      urlScope: { page: page as any, goto: goto as any },
      getActiveNamespaceId: () => 'ns-1',
      getNamespaceName: () => 'Test Namespace',
      ...overrides
    });
  });

  return { model, cleanup };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('objectsModel - Initial State', () => {
  let model: ObjectsModelState;
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
  let model: ObjectsModelState;
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

  it('should be valid when name is provided', () => {
    ({ model, cleanup } = createTestModel());

    model.openCreate();
    flushSync();

    model.editedItem!.name = 'User';
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
    expect(model.visibleErrors).toEqual(
      expect.objectContaining({ name: 'Must be PascalCase (e.g. UserEmail)' })
    );
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
  let model: ObjectsModelState;
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
    expect(model.editedItem!.fields).toEqual([]);
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
  let model: ObjectsModelState;
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
  let model: ObjectsModelState;
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

    expect(updateObjectAction).not.toHaveBeenCalled();
  });

  it('should call updateObjectAction on successful save', async () => {
    const items = [makeObject({ id: 'o-1', name: 'User' })];
    ({ model, cleanup } = createTestModel({
      itemsStore: () => items
    }));

    const updated = makeObject({ id: 'o-1', name: 'UserV2' });
    (updateObjectAction as Mock).mockResolvedValue({ success: true, data: updated });

    model.selectItem(items[0]);
    flushSync();
    model.editedItem!.name = 'UserV2';
    flushSync();

    await model.handleSave();

    expect(updateObjectAction).toHaveBeenCalledWith('o-1', expect.objectContaining({
      name: 'UserV2'
    }));
    expect(showToast).toHaveBeenCalledWith(
      expect.stringContaining('updated successfully'),
      'success',
      3000
    );
  });

  it('should strip derived properties from update payload', async () => {
    // Objects get fieldCount, usedInApisCount, namespaceName added by deriveExtra.
    // The toUpdatePayload function must strip these before sending.
    const items = [makeObject({ id: 'o-1', name: 'User', fields: ['f-1', 'f-2'] as any })];
    ({ model, cleanup } = createTestModel({
      itemsStore: () => items
    }));

    const updated = makeObject({ id: 'o-1', name: 'User' });
    (updateObjectAction as Mock).mockResolvedValue({ success: true, data: updated });

    model.selectItem(items[0]);
    flushSync();

    await model.handleSave();

    // Verify the payload does not contain derived properties
    const payload = (updateObjectAction as Mock).mock.calls[0][1];
    expect(payload).not.toHaveProperty('fieldCount');
    expect(payload).not.toHaveProperty('usedInApisCount');
    expect(payload).not.toHaveProperty('namespaceName');
  });

  it('should show error toast on save failure', async () => {
    const items = [makeObject({ id: 'o-1', name: 'User' })];
    ({ model, cleanup } = createTestModel({
      itemsStore: () => items
    }));

    (updateObjectAction as Mock).mockResolvedValue({ success: false, error: 'Server error' });

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

    (updateObjectAction as Mock).mockResolvedValue({
      success: false,
      error: 'Object name already exists'
    });

    model.selectItem(items[0]);
    flushSync();
    model.editedItem!.name = 'Duplicate';
    flushSync();

    await model.handleSave();
    flushSync();

    expect(model.visibleErrors).toEqual(
      expect.objectContaining({ name: 'Object name already exists' })
    );
  });
});

describe('objectsModel - Create', () => {
  let model: ObjectsModelState;
  let cleanup: () => void;

  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanup?.());

  it('should call createObjectAction with correct payload', async () => {
    ({ model, cleanup } = createTestModel());
    const created = makeObject({ id: 'o-new', name: 'NewObj' });
    (createObjectAction as Mock).mockResolvedValue({ success: true, data: created });

    model.openCreate();
    flushSync();
    model.editedItem!.name = 'NewObj';
    flushSync();

    await model.handleCreate();

    expect(createObjectAction).toHaveBeenCalledWith(expect.objectContaining({
      namespaceId: 'ns-1',
      name: 'NewObj'
    }));
    expect(showToast).toHaveBeenCalledWith(
      expect.stringContaining('created successfully'),
      'success',
      3000
    );
  });

  it('should not create when form is invalid', async () => {
    ({ model, cleanup } = createTestModel());

    model.openCreate();
    flushSync();

    await model.handleCreate();

    expect(createObjectAction).not.toHaveBeenCalled();
  });

  it('should map validators to template-based payload', async () => {
    ({ model, cleanup } = createTestModel());
    const created = makeObject({ id: 'o-new', name: 'NewObj' });
    (createObjectAction as Mock).mockResolvedValue({ success: true, data: created });

    model.openCreate();
    flushSync();
    model.editedItem!.name = 'NewObj';
    model.editedItem!.validators = [
      { id: '', templateId: 'tmpl-pwd', parameters: null, fieldMappings: { password_field: 'password', confirm_field: 'confirm' } }
    ];
    flushSync();

    await model.handleCreate();

    const payload = (createObjectAction as Mock).mock.calls[0][0];
    expect(payload.validators).toEqual([
      { templateId: 'tmpl-pwd', parameters: undefined, fieldMappings: { password_field: 'password', confirm_field: 'confirm' } }
    ]);
  });

  it('should handle create failure', async () => {
    ({ model, cleanup } = createTestModel());
    (createObjectAction as Mock).mockResolvedValue({ success: false, error: 'Create failed' });

    model.openCreate();
    flushSync();
    model.editedItem!.name = 'NewObj';
    flushSync();

    await model.handleCreate();

    expect(showToast).toHaveBeenCalledWith('Create failed', 'error', 5000);
  });
});

describe('objectsModel - Delete', () => {
  let model: ObjectsModelState;
  let cleanup: () => void;

  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanup?.());

  it('should call deleteObjectAction on delete', async () => {
    const items = [makeObject({ id: 'o-1', name: 'User' })];
    ({ model, cleanup } = createTestModel({
      itemsStore: () => items
    }));

    (deleteObjectAction as Mock).mockResolvedValue({ success: true });

    model.selectItem(items[0]);
    flushSync();
    await model.handleDelete();

    expect(deleteObjectAction).toHaveBeenCalledWith('o-1');
    expect(showToast).toHaveBeenCalledWith(
      expect.stringContaining('deleted successfully'),
      'success',
      3000
    );
  });

  it('should show error toast on delete failure', async () => {
    const items = [makeObject({ id: 'o-1', name: 'User' })];
    ({ model, cleanup } = createTestModel({
      itemsStore: () => items
    }));

    (deleteObjectAction as Mock).mockResolvedValue({ success: false, error: 'Delete failed' });

    model.selectItem(items[0]);
    flushSync();
    await model.handleDelete();

    expect(showToast).toHaveBeenCalledWith('Delete failed', 'error', 5000);
  });
});

describe('objectsModel - Undo', () => {
  let model: ObjectsModelState;
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
  let model: ObjectsModelState;
  let cleanup: () => void;

  afterEach(() => cleanup?.());

  it('should return true for the selected item', () => {
    const items = [
      makeObject({ id: 'o-1', name: 'User' }),
      makeObject({ id: 'o-2', name: 'Product' })
    ];
    ({ model, cleanup } = createTestModel({
      itemsStore: () => items
    }));

    model.selectItem(items[0]);
    flushSync();

    expect(model.isSelected(items[0])).toBe(true);
    expect(model.isSelected(items[1])).toBe(false);
  });
});
