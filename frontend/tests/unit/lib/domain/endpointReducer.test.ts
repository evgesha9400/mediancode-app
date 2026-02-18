// tests/unit/lib/domain/endpointReducer.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('$lib/stores/fields', () => {
  const { writable } = require('svelte/store');
  return { fieldsStore: writable([]) };
});

vi.mock('$lib/utils/ids', () => ({
  generateId: vi.fn(() => 'new-endpoint-id'),
  deepClone: vi.fn(<T>(obj: T): T => JSON.parse(JSON.stringify(obj)))
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import {
  reconcilePathParams,
  normalizeEndpoint,
  buildDuplicateEndpoint
} from '$lib/domain/endpointReducer';
import { fieldsStore } from '$lib/stores/fields';
import type { ApiEndpoint } from '$lib/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEndpoint(overrides: Partial<ApiEndpoint> = {}): ApiEndpoint {
  return {
    id: 'ep-1',
    apiId: 'api-1',
    path: '/items',
    method: 'GET',
    summary: '',
    description: '',
    pathParams: [],
    queryParams: [],
    requestObjectId: null,
    responseObjectId: null,
    responseShape: 'object',
    expanded: true,
    ...overrides
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('reconcilePathParams', () => {
  beforeEach(() => {
    fieldsStore.set([]);
  });

  it('extracts parameter names from path', () => {
    const result = reconcilePathParams('/users/{user_id}', []);
    expect(result.pathParams).toEqual([{ name: 'user_id', fieldId: '' }]);
  });

  it('preserves existing parameter definitions', () => {
    const existing = [{ name: 'user_id', fieldId: 'field-1' }];
    const result = reconcilePathParams('/users/{user_id}', existing);
    expect(result.pathParams).toEqual([{ name: 'user_id', fieldId: 'field-1' }]);
  });

  it('adds leading slash if missing', () => {
    const result = reconcilePathParams('items/{id}', []);
    expect(result.path).toBe('/items/{id}');
  });

  it('keeps existing leading slash', () => {
    const result = reconcilePathParams('/items/{id}', []);
    expect(result.path).toBe('/items/{id}');
  });

  it('matches field by name for new params', () => {
    fieldsStore.set([
      { id: 'f-1', name: 'user_id', namespaceId: 'ns', type: 'uuid', description: '', defaultValue: '', constraints: [], usedInApis: [] }
    ] as any);

    const result = reconcilePathParams('/users/{user_id}', []);
    expect(result.pathParams[0].fieldId).toBe('f-1');
  });

  it('returns empty pathParams when path has no parameters', () => {
    const result = reconcilePathParams('/users', []);
    expect(result.pathParams).toEqual([]);
  });
});

describe('normalizeEndpoint', () => {
  it('adds default responseShape when missing', () => {
    const ep = makeEndpoint({ responseShape: undefined as any });
    const result = normalizeEndpoint(ep);
    expect(result.responseShape).toBe('object');
  });

  it('preserves existing responseShape', () => {
    const ep = makeEndpoint({ responseShape: 'list' as any });
    const result = normalizeEndpoint(ep);
    expect(result.responseShape).toBe('list');
  });
});

describe('buildDuplicateEndpoint', () => {
  it('returns a new endpoint with a fresh ID', () => {
    const original = makeEndpoint({ id: 'ep-original' });
    const dup = buildDuplicateEndpoint(original);
    expect(dup.id).toBe('new-endpoint-id');
  });

  it('appends -copy to the path', () => {
    const original = makeEndpoint({ path: '/users' });
    const dup = buildDuplicateEndpoint(original);
    expect(dup.path).toBe('/users-copy');
  });

  it('sets expanded to false', () => {
    const original = makeEndpoint({ expanded: true });
    const dup = buildDuplicateEndpoint(original);
    expect(dup.expanded).toBe(false);
  });

  it('deep copies pathParams', () => {
    const original = makeEndpoint({
      pathParams: [{ name: 'id', fieldId: 'f-1' }]
    });
    const dup = buildDuplicateEndpoint(original);
    expect(dup.pathParams).toEqual([{ name: 'id', fieldId: 'f-1' }]);
    expect(dup.pathParams[0]).not.toBe(original.pathParams[0]);
  });
});
