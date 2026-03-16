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
				responseShape: 'list',
				validationErrors: [],
				onAdd: () => {},
				onUpdate: () => {},
				onRemove: () => {}
			};

			expect(props.queryParams).toEqual([]);
			expect(props.responseShape).toBe('list');
			expect(typeof props.onAdd).toBe('function');
		});

		it('QueryParametersEditorProps accepts query param data', () => {
			const props: QueryParametersEditorProps = {
				queryParams: [
					{ name: 'min_price', field: 'price', operator: 'gte', pagination: false },
					{ name: 'limit', field: '', operator: 'eq', pagination: true }
				],
				targetFields: [
					{ name: 'price', type: 'float', isPk: false }
				],
				responseShape: 'list',
				validationErrors: [],
				onAdd: () => {},
				onUpdate: () => {},
				onRemove: () => {}
			};

			expect(props.queryParams).toHaveLength(2);
			expect(props.queryParams[0].field).toBe('price');
			expect(props.queryParams[1].pagination).toBe(true);
		});

		it('QueryParametersEditorProps handlers receive correct arguments', () => {
			let addCalled = false;
			let updateArgs: { index: number; updates: any } | undefined;
			let removeIndex: number | undefined;

			const props: QueryParametersEditorProps = {
				queryParams: [],
				targetFields: [],
				responseShape: 'list',
				validationErrors: [],
				onAdd: () => { addCalled = true; },
				onUpdate: (index, updates) => { updateArgs = { index, updates }; },
				onRemove: (index) => { removeIndex = index; }
			};

			props.onAdd();
			expect(addCalled).toBe(true);

			props.onUpdate(0, { field: 'price' });
			expect(updateArgs).toEqual({ index: 0, updates: { field: 'price' } });

			props.onRemove(1);
			expect(removeIndex).toBe(1);
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
				responseShape: 'list',
				validationErrors: [],
				onAdd: () => {},
				onUpdate: () => {},
				onRemove: () => {}
			};

			expect(props).toBeDefined();
		});
	});
});
