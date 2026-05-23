// tests/unit/lib/domain/endpointReducer.test.ts
import { describe, it, expect, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

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
  it('extracts parameter names from path', () => {
    const result = reconcilePathParams('/users/{user_id}', []);
    expect(result.pathParams).toEqual([{ name: 'user_id', fieldMemberId: '' }]);
  });

  it('preserves existing parameter definitions', () => {
    const existing = [{ name: 'user_id', fieldMemberId: 'member-1' }];
    const result = reconcilePathParams('/users/{user_id}', existing);
    expect(result.pathParams).toEqual([{ name: 'user_id', fieldMemberId: 'member-1' }]);
  });

  it('adds leading slash if missing', () => {
    const result = reconcilePathParams('items/{id}', []);
    expect(result.path).toBe('/items/{id}');
  });

  it('keeps existing leading slash', () => {
    const result = reconcilePathParams('/items/{id}', []);
    expect(result.path).toBe('/items/{id}');
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
      pathParams: [{ name: 'id', fieldMemberId: 'fm-1' }]
    });
    const dup = buildDuplicateEndpoint(original);
    expect(dup.pathParams).toEqual([{ name: 'id', fieldMemberId: 'fm-1' }]);
    expect(dup.pathParams[0]).not.toBe(original.pathParams[0]);
  });

  it('deep copies queryParams', () => {
    const original = makeEndpoint({
      queryParams: [{ name: 'min_price', fieldMemberId: 'fm-price', operator: 'gte' as any, required: false }]
    });
    const dup = buildDuplicateEndpoint(original);
    expect(dup.queryParams).toEqual(original.queryParams);
    expect(dup.queryParams[0]).not.toBe(original.queryParams[0]);
  });
});
