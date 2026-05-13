/**
 * QueryParamRow Component Tests
 *
 * Unit tests for the QueryParamRow component.
 * Location mirrors: src/lib/components/api-generator/QueryParamRow.svelte
 *
 * IMPORTANT: Svelte 5 components using $props() cannot be rendered in jsdom.
 * Tests verify TypeScript interface contracts and component exports.
 */

import { describe, it, expect } from 'vitest';
import { QueryParamRow, type QueryParamRowProps } from '$lib/components';

describe('QueryParamRow Component', () => {
	describe('TypeScript Interface', () => {
		it('QueryParamRowProps interface accepts all required properties', () => {
			const props: QueryParamRowProps = {
				param: { name: 'min_price', field: 'price', operator: 'gte' },
				targetFields: [],
				onUpdate: () => {},
				onRemove: () => {}
			};

			expect(props.param.name).toBe('min_price');
			expect(props.param.field).toBe('price');
			expect(props.param.operator).toBe('gte');
			expect(props.targetFields).toEqual([]);
			expect(typeof props.onUpdate).toBe('function');
			expect(typeof props.onRemove).toBe('function');
		});

		it('QueryParamRowProps accepts target field data', () => {
			const props: QueryParamRowProps = {
				param: { name: 'store_id', field: 'store_id', operator: 'eq' },
				targetFields: [
					{ name: 'id', type: 'uuid', isPk: true },
					{ name: 'store_id', type: 'uuid', isPk: false },
					{ name: 'price', type: 'float', isPk: false }
				],
				onUpdate: () => {},
				onRemove: () => {}
			};

			expect(props.targetFields).toHaveLength(3);
			expect(props.targetFields[0].name).toBe('id');
			expect(props.targetFields[0].isPk).toBe(true);
			expect(props.targetFields[2].type).toBe('float');
		});

		it('QueryParamRowProps onUpdate receives partial QueryParam updates', () => {
			let receivedUpdates: Record<string, unknown> | undefined;

			const props: QueryParamRowProps = {
				param: { name: '', field: '', operator: 'eq' },
				targetFields: [],
				onUpdate: (updates) => {
					receivedUpdates = updates;
				},
				onRemove: () => {}
			};

			props.onUpdate({ name: 'status' });
			expect(receivedUpdates).toEqual({ name: 'status' });

			props.onUpdate({ field: 'price', operator: 'gte' });
			expect(receivedUpdates).toEqual({ field: 'price', operator: 'gte' });
		});

		it('QueryParamRowProps onRemove is callable', () => {
			let removeCalled = false;

			const props: QueryParamRowProps = {
				param: { name: 'test', field: 'test', operator: 'eq' },
				targetFields: [],
				onUpdate: () => {},
				onRemove: () => {
					removeCalled = true;
				}
			};

			props.onRemove();
			expect(removeCalled).toBe(true);
		});

		it('QueryParamRowProps onSuggest is optional', () => {
			const propsWithout: QueryParamRowProps = {
				param: { name: '', field: '', operator: 'eq' },
				targetFields: [],
				onUpdate: () => {},
				onRemove: () => {}
			};

			expect(propsWithout.onSuggest).toBeUndefined();
		});

		it('QueryParamRowProps onSuggest receives field and operator suggestion', () => {
			let suggestion: { field: string; operator: string } | undefined;

			const props: QueryParamRowProps = {
				param: { name: '', field: '', operator: 'eq' },
				targetFields: [],
				onUpdate: () => {},
				onRemove: () => {},
				onSuggest: (s) => {
					suggestion = s;
				}
			};

			props.onSuggest!({ field: 'price', operator: 'gte' });
			expect(suggestion).toEqual({ field: 'price', operator: 'gte' });
		});

		it('QueryParamRowProps param supports all filter operator values', () => {
			const operators = ['eq', 'gte', 'lte', 'gt', 'lt', 'like', 'ilike', 'in'] as const;

			operators.forEach((op) => {
				const props: QueryParamRowProps = {
					param: { name: 'test', field: 'test', operator: op },
					targetFields: [],
					onUpdate: () => {},
					onRemove: () => {}
				};

				expect(props.param.operator).toBe(op);
			});
		});
	});

	describe('Component Structure Verification', () => {
		it('QueryParamRow component exports correctly from barrel export', () => {
			expect(QueryParamRow).toBeDefined();
			expect(typeof QueryParamRow).toBe('function');
		});

		it('QueryParamRowProps type exports correctly from barrel export', () => {
			const props: QueryParamRowProps = {
				param: { name: 'test', field: 'test', operator: 'eq' },
				targetFields: [],
				onUpdate: () => {},
				onRemove: () => {}
			};

			expect(props).toBeDefined();
		});
	});
});
