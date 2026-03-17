/**
 * API Detail State Tests
 *
 * Unit tests for the apiDetailState store.
 * Location mirrors: src/lib/stores/apiDetailState.svelte.ts
 *
 * Tests the createApiDetailState factory: initial state, edit drawer,
 * endpoint drawer, tag sections, and CRUD action flows.
 */

import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import type { Api, ApiEndpoint } from '$lib/types';

// ---------------------------------------------------------------------------
// Mocks -- must be declared before imports that use them
// ---------------------------------------------------------------------------

vi.mock('$app/environment', () => ({ browser: false }));

vi.mock('$lib/stores/apis', () => {
  const { writable } = require('svelte/store');
  const apisStore = writable([]);
  const endpointsStore = writable([]);
  return {
    apisStore,
    endpointsStore,
    getEndpointCountByTagName: vi.fn(() => 0)
  };
});

vi.mock('$lib/stores/toasts', () => ({
  showToast: vi.fn()
}));

vi.mock('$lib/domain/mutations', () => ({
  updateApiAction: vi.fn(),
  deleteApiAction: vi.fn(),
  createEndpointAction: vi.fn(),
  updateEndpointAction: vi.fn(),
  deleteEndpointAction: vi.fn()
}));

vi.mock('$lib/domain/endpointReducer', () => ({
  reconcilePathParams: vi.fn((path: string, params: any[]) => ({ path, pathParams: params })),
  normalizeEndpoint: vi.fn((ep: ApiEndpoint) => ({ ...ep, responseShape: ep.responseShape ?? 'object' }))
}));

vi.mock('$lib/utils/ids', () => ({
  deepClone: vi.fn((obj: any) => JSON.parse(JSON.stringify(obj)))
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import {
  createApiDetailState,
  type ApiDetailState,
  type ApiDetailStateConfig,
  type TagSection
} from '$lib/stores/apiDetailState.svelte';
import { apisStore, endpointsStore, getEndpointCountByTagName } from '$lib/stores/apis';
import {
  updateApiAction,
  deleteApiAction,
  createEndpointAction,
  updateEndpointAction,
  deleteEndpointAction
} from '$lib/domain/mutations';
import { showToast } from '$lib/stores/toasts';
import { effect_root } from 'svelte/internal/client';
import { flushSync } from 'svelte';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeApi(overrides: Partial<Api> & { id: string }): Api {
  return {
    namespaceId: 'ns-1',
    title: 'Test API',
    version: '1.0.0',
    description: 'A test API',
    serverUrl: 'http://localhost',
    baseUrl: '/api',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides
  };
}

function makeEndpoint(overrides: Partial<ApiEndpoint> & { id: string; apiId: string }): ApiEndpoint {
  return {
    method: 'GET',
    path: '/',
    description: '',
    pathParams: [],
    queryParams: [],
    useEnvelope: true,
    responseShape: 'object',
    ...overrides
  };
}

function createTestState(overrides: Partial<ApiDetailStateConfig> = {}): {
  state: ApiDetailState;
  cleanup: () => void;
} {
  let state!: ApiDetailState;

  const cleanup = effect_root(() => {
    state = createApiDetailState({
      apiId: 'api-1',
      onNavigateBack: vi.fn(),
      ...overrides
    });
  });

  return { state, cleanup };
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  apisStore.set([]);
  endpointsStore.set([]);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('apiDetailState - Exports', () => {
  it('should export createApiDetailState as a function', () => {
    expect(typeof createApiDetailState).toBe('function');
  });
});

describe('apiDetailState - Initial State', () => {
  let state: ApiDetailState;
  let cleanup: () => void;

  afterEach(() => cleanup?.());

  it('should return null api when no matching API exists', () => {
    ({ state, cleanup } = createTestState());

    expect(state.api).toBeNull();
    expect(state.apiNamespaceId).toBe('');
    expect(state.tags).toEqual([]);
    expect(state.endpoints).toEqual([]);
  });

  it('should resolve api from store when it exists', () => {
    const api = makeApi({ id: 'api-1', title: 'My API' });
    apisStore.set([api]);
    flushSync();

    ({ state, cleanup } = createTestState());
    flushSync();

    expect(state.api).not.toBeNull();
    expect(state.api!.title).toBe('My API');
    expect(state.apiNamespaceId).toBe('ns-1');
  });

  it('should start with drawers closed', () => {
    ({ state, cleanup } = createTestState());

    expect(state.editDrawerOpen).toBe(false);
    expect(state.endpointDrawerOpen).toBe(false);
    expect(state.showEditDeleteConfirm).toBe(false);
    expect(state.showEndpointDeleteConfirm).toBe(false);
    expect(state.isSaving).toBe(false);
  });

  it('should have no endpoint selected initially', () => {
    ({ state, cleanup } = createTestState());

    expect(state.selectedEndpoint).toBeNull();
    expect(state.editedEndpoint).toBeNull();
    expect(state.hasEndpointChanges).toBe(false);
  });
});

describe('apiDetailState - Derived Tags', () => {
  let state: ApiDetailState;
  let cleanup: () => void;

  afterEach(() => cleanup?.());

  it('should derive unique tags from endpoints', () => {
    apisStore.set([makeApi({ id: 'api-1' })]);
    endpointsStore.set([
      makeEndpoint({ id: 'ep-1', apiId: 'api-1', tagName: 'users' }),
      makeEndpoint({ id: 'ep-2', apiId: 'api-1', tagName: 'auth' }),
      makeEndpoint({ id: 'ep-3', apiId: 'api-1', tagName: 'users' })
    ]);
    flushSync();

    ({ state, cleanup } = createTestState());
    flushSync();

    expect(state.tags).toEqual(['auth', 'users']);
  });

  it('should only include endpoints for this API', () => {
    apisStore.set([makeApi({ id: 'api-1' }), makeApi({ id: 'api-2' })]);
    endpointsStore.set([
      makeEndpoint({ id: 'ep-1', apiId: 'api-1', path: '/users' }),
      makeEndpoint({ id: 'ep-2', apiId: 'api-2', path: '/products' })
    ]);
    flushSync();

    ({ state, cleanup } = createTestState());
    flushSync();

    expect(state.endpoints).toHaveLength(1);
    expect(state.endpoints[0].path).toBe('/users');
  });
});

describe('apiDetailState - Tag Sections', () => {
  let state: ApiDetailState;
  let cleanup: () => void;

  afterEach(() => cleanup?.());

  it('should group endpoints by tag', () => {
    apisStore.set([makeApi({ id: 'api-1' })]);
    endpointsStore.set([
      makeEndpoint({ id: 'ep-1', apiId: 'api-1', tagName: 'users' }),
      makeEndpoint({ id: 'ep-2', apiId: 'api-1', tagName: 'auth' }),
      makeEndpoint({ id: 'ep-3', apiId: 'api-1', tagName: 'users' })
    ]);
    flushSync();

    ({ state, cleanup } = createTestState());
    flushSync();

    expect(state.allTagSections.length).toBeGreaterThanOrEqual(2);
    const usersSection = state.allTagSections.find((s: TagSection) => s.tag === 'users');
    expect(usersSection?.endpoints).toHaveLength(2);
  });

  it('should put endpoints without tag into default group', () => {
    apisStore.set([makeApi({ id: 'api-1' })]);
    endpointsStore.set([
      makeEndpoint({ id: 'ep-1', apiId: 'api-1' }) // no tagName
    ]);
    flushSync();

    ({ state, cleanup } = createTestState());
    flushSync();

    const defaultSection = state.allTagSections.find((s: TagSection) => s.tag === 'default');
    expect(defaultSection).toBeDefined();
    expect(defaultSection!.endpoints).toHaveLength(1);
  });

  it('should toggle tag section expanded state', () => {
    apisStore.set([makeApi({ id: 'api-1' })]);
    endpointsStore.set([
      makeEndpoint({ id: 'ep-1', apiId: 'api-1', tagName: 'users' })
    ]);
    flushSync();

    ({ state, cleanup } = createTestState());
    flushSync();

    // Tags start expanded after initialization
    const initiallyExpanded = state.expandedTags.has('users');

    state.toggleTagSection('users');
    flushSync();

    expect(state.expandedTags.has('users')).toBe(!initiallyExpanded);
  });
});

describe('apiDetailState - Edit API Drawer', () => {
  let state: ApiDetailState;
  let cleanup: () => void;

  beforeEach(() => {
    apisStore.set([makeApi({ id: 'api-1', title: 'My API', version: '1.0.0' })]);
    flushSync();
  });
  afterEach(() => cleanup?.());

  it('should populate edit form when opening drawer', () => {
    ({ state, cleanup } = createTestState());
    flushSync();

    state.openEditDrawer();
    flushSync();

    expect(state.editDrawerOpen).toBe(true);
    expect(state.editForm.title).toBe('My API');
    expect(state.editForm.version).toBe('1.0.0');
    expect(state.hasEditChanges).toBe(false);
  });

  it('should detect edit changes', () => {
    ({ state, cleanup } = createTestState());
    flushSync();

    state.openEditDrawer();
    flushSync();

    state.editForm = { ...state.editForm, title: 'Changed Title' };
    flushSync();

    expect(state.hasEditChanges).toBe(true);
  });

  it('should close edit drawer and reset delete confirm', () => {
    ({ state, cleanup } = createTestState());
    flushSync();

    state.openEditDrawer();
    flushSync();
    state.handleEditDeleteClick();
    flushSync();

    expect(state.showEditDeleteConfirm).toBe(true);

    state.closeEditDrawer();
    flushSync();

    expect(state.editDrawerOpen).toBe(false);
    expect(state.showEditDeleteConfirm).toBe(false);
  });

  it('should undo edit changes', () => {
    ({ state, cleanup } = createTestState());
    flushSync();

    state.openEditDrawer();
    flushSync();

    state.editForm = { ...state.editForm, title: 'Changed Title' };
    flushSync();
    expect(state.hasEditChanges).toBe(true);

    state.handleEditUndo();
    flushSync();

    expect(state.editForm.title).toBe('My API');
    expect(state.hasEditChanges).toBe(false);
  });

  it('should call updateApiAction on edit save', async () => {
    (updateApiAction as Mock).mockResolvedValue({ success: true });

    ({ state, cleanup } = createTestState());
    flushSync();

    state.openEditDrawer();
    flushSync();

    state.editForm = { ...state.editForm, title: 'UpdatedTitle' };
    flushSync();

    await state.handleEditSave();

    expect(updateApiAction).toHaveBeenCalledWith('api-1', expect.objectContaining({
      title: 'UpdatedTitle'
    }));
    expect(showToast).toHaveBeenCalledWith(
      expect.stringContaining('saved'),
      'success'
    );
  });

  it('should show error toast on edit save failure', async () => {
    (updateApiAction as Mock).mockResolvedValue({ success: false, error: 'Save failed' });

    ({ state, cleanup } = createTestState());
    flushSync();

    state.openEditDrawer();
    flushSync();

    state.editForm = { ...state.editForm, title: 'Updated' };
    flushSync();

    await state.handleEditSave();

    expect(showToast).toHaveBeenCalledWith('Save failed', 'error');
  });
});

describe('apiDetailState - Edit Form Validation', () => {
  let state: ApiDetailState;
  let cleanup: () => void;

  beforeEach(() => {
    apisStore.set([makeApi({ id: 'api-1', title: 'MyApi', version: '1.0.0' })]);
    flushSync();
  });
  afterEach(() => cleanup?.());

  it('should have editFormErrors when title is empty', () => {
    ({ state, cleanup } = createTestState());
    flushSync();

    state.openEditDrawer();
    flushSync();

    state.editForm = { ...state.editForm, title: '' };
    flushSync();

    expect(state.editFormErrors.title).toBe('API title is required');
    expect(state.editFormValid).toBe(false);
  });

  it('should have editFormErrors when title is not PascalCase', () => {
    ({ state, cleanup } = createTestState());
    flushSync();

    state.openEditDrawer();
    flushSync();

    state.editForm = { ...state.editForm, title: 'my_api' };
    flushSync();

    expect(state.editFormErrors.title).toBe('Must be PascalCase (e.g. UserApi)');
    expect(state.editFormValid).toBe(false);
  });

  it('should have no editFormErrors when title is valid PascalCase', () => {
    ({ state, cleanup } = createTestState());
    flushSync();

    state.openEditDrawer();
    flushSync();

    state.editForm = { ...state.editForm, title: 'MyApi' };
    flushSync();

    expect(state.editFormErrors).toEqual({});
    expect(state.editFormValid).toBe(true);
  });

  it('should prevent save when title is invalid', async () => {
    ({ state, cleanup } = createTestState());
    flushSync();

    state.openEditDrawer();
    flushSync();

    state.editForm = { ...state.editForm, title: 'my_api' };
    flushSync();

    await state.handleEditSave();

    expect(updateApiAction).not.toHaveBeenCalled();
  });
});

describe('apiDetailState - Delete API', () => {
  let state: ApiDetailState;
  let cleanup: () => void;
  let onNavigateBack: Mock;

  beforeEach(() => {
    onNavigateBack = vi.fn();
    apisStore.set([makeApi({ id: 'api-1', title: 'My API' })]);
    flushSync();
  });
  afterEach(() => cleanup?.());

  it('should call deleteApiAction and navigate back on success', async () => {
    (deleteApiAction as Mock).mockResolvedValue({ success: true });

    ({ state, cleanup } = createTestState({ onNavigateBack }));
    flushSync();

    state.openEditDrawer();
    flushSync();

    await state.handleDeleteApi();

    expect(deleteApiAction).toHaveBeenCalledWith('api-1');
    expect(onNavigateBack).toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(
      expect.stringContaining('deleted'),
      'success'
    );
  });

  it('should show error toast on delete failure', async () => {
    (deleteApiAction as Mock).mockResolvedValue({ success: false, error: 'Delete failed' });

    ({ state, cleanup } = createTestState({ onNavigateBack }));
    flushSync();

    await state.handleDeleteApi();

    expect(onNavigateBack).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith('Delete failed', 'error');
  });

  it('should toggle edit delete confirmation', () => {
    ({ state, cleanup } = createTestState());
    flushSync();

    state.openEditDrawer();
    flushSync();

    expect(state.showEditDeleteConfirm).toBe(false);

    state.handleEditDeleteClick();
    flushSync();
    expect(state.showEditDeleteConfirm).toBe(true);

    state.cancelEditDelete();
    flushSync();
    expect(state.showEditDeleteConfirm).toBe(false);
  });
});

describe('apiDetailState - Endpoint Drawer', () => {
  let state: ApiDetailState;
  let cleanup: () => void;

  beforeEach(() => {
    apisStore.set([makeApi({ id: 'api-1' })]);
    endpointsStore.set([
      makeEndpoint({ id: 'ep-1', apiId: 'api-1', method: 'GET', path: '/users' })
    ]);
    flushSync();
  });
  afterEach(() => cleanup?.());

  it('should open endpoint drawer with cloned endpoint', () => {
    ({ state, cleanup } = createTestState());
    flushSync();

    const ep = state.endpoints[0];
    state.openEndpoint(ep);
    flushSync();

    expect(state.endpointDrawerOpen).toBe(true);
    expect(state.selectedEndpoint).not.toBeNull();
    expect(state.editedEndpoint).not.toBeNull();
    expect(state.editedEndpoint!.path).toBe('/users');
  });

  it('should track endpoint changes', () => {
    ({ state, cleanup } = createTestState());
    flushSync();

    const ep = state.endpoints[0];
    state.openEndpoint(ep);
    flushSync();

    expect(state.hasEndpointChanges).toBe(false);

    state.editedEndpoint = { ...state.editedEndpoint!, path: '/users/v2' };
    flushSync();

    expect(state.hasEndpointChanges).toBe(true);
  });

  it('should undo endpoint changes', () => {
    ({ state, cleanup } = createTestState());
    flushSync();

    const ep = state.endpoints[0];
    state.openEndpoint(ep);
    flushSync();

    state.editedEndpoint = { ...state.editedEndpoint!, path: '/changed' };
    flushSync();

    state.handleUndoEndpoint();
    flushSync();

    expect(state.editedEndpoint!.path).toBe('/users');
  });

  it('should manage endpoint delete confirmation state', () => {
    ({ state, cleanup } = createTestState());
    flushSync();

    state.openEndpoint(state.endpoints[0]);
    flushSync();

    expect(state.showEndpointDeleteConfirm).toBe(false);

    state.handleDeleteEndpointClick();
    flushSync();
    expect(state.showEndpointDeleteConfirm).toBe(true);

    state.cancelDeleteEndpoint();
    flushSync();
    expect(state.showEndpointDeleteConfirm).toBe(false);
  });
});

describe('apiDetailState - Endpoint CRUD', () => {
  let state: ApiDetailState;
  let cleanup: () => void;

  beforeEach(() => {
    vi.clearAllMocks();
    apisStore.set([makeApi({ id: 'api-1' })]);
    endpointsStore.set([
      makeEndpoint({ id: 'ep-1', apiId: 'api-1', method: 'GET', path: '/users' })
    ]);
    flushSync();
  });
  afterEach(() => cleanup?.());

  it('should open create drawer with defaults when adding endpoint', () => {
    ({ state, cleanup } = createTestState());
    flushSync();

    state.handleAddEndpoint();
    flushSync();

    expect(state.isCreating).toBe(true);
    expect(state.endpointDrawerOpen).toBe(true);
    expect(state.editedEndpoint).toEqual(expect.objectContaining({
      id: '',
      apiId: 'api-1',
      method: 'GET',
      path: '/'
    }));
    expect(createEndpointAction).not.toHaveBeenCalled();
  });

  it('should create endpoint via handleCreateEndpoint', async () => {
    const newEndpoint = makeEndpoint({ id: 'ep-new', apiId: 'api-1', path: '/items' });
    (createEndpointAction as Mock).mockResolvedValue({ success: true, data: newEndpoint });

    ({ state, cleanup } = createTestState());
    flushSync();

    state.handleAddEndpoint();
    flushSync();
    state.editedEndpoint = { ...state.editedEndpoint!, path: '/items' };
    flushSync();

    await state.handleCreateEndpoint();

    expect(createEndpointAction).toHaveBeenCalledWith(expect.objectContaining({
      apiId: 'api-1',
      method: 'GET',
      path: '/items'
    }));
    expect(showToast).toHaveBeenCalledWith('Endpoint created successfully', 'success');
    expect(state.isCreating).toBe(false);
  });

  it('should show error toast when creating endpoint fails', async () => {
    (createEndpointAction as Mock).mockResolvedValue({ success: false, error: 'Create failed' });

    ({ state, cleanup } = createTestState());
    flushSync();

    state.handleAddEndpoint();
    flushSync();

    await state.handleCreateEndpoint();

    expect(showToast).toHaveBeenCalledWith('Create failed', 'error');
  });

  it('should save endpoint via updateEndpointAction', async () => {
    const updatedEp = makeEndpoint({ id: 'ep-1', apiId: 'api-1', path: '/users/v2' });
    (updateEndpointAction as Mock).mockResolvedValue({ success: true, data: updatedEp });

    ({ state, cleanup } = createTestState());
    flushSync();

    state.openEndpoint(state.endpoints[0]);
    flushSync();
    state.editedEndpoint = { ...state.editedEndpoint!, path: '/users/v2' };
    flushSync();

    const result = await state.handleSaveEndpoint();

    expect(updateEndpointAction).toHaveBeenCalledWith('ep-1', expect.objectContaining({
      path: '/users/v2'
    }));
    expect(result).toBe(true);
  });

  it('should return false when endpoint save fails', async () => {
    (updateEndpointAction as Mock).mockResolvedValue({ success: false, error: 'Update failed' });

    ({ state, cleanup } = createTestState());
    flushSync();

    state.openEndpoint(state.endpoints[0]);
    flushSync();

    const result = await state.handleSaveEndpoint();

    expect(result).toBe(false);
    expect(showToast).toHaveBeenCalledWith('Update failed', 'error');
  });

  it('should delete endpoint via deleteEndpointAction', async () => {
    (deleteEndpointAction as Mock).mockResolvedValue({ success: true });

    ({ state, cleanup } = createTestState());
    flushSync();

    state.openEndpoint(state.endpoints[0]);
    flushSync();

    await state.handleDeleteEndpoint();

    expect(deleteEndpointAction).toHaveBeenCalledWith('ep-1');
    expect(showToast).toHaveBeenCalledWith(
      expect.stringContaining('deleted'),
      'success'
    );
  });

  it('should duplicate endpoint via createEndpointAction', async () => {
    const duplicate = makeEndpoint({ id: 'ep-dup', apiId: 'api-1', path: '/users-copy' });
    (createEndpointAction as Mock).mockResolvedValue({ success: true, data: duplicate });

    ({ state, cleanup } = createTestState());
    flushSync();

    await state.handleDuplicateEndpoint('ep-1');

    expect(createEndpointAction).toHaveBeenCalledWith(expect.objectContaining({
      path: '/users-copy'
    }));
    expect(showToast).toHaveBeenCalledWith(
      expect.stringContaining('duplicated'),
      'success'
    );
  });
});

describe('apiDetailState - Endpoint Editing Helpers', () => {
  let state: ApiDetailState;
  let cleanup: () => void;

  beforeEach(() => {
    apisStore.set([makeApi({ id: 'api-1' })]);
    endpointsStore.set([
      makeEndpoint({ id: 'ep-1', apiId: 'api-1', method: 'GET', path: '/users' })
    ]);
    flushSync();
  });
  afterEach(() => cleanup?.());

  it('should update query params object', () => {
    ({ state, cleanup } = createTestState());
    flushSync();

    state.openEndpoint(state.endpoints[0]);
    flushSync();

    state.handleSelectQueryParamsObject('obj-1');
    flushSync();

    expect(state.editedEndpoint!.queryParamsObjectId).toBe('obj-1');
  });

  it('should update object', () => {
    ({ state, cleanup } = createTestState());
    flushSync();

    state.openEndpoint(state.endpoints[0]);
    flushSync();

    state.handleSelectObject('obj-2');
    flushSync();

    expect(state.editedEndpoint!.objectId).toBe('obj-2');
  });

  it('should toggle envelope', () => {
    ({ state, cleanup } = createTestState());
    flushSync();

    state.openEndpoint(state.endpoints[0]);
    flushSync();

    state.handleEnvelopeToggle(false);
    flushSync();

    expect(state.editedEndpoint!.useEnvelope).toBe(false);
  });

  it('should set response shape', () => {
    ({ state, cleanup } = createTestState());
    flushSync();

    state.openEndpoint(state.endpoints[0]);
    flushSync();

    state.handleSetResponseShape('list');
    flushSync();

    expect(state.editedEndpoint!.responseShape).toBe('list');
  });

  it('should reset response defaults', () => {
    ({ state, cleanup } = createTestState());
    flushSync();

    state.openEndpoint(state.endpoints[0]);
    flushSync();

    state.handleEnvelopeToggle(false);
    state.handleSetResponseShape('list');
    state.handleSelectObject('obj-1');
    flushSync();

    state.handleResetResponseDefaults();
    flushSync();

    expect(state.editedEndpoint!.useEnvelope).toBe(true);
    expect(state.editedEndpoint!.responseShape).toBe('object');
    expect(state.editedEndpoint!.objectId).toBeUndefined();
  });

  it('should handle tag select', () => {
    ({ state, cleanup } = createTestState());
    flushSync();

    state.openEndpoint(state.endpoints[0]);
    flushSync();

    state.handleTagSelect('users');
    flushSync();

    expect(state.editedEndpoint!.tagName).toBe('users');
    expect(state.tagInputValue).toBe('users');
    expect(state.tagDropdownOpen).toBe(false);
  });

  it('should clear tag on undefined select', () => {
    ({ state, cleanup } = createTestState());
    flushSync();

    state.openEndpoint(state.endpoints[0]);
    flushSync();

    state.handleTagSelect(undefined);
    flushSync();

    expect(state.editedEndpoint!.tagName).toBeUndefined();
    expect(state.tagInputValue).toBe('');
  });
});

describe('apiDetailState - getEndpointsUsingTag', () => {
  let state: ApiDetailState;
  let cleanup: () => void;

  afterEach(() => cleanup?.());

  it('should delegate to getEndpointCountByTagName', () => {
    (getEndpointCountByTagName as Mock).mockReturnValue(3);

    ({ state, cleanup } = createTestState());
    flushSync();

    const count = state.getEndpointsUsingTag('users');

    expect(getEndpointCountByTagName).toHaveBeenCalledWith('api-1', 'users');
    expect(count).toBe(3);
  });
});

describe('apiDetailState - Pagination Toggle', () => {
  let state: ApiDetailState;
  let cleanup: () => void;

  beforeEach(() => {
    apisStore.set([makeApi({ id: 'api-1' })]);
    endpointsStore.set([
      makeEndpoint({ id: 'ep-1', apiId: 'api-1', method: 'GET', path: '/items', responseShape: 'list' })
    ]);
    flushSync();
  });
  afterEach(() => cleanup?.());

  it('should toggle pagination from false to true', () => {
    ({ state, cleanup } = createTestState());
    flushSync();

    state.openEndpoint(state.endpoints[0]);
    flushSync();

    expect(state.editedEndpoint!.pagination).toBeFalsy();

    state.handleTogglePagination();
    flushSync();

    expect(state.editedEndpoint!.pagination).toBe(true);
  });

  it('should toggle pagination from true to false', () => {
    endpointsStore.set([
      makeEndpoint({ id: 'ep-1', apiId: 'api-1', method: 'GET', path: '/items', responseShape: 'list', pagination: true })
    ]);
    flushSync();

    ({ state, cleanup } = createTestState());
    flushSync();

    state.openEndpoint(state.endpoints[0]);
    flushSync();

    expect(state.editedEndpoint!.pagination).toBe(true);

    state.handleTogglePagination();
    flushSync();

    expect(state.editedEndpoint!.pagination).toBe(false);
  });

  it('should start with pagination false for new endpoints', () => {
    ({ state, cleanup } = createTestState());
    flushSync();

    state.handleAddEndpoint();
    flushSync();

    expect(state.editedEndpoint!.pagination).toBe(false);
  });

  it('should clear pagination when target object changes', () => {
    ({ state, cleanup } = createTestState());
    flushSync();

    state.openEndpoint(state.endpoints[0]);
    flushSync();

    state.handleTogglePagination();
    flushSync();
    expect(state.editedEndpoint!.pagination).toBe(true);

    state.handleSelectObject('obj-new');
    flushSync();

    expect(state.editedEndpoint!.pagination).toBe(false);
  });

  it('should include pagination in create payload', async () => {
    const newEndpoint = makeEndpoint({ id: 'ep-new', apiId: 'api-1', path: '/items', pagination: true });
    (createEndpointAction as Mock).mockResolvedValue({ success: true, data: newEndpoint });

    ({ state, cleanup } = createTestState());
    flushSync();

    state.handleAddEndpoint();
    flushSync();
    state.editedEndpoint = { ...state.editedEndpoint!, path: '/items', pagination: true };
    flushSync();

    await state.handleCreateEndpoint();

    expect(createEndpointAction).toHaveBeenCalledWith(expect.objectContaining({
      pagination: true
    }));
  });

  it('should include pagination in update payload', async () => {
    const updatedEp = makeEndpoint({ id: 'ep-1', apiId: 'api-1', path: '/items', pagination: true });
    (updateEndpointAction as Mock).mockResolvedValue({ success: true, data: updatedEp });

    ({ state, cleanup } = createTestState());
    flushSync();

    state.openEndpoint(state.endpoints[0]);
    flushSync();

    state.handleTogglePagination();
    flushSync();

    await state.handleSaveEndpoint();

    expect(updateEndpointAction).toHaveBeenCalledWith('ep-1', expect.objectContaining({
      pagination: true
    }));
  });

  it('should detect pagination change as unsaved change', () => {
    ({ state, cleanup } = createTestState());
    flushSync();

    state.openEndpoint(state.endpoints[0]);
    flushSync();

    expect(state.hasEndpointChanges).toBe(false);

    state.handleTogglePagination();
    flushSync();

    expect(state.hasEndpointChanges).toBe(true);
  });
});

describe('apiDetailState - Query Param from Field', () => {
  let state: ApiDetailState;
  let cleanup: () => void;

  beforeEach(() => {
    apisStore.set([makeApi({ id: 'api-1' })]);
    endpointsStore.set([
      makeEndpoint({ id: 'ep-1', apiId: 'api-1', method: 'GET', path: '/items', responseShape: 'list' })
    ]);
    flushSync();
  });
  afterEach(() => cleanup?.());

  it('should add query param with name and field pre-populated from field name', () => {
    ({ state, cleanup } = createTestState());
    flushSync();

    state.openEndpoint(state.endpoints[0]);
    flushSync();

    expect(state.editedEndpoint!.queryParams).toEqual([]);

    state.handleAddQueryParamFromField('price');
    flushSync();

    expect(state.editedEndpoint!.queryParams).toHaveLength(1);
    expect(state.editedEndpoint!.queryParams[0]).toEqual({
      name: 'price',
      field: 'price',
      operator: 'eq'
    });
  });

  it('should append to existing query params', () => {
    ({ state, cleanup } = createTestState());
    flushSync();

    state.openEndpoint(state.endpoints[0]);
    flushSync();

    state.handleAddQueryParamFromField('price');
    flushSync();
    state.handleAddQueryParamFromField('category');
    flushSync();

    expect(state.editedEndpoint!.queryParams).toHaveLength(2);
    expect(state.editedEndpoint!.queryParams[1].name).toBe('category');
    expect(state.editedEndpoint!.queryParams[1].field).toBe('category');
  });
});
