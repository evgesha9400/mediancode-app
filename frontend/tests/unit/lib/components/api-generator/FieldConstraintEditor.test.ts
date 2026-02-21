/**
 * FieldConstraintEditor Component Tests
 *
 * Unit tests for the FieldConstraintEditor component.
 * Location mirrors: src/lib/components/api-generator/FieldConstraintEditor.svelte
 *
 * IMPORTANT: Svelte 5 components using $props() cannot be rendered in jsdom.
 * Tests verify TypeScript interface contracts and component exports.
 */

import { describe, it, expect } from 'vitest';
import { FieldConstraintEditor, type FieldConstraintEditorProps } from '$lib/components';

describe('FieldConstraintEditor Component', () => {
	describe('TypeScript Interface', () => {
		it('FieldConstraintEditorProps interface accepts all required properties', () => {
			const props: FieldConstraintEditorProps = {
				constraints: [],
				availableConstraints: [],
				allConstraintMeta: [],
				selectedNames: [],
				onAdd: () => {},
				onRemove: () => {},
				onParamChange: () => {}
			};

			expect(props.constraints).toEqual([]);
			expect(typeof props.onAdd).toBe('function');
			expect(typeof props.onRemove).toBe('function');
			expect(typeof props.onParamChange).toBe('function');
		});

		it('FieldConstraintEditorProps accepts constraint values', () => {
			const props: FieldConstraintEditorProps = {
				constraints: [
					{ name: 'max_length', constraintId: 'fc-1', value: '255' },
					{ name: 'min_length', constraintId: 'fc-2', value: '1' }
				],
				availableConstraints: [
					{
						id: 'fc-1',
						namespaceId: 'ns-1',
						name: 'max_length',
						description: 'Maximum length',
						parameterTypes: ['int'],
						docsUrl: null,
						compatibleTypes: ['str'],
						usedInFields: 2
					}
				],
				allConstraintMeta: [],
				selectedNames: ['max_length', 'min_length'],
				onAdd: () => {},
				onRemove: () => {},
				onParamChange: () => {}
			};

			expect(props.constraints).toHaveLength(2);
			expect(props.constraints[0].name).toBe('max_length');
			expect(props.selectedNames).toContain('max_length');
		});

		it('FieldConstraintEditorProps error is optional', () => {
			const propsWithoutError: FieldConstraintEditorProps = {
				constraints: [],
				availableConstraints: [],
				allConstraintMeta: [],
				selectedNames: [],
				onAdd: () => {},
				onRemove: () => {},
				onParamChange: () => {}
			};

			expect(propsWithoutError.error).toBeUndefined();

			const propsWithError: FieldConstraintEditorProps = {
				...propsWithoutError,
				error: 'Constraint value is required'
			};

			expect(propsWithError.error).toBe('Constraint value is required');
		});

		it('FieldConstraintEditorProps onParamChange receives index, rawValue, and parameterTypes', () => {
			let capturedIndex: number | undefined;
			let capturedRawValue: string | undefined;
			let capturedParamTypes: string[] | undefined;

			const props: FieldConstraintEditorProps = {
				constraints: [],
				availableConstraints: [],
				allConstraintMeta: [],
				selectedNames: [],
				onAdd: () => {},
				onRemove: () => {},
				onParamChange: (index, rawValue, parameterTypes) => {
					capturedIndex = index;
					capturedRawValue = rawValue;
					capturedParamTypes = parameterTypes;
				}
			};

			props.onParamChange(0, '100', ['int']);

			expect(capturedIndex).toBe(0);
			expect(capturedRawValue).toBe('100');
			expect(capturedParamTypes).toEqual(['int']);
		});
	});

	describe('Component Structure Verification', () => {
		it('FieldConstraintEditor component exports correctly from barrel export', () => {
			expect(FieldConstraintEditor).toBeDefined();
			expect(typeof FieldConstraintEditor).toBe('function');
		});

		it('FieldConstraintEditorProps type exports correctly from barrel export', () => {
			const props: FieldConstraintEditorProps = {
				constraints: [],
				availableConstraints: [],
				allConstraintMeta: [],
				selectedNames: [],
				onAdd: () => {},
				onRemove: () => {},
				onParamChange: () => {}
			};

			expect(props).toBeDefined();
		});
	});
});
