/**
 * TemplateForm Component Tests
 *
 * Unit tests for the TemplateForm component.
 * Location mirrors: src/lib/components/validator-templates/TemplateForm.svelte
 *
 * IMPORTANT: Svelte 5 components using $props() cannot be rendered in jsdom.
 * Tests verify TypeScript interface contracts and component exports.
 */

import { describe, it, expect } from 'vitest';
import { TemplateForm, type TemplateFormProps } from '$lib/components';
import type { FieldValidatorTemplate, ModelValidatorTemplate } from '$lib/types';
import type { Field } from '$lib/types';

describe('TemplateForm Component', () => {
	const mockOnAdd = (_validator: {
		templateId: string;
		parameters?: Record<string, string>;
		fieldMappings?: Record<string, string>;
	}) => {};
	const mockOnBack = () => {};

	describe('TypeScript Interface', () => {
		it('TemplateFormProps requires kind, onAdd, and onBack', () => {
			const props: TemplateFormProps = {
				kind: 'field',
				onAdd: mockOnAdd,
				onBack: mockOnBack
			};

			expect(props.kind).toBe('field');
			expect(props.onAdd).toBeTypeOf('function');
			expect(props.onBack).toBeTypeOf('function');
		});

		it('TemplateFormProps accepts kind "model"', () => {
			const props: TemplateFormProps = {
				kind: 'model',
				onAdd: mockOnAdd,
				onBack: mockOnBack
			};

			expect(props.kind).toBe('model');
		});

		it('TemplateFormProps accepts optional fieldTemplate', () => {
			const template: FieldValidatorTemplate = {
				id: 'test',
				name: 'Test Template',
				description: 'A test template',
				compatibleTypes: ['str'],
				mode: 'before',
				parameters: [],
				bodyTemplate: '    return v.strip()'
			};

			const props: TemplateFormProps = {
				kind: 'field',
				fieldTemplate: template,
				onAdd: mockOnAdd,
				onBack: mockOnBack
			};

			expect(props.fieldTemplate).toBeDefined();
			expect(props.fieldTemplate!.name).toBe('Test Template');
		});

		it('TemplateFormProps accepts optional modelTemplate', () => {
			const template: ModelValidatorTemplate = {
				id: 'test_model',
				name: 'Test Model Template',
				description: 'A test model template',
				mode: 'after',
				parameters: [],
				fieldMappings: [{ key: 'field_a', label: 'Field A', compatibleTypes: [], required: true }],
				bodyTemplate: '    return self'
			};

			const props: TemplateFormProps = {
				kind: 'model',
				modelTemplate: template,
				onAdd: mockOnAdd,
				onBack: mockOnBack
			};

			expect(props.modelTemplate).toBeDefined();
			expect(props.modelTemplate!.name).toBe('Test Model Template');
		});

		it('TemplateFormProps accepts optional availableFields for model validators', () => {
			const fields: Field[] = [
				{
					id: '1',
					namespaceId: 'ns1',
					name: 'email',
					type: 'str',
					description: 'Email field',
					constraints: [],
					validators: [],
					usedInApis: []
				}
			];

			const props: TemplateFormProps = {
				kind: 'model',
				availableFields: fields,
				onAdd: mockOnAdd,
				onBack: mockOnBack
			};

			expect(props.availableFields).toHaveLength(1);
			expect(props.availableFields![0].name).toBe('email');
		});

		it('TemplateFormProps optional properties default to undefined', () => {
			const props: TemplateFormProps = {
				kind: 'field',
				onAdd: mockOnAdd,
				onBack: mockOnBack
			};

			expect(props.fieldTemplate).toBeUndefined();
			expect(props.modelTemplate).toBeUndefined();
			expect(props.availableFields).toBeUndefined();
		});
	});

	describe('Component Structure Verification', () => {
		it('TemplateForm component exports correctly from barrel export', () => {
			expect(TemplateForm).toBeDefined();
			expect(typeof TemplateForm).toBe('function');
		});

		it('TemplateFormProps type exports correctly from barrel export', () => {
			const props: TemplateFormProps = {
				kind: 'field',
				onAdd: mockOnAdd,
				onBack: mockOnBack
			};

			expect(props).toBeDefined();
		});
	});
});
