// tests/unit/lib/utils/references.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('$lib/stores/stores', () => {
  const { writable } = require('svelte/store');
  return { apisStore: writable([]) };
});

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import {
  buildDeletionTooltip,
  checkFieldDeletion,
  checkObjectDeletion
} from '$lib/utils/references';
import { apisStore } from '$lib/stores/stores';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('buildDeletionTooltip', () => {
  it('shows inline format for single reference', () => {
    const result = buildDeletionTooltip('field', 'API', [{ name: 'Users API' }]);
    expect(result).toContain('1 API');
    expect(result).toContain('(Users API)');
  });

  it('lists all references for 2–5 refs', () => {
    const refs = [{ name: 'A' }, { name: 'B' }, { name: 'C' }];
    const result = buildDeletionTooltip('field', 'API', refs);
    expect(result).toContain('3 APIs');
    expect(result).toContain('- A');
    expect(result).toContain('- B');
    expect(result).toContain('- C');
  });

  it('shows first 4 and "N more" for 6+ refs', () => {
    const refs = [
      { name: 'A' }, { name: 'B' }, { name: 'C' },
      { name: 'D' }, { name: 'E' }, { name: 'F' }
    ];
    const result = buildDeletionTooltip('field', 'API', refs);
    expect(result).toContain('6 APIs');
    expect(result).toContain('- A');
    expect(result).toContain('- D');
    expect(result).toContain('and 2 more');
    expect(result).not.toContain('- E');
  });
});

describe('checkFieldDeletion', () => {
  beforeEach(() => {
    apisStore.set([]);
  });

  it('returns success when usedInApis is empty', () => {
    const result = checkFieldDeletion('username', []);
    expect(result).toEqual({ success: true });
  });

  it('returns error with references when usedInApis is non-empty', () => {
    const result = checkFieldDeletion('username', ['api-1', 'api-2']);
    expect(result.success).toBe(false);
    expect(result.error).toContain('username');
    expect(result.error).toContain('2 APIs');
    expect(result.references).toHaveLength(2);
  });

  it('filters by namespace when namespaceId is provided', () => {
    apisStore.set([
      { id: 'api-1', namespaceId: 'ns-1', title: 'A', version: '1', description: '', updatedAt: '', namespaceSlug: '' },
      { id: 'api-2', namespaceId: 'ns-2', title: 'B', version: '1', description: '', updatedAt: '', namespaceSlug: '' }
    ] as any);

    const result = checkFieldDeletion('username', ['api-1', 'api-2'], 'ns-1');
    expect(result.success).toBe(false);
    // Only api-1 is in ns-1, so only 1 reference
    expect(result.references).toHaveLength(1);
  });

  it('returns success when namespace filter excludes all apis', () => {
    apisStore.set([
      { id: 'api-1', namespaceId: 'ns-other', title: 'A', version: '1', description: '', updatedAt: '', namespaceSlug: '' }
    ] as any);

    const result = checkFieldDeletion('username', ['api-1'], 'ns-1');
    expect(result).toEqual({ success: true });
  });
});

describe('checkObjectDeletion', () => {
  beforeEach(() => {
    apisStore.set([]);
  });

  it('returns success when usedInApis is empty', () => {
    const result = checkObjectDeletion('UserResponse', []);
    expect(result).toEqual({ success: true });
  });

  it('returns error with references when usedInApis is non-empty', () => {
    const result = checkObjectDeletion('UserResponse', ['api-1']);
    expect(result.success).toBe(false);
    expect(result.error).toContain('UserResponse');
    expect(result.error).toContain('1 API');
    expect(result.references).toHaveLength(1);
  });

  it('filters by namespace when namespaceId is provided', () => {
    apisStore.set([
      { id: 'api-1', namespaceId: 'ns-1', title: 'A', version: '1', description: '', updatedAt: '', namespaceSlug: '' },
      { id: 'api-2', namespaceId: 'ns-2', title: 'B', version: '1', description: '', updatedAt: '', namespaceSlug: '' }
    ] as any);

    const result = checkObjectDeletion('UserResponse', ['api-1', 'api-2'], 'ns-1');
    expect(result.success).toBe(false);
    expect(result.references).toHaveLength(1);
  });
});
