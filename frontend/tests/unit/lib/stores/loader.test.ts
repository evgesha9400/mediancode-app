/**
 * Store Loader Tests
 *
 * Unit tests for the loader store.
 * Location mirrors: src/lib/stores/loader.ts
 *
 * Tests loadStoresFromApi, resetStores, reloadStores, and the
 * storeLoadingState writable. Verifies two-phase loading, error handling,
 * and store population.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';

// ---------------------------------------------------------------------------
// Mocks -- must be declared before imports that use them
// ---------------------------------------------------------------------------

// Mock all API client modules
vi.mock('$lib/api/namespaces', () => ({ listNamespaces: vi.fn() }));
vi.mock('$lib/api/apis', () => ({ listApis: vi.fn() }));
vi.mock('$lib/api/fields', () => ({ listFields: vi.fn() }));
vi.mock('$lib/api/objects', () => ({ listObjects: vi.fn() }));
vi.mock('$lib/api/endpoints', () => ({ listEndpoints: vi.fn() }));
vi.mock('$lib/api/fieldConstraints', () => ({ listFieldConstraints: vi.fn() }));
vi.mock('$lib/api/fieldValidators', () => ({ listFieldValidators: vi.fn() }));
vi.mock('$lib/api/modelValidators', () => ({ listModelValidators: vi.fn() }));
vi.mock('$lib/api/types', () => ({ listTypes: vi.fn() }));

// Mock all store modules
vi.mock('$lib/stores/namespaces', () => {
  const { writable } = require('svelte/store');
  return {
    namespacesStore: writable([]),
    activeNamespaceId: writable('')
  };
});

vi.mock('$lib/stores/apis', () => {
  const { writable } = require('svelte/store');
  return {
    apisStore: writable([]),
    endpointsStore: writable([])
  };
});

vi.mock('$lib/stores/fields', () => {
  const { writable } = require('svelte/store');
  return { fieldsStore: writable([]) };
});

vi.mock('$lib/stores/objects', () => {
  const { writable } = require('svelte/store');
  return { objectsStore: writable([]) };
});

vi.mock('$lib/stores/fieldConstraints', () => {
  const { writable } = require('svelte/store');
  return { fieldConstraintsStore: writable([]) };
});

vi.mock('$lib/stores/fieldValidators', () => {
  const { writable } = require('svelte/store');
  return { fieldValidatorsStore: writable([]) };
});

vi.mock('$lib/stores/modelValidators', () => {
  const { writable } = require('svelte/store');
  return { modelValidatorsStore: writable([]) };
});

vi.mock('$lib/stores/types', () => {
  const { writable } = require('svelte/store');
  return { typesBaseStore: writable([]) };
});

vi.mock('$lib/constants', () => ({
  GLOBAL_NAMESPACE_ID: 'global-ns'
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import {
  storeLoadingState,
  loadStoresFromApi,
  resetStores,
  reloadStores,
  STORE_NAMES,
  type LoadingState
} from '$lib/stores/loader';

import { listNamespaces } from '$lib/api/namespaces';
import { listApis } from '$lib/api/apis';
import { listFields } from '$lib/api/fields';
import { listObjects } from '$lib/api/objects';
import { listEndpoints } from '$lib/api/endpoints';
import { listFieldConstraints } from '$lib/api/fieldConstraints';
import { listFieldValidators } from '$lib/api/fieldValidators';
import { listModelValidators } from '$lib/api/modelValidators';
import { listTypes } from '$lib/api/types';

import { namespacesStore, activeNamespaceId } from '$lib/stores/namespaces';
import { apisStore, endpointsStore } from '$lib/stores/apis';
import { fieldsStore } from '$lib/stores/fields';
import { objectsStore } from '$lib/stores/objects';
import { fieldConstraintsStore } from '$lib/stores/fieldConstraints';
import { fieldValidatorsStore } from '$lib/stores/fieldValidators';
import { modelValidatorsStore } from '$lib/stores/modelValidators';
import { typesBaseStore } from '$lib/stores/types';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();

  // Reset loading state to initial
  storeLoadingState.set({
    isLoading: false,
    isLoaded: false,
    storeErrors: []
  });

  // Default all API calls to return empty arrays
  (listTypes as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (listNamespaces as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (listFieldConstraints as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (listFields as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (listObjects as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (listApis as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (listEndpoints as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (listFieldValidators as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (listModelValidators as ReturnType<typeof vi.fn>).mockResolvedValue([]);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('loader - Exports', () => {
  it('should export storeLoadingState as a writable store', () => {
    expect(storeLoadingState).toBeDefined();
    expect(typeof storeLoadingState.subscribe).toBe('function');
    expect(typeof storeLoadingState.set).toBe('function');
  });

  it('should export loadStoresFromApi as a function', () => {
    expect(typeof loadStoresFromApi).toBe('function');
  });

  it('should export resetStores as a function', () => {
    expect(typeof resetStores).toBe('function');
  });

  it('should export reloadStores as a function', () => {
    expect(typeof reloadStores).toBe('function');
  });

  it('should export STORE_NAMES with all expected keys', () => {
    expect(STORE_NAMES.TYPES).toBe('Types');
    expect(STORE_NAMES.NAMESPACES).toBe('Namespaces');
    expect(STORE_NAMES.FIELD_CONSTRAINTS).toBe('Field Constraints');
    expect(STORE_NAMES.FIELDS).toBe('Fields');
    expect(STORE_NAMES.OBJECTS).toBe('Objects');
    expect(STORE_NAMES.APIS).toBe('APIs');
    expect(STORE_NAMES.ENDPOINTS).toBe('Endpoints');
    expect(STORE_NAMES.FIELD_VALIDATORS).toBe('Field Validators');
    expect(STORE_NAMES.MODEL_VALIDATORS).toBe('Model Validators');
  });
});

describe('loader - Initial Loading State', () => {
  it('should start with isLoading false and isLoaded false', () => {
    const state = get(storeLoadingState);
    expect(state.isLoading).toBe(false);
    expect(state.isLoaded).toBe(false);
    expect(state.storeErrors).toEqual([]);
  });
});

describe('loader - loadStoresFromApi', () => {
  it('should set isLoading during load', async () => {
    const states: LoadingState[] = [];
    const unsub = storeLoadingState.subscribe(s => states.push({ ...s }));

    await loadStoresFromApi();
    unsub();

    // Should have gone through: initial -> loading -> loaded
    const loadingState = states.find(s => s.isLoading && !s.isLoaded);
    expect(loadingState).toBeDefined();

    const loadedState = states[states.length - 1];
    expect(loadedState.isLoading).toBe(false);
    expect(loadedState.isLoaded).toBe(true);
  });

  it('should call all phase 1 API endpoints', async () => {
    await loadStoresFromApi();

    expect(listTypes).toHaveBeenCalledTimes(1);
    expect(listNamespaces).toHaveBeenCalledTimes(1);
    expect(listFieldConstraints).toHaveBeenCalledTimes(1);
  });

  it('should call all phase 2 API endpoints', async () => {
    await loadStoresFromApi();

    expect(listFields).toHaveBeenCalledTimes(1);
    expect(listObjects).toHaveBeenCalledTimes(1);
    expect(listApis).toHaveBeenCalledTimes(1);
    expect(listEndpoints).toHaveBeenCalledTimes(1);
    expect(listFieldValidators).toHaveBeenCalledTimes(1);
    expect(listModelValidators).toHaveBeenCalledTimes(1);
  });

  it('should populate stores with API data', async () => {
    const mockTypes = [{ id: 'type-1', name: 'str' }];
    const mockNamespaces = [{ id: 'ns-1', name: 'Default' }];
    const mockFields = [{ id: 'f-1', name: 'email' }];

    (listTypes as ReturnType<typeof vi.fn>).mockResolvedValue(mockTypes);
    (listNamespaces as ReturnType<typeof vi.fn>).mockResolvedValue(mockNamespaces);
    (listFields as ReturnType<typeof vi.fn>).mockResolvedValue(mockFields);

    await loadStoresFromApi();

    expect(get(typesBaseStore)).toEqual(mockTypes);
    expect(get(namespacesStore)).toEqual(mockNamespaces);
    expect(get(fieldsStore)).toEqual(mockFields);
  });

  it('should set activeNamespaceId to global namespace when it exists', async () => {
    (listNamespaces as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'global-ns', name: 'Global' },
      { id: 'ns-2', name: 'Custom' }
    ]);

    await loadStoresFromApi();

    expect(get(activeNamespaceId)).toBe('global-ns');
  });

  it('should set activeNamespaceId to first namespace when global does not exist', async () => {
    (listNamespaces as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'ns-1', name: 'First' },
      { id: 'ns-2', name: 'Second' }
    ]);

    await loadStoresFromApi();

    expect(get(activeNamespaceId)).toBe('ns-1');
  });

  it('should skip if already loading', async () => {
    storeLoadingState.set({ isLoading: true, isLoaded: false, storeErrors: [] });

    await loadStoresFromApi();

    expect(listTypes).not.toHaveBeenCalled();
  });

  it('should skip if already loaded', async () => {
    storeLoadingState.set({ isLoading: false, isLoaded: true, storeErrors: [] });

    await loadStoresFromApi();

    expect(listTypes).not.toHaveBeenCalled();
  });

  it('should track phase 1 errors without blocking phase 2', async () => {
    (listTypes as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Types fetch failed'));

    await loadStoresFromApi();

    const state = get(storeLoadingState);
    expect(state.isLoaded).toBe(true);
    expect(state.storeErrors).toContain('Types');

    // Phase 2 should still have been called
    expect(listFields).toHaveBeenCalledTimes(1);
  });

  it('should track phase 2 errors', async () => {
    (listFields as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Fields fetch failed'));
    (listApis as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('APIs fetch failed'));

    await loadStoresFromApi();

    const state = get(storeLoadingState);
    expect(state.isLoaded).toBe(true);
    expect(state.storeErrors).toContain('Fields');
    expect(state.storeErrors).toContain('APIs');
  });

  it('should use empty arrays for failed stores', async () => {
    (listTypes as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('fail'));
    (listFields as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('fail'));

    await loadStoresFromApi();

    expect(get(typesBaseStore)).toEqual([]);
    expect(get(fieldsStore)).toEqual([]);
  });
});

describe('loader - resetStores', () => {
  it('should reset loading state', () => {
    storeLoadingState.set({ isLoading: false, isLoaded: true, storeErrors: ['Types'] });

    resetStores();

    const state = get(storeLoadingState);
    expect(state.isLoading).toBe(false);
    expect(state.isLoaded).toBe(false);
    expect(state.storeErrors).toEqual([]);
  });

  it('should reset all stores to empty arrays', () => {
    namespacesStore.set([{ id: 'ns-1' }] as any);
    apisStore.set([{ id: 'api-1' }] as any);
    fieldsStore.set([{ id: 'f-1' }] as any);
    objectsStore.set([{ id: 'o-1' }] as any);
    endpointsStore.set([{ id: 'ep-1' }] as any);
    fieldConstraintsStore.set([{ id: 'fc-1' }] as any);
    fieldValidatorsStore.set([{ id: 'fv-1' }] as any);
    modelValidatorsStore.set([{ id: 'mv-1' }] as any);
    typesBaseStore.set([{ id: 'type-1' }] as any);

    resetStores();

    expect(get(namespacesStore)).toEqual([]);
    expect(get(apisStore)).toEqual([]);
    expect(get(fieldsStore)).toEqual([]);
    expect(get(objectsStore)).toEqual([]);
    expect(get(endpointsStore)).toEqual([]);
    expect(get(fieldConstraintsStore)).toEqual([]);
    expect(get(fieldValidatorsStore)).toEqual([]);
    expect(get(modelValidatorsStore)).toEqual([]);
    expect(get(typesBaseStore)).toEqual([]);
  });

  it('should reset activeNamespaceId to global namespace ID', () => {
    activeNamespaceId.set('ns-custom');

    resetStores();

    expect(get(activeNamespaceId)).toBe('global-ns');
  });
});

describe('loader - reloadStores', () => {
  it('should reset isLoaded and call loadStoresFromApi', async () => {
    // First, load stores
    await loadStoresFromApi();
    expect(get(storeLoadingState).isLoaded).toBe(true);

    vi.clearAllMocks();

    // Re-setup mocks for reload
    (listTypes as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (listNamespaces as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (listFieldConstraints as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (listFields as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (listObjects as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (listApis as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (listEndpoints as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (listFieldValidators as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (listModelValidators as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await reloadStores();

    // Should have called API endpoints again
    expect(listTypes).toHaveBeenCalledTimes(1);
    expect(listNamespaces).toHaveBeenCalledTimes(1);
    expect(get(storeLoadingState).isLoaded).toBe(true);
  });
});

describe('loader - STORE_NAMES constants', () => {
  it('should have values usable with .includes() for error checking', () => {
    const errors = ['Types', 'Fields'];
    expect(errors.includes(STORE_NAMES.TYPES)).toBe(true);
    expect(errors.includes(STORE_NAMES.FIELDS)).toBe(true);
    expect(errors.includes(STORE_NAMES.OBJECTS)).toBe(false);
  });

  it('should cover all 9 store entities', () => {
    const allNames = Object.values(STORE_NAMES);
    expect(allNames).toHaveLength(9);
  });
});
