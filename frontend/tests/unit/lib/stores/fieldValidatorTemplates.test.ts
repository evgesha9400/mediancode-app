// tests/unit/lib/stores/fieldValidatorTemplates.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import {
  fieldValidatorTemplatesStore,
  searchFieldValidatorTemplates,
  getFieldValidatorTemplateById
} from '$lib/stores/fieldValidatorTemplates';

import type { FieldValidatorTemplate } from '$lib/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTemplate(overrides: Partial<FieldValidatorTemplate> & { name: string }): FieldValidatorTemplate {
  return {
    id: `fvt-${overrides.name}`,
    description: '',
    compatibleTypes: [],
    mode: 'before',
    parameters: [],
    bodyTemplate: '',
    ...overrides
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('fieldValidatorTemplatesStore', () => {
  beforeEach(() => {
    fieldValidatorTemplatesStore.set([]);
  });

  it('starts empty', () => {
    expect(get(fieldValidatorTemplatesStore)).toEqual([]);
  });
});

describe('searchFieldValidatorTemplates', () => {
  const templates = [
    makeTemplate({
      name: 'NotEmpty',
      description: 'Ensures the field is not empty',
      compatibleTypes: ['str']
    }),
    makeTemplate({
      name: 'PositiveNumber',
      description: 'Validates that the value is positive',
      compatibleTypes: ['int', 'float']
    }),
    makeTemplate({
      name: 'EmailFormat',
      description: 'Validates email address format',
      compatibleTypes: ['str']
    })
  ];

  it('returns all templates for empty query', () => {
    expect(searchFieldValidatorTemplates(templates, '')).toHaveLength(3);
    expect(searchFieldValidatorTemplates(templates, '  ')).toHaveLength(3);
  });

  it('searches by name', () => {
    const results = searchFieldValidatorTemplates(templates, 'email');
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('EmailFormat');
  });

  it('searches by name case-insensitively', () => {
    const results = searchFieldValidatorTemplates(templates, 'POSITIVE');
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('PositiveNumber');
  });

  it('searches by description', () => {
    const results = searchFieldValidatorTemplates(templates, 'not empty');
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('NotEmpty');
  });

  it('searches by compatibleTypes', () => {
    const results = searchFieldValidatorTemplates(templates, 'float');
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('PositiveNumber');
  });

  it('searches by compatibleTypes matching multiple templates', () => {
    const results = searchFieldValidatorTemplates(templates, 'str');
    expect(results).toHaveLength(2);
    expect(results.map(t => t.name)).toContain('NotEmpty');
    expect(results.map(t => t.name)).toContain('EmailFormat');
  });

  it('returns empty array when no match', () => {
    const results = searchFieldValidatorTemplates(templates, 'nonexistent');
    expect(results).toHaveLength(0);
  });
});

describe('getFieldValidatorTemplateById', () => {
  beforeEach(() => {
    fieldValidatorTemplatesStore.set([
      makeTemplate({ id: 'fvt-1', name: 'NotEmpty' }),
      makeTemplate({ id: 'fvt-2', name: 'PositiveNumber' })
    ]);
  });

  it('returns the template when found', () => {
    const result = getFieldValidatorTemplateById('fvt-1');
    expect(result).toBeDefined();
    expect(result!.name).toBe('NotEmpty');
  });

  it('returns undefined when not found', () => {
    const result = getFieldValidatorTemplateById('fvt-nonexistent');
    expect(result).toBeUndefined();
  });
});
