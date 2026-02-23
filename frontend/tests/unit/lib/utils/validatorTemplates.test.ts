// tests/unit/lib/utils/validatorTemplates.test.ts
//
// Unit tests for parameterized validator template system.

import { describe, it, expect } from 'vitest';
import {
  FIELD_VALIDATOR_TEMPLATES,
  MODEL_VALIDATOR_TEMPLATES,
  getFieldTemplatesForType,
  getModelTemplates
} from '$lib/utils/validatorTemplates';

// ============================================================================
// Field Validator Templates
// ============================================================================

describe('FIELD_VALIDATOR_TEMPLATES', () => {
  it('has 10 templates', () => {
    expect(FIELD_VALIDATOR_TEMPLATES).toHaveLength(10);
  });

  it('each template has required fields', () => {
    for (const t of FIELD_VALIDATOR_TEMPLATES) {
      expect(t.id).toBeTruthy();
      expect(t.name).toBeTruthy();
      expect(t.description).toBeTruthy();
      expect(t.compatibleTypes.length).toBeGreaterThan(0);
      expect(['before', 'after']).toContain(t.mode);
      expect(typeof t.generateFunctionName).toBe('function');
      expect(typeof t.generateFunctionBody).toBe('function');
    }
  });

  it('generateFunctionName produces valid Python identifiers', () => {
    for (const t of FIELD_VALIDATOR_TEMPLATES) {
      const name = t.generateFunctionName('test_field');
      expect(name).toMatch(/^[a-zA-Z_][a-zA-Z0-9_]*$/);
    }
  });

  it('generateFunctionName sanitizes special characters', () => {
    const template = FIELD_VALIDATOR_TEMPLATES[0]; // strip_lowercase
    const name = template.generateFunctionName('my-field.name');
    expect(name).toMatch(/^[a-zA-Z_][a-zA-Z0-9_]*$/);
    expect(name).not.toContain('-');
    expect(name).not.toContain('.');
  });

  it('generateFunctionBody returns non-empty strings', () => {
    for (const t of FIELD_VALIDATOR_TEMPLATES) {
      const body = t.generateFunctionBody();
      expect(body).toBeTruthy();
      expect(body.length).toBeGreaterThan(0);
    }
  });

  it('generateFunctionBody includes return statement', () => {
    for (const t of FIELD_VALIDATOR_TEMPLATES) {
      const body = t.generateFunctionBody();
      expect(body).toContain('return');
    }
  });
});

describe('Field templates with parameters', () => {
  it('regex_match uses provided pattern', () => {
    const template = FIELD_VALIDATOR_TEMPLATES.find(t => t.id === 'regex_match')!;
    const body = template.generateFunctionBody({ pattern: '^[A-Z]+$' });
    expect(body).toContain('^[A-Z]+$');
  });

  it('string_length uses min and max', () => {
    const template = FIELD_VALIDATOR_TEMPLATES.find(t => t.id === 'string_length')!;
    const body = template.generateFunctionBody({ min: '3', max: '50' });
    expect(body).toContain('3');
    expect(body).toContain('50');
  });

  it('number_range uses min and max', () => {
    const template = FIELD_VALIDATOR_TEMPLATES.find(t => t.id === 'number_range')!;
    const body = template.generateFunctionBody({ min: '0', max: '100' });
    expect(body).toContain('0');
    expect(body).toContain('100');
  });

  it('string_length with no params returns passthrough', () => {
    const template = FIELD_VALIDATOR_TEMPLATES.find(t => t.id === 'string_length')!;
    const body = template.generateFunctionBody();
    expect(body).toContain('return v');
  });
});

// ============================================================================
// Model Validator Templates
// ============================================================================

describe('MODEL_VALIDATOR_TEMPLATES', () => {
  it('has 6 templates', () => {
    expect(MODEL_VALIDATOR_TEMPLATES).toHaveLength(6);
  });

  it('each template has required fields', () => {
    for (const t of MODEL_VALIDATOR_TEMPLATES) {
      expect(t.id).toBeTruthy();
      expect(t.name).toBeTruthy();
      expect(t.description).toBeTruthy();
      expect(['before', 'after']).toContain(t.mode);
      expect(t.roles.length).toBeGreaterThan(0);
      expect(typeof t.generateFunctionName).toBe('function');
      expect(typeof t.generateFunctionBody).toBe('function');
    }
  });

  it('generateFunctionName produces valid Python identifiers', () => {
    for (const t of MODEL_VALIDATOR_TEMPLATES) {
      const name = t.generateFunctionName();
      expect(name).toMatch(/^[a-zA-Z_][a-zA-Z0-9_]*$/);
    }
  });

  it('generateFunctionBody substitutes field mappings', () => {
    const dateRange = MODEL_VALIDATOR_TEMPLATES.find(t => t.id === 'date_range')!;
    const body = dateRange.generateFunctionBody({
      start_field: 'start_date',
      end_field: 'end_date'
    });
    expect(body).toContain('start_date');
    expect(body).toContain('end_date');
  });

  it('password_confirm substitutes both fields', () => {
    const template = MODEL_VALIDATOR_TEMPLATES.find(t => t.id === 'password_confirm')!;
    const body = template.generateFunctionBody({
      password_field: 'password',
      confirm_field: 'password_confirm'
    });
    expect(body).toContain('self.password');
    expect(body).toContain('self.password_confirm');
  });

  it('conditional_required uses trigger value from params', () => {
    const template = MODEL_VALIDATOR_TEMPLATES.find(t => t.id === 'conditional_required')!;
    const body = template.generateFunctionBody({
      trigger_field: 'status',
      required_field: 'reason',
      trigger_value: 'rejected'
    });
    expect(body).toContain('rejected');
    expect(body).toContain('status');
    expect(body).toContain('reason');
  });

  it('at_least_one uses data.get for before mode', () => {
    const template = MODEL_VALIDATOR_TEMPLATES.find(t => t.id === 'at_least_one')!;
    expect(template.mode).toBe('before');
    const body = template.generateFunctionBody({
      field_a: 'email',
      field_b: 'phone'
    });
    expect(body).toContain('data.get("email")');
    expect(body).toContain('data.get("phone")');
    expect(body).toContain('return data');
  });
});

// ============================================================================
// Lookup Helpers
// ============================================================================

describe('getFieldTemplatesForType', () => {
  it('returns string-compatible templates for str type', () => {
    const templates = getFieldTemplatesForType('str');
    expect(templates.length).toBeGreaterThan(0);
    for (const t of templates) {
      expect(t.compatibleTypes).toContain('str');
    }
  });

  it('returns numeric templates for int type', () => {
    const templates = getFieldTemplatesForType('int');
    expect(templates.length).toBeGreaterThan(0);
    const ids = templates.map(t => t.id);
    expect(ids).toContain('number_range');
    expect(ids).toContain('must_be_positive');
  });

  it('returns datetime templates', () => {
    const templates = getFieldTemplatesForType('datetime');
    expect(templates.length).toBeGreaterThan(0);
    const ids = templates.map(t => t.id);
    expect(ids).toContain('future_date');
  });

  it('returns empty for unknown type', () => {
    const templates = getFieldTemplatesForType('custom_unknown_type');
    expect(templates).toHaveLength(0);
  });
});

describe('getModelTemplates', () => {
  it('returns all model templates', () => {
    const templates = getModelTemplates();
    expect(templates).toHaveLength(6);
  });
});
