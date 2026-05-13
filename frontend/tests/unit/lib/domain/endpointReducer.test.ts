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
  hydratePathParamsForEndpoint,
  buildDuplicateEndpoint
} from '$lib/domain/endpointReducer';
import { fieldsStore } from '$lib/stores/fields';
import type { ApiEndpoint, Field, ObjectDefinition } from '$lib/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEndpoint(overrides: Partial<ApiEndpoint> = {}): ApiEndpoint {
  return {
    id: 'ep-1',
    apiId: 'api-1',
    path: '/items',
    method: 'GET',
    description: '',
    pathParams: [],
    queryParams: [],
    useEnvelope: false,
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
    expect(result.pathParams).toEqual([{ name: 'user_id', fieldId: '', field: '' }]);
  });

  it('preserves existing parameter definitions', () => {
    const existing = [{ name: 'user_id', fieldId: 'field-1', field: 'user_id' }];
    const result = reconcilePathParams('/users/{user_id}', existing);
    expect(result.pathParams).toEqual([{ name: 'user_id', fieldId: 'field-1', field: 'user_id' }]);
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
      { id: 'f-1', name: 'user_id', namespaceId: 'ns', type: 'uuid', description: '', defaultValue: '', constraints: [], validators: [], usedInApis: [] }
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

  it('adds default pagination when missing', () => {
    const ep = makeEndpoint({ pagination: undefined as any });
    const result = normalizeEndpoint(ep);
    expect(result.pagination).toBe(false);
  });

  it('preserves existing pagination', () => {
    const ep = makeEndpoint({ pagination: true });
    const result = normalizeEndpoint(ep);
    expect(result.pagination).toBe(true);
  });
});

describe('hydratePathParamsForEndpoint', () => {
  const fields: Field[] = [
    {
      id: 'f-track',
      namespaceId: 'ns',
      name: 'tracking_id',
      type: 'uuid',
      container: null,
      constraints: [],
      validators: [],
      usedInApis: []
    }
  ];

  const objects: ObjectDefinition[] = [
    {
      id: 'obj-prod',
      namespaceId: 'ns',
      name: 'Product',
      members: [
        {
          memberType: 'scalar',
          name: 'tracking_id',
          fieldId: 'f-track',
          role: 'pk',
          isNullable: false
        }
      ],
      derivedRelationships: [],
      validators: [],
      usedInApis: []
    }
  ];

  it('fills field from object member when API omits field name', () => {
    const ep = makeEndpoint({
      objectId: 'obj-prod',
      pathParams: [{ name: 'tracking_id', fieldId: 'f-track', field: '' }]
    });
    const out = hydratePathParamsForEndpoint(ep, objects, fields);
    expect(out.pathParams[0].field).toBe('tracking_id');
  });

  it('falls back to global field catalog when objectId is missing', () => {
    const ep = makeEndpoint({
      objectId: undefined,
      pathParams: [{ name: 'tracking_id', fieldId: 'f-track', field: '' }]
    });
    const out = hydratePathParamsForEndpoint(ep, objects, fields);
    expect(out.pathParams[0].field).toBe('tracking_id');
  });

  it('does not overwrite an existing non-empty field', () => {
    const ep = makeEndpoint({
      objectId: 'obj-prod',
      pathParams: [{ name: 'tid', fieldId: 'f-track', field: 'custom_member' }]
    });
    const out = hydratePathParamsForEndpoint(ep, objects, fields);
    expect(out.pathParams[0].field).toBe('custom_member');
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
      pathParams: [{ name: 'id', fieldId: 'f-1', field: 'id' }]
    });
    const dup = buildDuplicateEndpoint(original);
    expect(dup.pathParams).toEqual([{ name: 'id', fieldId: 'f-1', field: 'id' }]);
    expect(dup.pathParams[0]).not.toBe(original.pathParams[0]);
  });

  it('deep copies queryParams', () => {
    const original = makeEndpoint({
      queryParams: [{ name: 'min_price', field: 'price', operator: 'gte' as any }]
    });
    const dup = buildDuplicateEndpoint(original);
    expect(dup.queryParams).toEqual(original.queryParams);
    expect(dup.queryParams[0]).not.toBe(original.queryParams[0]);
  });
});
