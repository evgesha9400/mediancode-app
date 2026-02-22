// tests/unit/lib/utils/validatorTemplates.test.ts

/**
 * Validator Templates Utility Tests
 *
 * Unit tests for field and model validator template definitions.
 * Location mirrors: src/lib/utils/validatorTemplates.ts
 */

import { describe, it, expect } from 'vitest';
import {
	blankFieldValidatorTemplate,
	fieldValidatorTemplates,
	blankModelValidatorTemplate,
	modelValidatorTemplates,
	type FieldValidatorTemplate,
	type ModelValidatorTemplate
} from '$lib/utils/validatorTemplates';

describe('Field Validator Templates', () => {
	describe('blankFieldValidatorTemplate', () => {
		it('should have id "blank"', () => {
			expect(blankFieldValidatorTemplate.id).toBe('blank');
		});

		it('should have mode "after"', () => {
			expect(blankFieldValidatorTemplate.mode).toBe('after');
		});

		it('should have compatibleTypes containing "Any"', () => {
			expect(blankFieldValidatorTemplate.compatibleTypes).toContain('Any');
		});

		it('should have code that returns v', () => {
			expect(blankFieldValidatorTemplate.code).toContain('return v');
		});

		it('should conform to FieldValidatorTemplate type', () => {
			const template: FieldValidatorTemplate = blankFieldValidatorTemplate;
			expect(template.id).toBeDefined();
			expect(template.name).toBeDefined();
			expect(template.icon).toBeDefined();
			expect(template.description).toBeDefined();
			expect(template.compatibleTypes).toBeDefined();
			expect(template.mode).toBeDefined();
			expect(template.code).toBeDefined();
		});
	});

	describe('fieldValidatorTemplates array', () => {
		it('should be a non-empty array', () => {
			expect(Array.isArray(fieldValidatorTemplates)).toBe(true);
			expect(fieldValidatorTemplates.length).toBeGreaterThan(0);
		});

		it('should not include the blank template', () => {
			const ids = fieldValidatorTemplates.map(t => t.id);
			expect(ids).not.toContain('blank');
		});

		it('every template should have a unique id', () => {
			const ids = fieldValidatorTemplates.map(t => t.id);
			const uniqueIds = new Set(ids);
			expect(uniqueIds.size).toBe(ids.length);
		});

		it('every template should have a valid mode', () => {
			for (const template of fieldValidatorTemplates) {
				expect(['before', 'after']).toContain(template.mode);
			}
		});

		it('every template should have non-empty compatibleTypes', () => {
			for (const template of fieldValidatorTemplates) {
				expect(template.compatibleTypes.length).toBeGreaterThan(0);
			}
		});

		it('every template should have code that returns v', () => {
			for (const template of fieldValidatorTemplates) {
				expect(template.code).toContain('return v');
			}
		});

		it('every template should have a non-empty name', () => {
			for (const template of fieldValidatorTemplates) {
				expect(template.name.length).toBeGreaterThan(0);
			}
		});

		it('every template should have a non-empty description', () => {
			for (const template of fieldValidatorTemplates) {
				expect(template.description.length).toBeGreaterThan(0);
			}
		});

		it('every template should have an icon string', () => {
			for (const template of fieldValidatorTemplates) {
				expect(template.icon).toMatch(/^fa-/);
			}
		});

		it('should contain known template ids', () => {
			const ids = fieldValidatorTemplates.map(t => t.id);
			expect(ids).toContain('string-cleanup');
			expect(ids).toContain('email-format');
			expect(ids).toContain('number-range');
			expect(ids).toContain('regex-pattern');
			expect(ids).toContain('allowed-values');
		});
	});
});

describe('Model Validator Templates', () => {
	describe('blankModelValidatorTemplate', () => {
		it('should have id "blank"', () => {
			expect(blankModelValidatorTemplate.id).toBe('blank');
		});

		it('should have mode "after"', () => {
			expect(blankModelValidatorTemplate.mode).toBe('after');
		});

		it('should have empty requiredFields', () => {
			expect(blankModelValidatorTemplate.requiredFields).toEqual([]);
		});

		it('should have code that returns self', () => {
			expect(blankModelValidatorTemplate.code).toContain('return self');
		});

		it('should conform to ModelValidatorTemplate type', () => {
			const template: ModelValidatorTemplate = blankModelValidatorTemplate;
			expect(template.id).toBeDefined();
			expect(template.name).toBeDefined();
			expect(template.icon).toBeDefined();
			expect(template.description).toBeDefined();
			expect(template.requiredFields).toBeDefined();
			expect(template.mode).toBeDefined();
			expect(template.code).toBeDefined();
		});
	});

	describe('modelValidatorTemplates array', () => {
		it('should be a non-empty array', () => {
			expect(Array.isArray(modelValidatorTemplates)).toBe(true);
			expect(modelValidatorTemplates.length).toBeGreaterThan(0);
		});

		it('should not include the blank template', () => {
			const ids = modelValidatorTemplates.map(t => t.id);
			expect(ids).not.toContain('blank');
		});

		it('every template should have a unique id', () => {
			const ids = modelValidatorTemplates.map(t => t.id);
			const uniqueIds = new Set(ids);
			expect(uniqueIds.size).toBe(ids.length);
		});

		it('every template should have a valid mode', () => {
			for (const template of modelValidatorTemplates) {
				expect(['before', 'after']).toContain(template.mode);
			}
		});

		it('every template should have requiredFields as an array', () => {
			for (const template of modelValidatorTemplates) {
				expect(Array.isArray(template.requiredFields)).toBe(true);
			}
		});

		it('every "after" mode template should have code that returns self', () => {
			const afterTemplates = modelValidatorTemplates.filter(t => t.mode === 'after');
			for (const template of afterTemplates) {
				expect(template.code).toContain('return self');
			}
		});

		it('every "before" mode template should have code that returns data', () => {
			const beforeTemplates = modelValidatorTemplates.filter(t => t.mode === 'before');
			for (const template of beforeTemplates) {
				expect(template.code).toContain('return data');
			}
		});

		it('every template should have a non-empty name', () => {
			for (const template of modelValidatorTemplates) {
				expect(template.name.length).toBeGreaterThan(0);
			}
		});

		it('every template should have a non-empty description', () => {
			for (const template of modelValidatorTemplates) {
				expect(template.description.length).toBeGreaterThan(0);
			}
		});

		it('every template should have an icon string', () => {
			for (const template of modelValidatorTemplates) {
				expect(template.icon).toMatch(/^fa-/);
			}
		});

		it('should contain known template ids', () => {
			const ids = modelValidatorTemplates.map(t => t.id);
			expect(ids).toContain('cross-field-comparison');
			expect(ids).toContain('mutual-exclusion');
			expect(ids).toContain('conditional-required');
			expect(ids).toContain('password-confirmation');
		});
	});
});

describe('Type Definitions', () => {
	it('FieldValidatorTemplate type has expected shape', () => {
		const template: FieldValidatorTemplate = {
			id: 'test',
			name: 'Test Validator',
			icon: 'fa-test',
			description: 'A test validator',
			compatibleTypes: ['str'],
			mode: 'after',
			code: '    return v'
		};

		expect(template.id).toBe('test');
		expect(template.compatibleTypes).toEqual(['str']);
		expect(template.mode).toBe('after');
	});

	it('ModelValidatorTemplate type has expected shape', () => {
		const template: ModelValidatorTemplate = {
			id: 'test',
			name: 'Test Model Validator',
			icon: 'fa-test',
			description: 'A test model validator',
			requiredFields: ['field_a', 'field_b'],
			mode: 'after',
			code: '    return self'
		};

		expect(template.id).toBe('test');
		expect(template.requiredFields).toEqual(['field_a', 'field_b']);
		expect(template.mode).toBe('after');
	});

	it('FieldValidatorTemplate mode is restricted to before or after', () => {
		const beforeTemplate: FieldValidatorTemplate = {
			id: 'b',
			name: 'Before',
			icon: 'fa-b',
			description: 'Before mode',
			compatibleTypes: ['Any'],
			mode: 'before',
			code: '    return v'
		};

		const afterTemplate: FieldValidatorTemplate = {
			id: 'a',
			name: 'After',
			icon: 'fa-a',
			description: 'After mode',
			compatibleTypes: ['Any'],
			mode: 'after',
			code: '    return v'
		};

		expect(beforeTemplate.mode).toBe('before');
		expect(afterTemplate.mode).toBe('after');
	});
});
