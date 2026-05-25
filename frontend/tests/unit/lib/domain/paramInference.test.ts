import { describe, it, expect } from 'vitest';
import { getCompatibleOperators, suggestFieldAndOperator, validateEndpointParams, resolveTargetFields } from '$lib/domain/paramInference';
import type { ObjectDefinition, Field } from '$lib/types';

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
  const targetFields = [
    { fieldMemberId: 'fm-price', name: 'price', type: 'float', isPk: false },
    { fieldMemberId: 'fm-quantity', name: 'quantity', type: 'int', isPk: false },
    { fieldMemberId: 'fm-category', name: 'category', type: 'str', isPk: false },
    { fieldMemberId: 'fm-name', name: 'name', type: 'str', isPk: false },
    { fieldMemberId: 'fm-created-at', name: 'created_at', type: 'datetime', isPk: false },
    { fieldMemberId: 'fm-id', name: 'id', type: 'uuid', isPk: true }
  ];

  it('suggests Field Member price, operator gte for "min_price"', () => {
    const result = suggestFieldAndOperator('min_price', targetFields);
    expect(result).toEqual({ fieldMemberId: 'fm-price', operator: 'gte' });
  });

  it('suggests Field Member quantity, operator lte for "max_quantity"', () => {
    const result = suggestFieldAndOperator('max_quantity', targetFields);
    expect(result).toEqual({ fieldMemberId: 'fm-quantity', operator: 'lte' });
  });

  it('suggests Field Member category, operator eq for "category"', () => {
    const result = suggestFieldAndOperator('category', targetFields);
    expect(result).toEqual({ fieldMemberId: 'fm-category', operator: 'eq' });
  });

  it('returns null when no field name matches', () => {
    const result = suggestFieldAndOperator('foobar', targetFields);
    expect(result).toBeNull();
  });

  it('returns null for empty param name', () => {
    const result = suggestFieldAndOperator('', targetFields);
    expect(result).toBeNull();
  });

  it('suggests Field Member created_at, operator gte for "after_created_at"', () => {
    const result = suggestFieldAndOperator('after_created_at', targetFields);
    expect(result).toEqual({ fieldMemberId: 'fm-created-at', operator: 'gte' });
  });

  it('suggests Field Member created_at, operator lte for "before_created_at"', () => {
    const result = suggestFieldAndOperator('before_created_at', targetFields);
    expect(result).toEqual({ fieldMemberId: 'fm-created-at', operator: 'lte' });
  });
});

interface TargetField {
  fieldMemberId: string;
  name: string;
  type: string;
  isPk: boolean;
}

function validate(opts: {
  targetObjectId?: string;
  targetFields?: TargetField[];
  pathParams?: { name: string; fieldMemberId: string }[];
  queryParams?: { name: string; fieldMemberId: string; operator: string; required?: boolean }[];
}) {
  return validateEndpointParams({
    targetObjectId: opts.targetObjectId,
    targetFields: opts.targetFields ?? [],
    pathParams: (opts.pathParams ?? []).map(p => ({
      name: p.name,
      fieldMemberId: p.fieldMemberId
    })),
    queryParams: (opts.queryParams ?? []).map(q => ({
      name: q.name,
      fieldMemberId: q.fieldMemberId,
      operator: q.operator as any,
      required: q.required ?? false
    }))
  });
}

describe('validateEndpointParams', () => {
  describe('Rule 1: target is known', () => {
    it('passes when targetObjectId is set', () => {
      const errors = validate({
        targetObjectId: 'obj-1',
        targetFields: [{ fieldMemberId: 'fm-id', name: 'id', type: 'uuid', isPk: true }],
        pathParams: [{ name: 'id', fieldMemberId: 'fm-id' }]
      });
      expect(errors).toEqual([]);
    });

    it('fails without targetObjectId', () => {
      const errors = validate({
        targetObjectId: undefined,
        targetFields: []
      });
      expect(errors).toContainEqual(
        expect.objectContaining({ rule: 1 })
      );
    });
  });

  describe('Rule 2: params link to target Field Members', () => {
    it('fails when a path param has no Field Member link', () => {
      const errors = validate({
        targetObjectId: 'obj-1',
        targetFields: [{ fieldMemberId: 'fm-id', name: 'id', type: 'uuid', isPk: true }],
        pathParams: [{ name: 'id', fieldMemberId: '' }]
      });
      expect(errors).toContainEqual(
        expect.objectContaining({ rule: 2, param: 'id' })
      );
    });

    it('fails when path param field does not exist on target', () => {
      const errors = validate({
        targetObjectId: 'obj-1',
        targetFields: [{ fieldMemberId: 'fm-id', name: 'id', type: 'uuid', isPk: true }],
        pathParams: [{ name: 'store_id', fieldMemberId: 'fm-store-id' }]
      });
      expect(errors).toContainEqual(
        expect.objectContaining({ rule: 2, param: 'store_id' })
      );
    });

    it('fails when query param field does not exist on target', () => {
      const errors = validate({
        targetObjectId: 'obj-1',
        targetFields: [{ fieldMemberId: 'fm-price', name: 'price', type: 'float', isPk: false }],
        queryParams: [{ name: 'category', fieldMemberId: 'fm-category', operator: 'eq' }]
      });
      expect(errors).toContainEqual(
        expect.objectContaining({ rule: 2, param: 'category' })
      );
    });

    it('fails when query params have no Field Member selected', () => {
      const errors = validate({
        targetObjectId: 'obj-1',
        targetFields: [{ fieldMemberId: 'fm-id', name: 'id', type: 'uuid', isPk: true }],
        queryParams: [{ name: 'limit', fieldMemberId: '', operator: 'eq' }]
      });
      expect(errors).toContainEqual(
        expect.objectContaining({ rule: 2, param: 'limit' })
      );
    });
  });

  describe('Rule 6: operator-type compatibility', () => {
    it('fails when using gte on str field', () => {
      const errors = validate({
        targetObjectId: 'obj-1',
        targetFields: [{ fieldMemberId: 'fm-name', name: 'name', type: 'str', isPk: false }],
        queryParams: [{ name: 'min_name', fieldMemberId: 'fm-name', operator: 'gte' }]
      });
      expect(errors).toContainEqual(
        expect.objectContaining({ rule: 6, param: 'min_name' })
      );
    });

    it('passes when using ilike on str field', () => {
      const errors = validate({
        targetObjectId: 'obj-1',
        targetFields: [{ fieldMemberId: 'fm-name', name: 'name', type: 'str', isPk: false }],
        queryParams: [{ name: 'search', fieldMemberId: 'fm-name', operator: 'ilike' }]
      });
      const rule6 = errors.filter(e => e.rule === 6);
      expect(rule6).toEqual([]);
    });

    it('fails when using like on int field', () => {
      const errors = validate({
        targetObjectId: 'obj-1',
        targetFields: [{ fieldMemberId: 'fm-count', name: 'count', type: 'int', isPk: false }],
        queryParams: [{ name: 'count_like', fieldMemberId: 'fm-count', operator: 'like' }]
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
      id: 'obj-1', namespaceId: 'ns', name: 'Product',
      members: [
        { memberType: 'field', id: 'fm-id', name: 'id', fieldId: 'f-1', role: 'pk', isNullable: false },
        { memberType: 'field', id: 'fm-price', name: 'price', fieldId: 'f-2', role: 'writable', isNullable: false },
        { memberType: 'field', id: 'fm-name', name: 'name', fieldId: 'f-3', role: 'writable', isNullable: true }
      ],
      derivedRelationships: [], validators: [], usedInApis: []
    }
  ];

  it('resolves fields from target object using member.name', () => {
    const result = resolveTargetFields('obj-1', objects, fields);
    expect(result).toEqual([
      { fieldMemberId: 'fm-id', name: 'id', type: 'uuid', isPk: true },
      { fieldMemberId: 'fm-price', name: 'price', type: 'float', isPk: false },
      { fieldMemberId: 'fm-name', name: 'name', type: 'str', isPk: false }
    ]);
  });

  it('returns empty array for unknown object', () => {
    const result = resolveTargetFields('unknown', objects, fields);
    expect(result).toEqual([]);
  });

  it('skips fields that cannot be resolved', () => {
    const sparseObjects: ObjectDefinition[] = [
      {
        id: 'obj-2', namespaceId: 'ns', name: 'Sparse',
        members: [
          { memberType: 'field', id: 'fm-id', name: 'id', fieldId: 'f-1', role: 'pk', isNullable: false },
          { memberType: 'field', id: 'fm-missing', name: 'missing_field', fieldId: 'f-missing', role: 'writable', isNullable: false }
        ],
        derivedRelationships: [], validators: [], usedInApis: []
      }
    ];
    const result = resolveTargetFields('obj-2', sparseObjects, fields);
    expect(result).toEqual([{ fieldMemberId: 'fm-id', name: 'id', type: 'uuid', isPk: true }]);
  });

  it('skips relationship members (only resolves field members)', () => {
    const mixedObjects: ObjectDefinition[] = [
      {
        id: 'obj-3', namespaceId: 'ns', name: 'Mixed',
        members: [
          { memberType: 'field', id: 'fm-id', name: 'id', fieldId: 'f-1', role: 'pk', isNullable: false },
          { memberType: 'relationship', name: 'orders', targetObjectId: 'o-2', kind: 'one_to_many', inverseName: 'product', required: true }
        ],
        derivedRelationships: [], validators: [], usedInApis: []
      }
    ];
    const result = resolveTargetFields('obj-3', mixedObjects, fields);
    expect(result).toEqual([{ fieldMemberId: 'fm-id', name: 'id', type: 'uuid', isPk: true }]);
  });
});
