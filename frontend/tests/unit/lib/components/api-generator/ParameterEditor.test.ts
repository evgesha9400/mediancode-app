/**
 * ParameterEditor Component Tests
 *
 * Unit tests for the ParameterEditor component.
 * Location mirrors: src/lib/components/api-generator/ParameterEditor.svelte
 *
 * IMPORTANT: Svelte 5 components using $props() cannot be rendered in jsdom.
 * Tests verify TypeScript interface contracts and component exports.
 */

import { describe, it, expect } from 'vitest';
import { ParameterEditor, type ParameterEditorProps } from '$lib/components';

describe('ParameterEditor Component', () => {
	describe('TypeScript Interface', () => {
		it('ParameterEditorProps interface accepts all required properties', () => {
			const props: ParameterEditorProps = {
				paramName: 'user_id',
				fieldId: 'field-1',
				availableFields: [],
				onFieldSelect: () => {}
			};

			expect(props.paramName).toBe('user_id');
			expect(props.fieldId).toBe('field-1');
			expect(props.availableFields).toEqual([]);
			expect(typeof props.onFieldSelect).toBe('function');
		});

		it('ParameterEditorProps accepts field data for available fields', () => {
			const props: ParameterEditorProps = {
				paramName: 'item_id',
				fieldId: 'field-2',
				availableFields: [
					{
						id: 'field-1',
						namespaceId: 'ns-1',
						name: 'user_id',
						type: 'int',
						description: 'User identifier',
						constraints: [],
						validators: [],
						usedInApis: []
					},
					{
						id: 'field-2',
						namespaceId: 'ns-1',
						name: 'item_id',
						type: 'str',
						constraints: [],
						validators: [],
						usedInApis: []
					}
				],
				onFieldSelect: () => {}
			};

			expect(props.availableFields).toHaveLength(2);
			expect(props.availableFields[0].name).toBe('user_id');
			expect(props.availableFields[1].type).toBe('str');
		});

		it('ParameterEditorProps onFieldSelect receives field ID', () => {
			let selectedFieldId: string | undefined;

			const props: ParameterEditorProps = {
				paramName: 'id',
				fieldId: '',
				availableFields: [],
				onFieldSelect: (fieldId) => {
					selectedFieldId = fieldId;
				}
			};

			props.onFieldSelect('field-1');

			expect(selectedFieldId).toBe('field-1');
		});
	});

	describe('Component Structure Verification', () => {
		it('ParameterEditor component exports correctly from barrel export', () => {
			expect(ParameterEditor).toBeDefined();
			expect(typeof ParameterEditor).toBe('function');
		});

		it('ParameterEditorProps type exports correctly from barrel export', () => {
			const props: ParameterEditorProps = {
				paramName: 'test',
				fieldId: '',
				availableFields: [],
				onFieldSelect: () => {}
			};

			expect(props).toBeDefined();
		});
	});
});
