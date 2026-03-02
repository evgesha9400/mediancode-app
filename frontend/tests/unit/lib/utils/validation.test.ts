// tests/unit/lib/utils/validation.test.ts
import { describe, it, expect } from 'vitest';
import { isValidSnakeCaseName, isValidPascalCaseName } from '$lib/utils/validation';

describe('isValidSnakeCaseName', () => {
  it.each([
    'email',
    'user_email',
    'created_at',
    'field2',
    'a',
    'a1_b2'
  ])('accepts valid snake_case name: %s', (name) => {
    expect(isValidSnakeCaseName(name)).toBe(true);
  });

  it.each([
    ['Email', 'starts with uppercase'],
    ['userEmail', 'camelCase'],
    ['user__email', 'consecutive underscores'],
    ['_email', 'starts with underscore'],
    ['email_', 'ends with underscore'],
    ['user-email', 'contains hyphen'],
    ['123field', 'starts with digit'],
    ['', 'empty string'],
    ['user email', 'contains space'],
    ['user_Email', 'uppercase after underscore']
  ])('rejects invalid name: %s (%s)', (name) => {
    expect(isValidSnakeCaseName(name)).toBe(false);
  });
});

describe('isValidPascalCaseName', () => {
  it.each([
    'User',
    'UserEmail',
    'Product2',
    'A',
    'Ab',
    'Ab2c'
  ])('accepts valid PascalCase name: %s', (name) => {
    expect(isValidPascalCaseName(name)).toBe(true);
  });

  it.each([
    ['user', 'starts with lowercase'],
    ['userEmail', 'starts with lowercase (camelCase)'],
    ['user_email', 'snake_case'],
    ['USer', 'consecutive uppercase'],
    ['', 'empty string'],
    ['User_Email', 'contains underscore'],
    ['User Email', 'contains space'],
    ['2User', 'starts with digit'],
    ['User-Email', 'contains hyphen'],
    ['ABc', 'consecutive uppercase at start']
  ])('rejects invalid name: %s (%s)', (name) => {
    expect(isValidPascalCaseName(name)).toBe(false);
  });
});
