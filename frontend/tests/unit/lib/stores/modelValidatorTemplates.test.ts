// tests/unit/lib/stores/modelValidatorTemplates.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import {
  modelValidatorTemplatesStore,
  searchModelValidatorTemplates,
  getModelValidatorTemplateById
} from '$lib/stores/modelValidatorTemplates';

import type { ModelValidatorTemplate } from '$lib/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTemplate(overrides: Partial<ModelValidatorTemplate> & { name: string }): ModelValidatorTemplate {
  return {
    id: `mvt-${overrides.name}`,
    description: '',
    mode: 'before',
    parameters: [],
    fieldMappings: [],
    bodyTemplate: '',
    ...overrides
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('modelValidatorTemplatesStore', () => {
  beforeEach(() => {
    modelValidatorTemplatesStore.set([]);
  });

  it('starts empty', () => {
    expect(get(modelValidatorTemplatesStore)).toEqual([]);
  });
});

describe('searchModelValidatorTemplates', () => {
  const templates = [
    makeTemplate({
      name: 'CrossFieldComparison',
      description: 'Compares two fields to ensure ordering'
    }),
    makeTemplate({
      name: 'DateRangeValidator',
      description: 'Validates that start date is before end date'
    }),
    makeTemplate({
      name: 'MutualExclusion',
      description: 'Ensures only one of several fields is set'
    })
  ];

  it('returns all templates for empty query', () => {
    expect(searchModelValidatorTemplates(templates, '')).toHaveLength(3);
    expect(searchModelValidatorTemplates(templates, '  ')).toHaveLength(3);
  });

  it('searches by name', () => {
    const results = searchModelValidatorTemplates(templates, 'date');
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('DateRangeValidator');
  });

  it('searches by name case-insensitively', () => {
    const results = searchModelValidatorTemplates(templates, 'MUTUAL');
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('MutualExclusion');
  });

  it('searches by description', () => {
    const results = searchModelValidatorTemplates(templates, 'ordering');
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('CrossFieldComparison');
  });

  it('searches by description matching multiple templates', () => {
    const results = searchModelValidatorTemplates(templates, 'fields');
    expect(results).toHaveLength(2);
    expect(results.map(t => t.name)).toContain('CrossFieldComparison');
    expect(results.map(t => t.name)).toContain('MutualExclusion');
  });

  it('returns empty array when no match', () => {
    const results = searchModelValidatorTemplates(templates, 'nonexistent');
    expect(results).toHaveLength(0);
  });
});

describe('getModelValidatorTemplateById', () => {
  beforeEach(() => {
    modelValidatorTemplatesStore.set([
      makeTemplate({ id: 'mvt-1', name: 'CrossFieldComparison' }),
      makeTemplate({ id: 'mvt-2', name: 'DateRangeValidator' })
    ]);
  });

  it('returns the template when found', () => {
    const result = getModelValidatorTemplateById('mvt-1');
    expect(result).toBeDefined();
    expect(result!.name).toBe('CrossFieldComparison');
  });

  it('returns undefined when not found', () => {
    const result = getModelValidatorTemplateById('mvt-nonexistent');
    expect(result).toBeUndefined();
  });
});
