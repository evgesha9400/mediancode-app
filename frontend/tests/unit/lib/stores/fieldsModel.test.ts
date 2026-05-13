// tests/unit/lib/stores/fieldsModel.test.ts
//
// Unit tests for the Fields per-entity CRUD model.
// Tests entity-specific logic: validation, draft creation, payload mapping,
// deletion guard, and CRUD action flows (save, create, delete).

import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import type { Field } from '$lib/stores/stores';

// ---------------------------------------------------------------------------
// Mocks -- must be declared before imports that use them
// ---------------------------------------------------------------------------

// Mock SvelteKit app modules
vi.mock('$app/environment', () => ({ browser: false }));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
vi.mock('$app/state', () => ({
  page: {
    url: new URL('http://localhost/fields'),
    params: {},
    route: { id: '/fields' },
    status: 200,
    error: null,
    data: {},
    form: null,
    state: {}
  }
}));

// Mock API transport
vi.mock('$lib/api/fields', () => ({
  createFieldApi: vi.fn(),
  updateFieldApi: vi.fn(),
  deleteFieldApi: vi.fn()
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
  checkFieldDeletion: vi.fn(() => ({ success: true }))
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { createCrudModel, type CrudModelState } from '$lib/stores/crudModel.svelte';
import { createFieldsContract } from '$lib/stores/fieldsConfig.svelte';
import { createFieldApi, updateFieldApi, deleteFieldApi } from '$lib/api/fields';
import { mapApiError } from '$lib/domain/errorMap';
import { showToast } from '$lib/stores/toasts';
import { page } from '$app/state';
import { goto } from '$app/navigation';
// Svelte 5 internal: needed to create a root effect context for $effect runes in tests
import { effect_root } from 'svelte/internal/client';
import { flushSync } from 'svelte';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeField(overrides: Partial<Field> & { id: string; name: string }): Field {
  return {
    namespaceId: 'ns-1',
    type: 'str',
    container: null,
    description: '',
    defaultValue: '',
    constraints: [],
    validators: [],
    usedInApis: [],
    ...overrides
  };
}

/** Wraps model creation in an effect root so $effect runes work outside components */
function createTestModel(overrides: {
  itemsStore?: () => Field[];
  getActiveNamespaceId?: () => string;
  getDefaultType?: () => string;
  getTypeIdByName?: (name: string) => string | undefined;
  afterCreate?: (field: Field) => void;
} = {}): {
  model: CrudModelState<Field>;
  cleanup: () => void;
} {
  let model!: CrudModelState<Field>;

  const cleanup = effect_root(() => {
    const contract = createFieldsContract({
      getActiveNamespaceId: overrides.getActiveNamespaceId ?? (() => 'ns-1'),
      getDefaultType: overrides.getDefaultType ?? (() => 'str'),
      getTypeIdByName: overrides.getTypeIdByName ?? ((name: string) => (name === 'str' ? 'type-str' : name === 'int' ? 'type-int' : undefined)),
      afterCreate: overrides.afterCreate
    });
    model = createCrudModel(contract, {
      itemsStore: overrides.itemsStore ?? (() => []),
      searchFn: (items, query) => {
        if (!query) return items;
        return items.filter(i => i.name.toLowerCase().includes(query.toLowerCase()));
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

describe('fieldsModel - Initial State', () => {
  let model: CrudModelState<Field>;
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

describe('fieldsModel - Validation', () => {
  let model: CrudModelState<Field>;
  let cleanup: () => void;

  afterEach(() => cleanup?.());

  it('should require field name', () => {
    ({ model, cleanup } = createTestModel());

    model.openCreate();
    flushSync();

    expect(model.editedItem).not.toBeNull();
    expect(model.editedItem!.name).toBe('');
    expect(model.isFormValid).toBe(false);
  });

  it('should require field type', () => {
    ({ model, cleanup } = createTestModel({
      getDefaultType: () => ''
    }));

    model.openCreate();
    flushSync();

    model.editedItem!.name = 'test_field';
    flushSync();

    expect(model.isFormValid).toBe(false);
  });

  it('should validate constraint values', () => {
    ({ model, cleanup } = createTestModel());

    model.openCreate();
    flushSync();

    model.editedItem!.name = 'test_field';
    model.editedItem!.constraints = [
      { name: 'max_length', constraintId: 'c-1', value: '' }
    ];
    flushSync();

    expect(model.isFormValid).toBe(false);
  });

  it('should be valid when all fields are provided', () => {
    ({ model, cleanup } = createTestModel());

    model.openCreate();
    flushSync();

    model.editedItem!.name = 'test_field';
    flushSync();

    expect(model.isFormValid).toBe(true);
  });

  it('should be valid with constraints that have values', () => {
    ({ model, cleanup } = createTestModel());

    model.openCreate();
    flushSync();

    model.editedItem!.name = 'test_field';
    model.editedItem!.constraints = [
      { name: 'max_length', constraintId: 'c-1', value: '100' }
    ];
    flushSync();

    expect(model.isFormValid).toBe(true);
  });

  it('should show snake_case error immediately when name is invalid (before save)', () => {
    ({ model, cleanup } = createTestModel());

    model.openCreate();
    flushSync();

    model.editedItem!.name = 'InvalidName';
    flushSync();

    // Case error should be visible immediately (no save attempt needed)
    expect(model.visibleErrors).toEqual(
      expect.objectContaining({ name: 'Must be snake_case (e.g. user_email)' })
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

    model.editedItem!.name = 'InvalidName';
    flushSync();
    expect(model.visibleErrors).toHaveProperty('name');

    model.editedItem!.name = 'valid_name';
    flushSync();
    expect(model.visibleErrors).not.toHaveProperty('name');
  });
});

describe('fieldsModel - Draft Creation', () => {
  let model: CrudModelState<Field>;
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
    expect(model.editedItem!.type).toBe('str');
    expect(model.editedItem!.constraints).toEqual([]);
    expect(model.editedItem!.usedInApis).toEqual([]);
    expect(model.editedItem!.description).toBe('');
    expect(model.editedItem!.defaultValue).toBe('');
  });

  it('should create draft with specified default type', () => {
    ({ model, cleanup } = createTestModel({
      getDefaultType: () => 'int'
    }));

    model.openCreate();
    flushSync();

    expect(model.editedItem!.type).toBe('int');
  });

  it('should set drawer mode to creating', () => {
    ({ model, cleanup } = createTestModel());

    model.openCreate();
    flushSync();

    expect(model.mode).toBe('creating');
    expect(model.drawerOpen).toBe(true);
  });
});

describe('fieldsModel - Deletion Guard', () => {
  let model: CrudModelState<Field>;
  let cleanup: () => void;

  afterEach(() => cleanup?.());

  it('should allow deletion when field has no API references', () => {
    const items = [makeField({ id: 'f-1', name: 'email', usedInApis: [] })];
    ({ model, cleanup } = createTestModel({
      itemsStore: () => items
    }));

    model.selectItem(items[0]);
    flushSync();

    expect(model.canDelete).toBe(true);
    expect(model.deleteTooltip).toBe('');
  });

  it('should allow deletion when field is used in only one API', () => {
    const items = [makeField({ id: 'f-1', name: 'email', usedInApis: ['api-1'] })];
    ({ model, cleanup } = createTestModel({
      itemsStore: () => items
    }));

    model.selectItem(items[0]);
    flushSync();

    expect(model.canDelete).toBe(true);
    expect(model.deleteTooltip).toBe('');
  });

  it('should block deletion when field is used in multiple APIs', () => {
    const items = [makeField({ id: 'f-1', name: 'email', usedInApis: ['api-1', 'api-2'] })];
    ({ model, cleanup } = createTestModel({
      itemsStore: () => items
    }));

    model.selectItem(items[0]);
    flushSync();

    expect(model.canDelete).toBe(false);
    expect(model.deleteTooltip).toContain('Cannot delete');
  });
});

describe('fieldsModel - Save (Update)', () => {
  let model: CrudModelState<Field>;
  let cleanup: () => void;

  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => cleanup?.());

  it('should not save when form is invalid', async () => {
    const items = [makeField({ id: 'f-1', name: 'email' })];
    ({ model, cleanup } = createTestModel({
      itemsStore: () => items
    }));

    model.selectItem(items[0]);
    flushSync();
    model.editedItem!.name = '';
    flushSync();

    await model.handleSave();

    expect(updateFieldApi).not.toHaveBeenCalled();
  });

  it('should call updateFieldAction on successful save', async () => {
    const items = [makeField({ id: 'f-1', name: 'email' })];
    ({ model, cleanup } = createTestModel({
      itemsStore: () => items
    }));

    const updatedField = makeField({ id: 'f-1', name: 'email_updated' });
    (updateFieldApi as Mock).mockResolvedValue(updatedField);

    model.selectItem(items[0]);
    flushSync();
    model.editedItem!.name = 'email_updated';
    flushSync();

    await model.handleSave();

    expect(updateFieldApi).toHaveBeenCalledWith('f-1', expect.objectContaining({
      name: 'email_updated'
    }));
    expect(showToast).toHaveBeenCalledWith(
      expect.stringContaining('updated successfully'),
      'success',
      3000
    );
  });

  it('should show error toast on save failure', async () => {
    const items = [makeField({ id: 'f-1', name: 'email' })];
    ({ model, cleanup } = createTestModel({
      itemsStore: () => items
    }));

    (updateFieldApi as Mock).mockRejectedValue(new Error('Server error'));
    (mapApiError as Mock).mockReturnValue('Server error');

    model.selectItem(items[0]);
    flushSync();
    model.editedItem!.name = 'email_updated';
    flushSync();

    await model.handleSave();

    expect(showToast).toHaveBeenCalledWith('Server error', 'error', 5000);
  });

  it('should set server error when name already exists', async () => {
    const items = [makeField({ id: 'f-1', name: 'email' })];
    ({ model, cleanup } = createTestModel({
      itemsStore: () => items
    }));

    (updateFieldApi as Mock).mockRejectedValue(new Error('conflict'));
    (mapApiError as Mock).mockReturnValue('Field name already exists');

    model.selectItem(items[0]);
    flushSync();
    model.editedItem!.name = 'duplicate_name';
    flushSync();

    await model.handleSave();
    flushSync();

    expect(model.visibleErrors).toEqual(
      expect.objectContaining({ name: 'Field name already exists' })
    );
  });

  it('should show toast when payload creation fails (unknown type)', async () => {
    const items = [makeField({ id: 'f-1', name: 'email', type: 'unknown_type' })];
    ({ model, cleanup } = createTestModel({
      itemsStore: () => items,
      getTypeIdByName: () => undefined
    }));

    model.selectItem(items[0]);
    flushSync();

    await model.handleSave();

    expect(showToast).toHaveBeenCalledWith(
      expect.stringContaining('Unknown type'),
      'error',
      5000
    );
    expect(updateFieldApi).not.toHaveBeenCalled();
  });
});

describe('fieldsModel - Create', () => {
  let model: CrudModelState<Field>;
  let cleanup: () => void;

  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => cleanup?.());

  it('should call createFieldAction with correct payload', async () => {
    ({ model, cleanup } = createTestModel());
    const newField = makeField({ id: 'f-new', name: 'new_field' });
    (createFieldApi as Mock).mockResolvedValue(newField);

    model.openCreate();
    flushSync();
    model.editedItem!.name = 'new_field';
    flushSync();

    await model.handleCreate();

    expect(createFieldApi).toHaveBeenCalledWith(expect.objectContaining({
      namespaceId: 'ns-1',
      name: 'new_field',
      typeId: 'type-str'
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
    // name is empty -- form invalid

    await model.handleCreate();

    expect(createFieldApi).not.toHaveBeenCalled();
  });

  it('should handle create failure', async () => {
    ({ model, cleanup } = createTestModel());
    (createFieldApi as Mock).mockRejectedValue(new Error('Create failed'));
    (mapApiError as Mock).mockReturnValue('Create failed');

    model.openCreate();
    flushSync();
    model.editedItem!.name = 'new_field';
    flushSync();

    await model.handleCreate();

    expect(showToast).toHaveBeenCalledWith('Create failed', 'error', 5000);
  });

  it('should map validators to template-based payload', async () => {
    ({ model, cleanup } = createTestModel());
    const newField = makeField({ id: 'f-new', name: 'new_field' });
    (createFieldApi as Mock).mockResolvedValue(newField);

    model.openCreate();
    flushSync();
    model.editedItem!.name = 'new_field';
    model.editedItem!.validators = [
      { id: '', templateId: 'tmpl-1', parameters: { case: 'lowercase' } }
    ];
    flushSync();

    await model.handleCreate();

    const payload = (createFieldApi as Mock).mock.calls[0][0];
    expect(payload.validators).toEqual([
      { templateId: 'tmpl-1', parameters: { case: 'lowercase' } }
    ]);
  });

  it('should call afterCreate hook with the created field', async () => {
    const afterCreate = vi.fn();
    ({ model, cleanup } = createTestModel({ afterCreate }));
    const newField = makeField({ id: 'f-new', name: 'new_field' });
    (createFieldApi as Mock).mockResolvedValue(newField);

    model.openCreate();
    flushSync();
    model.editedItem!.name = 'new_field';
    flushSync();

    await model.handleCreate();

    expect(afterCreate).toHaveBeenCalledWith(newField);
  });
});

describe('fieldsModel - Delete', () => {
  let model: CrudModelState<Field>;
  let cleanup: () => void;

  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => cleanup?.());

  it('should call deleteFieldAction on delete', async () => {
    const items = [makeField({ id: 'f-1', name: 'email' })];
    ({ model, cleanup } = createTestModel({
      itemsStore: () => items
    }));

    (deleteFieldApi as Mock).mockResolvedValue(undefined);

    model.selectItem(items[0]);
    flushSync();
    await model.handleDelete();

    expect(deleteFieldApi).toHaveBeenCalledWith('f-1');
    expect(showToast).toHaveBeenCalledWith(
      expect.stringContaining('deleted successfully'),
      'success',
      3000
    );
  });

  it('should show error toast on delete failure', async () => {
    const items = [makeField({ id: 'f-1', name: 'email' })];
    ({ model, cleanup } = createTestModel({
      itemsStore: () => items
    }));

    (deleteFieldApi as Mock).mockRejectedValue(new Error('Delete failed'));
    (mapApiError as Mock).mockReturnValue('Delete failed');

    model.selectItem(items[0]);
    flushSync();
    await model.handleDelete();

    expect(showToast).toHaveBeenCalledWith('Delete failed', 'error', 5000);
  });
});

describe('fieldsModel - Undo', () => {
  let model: CrudModelState<Field>;
  let cleanup: () => void;

  afterEach(() => cleanup?.());

  it('should restore editedItem from originalItem', () => {
    const items = [makeField({ id: 'f-1', name: 'email' })];
    ({ model, cleanup } = createTestModel({
      itemsStore: () => items
    }));

    model.selectItem(items[0]);
    flushSync();

    model.editedItem!.name = 'changed_name';
    flushSync();
    expect(model.editedItem!.name).toBe('changed_name');

    model.handleUndo();
    flushSync();

    expect(model.editedItem!.name).toBe('email');
  });
});

describe('fieldsModel - isSelected', () => {
  let model: CrudModelState<Field>;
  let cleanup: () => void;

  afterEach(() => cleanup?.());

  it('should return true for the selected item', () => {
    const items = [
      makeField({ id: 'f-1', name: 'email' }),
      makeField({ id: 'f-2', name: 'phone' })
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
