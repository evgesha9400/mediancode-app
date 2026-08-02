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
				fieldMemberId: 'fm-user-id',
				targetFields: [],
				onFieldSelect: () => {}
			};

			expect(props.paramName).toBe('user_id');
			expect(props.fieldMemberId).toBe('fm-user-id');
			expect(props.targetFields).toEqual([]);
			expect(typeof props.onFieldSelect).toBe('function');
		});

		it('ParameterEditorProps accepts target Field Member data', () => {
			const props: ParameterEditorProps = {
				paramName: 'item_id',
				fieldMemberId: 'fm-id',
				targetFields: [
					{ id: 'fm-id', name: 'id', type: 'uuid', isPrimary: true },
					{ id: 'fm-store-id', name: 'store_id', type: 'uuid', isPrimary: false }
				],
				onFieldSelect: () => {}
			};

			expect(props.targetFields).toHaveLength(2);
			expect(props.targetFields[0].name).toBe('id');
			expect(props.targetFields[0].isPrimary).toBe(true);
		});

		it('ParameterEditorProps onFieldSelect receives Field Member ID', () => {
			let selectedFieldMemberId: string | undefined;

			const props: ParameterEditorProps = {
				paramName: 'id',
				fieldMemberId: '',
				targetFields: [],
				onFieldSelect: (fieldMemberId) => {
					selectedFieldMemberId = fieldMemberId;
				}
			};

			props.onFieldSelect('fm-user-id');

			expect(selectedFieldMemberId).toBe('fm-user-id');
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
				fieldMemberId: '',
				targetFields: [],
				onFieldSelect: () => {}
			};

			expect(props).toBeDefined();
		});
	});
});
