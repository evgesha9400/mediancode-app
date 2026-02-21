import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
  fieldValidatorsStore,
  getFieldValidatorById,
  getTotalFieldValidatorCount,
  getFieldValidatorsByNamespace,
  searchFieldValidators
} from '$lib/stores/fieldValidators';
import { mockFieldValidators } from '../../../fixtures/validators';

describe('fieldValidators store - Basic Operations', () => {
  beforeEach(() => {
    fieldValidatorsStore.set([]);
  });

  it('should start with empty field validators', () => {
    expect(get(fieldValidatorsStore)).toHaveLength(0);
  });

  it('should return undefined for non-existent ID', () => {
    expect(getFieldValidatorById('nonexistent')).toBeUndefined();
  });

  it('should count total field validators', () => {
    expect(getTotalFieldValidatorCount()).toBe(0);

    fieldValidatorsStore.set([...mockFieldValidators]);
    expect(getTotalFieldValidatorCount()).toBe(3);
  });

  it('should get field validator by ID', () => {
    fieldValidatorsStore.set([...mockFieldValidators]);

    const fv = getFieldValidatorById('fv-001');
    expect(fv).toBeDefined();
    expect(fv?.name).toBe('String Cleanup');

    expect(getFieldValidatorById('fv-999')).toBeUndefined();
  });
});

describe('fieldValidators store - Namespace Filtering', () => {
  beforeEach(() => {
    fieldValidatorsStore.set([
      ...mockFieldValidators,
      {
        ...mockFieldValidators[0],
        id: 'fv-other-ns',
        namespaceId: 'other-namespace',
        name: 'Other NS Validator'
      }
    ]);
  });

  it('should filter field validators by namespace', () => {
    const ns1 = getFieldValidatorsByNamespace('00000000-0000-0000-0000-000000000001');
    expect(ns1).toHaveLength(3);

    const nsOther = getFieldValidatorsByNamespace('other-namespace');
    expect(nsOther).toHaveLength(1);
    expect(nsOther[0].name).toBe('Other NS Validator');
  });

  it('should return empty array for non-existent namespace', () => {
    expect(getFieldValidatorsByNamespace('nonexistent')).toHaveLength(0);
  });
});

describe('fieldValidators store - Search', () => {
  beforeEach(() => {
    fieldValidatorsStore.set([...mockFieldValidators]);
  });

  it('should search by name', () => {
    const results = searchFieldValidators(get(fieldValidatorsStore), 'String Cleanup');
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('String Cleanup');
  });

  it('should search by description', () => {
    const results = searchFieldValidators(get(fieldValidatorsStore), 'regex');
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Email Format');
  });

  it('should search by compatible types', () => {
    const results = searchFieldValidators(get(fieldValidatorsStore), 'float');
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Number Range');
  });

  it('should search by mode', () => {
    const results = searchFieldValidators(get(fieldValidatorsStore), 'before');
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('String Cleanup');
  });

  it('should search by code content', () => {
    const results = searchFieldValidators(get(fieldValidatorsStore), '255 characters');
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('String Cleanup');
  });

  it('should return all for empty query', () => {
    const results = searchFieldValidators(get(fieldValidatorsStore), '');
    expect(results).toHaveLength(3);
  });

  it('should return all for whitespace query', () => {
    const results = searchFieldValidators(get(fieldValidatorsStore), '   ');
    expect(results).toHaveLength(3);
  });

  it('should be case insensitive', () => {
    const results = searchFieldValidators(get(fieldValidatorsStore), 'STRING CLEANUP');
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('String Cleanup');
  });
});
