/**
 * QueryParametersEditor Component Tests
 *
 * Unit tests for the QueryParametersEditor component.
 * Location mirrors: src/lib/components/api-generator/QueryParametersEditor.svelte
 *
 * IMPORTANT: Svelte 5 components using $props() cannot be rendered in jsdom.
 * Tests verify TypeScript interface contracts and component exports.
 */

import { describe, it, expect } from 'vitest';
import { QueryParametersEditor, type QueryParametersEditorProps } from '$lib/components';

describe('QueryParametersEditor Component', () => {
	describe('TypeScript Interface', () => {
		it('QueryParametersEditorProps interface accepts all required properties', () => {
			const props: QueryParametersEditorProps = {
				queryParams: [],
				targetFields: [],
				controls: {
					queryParameters: { mode: 'editable' },
					pagination: { mode: 'editable' },
					responseShape: { mode: 'locked', value: 'list', reason: 'Queryable endpoints return a list' },
					responsePreview: { requestBodyVisible: false, responseBodyVisible: true, emptyMessage: '', targetNote: '' }
				},
				pagination: false,
				validationErrors: [],
				blockIssues: [],
				onAddFromField: () => {},
				onUpdate: () => {},
				onRemove: () => {},
				onTogglePagination: () => {}
			};

			expect(props.queryParams).toEqual([]);
			expect(props.controls.queryParameters.mode).toBe('editable');
			expect(props.pagination).toBe(false);
			expect(typeof props.onAddFromField).toBe('function');
			expect(typeof props.onTogglePagination).toBe('function');
		});

		it('QueryParametersEditorProps accepts query param data', () => {
			const props: QueryParametersEditorProps = {
				queryParams: [
					{ name: 'min_price', fieldMemberId: 'fm-price', operator: 'gte', required: false }
				],
				targetFields: [
					{ id: 'fm-price', name: 'price', type: 'float', isPrimary: false }
				],
				controls: {
					queryParameters: { mode: 'editable' },
					pagination: { mode: 'editable' },
					responseShape: { mode: 'locked', value: 'list', reason: 'Queryable endpoints return a list' },
					responsePreview: { requestBodyVisible: false, responseBodyVisible: true, emptyMessage: '', targetNote: '' }
				},
				pagination: true,
				validationErrors: [],
				onAddFromField: () => {},
				onUpdate: () => {},
				onRemove: () => {},
				onTogglePagination: () => {}
			};

			expect(props.queryParams).toHaveLength(1);
			expect(props.queryParams[0].fieldMemberId).toBe('fm-price');
			expect(props.pagination).toBe(true);
		});

		it('QueryParametersEditorProps handlers receive correct arguments', () => {
			let addFieldMemberId: string | undefined;
			let updateArgs: { index: number; updates: any } | undefined;
			let removeIndex: number | undefined;
			let paginationToggled = false;

			const props: QueryParametersEditorProps = {
				queryParams: [],
				targetFields: [],
				controls: {
					queryParameters: { mode: 'editable' },
					pagination: { mode: 'editable' },
					responseShape: { mode: 'locked', value: 'list', reason: 'Queryable endpoints return a list' },
					responsePreview: { requestBodyVisible: false, responseBodyVisible: true, emptyMessage: '', targetNote: '' }
				},
				pagination: false,
				validationErrors: [],
				onAddFromField: (fieldMemberId) => { addFieldMemberId = fieldMemberId; },
				onUpdate: (index, updates) => { updateArgs = { index, updates }; },
				onRemove: (index) => { removeIndex = index; },
				onTogglePagination: () => { paginationToggled = true; }
			};

			props.onAddFromField('fm-price');
			expect(addFieldMemberId).toBe('fm-price');

			props.onUpdate(0, { fieldMemberId: 'fm-price' });
			expect(updateArgs).toEqual({ index: 0, updates: { fieldMemberId: 'fm-price' } });

			props.onRemove(1);
			expect(removeIndex).toBe(1);

			props.onTogglePagination();
			expect(paginationToggled).toBe(true);
		});
	});

	describe('Component Structure Verification', () => {
		it('QueryParametersEditor component exports correctly from barrel export', () => {
			expect(QueryParametersEditor).toBeDefined();
			expect(typeof QueryParametersEditor).toBe('function');
		});

		it('QueryParametersEditorProps type exports correctly from barrel export', () => {
			const props: QueryParametersEditorProps = {
				queryParams: [],
				targetFields: [],
				controls: {
					queryParameters: { mode: 'editable' },
					pagination: { mode: 'editable' },
					responseShape: { mode: 'locked', value: 'list', reason: 'Queryable endpoints return a list' },
					responsePreview: { requestBodyVisible: false, responseBodyVisible: true, emptyMessage: '', targetNote: '' }
				},
				pagination: false,
				validationErrors: [],
				onAddFromField: () => {},
				onUpdate: () => {},
				onRemove: () => {},
				onTogglePagination: () => {}
			};

			expect(props).toBeDefined();
		});
	});
});
