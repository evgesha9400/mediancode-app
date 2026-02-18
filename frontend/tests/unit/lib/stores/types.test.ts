// tests/unit/lib/stores/types.test.ts
//
// Unit tests for the types store: base store, derived store with usage,
// selectors, and search.

import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';

import {
  typesBaseStore,
  typesStore,
  getTotalTypeCount,
  getPrimitiveTypes,
  getSelectableTypes,
  searchTypes,
  getTypeIdByName,
  type TypeBase,
  type FieldType
} from '$lib/stores/types';
import { fieldsStore } from '$lib/stores/fields';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeType(overrides: Partial<TypeBase> & { name: string }): TypeBase {
  return {
    id: `type-${overrides.name}`,
    namespaceId: 'ns-1',
    pythonType: overrides.name,
    description: `${overrides.name} type`,
    importPath: null,
    parentTypeId: null,
    ...overrides
  };
}

const PRIMITIVE_TYPES: TypeBase[] = [
  makeType({ name: 'str', pythonType: 'str', description: 'String type' }),
  makeType({ name: 'int', pythonType: 'int', description: 'Integer type' }),
  makeType({ name: 'float', pythonType: 'float', description: 'Float type' }),
  makeType({ name: 'bool', pythonType: 'bool', description: 'Boolean type' }),
  makeType({ name: 'datetime', pythonType: 'datetime', description: 'Datetime type' }),
  makeType({ name: 'uuid', pythonType: 'UUID', description: 'UUID type' })
];

const ABSTRACT_TYPE = makeType({ name: 'numeric', pythonType: 'numeric', description: 'Abstract numeric type' });

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  typesBaseStore.set([]);
  fieldsStore.set([]);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('typesBaseStore', () => {
  it('starts empty', () => {
    expect(get(typesBaseStore)).toEqual([]);
  });
});

describe('typesStore (derived)', () => {
  it('computes usedInFields from fieldsStore', () => {
    typesBaseStore.set([...PRIMITIVE_TYPES]);
    fieldsStore.set([
      { id: 'f-1', name: 'username', namespaceId: 'ns-1', type: 'str', description: '', defaultValue: '', constraints: [], usedInApis: [] },
      { id: 'f-2', name: 'email', namespaceId: 'ns-1', type: 'str', description: '', defaultValue: '', constraints: [], usedInApis: [] },
      { id: 'f-3', name: 'age', namespaceId: 'ns-1', type: 'int', description: '', defaultValue: '', constraints: [], usedInApis: [] }
    ] as any);

    const types = get(typesStore);
    const strType = types.find(t => t.name === 'str');
    const intType = types.find(t => t.name === 'int');
    const boolType = types.find(t => t.name === 'bool');

    expect(strType?.usedInFields).toBe(2);
    expect(intType?.usedInFields).toBe(1);
    expect(boolType?.usedInFields).toBe(0);
  });

  it('counts int+float usage for abstract "numeric" type', () => {
    typesBaseStore.set([...PRIMITIVE_TYPES, ABSTRACT_TYPE]);
    fieldsStore.set([
      { id: 'f-1', name: 'age', namespaceId: 'ns-1', type: 'int', description: '', defaultValue: '', constraints: [], usedInApis: [] },
      { id: 'f-2', name: 'price', namespaceId: 'ns-1', type: 'float', description: '', defaultValue: '', constraints: [], usedInApis: [] },
      { id: 'f-3', name: 'count', namespaceId: 'ns-1', type: 'int', description: '', defaultValue: '', constraints: [], usedInApis: [] }
    ] as any);

    const types = get(typesStore);
    const numeric = types.find(t => t.name === 'numeric');
    expect(numeric?.usedInFields).toBe(3); // 2 int + 1 float
  });
});

describe('getTotalTypeCount', () => {
  it('returns 0 when empty', () => {
    expect(getTotalTypeCount()).toBe(0);
  });

  it('returns count of base types', () => {
    typesBaseStore.set([...PRIMITIVE_TYPES]);
    expect(getTotalTypeCount()).toBe(6);
  });
});

describe('getPrimitiveTypes', () => {
  beforeEach(() => {
    typesBaseStore.set([...PRIMITIVE_TYPES, ABSTRACT_TYPE]);
    fieldsStore.set([]);
  });

  it('returns only primitive types (excludes abstract)', () => {
    const primitives = getPrimitiveTypes();
    expect(primitives).toHaveLength(6);
    expect(primitives.map(t => t.name)).not.toContain('numeric');
  });
});

describe('getSelectableTypes', () => {
  beforeEach(() => {
    typesBaseStore.set([...PRIMITIVE_TYPES, ABSTRACT_TYPE]);
    fieldsStore.set([]);
  });

  it('returns all types except abstract types', () => {
    const selectable = getSelectableTypes();
    expect(selectable).toHaveLength(6);
    expect(selectable.map(t => t.name)).not.toContain('numeric');
  });
});

describe('searchTypes', () => {
  let allTypes: FieldType[];

  beforeEach(() => {
    typesBaseStore.set([...PRIMITIVE_TYPES]);
    fieldsStore.set([]);
    allTypes = get(typesStore);
  });

  it('returns all types for empty query', () => {
    expect(searchTypes(allTypes, '')).toHaveLength(6);
    expect(searchTypes(allTypes, '  ')).toHaveLength(6);
  });

  it('searches by name', () => {
    const results = searchTypes(allTypes, 'str');
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].name).toBe('str');
  });

  it('searches by pythonType', () => {
    const results = searchTypes(allTypes, 'UUID');
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('uuid');
  });

  it('searches by description', () => {
    const results = searchTypes(allTypes, 'Boolean');
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('bool');
  });
});

describe('getTypeIdByName', () => {
  beforeEach(() => {
    typesBaseStore.set([...PRIMITIVE_TYPES]);
    fieldsStore.set([]);
  });

  it('returns type ID for known type name', () => {
    expect(getTypeIdByName('str')).toBe('type-str');
  });

  it('returns undefined for unknown type name', () => {
    expect(getTypeIdByName('nonexistent')).toBeUndefined();
  });
});
