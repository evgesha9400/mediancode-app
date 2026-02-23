// tests/unit/lib/stores/namespacesModel.test.ts
//
// Unit tests for the Namespaces per-entity CRUD model.
// Tests entity-specific logic: validation, payload mapping, deletion guard
// (locked + entity count), locked namespace save guard, and CRUD action flows.
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

vi.mock('$lib/domain/mutations', () => ({
  createNamespaceAction: vi.fn(),
  updateNamespaceAction: vi.fn(),
  deleteNamespaceAction: vi.fn()
}));

vi.mock('$lib/stores/toasts', () => ({
  showToast: vi.fn()
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { createNamespacesModel, type NamespacesModelConfig, type NamespacesModelState } from '$lib/stores/namespacesModel.svelte';
import { updateNamespaceAction, deleteNamespaceAction } from '$lib/domain/mutations';
import { showToast } from '$lib/stores/toasts';
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

function createTestModel(overrides: Partial<NamespacesModelConfig> = {}): {
  model: NamespacesModelState;
  cleanup: () => void;
} {
  let model!: NamespacesModelState;

  const cleanup = effect_root(() => {
    model = createNamespacesModel({
      itemsStore: () => [],
      searchFn: (items, query) => {
        if (!query) return items;
        return items.filter(i => i.name.toLowerCase().includes(query.toLowerCase()));
      },
      filterSections: [],
      urlScope: { page: page as any, goto: goto as any },
      getNamespaceEntityDetails: () => emptyDetails,
      ...overrides
    });
  });

  return { model, cleanup };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('namespacesModel - Initial State', () => {
  let model: NamespacesModelState;
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
  let model: NamespacesModelState;
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
  let model: NamespacesModelState;
  let cleanup: () => void;

  afterEach(() => cleanup?.());

  it('should allow deletion when namespace is empty and unlocked', () => {
    const items = [makeNamespace({ id: 'ns-1', name: 'empty', locked: false })];
    ({ model, cleanup } = createTestModel({
      itemsStore: () => items,
      getNamespaceEntityDetails: () => emptyDetails
    }));

    model.selectItem(items[0]);
    flushSync();

    expect(model.canDelete).toBe(true);
    expect(model.deleteTooltip).toBe('');
  });

  it('should block deletion when namespace is locked', () => {
    const items = [makeNamespace({ id: 'ns-1', name: 'locked', locked: true })];
    ({ model, cleanup } = createTestModel({
      itemsStore: () => items,
      getNamespaceEntityDetails: () => emptyDetails
    }));

    model.selectItem(items[0]);
    flushSync();

    expect(model.canDelete).toBe(false);
    expect(model.deleteTooltip).toContain('locked');
  });

  it('should block deletion when namespace contains entities', () => {
    const items = [makeNamespace({ id: 'ns-1', name: 'populated', locked: false })];
    ({ model, cleanup } = createTestModel({
      itemsStore: () => items,
      getNamespaceEntityDetails: () => nonEmptyDetails
    }));

    model.selectItem(items[0]);
    flushSync();

    expect(model.canDelete).toBe(false);
    expect(model.deleteTooltip).toContain('5');
  });
});

describe('namespacesModel - Save (Update)', () => {
  let model: NamespacesModelState;
  let cleanup: () => void;

  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanup?.());

  it('should block save on locked namespaces', async () => {
    const items = [makeNamespace({ id: 'ns-1', name: 'locked', locked: true })];
    ({ model, cleanup } = createTestModel({
      itemsStore: () => items
    }));

    model.selectItem(items[0]);
    flushSync();

    await model.handleSave();

    expect(updateNamespaceAction).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(
      expect.stringContaining('locked'),
      'error',
      3000
    );
  });

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

    expect(updateNamespaceAction).not.toHaveBeenCalled();
  });

  it('should call updateNamespaceAction on successful save', async () => {
    const items = [makeNamespace({ id: 'ns-1', name: 'test' })];
    ({ model, cleanup } = createTestModel({
      itemsStore: () => items
    }));

    const updated = makeNamespace({ id: 'ns-1', name: 'updated' });
    (updateNamespaceAction as Mock).mockResolvedValue({ success: true, data: updated });

    model.selectItem(items[0]);
    flushSync();
    model.editedItem!.name = 'updated';
    flushSync();

    await model.handleSave();

    expect(updateNamespaceAction).toHaveBeenCalledWith('ns-1', expect.objectContaining({
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

    (updateNamespaceAction as Mock).mockResolvedValue({ success: false, error: 'Server error' });

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

    (updateNamespaceAction as Mock).mockResolvedValue({
      success: false,
      error: 'Namespace name already exists'
    });

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
    (updateNamespaceAction as Mock).mockResolvedValue({ success: true, data: updated });

    model.selectItem(items[0]);
    flushSync();
    model.editedItem!.description = 'new desc';
    flushSync();

    await model.handleSave();

    expect(updateNamespaceAction).toHaveBeenCalledWith('ns-1', {
      name: 'test',
      description: 'new desc'
    });
  });
});

describe('namespacesModel - Delete', () => {
  let model: NamespacesModelState;
  let cleanup: () => void;

  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanup?.());

  it('should call deleteNamespaceAction on delete', async () => {
    const items = [makeNamespace({ id: 'ns-1', name: 'test' })];
    ({ model, cleanup } = createTestModel({
      itemsStore: () => items
    }));

    (deleteNamespaceAction as Mock).mockResolvedValue({ success: true });

    model.selectItem(items[0]);
    flushSync();
    await model.handleDelete();

    expect(deleteNamespaceAction).toHaveBeenCalledWith('ns-1');
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

    (deleteNamespaceAction as Mock).mockResolvedValue({ success: false, error: 'Delete failed' });

    model.selectItem(items[0]);
    flushSync();
    await model.handleDelete();

    expect(showToast).toHaveBeenCalledWith('Delete failed', 'error', 5000);
  });
});

describe('namespacesModel - Undo', () => {
  let model: NamespacesModelState;
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

describe('namespacesModel - isSelected', () => {
  let model: NamespacesModelState;
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
