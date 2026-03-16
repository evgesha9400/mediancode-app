import { describe, it, expect } from 'vitest';
import { getCompatibleOperators, suggestFieldAndOperator } from '$lib/domain/paramInference';

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
