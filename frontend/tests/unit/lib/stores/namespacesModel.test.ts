// tests/unit/lib/stores/namespacesModel.test.ts
//
// Unit tests for the Namespaces per-entity CRUD model.
// Tests entity-specific logic: validation, payload mapping, deletion guard
// (entity count), and CRUD action flows.
// Note: Namespaces use a modal for creation, so no openCreate/handleCreate.

import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import type { Namespace } from '$lib/types';

// ---------------------------------------------------------------------------
// Mocks -- must be declared before imports that use them
// ---------------------------------------------------------------------------

vi.mock('$app/environment', () => ({ browser: false }));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
vi.mock('$app/state', () => ({
  page: {
    url: new URL('http://localhost/namespaces'),
    params: {},
    route: { id: '/namespaces' },
    status: 200,
    error: null,
    data: {},
    form: null,
    state: {}
  }
}));

// Mock API transport
vi.mock('$lib/api/namespaces', () => ({
  createNamespaceApi: vi.fn(),
  updateNamespaceApi: vi.fn(),
  deleteNamespaceApi: vi.fn()
}));

// Mock error mapping
vi.mock('$lib/domain/errorMap', () => ({
  mapApiError: vi.fn((_err: unknown, context: string) => `Failed to ${context}`)
}));

// Mock toast notifications
vi.mock('$lib/stores/toasts', () => ({
  showToast: vi.fn()
}));

// Mock namespace store selectors (used by inlined handleDelete guard)
vi.mock('$lib/stores/stores', async (importOriginal) => {
  const actual = await importOriginal<typeof import('$lib/stores/stores')>();
  return {
    ...actual,
    getNamespaceById: vi.fn(),
    getNamespaceEntityCount: vi.fn(() => 0),
    getNamespaceEntityDetails: vi.fn(() => ({ total: 0, fields: 0, fieldConstraints: 0, objects: 0, endpoints: 0 }))
  };
});

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { createCrudModel, type CrudModelState } from '$lib/stores/crudModel.svelte';
import { createNamespacesContract } from '$lib/stores/namespacesConfig.svelte';
import { createNamespaceApi, updateNamespaceApi, deleteNamespaceApi } from '$lib/api/namespaces';
import { mapApiError } from '$lib/domain/errorMap';
import { showToast } from '$lib/stores/toasts';
import { getNamespaceById, getNamespaceEntityCount } from '$lib/stores/stores';
import { page } from '$app/state';
import { goto } from '$app/navigation';
import { effect_root } from 'svelte/internal/client';
import { flushSync } from 'svelte';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const emptyDetails = { total: 0, fields: 0, fieldConstraints: 0, objects: 0, endpoints: 0 };
const nonEmptyDetails = { total: 5, fields: 2, fieldConstraints: 1, objects: 1, endpoints: 1 };

function makeNamespace(overrides: Partial<Namespace> & { id: string; name: string }): Namespace {
  return {
    description: '',
    locked: false,
    isDefault: false,
    ...overrides
  };
}

function createTestModel(overrides: {
  itemsStore?: () => Namespace[];
  getNamespaceEntityDetails?: () => { total: number; fields: number; fieldConstraints: number; objects: number; endpoints: number };
} = {}): {
  model: CrudModelState<Namespace>;
  cleanup: () => void;
} {
  let model!: CrudModelState<Namespace>;

  const cleanup = effect_root(() => {
    const contract = createNamespacesContract({
      getNamespaceEntityDetails: overrides.getNamespaceEntityDetails ?? (() => emptyDetails)
    });
    model = createCrudModel(contract, {
      itemsStore: overrides.itemsStore ?? (() => []),
      searchFn: (items, query) => {
        if (!query) return items;
        return items.filter(i => i.name.toLowerCase().includes(query.toLowerCase()));
      },
      filterSections: [],
      urlScope: { page: page as any, goto: goto as any }
    });
  });

  return { model, cleanup };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('namespacesModel - Initial State', () => {
  let model: CrudModelState<Namespace>;
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

describe('namespacesModel - Validation', () => {
  let model: CrudModelState<Namespace>;
  let cleanup: () => void;

  afterEach(() => cleanup?.());

  it('should require namespace name', () => {
    const items = [makeNamespace({ id: 'ns-1', name: 'test' })];
    ({ model, cleanup } = createTestModel({
      itemsStore: () => items
    }));

    model.selectItem(items[0]);
    flushSync();

    model.editedItem!.name = '';
    flushSync();

    expect(model.isFormValid).toBe(false);
  });

  it('should be valid when name is provided', () => {
    const items = [makeNamespace({ id: 'ns-1', name: 'test' })];
    ({ model, cleanup } = createTestModel({
      itemsStore: () => items
    }));

    model.selectItem(items[0]);
    flushSync();

    expect(model.isFormValid).toBe(true);
  });

  it('should be invalid when name is whitespace only', () => {
    const items = [makeNamespace({ id: 'ns-1', name: 'test' })];
    ({ model, cleanup } = createTestModel({
      itemsStore: () => items
    }));

    model.selectItem(items[0]);
    flushSync();

    model.editedItem!.name = '   ';
    flushSync();

    expect(model.isFormValid).toBe(false);
  });
});

describe('namespacesModel - Deletion Guard', () => {
  let model: CrudModelState<Namespace>;
  let cleanup: () => void;

  afterEach(() => cleanup?.());

  it('should allow deletion when namespace is empty', () => {
    const items = [makeNamespace({ id: 'ns-1', name: 'empty' })];
    ({ model, cleanup } = createTestModel({
      itemsStore: () => items,
      getNamespaceEntityDetails: () => emptyDetails
    }));

    model.selectItem(items[0]);
    flushSync();

    expect(model.canDelete).toBe(true);
    expect(model.deleteTooltip).toBe('');
  });

  it('should block deletion when namespace contains entities', () => {
    const items = [makeNamespace({ id: 'ns-1', name: 'populated' })];
    ({ model, cleanup } = createTestModel({
      itemsStore: () => items,
      getNamespaceEntityDetails: () => nonEmptyDetails
    }));

    model.selectItem(items[0]);
    flushSync();

    expect(model.canDelete).toBe(false);
    expect(model.deleteTooltip).toContain('5');
  });

  it('should block deletion of locked namespace', () => {
    const items = [makeNamespace({ id: 'global-id', name: 'Global', isDefault: true, locked: true })];
    ({ model, cleanup } = createTestModel({
      itemsStore: () => items
    }));

    model.selectItem(items[0]);
    flushSync();

    expect(model.canDelete).toBe(false);
    expect(model.deleteTooltip).toBe('Cannot delete the Global namespace');
  });

  it('should block deletion of default namespace', () => {
    const items = [makeNamespace({ id: 'ns-1', name: 'My NS', isDefault: true, locked: false })];
    ({ model, cleanup } = createTestModel({
      itemsStore: () => items
    }));

    model.selectItem(items[0]);
    flushSync();

    expect(model.canDelete).toBe(false);
    expect(model.deleteTooltip).toBe('Cannot delete the default namespace');
  });

  it('should allow deletion of non-default, non-locked, empty namespace', () => {
    const items = [makeNamespace({ id: 'ns-1', name: 'Regular', isDefault: false, locked: false })];
    ({ model, cleanup } = createTestModel({
      itemsStore: () => items,
      getNamespaceEntityDetails: () => emptyDetails
    }));

    model.selectItem(items[0]);
    flushSync();

    expect(model.canDelete).toBe(true);
    expect(model.deleteTooltip).toBe('');
  });
});

describe('namespacesModel - Save (Update)', () => {
  let model: CrudModelState<Namespace>;
  let cleanup: () => void;

  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanup?.());

  it('should not save when form is invalid', async () => {
    const items = [makeNamespace({ id: 'ns-1', name: 'test' })];
    ({ model, cleanup } = createTestModel({
      itemsStore: () => items
    }));

    model.selectItem(items[0]);
    flushSync();
    model.editedItem!.name = '';
    flushSync();

    await model.handleSave();

    expect(updateNamespaceApi).not.toHaveBeenCalled();
  });

  it('should call updateNamespaceApi on successful save', async () => {
    const items = [makeNamespace({ id: 'ns-1', name: 'test' })];
    ({ model, cleanup } = createTestModel({
      itemsStore: () => items
    }));

    const updated = makeNamespace({ id: 'ns-1', name: 'updated' });
    (updateNamespaceApi as Mock).mockResolvedValue(updated);

    model.selectItem(items[0]);
    flushSync();
    model.editedItem!.name = 'updated';
    flushSync();

    await model.handleSave();

    expect(updateNamespaceApi).toHaveBeenCalledWith('ns-1', expect.objectContaining({
      name: 'updated'
    }));
    expect(showToast).toHaveBeenCalledWith(
      expect.stringContaining('updated successfully'),
      'success',
      3000
    );
  });

  it('should show error toast on save failure', async () => {
    const items = [makeNamespace({ id: 'ns-1', name: 'test' })];
    ({ model, cleanup } = createTestModel({
      itemsStore: () => items
    }));

    (updateNamespaceApi as Mock).mockRejectedValue(new Error('Server error'));
    (mapApiError as Mock).mockReturnValue('Server error');

    model.selectItem(items[0]);
    flushSync();
    model.editedItem!.name = 'updated';
    flushSync();

    await model.handleSave();

    expect(showToast).toHaveBeenCalledWith('Server error', 'error', 5000);
  });

  it('should set server error when name already exists', async () => {
    const items = [makeNamespace({ id: 'ns-1', name: 'test' })];
    ({ model, cleanup } = createTestModel({
      itemsStore: () => items
    }));

    (updateNamespaceApi as Mock).mockRejectedValue(new Error('conflict'));
    (mapApiError as Mock).mockReturnValue('Namespace name already exists');

    model.selectItem(items[0]);
    flushSync();
    model.editedItem!.name = 'duplicate';
    flushSync();

    await model.handleSave();
    flushSync();

    expect(model.visibleErrors).toEqual(
      expect.objectContaining({ name: 'Namespace name already exists' })
    );
  });

  it('should send name and description in payload', async () => {
    const items = [makeNamespace({ id: 'ns-1', name: 'test', description: 'desc' })];
    ({ model, cleanup } = createTestModel({
      itemsStore: () => items
    }));

    const updated = makeNamespace({ id: 'ns-1', name: 'test', description: 'new desc' });
    (updateNamespaceApi as Mock).mockResolvedValue(updated);

    model.selectItem(items[0]);
    flushSync();
    model.editedItem!.description = 'new desc';
    flushSync();

    await model.handleSave();

    expect(updateNamespaceApi).toHaveBeenCalledWith('ns-1', {
      name: 'test',
      description: 'new desc'
    });
  });

  it('should send only isDefault for locked namespace', async () => {
    const items = [makeNamespace({ id: 'global-id', name: 'Global', isDefault: false, locked: true })];
    ({ model, cleanup } = createTestModel({
      itemsStore: () => items
    }));

    (updateNamespaceApi as Mock).mockResolvedValue(
      makeNamespace({ id: 'global-id', name: 'Global', isDefault: true, locked: true })
    );

    model.selectItem(items[0]);
    flushSync();

    model.editedItem!.isDefault = true;
    flushSync();

    await model.handleSave();

    expect(updateNamespaceApi).toHaveBeenCalledWith('global-id', { isDefault: true });
    const payload = (updateNamespaceApi as Mock).mock.calls[0][1];
    expect(payload).not.toHaveProperty('name');
    expect(payload).not.toHaveProperty('description');
  });

  it('should send name and description for non-locked namespace', async () => {
    const items = [makeNamespace({ id: 'ns-1', name: 'My NS', description: 'My desc', isDefault: false, locked: false })];
    ({ model, cleanup } = createTestModel({
      itemsStore: () => items
    }));

    (updateNamespaceApi as Mock).mockResolvedValue(
      makeNamespace({ id: 'ns-1', name: 'My NS', description: 'Updated desc' })
    );

    model.selectItem(items[0]);
    flushSync();

    model.editedItem!.description = 'Updated desc';
    flushSync();

    await model.handleSave();

    const payload = (updateNamespaceApi as Mock).mock.calls[0][1];
    expect(payload).toHaveProperty('name', 'My NS');
    expect(payload).toHaveProperty('description', 'Updated desc');
  });
});

describe('namespacesModel - Delete', () => {
  let model: CrudModelState<Namespace>;
  let cleanup: () => void;

  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanup?.());

  it('should call deleteNamespaceApi on delete', async () => {
    const items = [makeNamespace({ id: 'ns-1', name: 'test' })];
    ({ model, cleanup } = createTestModel({
      itemsStore: () => items
    }));

    (getNamespaceById as Mock).mockReturnValue(items[0]);
    (getNamespaceEntityCount as Mock).mockReturnValue(0);
    (deleteNamespaceApi as Mock).mockResolvedValue(undefined);

    model.selectItem(items[0]);
    flushSync();
    await model.handleDelete();

    expect(deleteNamespaceApi).toHaveBeenCalledWith('ns-1');
    expect(showToast).toHaveBeenCalledWith(
      expect.stringContaining('deleted successfully'),
      'success',
      3000
    );
  });

  it('should show error toast on delete failure', async () => {
    const items = [makeNamespace({ id: 'ns-1', name: 'test' })];
    ({ model, cleanup } = createTestModel({
      itemsStore: () => items
    }));

    (getNamespaceById as Mock).mockReturnValue(items[0]);
    (getNamespaceEntityCount as Mock).mockReturnValue(0);
    (deleteNamespaceApi as Mock).mockRejectedValue(new Error('Delete failed'));
    (mapApiError as Mock).mockReturnValue('Delete failed');

    model.selectItem(items[0]);
    flushSync();
    await model.handleDelete();

    expect(showToast).toHaveBeenCalledWith('Delete failed', 'error', 5000);
  });
});

describe('namespacesModel - Undo', () => {
  let model: CrudModelState<Namespace>;
  let cleanup: () => void;

  afterEach(() => cleanup?.());

  it('should restore editedItem from originalItem', () => {
    const items = [makeNamespace({ id: 'ns-1', name: 'original' })];
    ({ model, cleanup } = createTestModel({
      itemsStore: () => items
    }));

    model.selectItem(items[0]);
    flushSync();

    model.editedItem!.name = 'changed';
    flushSync();
    expect(model.editedItem!.name).toBe('changed');

    model.handleUndo();
    flushSync();

    expect(model.editedItem!.name).toBe('original');
  });
});

describe('namespacesModel - Create Payload', () => {
  let model: CrudModelState<Namespace>;
  let cleanup: () => void;

  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanup?.());

  it('should include isDefault when true', async () => {
    ({ model, cleanup } = createTestModel());

    const created = makeNamespace({ id: 'ns-new', name: 'New NS', isDefault: true });
    (createNamespaceApi as Mock).mockResolvedValue(created);

    model.openCreate();
    flushSync();

    model.editedItem!.name = 'New NS';
    model.editedItem!.isDefault = true;
    flushSync();

    await model.handleCreate();

    expect(createNamespaceApi).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'New NS', isDefault: true })
    );
  });

  it('should omit isDefault when false', async () => {
    ({ model, cleanup } = createTestModel());

    const created = makeNamespace({ id: 'ns-new', name: 'New NS' });
    (createNamespaceApi as Mock).mockResolvedValue(created);

    model.openCreate();
    flushSync();

    model.editedItem!.name = 'New NS';
    flushSync();

    await model.handleCreate();

    const payload = (createNamespaceApi as Mock).mock.calls[0][0];
    expect(payload).not.toHaveProperty('isDefault');
  });
});

describe('namespacesModel - isSelected', () => {
  let model: CrudModelState<Namespace>;
  let cleanup: () => void;

  afterEach(() => cleanup?.());

  it('should return true for the selected item', () => {
    const items = [
      makeNamespace({ id: 'ns-1', name: 'first' }),
      makeNamespace({ id: 'ns-2', name: 'second' })
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
