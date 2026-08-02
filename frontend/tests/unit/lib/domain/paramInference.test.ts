import { describe, it, expect } from 'vitest';
import { getCompatibleOperators, suggestFieldAndOperator, validateEndpointParams } from '$lib/domain/paramInference';
import type { EndpointTargetFieldMember } from '$lib/domain/paramInference';

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
    { id: 'fm-price', name: 'price', type: 'float', isPrimary: false },
    { id: 'fm-quantity', name: 'quantity', type: 'int', isPrimary: false },
    { id: 'fm-category', name: 'category', type: 'str', isPrimary: false },
    { id: 'fm-name', name: 'name', type: 'str', isPrimary: false },
    { id: 'fm-created-at', name: 'created_at', type: 'datetime', isPrimary: false },
    { id: 'fm-id', name: 'id', type: 'uuid', isPrimary: true }
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

function validate(opts: {
  targetObjectId?: string;
  targetFields?: EndpointTargetFieldMember[];
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
        targetFields: [{ id: 'fm-id', name: 'id', type: 'uuid', isPrimary: true }],
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
        targetFields: [{ id: 'fm-id', name: 'id', type: 'uuid', isPrimary: true }],
        pathParams: [{ name: 'id', fieldMemberId: '' }]
      });
      expect(errors).toContainEqual(
        expect.objectContaining({ rule: 2, param: 'id' })
      );
    });

    it('fails when path param field does not exist on target', () => {
      const errors = validate({
        targetObjectId: 'obj-1',
        targetFields: [{ id: 'fm-id', name: 'id', type: 'uuid', isPrimary: true }],
        pathParams: [{ name: 'store_id', fieldMemberId: 'fm-store-id' }]
      });
      expect(errors).toContainEqual(
        expect.objectContaining({ rule: 2, param: 'store_id' })
      );
    });

    it('fails when query param field does not exist on target', () => {
      const errors = validate({
        targetObjectId: 'obj-1',
        targetFields: [{ id: 'fm-price', name: 'price', type: 'float', isPrimary: false }],
        queryParams: [{ name: 'category', fieldMemberId: 'fm-category', operator: 'eq' }]
      });
      expect(errors).toContainEqual(
        expect.objectContaining({ rule: 2, param: 'category' })
      );
    });

    it('fails when query params have no Field Member selected', () => {
      const errors = validate({
        targetObjectId: 'obj-1',
        targetFields: [{ id: 'fm-id', name: 'id', type: 'uuid', isPrimary: true }],
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
        targetFields: [{ id: 'fm-name', name: 'name', type: 'str', isPrimary: false }],
        queryParams: [{ name: 'min_name', fieldMemberId: 'fm-name', operator: 'gte' }]
      });
      expect(errors).toContainEqual(
        expect.objectContaining({ rule: 6, param: 'min_name' })
      );
    });

    it('passes when using ilike on str field', () => {
      const errors = validate({
        targetObjectId: 'obj-1',
        targetFields: [{ id: 'fm-name', name: 'name', type: 'str', isPrimary: false }],
        queryParams: [{ name: 'search', fieldMemberId: 'fm-name', operator: 'ilike' }]
      });
      const rule6 = errors.filter(e => e.rule === 6);
      expect(rule6).toEqual([]);
    });

    it('fails when using like on int field', () => {
      const errors = validate({
        targetObjectId: 'obj-1',
        targetFields: [{ id: 'fm-count', name: 'count', type: 'int', isPrimary: false }],
        queryParams: [{ name: 'count_like', fieldMemberId: 'fm-count', operator: 'like' }]
      });
      expect(errors).toContainEqual(
        expect.objectContaining({ rule: 6, param: 'count_like' })
      );
    });
  });
});
