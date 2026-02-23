/**
 * TemplateGallery Component Tests
 *
 * Unit tests for the TemplateGallery component.
 * Location mirrors: src/lib/components/validator-templates/TemplateGallery.svelte
 *
 * IMPORTANT: Svelte 5 components using $props() cannot be rendered in jsdom.
 * Tests verify TypeScript interface contracts and component exports.
 */

import { describe, it, expect } from 'vitest';
import { TemplateGallery, type TemplateGalleryProps } from '$lib/components';
import type { FieldValidatorTemplate, ModelValidatorTemplate } from '$lib/utils/validatorTemplates';

describe('TemplateGallery Component', () => {
	describe('TypeScript Interface', () => {
		it('TemplateGalleryProps requires kind and onClose', () => {
			const props: TemplateGalleryProps = {
				kind: 'field',
				onClose: () => {}
			};

			expect(props.kind).toBe('field');
			expect(props.onClose).toBeTypeOf('function');
		});

		it('TemplateGalleryProps accepts kind "model"', () => {
			const props: TemplateGalleryProps = {
				kind: 'model',
				onClose: () => {}
			};

			expect(props.kind).toBe('model');
		});

		it('TemplateGalleryProps accepts optional fieldTemplates', () => {
			const template: FieldValidatorTemplate = {
				id: 'test',
				name: 'Test Template',
				description: 'A test template',
				compatibleTypes: ['str'],
				mode: 'before',
				generateFunctionName: (fieldName) => `test_${fieldName}`,
				generateFunctionBody: () => '    return v'
			};

			const props: TemplateGalleryProps = {
				kind: 'field',
				fieldTemplates: [template],
				onClose: () => {}
			};

			expect(props.fieldTemplates).toHaveLength(1);
			expect(props.fieldTemplates![0].name).toBe('Test Template');
		});

		it('TemplateGalleryProps accepts optional modelTemplates', () => {
			const template: ModelValidatorTemplate = {
				id: 'test_model',
				name: 'Test Model Template',
				description: 'A test model template',
				mode: 'after',
				roles: [{ key: 'field_a', label: 'Field A', compatibleTypes: [], required: true }],
				generateFunctionName: () => 'test_model_validator',
				generateFunctionBody: (mappings) => `    return self`
			};

			const props: TemplateGalleryProps = {
				kind: 'model',
				modelTemplates: [template],
				onClose: () => {}
			};

			expect(props.modelTemplates).toHaveLength(1);
			expect(props.modelTemplates![0].name).toBe('Test Model Template');
		});

		it('TemplateGalleryProps accepts optional onSelectField callback', () => {
			const selectFn = (_template: FieldValidatorTemplate) => {};
			const props: TemplateGalleryProps = {
				kind: 'field',
				onSelectField: selectFn,
				onClose: () => {}
			};

			expect(props.onSelectField).toBe(selectFn);
		});

		it('TemplateGalleryProps accepts optional onSelectModel callback', () => {
			const selectFn = (_template: ModelValidatorTemplate) => {};
			const props: TemplateGalleryProps = {
				kind: 'model',
				onSelectModel: selectFn,
				onClose: () => {}
			};

			expect(props.onSelectModel).toBe(selectFn);
		});

		it('TemplateGalleryProps optional properties default to undefined', () => {
			const props: TemplateGalleryProps = {
				kind: 'field',
				onClose: () => {}
			};

			expect(props.fieldTemplates).toBeUndefined();
			expect(props.modelTemplates).toBeUndefined();
			expect(props.onSelectField).toBeUndefined();
			expect(props.onSelectModel).toBeUndefined();
		});
	});

	describe('Component Structure Verification', () => {
		it('TemplateGallery component exports correctly from barrel export', () => {
			expect(TemplateGallery).toBeDefined();
			expect(typeof TemplateGallery).toBe('function');
		});

		it('TemplateGalleryProps type exports correctly from barrel export', () => {
			const props: TemplateGalleryProps = {
				kind: 'field',
				onClose: () => {}
			};

			expect(props).toBeDefined();
		});
	});
});
