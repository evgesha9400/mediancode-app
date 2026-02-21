import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
  modelValidatorsStore,
  getModelValidatorById,
  getTotalModelValidatorCount,
  getModelValidatorsByNamespace,
  searchModelValidators
} from '$lib/stores/modelValidators';
import { mockModelValidators } from '../../../fixtures/validators';

describe('modelValidators store - Basic Operations', () => {
  beforeEach(() => {
    modelValidatorsStore.set([]);
  });

  it('should start with empty model validators', () => {
    expect(get(modelValidatorsStore)).toHaveLength(0);
  });

  it('should return undefined for non-existent ID', () => {
    expect(getModelValidatorById('nonexistent')).toBeUndefined();
  });

  it('should count total model validators', () => {
    expect(getTotalModelValidatorCount()).toBe(0);

    modelValidatorsStore.set([...mockModelValidators]);
    expect(getTotalModelValidatorCount()).toBe(3);
  });

  it('should get model validator by ID', () => {
    modelValidatorsStore.set([...mockModelValidators]);

    const mv = getModelValidatorById('mv-001');
    expect(mv).toBeDefined();
    expect(mv?.name).toBe('Date Range Check');

    expect(getModelValidatorById('mv-999')).toBeUndefined();
  });
});

describe('modelValidators store - Namespace Filtering', () => {
  beforeEach(() => {
    modelValidatorsStore.set([
      ...mockModelValidators,
      {
        ...mockModelValidators[0],
        id: 'mv-other-ns',
        namespaceId: 'other-namespace',
        name: 'Other NS Validator'
      }
    ]);
  });

  it('should filter model validators by namespace', () => {
    const ns1 = getModelValidatorsByNamespace('00000000-0000-0000-0000-000000000001');
    expect(ns1).toHaveLength(3);

    const nsOther = getModelValidatorsByNamespace('other-namespace');
    expect(nsOther).toHaveLength(1);
    expect(nsOther[0].name).toBe('Other NS Validator');
  });

  it('should return empty array for non-existent namespace', () => {
    expect(getModelValidatorsByNamespace('nonexistent')).toHaveLength(0);
  });
});

describe('modelValidators store - Search', () => {
  beforeEach(() => {
    modelValidatorsStore.set([...mockModelValidators]);
  });

  it('should search by name', () => {
    const results = searchModelValidators(get(modelValidatorsStore), 'Date Range');
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Date Range Check');
  });

  it('should search by description', () => {
    const results = searchModelValidators(get(modelValidatorsStore), 'company_name');
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Company Fields Required');
  });

  it('should search by required fields', () => {
    const results = searchModelValidators(get(modelValidatorsStore), 'discount_code');
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Discount Validation');
  });

  it('should search by mode', () => {
    // All mock model validators have mode 'after'
    const results = searchModelValidators(get(modelValidatorsStore), 'after');
    expect(results).toHaveLength(3);
  });

  it('should search by code content', () => {
    const results = searchModelValidators(get(modelValidatorsStore), 'end_date');
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Date Range Check');
  });

  it('should return all for empty query', () => {
    const results = searchModelValidators(get(modelValidatorsStore), '');
    expect(results).toHaveLength(3);
  });

  it('should return all for whitespace query', () => {
    const results = searchModelValidators(get(modelValidatorsStore), '   ');
    expect(results).toHaveLength(3);
  });

  it('should be case insensitive', () => {
    const results = searchModelValidators(get(modelValidatorsStore), 'DATE RANGE CHECK');
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Date Range Check');
  });
});
