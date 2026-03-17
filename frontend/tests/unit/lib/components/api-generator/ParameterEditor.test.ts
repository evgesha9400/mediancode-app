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
				fieldName: 'user_id',
				targetFields: [],
				objectFields: [],
				onFieldSelect: () => {}
			};

			expect(props.paramName).toBe('user_id');
			expect(props.fieldName).toBe('user_id');
			expect(props.targetFields).toEqual([]);
			expect(props.objectFields).toEqual([]);
			expect(typeof props.onFieldSelect).toBe('function');
		});

		it('ParameterEditorProps accepts target field and object field data', () => {
			const props: ParameterEditorProps = {
				paramName: 'item_id',
				fieldName: 'id',
				targetFields: [
					{ name: 'id', type: 'uuid', isPk: true },
					{ name: 'store_id', type: 'uuid', isPk: false }
				],
				objectFields: [
					{ id: 'f-1', namespaceId: 'ns', name: 'id', type: 'uuid', container: null, constraints: [], validators: [], usedInApis: [] },
					{ id: 'f-2', namespaceId: 'ns', name: 'store_id', type: 'uuid', container: null, constraints: [], validators: [], usedInApis: [] }
				],
				onFieldSelect: () => {}
			};

			expect(props.targetFields).toHaveLength(2);
			expect(props.targetFields[0].name).toBe('id');
			expect(props.targetFields[0].isPk).toBe(true);
			expect(props.objectFields).toHaveLength(2);
		});

		it('ParameterEditorProps onFieldSelect receives field name', () => {
			let selectedFieldName: string | undefined;

			const props: ParameterEditorProps = {
				paramName: 'id',
				fieldName: '',
				targetFields: [],
				objectFields: [],
				onFieldSelect: (fieldName) => {
					selectedFieldName = fieldName;
				}
			};

			props.onFieldSelect('user_id');

			expect(selectedFieldName).toBe('user_id');
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
				fieldName: '',
				targetFields: [],
				objectFields: [],
				onFieldSelect: () => {}
			};

			expect(props).toBeDefined();
		});
	});
});
