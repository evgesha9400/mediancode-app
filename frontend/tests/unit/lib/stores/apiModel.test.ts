// tests/unit/lib/stores/apiModel.test.ts
//
// Unit tests for the API per-entity CRUD model.
// Tests entity-specific logic: validation, draft creation, payload mapping,
// deletion guard, and CRUD action flows (save, create, delete).

import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import type { Api } from '$lib/types';

// ---------------------------------------------------------------------------
// Mocks -- must be declared before imports that use them
// ---------------------------------------------------------------------------

// Mock SvelteKit app modules
vi.mock('$app/environment', () => ({ browser: false }));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
vi.mock('$app/state', () => ({
  page: {
    url: new URL('http://localhost/apis'),
    params: {},
    route: { id: '/apis' },
    status: 200,
    error: null,
    data: {},
    form: null,
    state: {}
  }
}));

// Mock API transport
vi.mock('$lib/api/apis', () => ({
  createApiApi: vi.fn(),
  updateApiApi: vi.fn(),
  deleteApiApi: vi.fn()
}));

// Mock error mapping
vi.mock('$lib/domain/errorMap', () => ({
  mapApiError: vi.fn((_err: unknown, context: string) => `Failed to ${context}`)
}));

// Mock toast notifications
vi.mock('$lib/stores/toasts', () => ({
  showToast: vi.fn()
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { createApiModel, type ApiModelConfig, type ApiModelState } from '$lib/stores/apiModel.svelte';
import { createApiApi, updateApiApi, deleteApiApi } from '$lib/api/apis';
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

function makeApi(overrides: Partial<Api> & { id: string; title: string }): Api {
  return {
    namespaceId: 'ns-1',
    version: '1.0.0',
    description: '',
    baseUrl: '/api/v1',
    serverUrl: '',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    ...overrides
  };
}

/** Wraps model creation in an effect root so $effect runes work outside components */
function createTestModel(overrides: Partial<ApiModelConfig> = {}): {
  model: ApiModelState;
  cleanup: () => void;
} {
  let model!: ApiModelState;

  const cleanup = effect_root(() => {
    model = createApiModel({
      itemsStore: () => [],
      searchFn: (items, query) => {
        if (!query) return items;
        return items.filter(i => i.title.toLowerCase().includes(query.toLowerCase()));
      },
      filterSections: () => [],
      urlScope: { page: page as any, goto: goto as any },
      getActiveNamespaceId: () => 'ns-1',
      getEndpointCount: () => 0,
      ...overrides
    });
  });

  return { model, cleanup };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('apiModel - Initial State', () => {
  let model: ApiModelState;
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

describe('apiModel - Validation', () => {
  let model: ApiModelState;
  let cleanup: () => void;

  afterEach(() => cleanup?.());

  it('should require API title', () => {
    ({ model, cleanup } = createTestModel());

    model.openCreate();
    flushSync();

    expect(model.editedItem).not.toBeNull();
    expect(model.editedItem!.title).toBe('');
    expect(model.isFormValid).toBe(false);
  });

  it('should be valid when title is provided', () => {
    ({ model, cleanup } = createTestModel());

    model.openCreate();
    flushSync();

    model.editedItem!.title = 'MyApi';
    flushSync();

    expect(model.isFormValid).toBe(true);
  });

  it('should reject snake_case title', () => {
    ({ model, cleanup } = createTestModel());

    model.openCreate();
    flushSync();

    model.editedItem!.title = 'my_api';
    flushSync();

    expect(model.isFormValid).toBe(false);
  });

  it('should reject title with consecutive uppercase', () => {
    ({ model, cleanup } = createTestModel());

    model.openCreate();
    flushSync();

    model.editedItem!.title = 'MyAPI';
    flushSync();

    expect(model.isFormValid).toBe(false);
  });

  it('should accept valid PascalCase title', () => {
    ({ model, cleanup } = createTestModel());

    model.openCreate();
    flushSync();

    model.editedItem!.title = 'MyApi';
    flushSync();

    expect(model.isFormValid).toBe(true);
  });
});

describe('apiModel - Draft Creation', () => {
  let model: ApiModelState;
  let cleanup: () => void;

  afterEach(() => cleanup?.());

  it('should create draft with active namespace and defaults', () => {
    ({ model, cleanup } = createTestModel({
      getActiveNamespaceId: () => 'custom-ns'
    }));

    model.openCreate();
    flushSync();

    expect(model.editedItem).not.toBeNull();
    expect(model.editedItem!.id).toBe('');
    expect(model.editedItem!.namespaceId).toBe('custom-ns');
    expect(model.editedItem!.title).toBe('');
    expect(model.editedItem!.version).toBe('1.0.0');
    expect(model.editedItem!.baseUrl).toBe('/api/v1');
    expect(model.editedItem!.serverUrl).toBe('');
    expect(model.editedItem!.description).toBe('');
  });

  it('should set drawer mode to creating', () => {
    ({ model, cleanup } = createTestModel());

    model.openCreate();
    flushSync();

    expect(model.mode).toBe('creating');
    expect(model.drawerOpen).toBe(true);
  });
});

describe('apiModel - Deletion Guard', () => {
  let model: ApiModelState;
  let cleanup: () => void;

  afterEach(() => cleanup?.());

  it('should always allow deletion (APIs have no deletion guard)', () => {
    const items = [makeApi({ id: 'a-1', title: 'Test API' })];
    ({ model, cleanup } = createTestModel({
      itemsStore: () => items
    }));

    model.selectItem(items[0]);
    flushSync();

    expect(model.canDelete).toBe(true);
    expect(model.deleteTooltip).toBe('');
  });
});

describe('apiModel - Save (Update)', () => {
  let model: ApiModelState;
  let cleanup: () => void;

  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => cleanup?.());

  it('should no-op when editedItem is null (trackEdits: false)', async () => {
    // API model uses trackEdits: false, so selectItem does NOT populate editedItem.
    // handleSave guards on !editedItem and returns early.
    const items = [makeApi({ id: 'a-1', title: 'Test API' })];
    ({ model, cleanup } = createTestModel({
      itemsStore: () => items
    }));

    model.selectItem(items[0]);
    flushSync();

    expect(model.editedItem).toBeNull();
    await model.handleSave();

    expect(updateApiApi).not.toHaveBeenCalled();
  });
});

describe('apiModel - Create', () => {
  let model: ApiModelState;
  let cleanup: () => void;

  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => cleanup?.());

  it('should call createApiApi with correct payload', async () => {
    ({ model, cleanup } = createTestModel());
    const newApi = makeApi({ id: 'a-new', title: 'NewApi' });
    (createApiApi as Mock).mockResolvedValue(newApi);

    model.openCreate();
    flushSync();
    model.editedItem!.title = 'NewApi';
    flushSync();

    await model.handleCreate();

    expect(createApiApi).toHaveBeenCalledWith(expect.objectContaining({
      namespaceId: 'ns-1',
      title: 'NewApi',
      version: '1.0.0',
      baseUrl: '/api/v1'
    }));
    expect(showToast).toHaveBeenCalledWith(
      expect.stringContaining('created successfully'),
      'success',
      3000
    );
  });

  it('should navigate to new API detail page after creation', async () => {
    ({ model, cleanup } = createTestModel());
    const newApi = makeApi({ id: 'a-new', title: 'NewApi' });
    (createApiApi as Mock).mockResolvedValue(newApi);

    model.openCreate();
    flushSync();
    model.editedItem!.title = 'NewApi';
    flushSync();

    await model.handleCreate();

    expect(goto).toHaveBeenCalledWith('/apis/a-new');
  });

  it('should not create when form is invalid', async () => {
    ({ model, cleanup } = createTestModel());

    model.openCreate();
    flushSync();
    // title is empty -- form invalid

    await model.handleCreate();

    expect(createApiApi).not.toHaveBeenCalled();
  });

  it('should handle create failure', async () => {
    ({ model, cleanup } = createTestModel());
    (createApiApi as Mock).mockRejectedValue(new Error('Create failed'));
    (mapApiError as Mock).mockReturnValue('Create failed');

    model.openCreate();
    flushSync();
    model.editedItem!.title = 'NewApi';
    flushSync();

    await model.handleCreate();

    expect(showToast).toHaveBeenCalledWith('Create failed', 'error', 5000);
  });
});

describe('apiModel - Delete', () => {
  let model: ApiModelState;
  let cleanup: () => void;

  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => cleanup?.());

  it('should no-op when editedItem is null (trackEdits: false)', async () => {
    // API model uses trackEdits: false, so selectItem does NOT populate editedItem.
    // handleDelete guards on !editedItem and returns early.
    const items = [makeApi({ id: 'a-1', title: 'Test API' })];
    ({ model, cleanup } = createTestModel({
      itemsStore: () => items
    }));

    model.selectItem(items[0]);
    flushSync();

    expect(model.editedItem).toBeNull();
    await model.handleDelete();

    expect(deleteApiApi).not.toHaveBeenCalled();
  });
});

describe('apiModel - Undo', () => {
  let model: ApiModelState;
  let cleanup: () => void;

  afterEach(() => cleanup?.());

  it('should no-op when originalItem is null (trackEdits: false)', () => {
    // API model uses trackEdits: false, so selectItem does NOT populate originalItem.
    // handleUndo guards on !originalItem and returns early.
    const items = [makeApi({ id: 'a-1', title: 'Test API' })];
    ({ model, cleanup } = createTestModel({
      itemsStore: () => items
    }));

    model.selectItem(items[0]);
    flushSync();

    expect(model.originalItem).toBeNull();
    model.handleUndo();
    // No error thrown — simply a no-op
  });
});

describe('apiModel - isSelected', () => {
  let model: ApiModelState;
  let cleanup: () => void;

  afterEach(() => cleanup?.());

  it('should return true for the selected item', () => {
    const items = [
      makeApi({ id: 'a-1', title: 'API One' }),
      makeApi({ id: 'a-2', title: 'API Two' })
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
