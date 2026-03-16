import { describe, it, expect } from 'vitest';
import { getCompatibleOperators, suggestFieldAndOperator, validateEndpointParams, resolveTargetFields } from '$lib/domain/paramInference';
import type { ResponseShape, PathParam, QueryParam, ObjectDefinition, Field } from '$lib/types';

describe('getCompatibleOperators', () => {
  it('returns all operators for "all" types like str', () => {
    const ops = getCompatibleOperators('str');
    expect(ops).toContain('eq');
    expect(ops).toContain('in');
    expect(ops).toContain('like');
    expect(ops).toContain('ilike');
    expect(ops).not.toContain('gte');
  });

  it('returns comparable + universal operators for int', () => {
    const ops = getCompatibleOperators('int');
    expect(ops).toContain('eq');
    expect(ops).toContain('gte');
    expect(ops).toContain('lte');
    expect(ops).toContain('gt');
    expect(ops).toContain('lt');
    expect(ops).toContain('in');
    expect(ops).not.toContain('like');
    expect(ops).not.toContain('ilike');
  });

  it('returns comparable + universal operators for datetime', () => {
    const ops = getCompatibleOperators('datetime');
    expect(ops).toContain('gte');
    expect(ops).toContain('eq');
    expect(ops).not.toContain('like');
  });

  it('returns comparable + universal operators for date', () => {
    const ops = getCompatibleOperators('date');
    expect(ops).toContain('lte');
    expect(ops).toContain('in');
    expect(ops).not.toContain('ilike');
  });

  it('returns eq and in for bool', () => {
    const ops = getCompatibleOperators('bool');
    expect(ops).toContain('eq');
    expect(ops).toContain('in');
    expect(ops).not.toContain('gte');
    expect(ops).not.toContain('like');
  });

  it('returns eq and in for uuid', () => {
    const ops = getCompatibleOperators('uuid');
    expect(ops).toContain('eq');
    expect(ops).toContain('in');
    expect(ops).not.toContain('lt');
  });
});

describe('suggestFieldAndOperator', () => {
  const fieldNames = ['price', 'quantity', 'category', 'name', 'created_at', 'id'];

  it('suggests field: price, operator: gte for "min_price"', () => {
    const result = suggestFieldAndOperator('min_price', fieldNames);
    expect(result).toEqual({ field: 'price', operator: 'gte' });
  });

  it('suggests field: quantity, operator: lte for "max_quantity"', () => {
    const result = suggestFieldAndOperator('max_quantity', fieldNames);
    expect(result).toEqual({ field: 'quantity', operator: 'lte' });
  });

  it('suggests field: category, operator: eq for "category"', () => {
    const result = suggestFieldAndOperator('category', fieldNames);
    expect(result).toEqual({ field: 'category', operator: 'eq' });
  });

  it('returns null when no field name matches', () => {
    const result = suggestFieldAndOperator('foobar', fieldNames);
    expect(result).toBeNull();
  });

  it('returns null for empty param name', () => {
    const result = suggestFieldAndOperator('', fieldNames);
    expect(result).toBeNull();
  });

  it('suggests field: created_at, operator: gte for "after_created_at"', () => {
    const result = suggestFieldAndOperator('after_created_at', fieldNames);
    expect(result).toEqual({ field: 'created_at', operator: 'gte' });
  });

  it('suggests field: created_at, operator: lte for "before_created_at"', () => {
    const result = suggestFieldAndOperator('before_created_at', fieldNames);
    expect(result).toEqual({ field: 'created_at', operator: 'lte' });
  });
});

// Helper to build validation input concisely
interface TargetField {
  name: string;
  type: string;
  isPk: boolean;
}

function validate(opts: {
  responseShape: ResponseShape;
  targetObjectId?: string;
  objectId?: string;
  targetFields?: TargetField[];
  pathParams?: { name: string; field: string }[];
  queryParams?: { name: string; field: string; operator: string; pagination: boolean }[];
}) {
  return validateEndpointParams({
    responseShape: opts.responseShape,
    targetObjectId: opts.targetObjectId,
    objectId: opts.objectId,
    targetFields: opts.targetFields ?? [],
    pathParams: (opts.pathParams ?? []).map(p => ({
      name: p.name,
      fieldId: '',
      field: p.field
    })),
    queryParams: (opts.queryParams ?? []).map(q => ({
      name: q.name,
      field: q.field,
      operator: q.operator as any,
      pagination: q.pagination
    }))
  });
}

describe('validateEndpointParams', () => {
  // Rule 1: Target object is known
  describe('Rule 1: target is known', () => {
    it('passes for detail endpoint with objectId (target inferred)', () => {
      const errors = validate({
        responseShape: 'object',
        objectId: 'obj-1',
        targetFields: [{ name: 'id', type: 'uuid', isPk: true }],
        pathParams: [{ name: 'id', field: 'id' }]
      });
      expect(errors).toEqual([]);
    });

    it('fails for list endpoint without targetObjectId', () => {
      const errors = validate({
        responseShape: 'list',
        targetObjectId: undefined,
        targetFields: []
      });
      expect(errors).toContainEqual(
        expect.objectContaining({ rule: 1 })
      );
    });
  });

  // Rule 2: Every param field exists on target
  describe('Rule 2: field exists on target', () => {
    it('fails when path param field does not exist on target', () => {
      const errors = validate({
        responseShape: 'object',
        targetObjectId: 'obj-1',
        targetFields: [{ name: 'id', type: 'uuid', isPk: true }],
        pathParams: [{ name: 'store_id', field: 'store_id' }]
      });
      expect(errors).toContainEqual(
        expect.objectContaining({ rule: 2, param: 'store_id' })
      );
    });

    it('fails when query param field does not exist on target', () => {
      const errors = validate({
        responseShape: 'list',
        targetObjectId: 'obj-1',
        targetFields: [{ name: 'price', type: 'float', isPk: false }],
        queryParams: [{ name: 'category', field: 'nonexistent', operator: 'eq', pagination: false }]
      });
      expect(errors).toContainEqual(
        expect.objectContaining({ rule: 2, param: 'category' })
      );
    });

    it('skips validation for pagination params', () => {
      const errors = validate({
        responseShape: 'list',
        targetObjectId: 'obj-1',
        targetFields: [{ name: 'id', type: 'uuid', isPk: true }],
        queryParams: [{ name: 'limit', field: '', operator: 'eq', pagination: true }]
      });
      const rule2Errors = errors.filter(e => e.rule === 2);
      expect(rule2Errors).toEqual([]);
    });
  });

  // Rule 3: Detail endpoint last path param = PK
  describe('Rule 3: detail last param is PK', () => {
    it('passes when last path param maps to PK', () => {
      const errors = validate({
        responseShape: 'object',
        targetObjectId: 'obj-1',
        targetFields: [
          { name: 'store_id', type: 'uuid', isPk: false },
          { name: 'id', type: 'uuid', isPk: true }
        ],
        pathParams: [
          { name: 'store_id', field: 'store_id' },
          { name: 'item_id', field: 'id' }
        ]
      });
      const rule3 = errors.filter(e => e.rule === 3);
      expect(rule3).toEqual([]);
    });

    it('fails when last path param does not map to PK', () => {
      const errors = validate({
        responseShape: 'object',
        targetObjectId: 'obj-1',
        targetFields: [
          { name: 'store_id', type: 'uuid', isPk: false },
          { name: 'id', type: 'uuid', isPk: true }
        ],
        pathParams: [{ name: 'store_id', field: 'store_id' }]
      });
      expect(errors).toContainEqual(
        expect.objectContaining({ rule: 3 })
      );
    });
  });

  // Rule 4: Detail endpoint no field-mapped query params
  describe('Rule 4: detail has no field-mapped query params', () => {
    it('fails when detail endpoint has query params with field references', () => {
      const errors = validate({
        responseShape: 'object',
        targetObjectId: 'obj-1',
        targetFields: [{ name: 'id', type: 'uuid', isPk: true }],
        pathParams: [{ name: 'id', field: 'id' }],
        queryParams: [{ name: 'q', field: 'id', operator: 'eq', pagination: false }]
      });
      expect(errors).toContainEqual(
        expect.objectContaining({ rule: 4 })
      );
    });

    it('passes when detail endpoint has legacy query params without field', () => {
      const errors = validate({
        responseShape: 'object',
        targetObjectId: 'obj-1',
        targetFields: [{ name: 'id', type: 'uuid', isPk: true }],
        pathParams: [{ name: 'id', field: 'id' }],
        queryParams: [{ name: 'include', field: '', operator: 'eq', pagination: false }]
      });
      const rule4 = errors.filter(e => e.rule === 4);
      expect(rule4).toEqual([]);
    });
  });

  // Rule 5: List endpoint no path param = PK
  describe('Rule 5: list path param not PK', () => {
    it('fails when list endpoint has path param mapped to PK', () => {
      const errors = validate({
        responseShape: 'list',
        targetObjectId: 'obj-1',
        targetFields: [
          { name: 'id', type: 'uuid', isPk: true },
          { name: 'price', type: 'float', isPk: false }
        ],
        pathParams: [{ name: 'product_id', field: 'id' }]
      });
      expect(errors).toContainEqual(
        expect.objectContaining({ rule: 5 })
      );
    });
  });

  // Rule 6: Operator compatible with field type
  describe('Rule 6: operator-type compatibility', () => {
    it('fails when using gte on str field', () => {
      const errors = validate({
        responseShape: 'list',
        targetObjectId: 'obj-1',
        targetFields: [{ name: 'name', type: 'str', isPk: false }],
        queryParams: [{ name: 'min_name', field: 'name', operator: 'gte', pagination: false }]
      });
      expect(errors).toContainEqual(
        expect.objectContaining({ rule: 6, param: 'min_name' })
      );
    });

    it('passes when using ilike on str field', () => {
      const errors = validate({
        responseShape: 'list',
        targetObjectId: 'obj-1',
        targetFields: [{ name: 'name', type: 'str', isPk: false }],
        queryParams: [{ name: 'search', field: 'name', operator: 'ilike', pagination: false }]
      });
      const rule6 = errors.filter(e => e.rule === 6);
      expect(rule6).toEqual([]);
    });

    it('fails when using like on int field', () => {
      const errors = validate({
        responseShape: 'list',
        targetObjectId: 'obj-1',
        targetFields: [{ name: 'count', type: 'int', isPk: false }],
        queryParams: [{ name: 'count_like', field: 'count', operator: 'like', pagination: false }]
      });
      expect(errors).toContainEqual(
        expect.objectContaining({ rule: 6, param: 'count_like' })
      );
    });
  });
});

describe('resolveTargetFields', () => {
  const fields: Field[] = [
    { id: 'f-1', namespaceId: 'ns', name: 'id', type: 'uuid', container: null, constraints: [], validators: [], usedInApis: [] },
    { id: 'f-2', namespaceId: 'ns', name: 'price', type: 'float', container: null, constraints: [], validators: [], usedInApis: [] },
    { id: 'f-3', namespaceId: 'ns', name: 'name', type: 'str', container: null, constraints: [], validators: [], usedInApis: [] }
  ];

  const objects: ObjectDefinition[] = [
    {
      id: 'obj-1', namespaceId: 'ns', name: 'Product', fields: [
        { fieldId: 'f-1', optional: false, isPk: true, appears: 'both' },
        { fieldId: 'f-2', optional: false, isPk: false, appears: 'both' },
        { fieldId: 'f-3', optional: true, isPk: false, appears: 'both' }
      ],
      relationships: [], validators: [], usedInApis: []
    }
  ];

  it('resolves fields from target object', () => {
    const result = resolveTargetFields('obj-1', objects, fields);
    expect(result).toEqual([
      { name: 'id', type: 'uuid', isPk: true },
      { name: 'price', type: 'float', isPk: false },
      { name: 'name', type: 'str', isPk: false }
    ]);
  });

  it('returns empty array for unknown object', () => {
    const result = resolveTargetFields('unknown', objects, fields);
    expect(result).toEqual([]);
  });

  it('skips fields that cannot be resolved', () => {
    const sparseObjects: ObjectDefinition[] = [
      {
        id: 'obj-2', namespaceId: 'ns', name: 'Sparse', fields: [
          { fieldId: 'f-1', optional: false, isPk: true, appears: 'both' },
          { fieldId: 'f-missing', optional: false, isPk: false, appears: 'both' }
        ],
        relationships: [], validators: [], usedInApis: []
      }
    ];
    const result = resolveTargetFields('obj-2', sparseObjects, fields);
    expect(result).toEqual([{ name: 'id', type: 'uuid', isPk: true }]);
  });
});
