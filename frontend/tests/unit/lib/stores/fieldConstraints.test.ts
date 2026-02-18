// tests/unit/lib/stores/fieldConstraints.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('$lib/utils/references', () => ({
  checkFieldConstraintDeletion: vi.fn()
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import {
  fieldConstraintsStore,
  getTotalFieldConstraintCount,
  searchFieldConstraints,
  getFieldConstraintsByFieldType,
  deleteFieldConstraint,
  addFieldConstraint,
  type FieldConstraint
} from '$lib/stores/fieldConstraints';
import { checkFieldConstraintDeletion } from '$lib/utils/references';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConstraint(overrides: Partial<FieldConstraint> & { name: string }): FieldConstraint {
  return {
    id: `fc-${overrides.name}`,
    namespaceId: 'ns-1',
    description: '',
    parameterTypes: [],
    docsUrl: null,
    compatibleTypes: [],
    usedInFields: 0,
    ...overrides
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('fieldConstraintsStore', () => {
  beforeEach(() => {
    fieldConstraintsStore.set([]);
    vi.clearAllMocks();
  });

  it('starts empty', () => {
    expect(get(fieldConstraintsStore)).toEqual([]);
  });
});

describe('getTotalFieldConstraintCount', () => {
  beforeEach(() => {
    fieldConstraintsStore.set([]);
  });

  it('returns 0 when empty', () => {
    expect(getTotalFieldConstraintCount()).toBe(0);
  });

  it('returns count of field constraints', () => {
    fieldConstraintsStore.set([
      makeConstraint({ name: 'MaxLength' }),
      makeConstraint({ name: 'MinValue' })
    ]);
    expect(getTotalFieldConstraintCount()).toBe(2);
  });
});

describe('searchFieldConstraints', () => {
  const constraints = [
    makeConstraint({ name: 'MaxLength', description: 'Maximum length', parameterTypes: ['int'], compatibleTypes: ['str'] }),
    makeConstraint({ name: 'MinValue', description: 'Minimum numeric value', parameterTypes: ['float'], compatibleTypes: ['int', 'float'] }),
    makeConstraint({ name: 'Pattern', description: 'Regex pattern', parameterTypes: ['str'], compatibleTypes: ['str'] })
  ];

  it('returns all constraints for empty query', () => {
    expect(searchFieldConstraints(constraints, '')).toHaveLength(3);
    expect(searchFieldConstraints(constraints, '  ')).toHaveLength(3);
  });

  it('searches by name', () => {
    const results = searchFieldConstraints(constraints, 'max');
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('MaxLength');
  });

  it('searches by description', () => {
    const results = searchFieldConstraints(constraints, 'numeric');
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('MinValue');
  });

  it('searches by parameterTypes', () => {
    const results = searchFieldConstraints(constraints, 'float');
    expect(results).toHaveLength(1); // MinValue has parameterType float
    expect(results[0].name).toBe('MinValue');
  });

  it('searches by compatibleTypes', () => {
    const results = searchFieldConstraints(constraints, 'str');
    // MaxLength (compatibleTypes: str), Pattern (compatibleTypes: str), and Pattern (parameterTypes: str)
    expect(results.length).toBeGreaterThanOrEqual(2);
  });
});

describe('getFieldConstraintsByFieldType', () => {
  beforeEach(() => {
    fieldConstraintsStore.set([
      makeConstraint({ name: 'MaxLength', compatibleTypes: ['str'] }),
      makeConstraint({ name: 'MinValue', compatibleTypes: ['int', 'float'] }),
      makeConstraint({ name: 'Pattern', compatibleTypes: ['str'] })
    ]);
  });

  it('returns constraints compatible with given type', () => {
    const results = getFieldConstraintsByFieldType('str');
    expect(results).toHaveLength(2);
    expect(results.map(c => c.name)).toContain('MaxLength');
    expect(results.map(c => c.name)).toContain('Pattern');
  });

  it('returns empty array for unmatched type', () => {
    const results = getFieldConstraintsByFieldType('bool');
    expect(results).toHaveLength(0);
  });
});

describe('deleteFieldConstraint', () => {
  beforeEach(() => {
    fieldConstraintsStore.set([
      makeConstraint({ name: 'MaxLength', usedInFields: 0 }),
      makeConstraint({ name: 'MinValue', usedInFields: 2 })
    ]);
    vi.clearAllMocks();
  });

  it('removes constraint when deletion check passes', () => {
    (checkFieldConstraintDeletion as any).mockReturnValue({ success: true });

    const result = deleteFieldConstraint('MaxLength');

    expect(result.success).toBe(true);
    expect(get(fieldConstraintsStore)).toHaveLength(1);
    expect(get(fieldConstraintsStore)[0].name).toBe('MinValue');
  });

  it('blocks deletion when used in fields', () => {
    (checkFieldConstraintDeletion as any).mockReturnValue({
      success: false,
      error: 'Cannot delete: used in 2 fields'
    });

    const result = deleteFieldConstraint('MinValue');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Cannot delete');
    expect(get(fieldConstraintsStore)).toHaveLength(2);
  });

  it('returns error when constraint not found', () => {
    const result = deleteFieldConstraint('NonExistent');

    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });
});

describe('addFieldConstraint', () => {
  beforeEach(() => {
    fieldConstraintsStore.set([]);
  });

  it('adds a constraint to the store', () => {
    const constraint = makeConstraint({ name: 'NewConstraint' });
    addFieldConstraint(constraint);

    expect(get(fieldConstraintsStore)).toHaveLength(1);
    expect(get(fieldConstraintsStore)[0].name).toBe('NewConstraint');
  });
});
