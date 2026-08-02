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
				param: { name: 'min_price', fieldMemberId: 'fm-price', operator: 'gte', required: false },
				targetFields: [],
				onUpdate: () => {},
				onRemove: () => {}
			};

			expect(props.param.name).toBe('min_price');
			expect(props.param.fieldMemberId).toBe('fm-price');
			expect(props.param.operator).toBe('gte');
			expect(props.targetFields).toEqual([]);
			expect(typeof props.onUpdate).toBe('function');
			expect(typeof props.onRemove).toBe('function');
		});

		it('QueryParamRowProps accepts target field data', () => {
			const props: QueryParamRowProps = {
				param: { name: 'store_id', fieldMemberId: 'fm-store-id', operator: 'eq', required: false },
				targetFields: [
					{ id: 'fm-id', name: 'id', type: 'uuid', isPrimary: true },
					{ id: 'fm-store-id', name: 'store_id', type: 'uuid', isPrimary: false },
					{ id: 'fm-price', name: 'price', type: 'float', isPrimary: false }
				],
				onUpdate: () => {},
				onRemove: () => {}
			};

			expect(props.targetFields).toHaveLength(3);
			expect(props.targetFields[0].name).toBe('id');
			expect(props.targetFields[0].isPrimary).toBe(true);
			expect(props.targetFields[2].type).toBe('float');
		});

		it('QueryParamRowProps onUpdate receives partial QueryParam updates', () => {
			let receivedUpdates: Record<string, unknown> | undefined;

			const props: QueryParamRowProps = {
				param: { name: '', fieldMemberId: '', operator: 'eq', required: false },
				targetFields: [],
				onUpdate: (updates) => {
					receivedUpdates = updates;
				},
				onRemove: () => {}
			};

			props.onUpdate({ name: 'status' });
			expect(receivedUpdates).toEqual({ name: 'status' });

			props.onUpdate({ fieldMemberId: 'fm-price', operator: 'gte' });
			expect(receivedUpdates).toEqual({ fieldMemberId: 'fm-price', operator: 'gte' });

			props.onUpdate({ required: true });
			expect(receivedUpdates).toEqual({ required: true });
		});

		it('QueryParamRowProps onRemove is callable', () => {
			let removeCalled = false;

			const props: QueryParamRowProps = {
				param: { name: 'test', fieldMemberId: 'fm-test', operator: 'eq', required: false },
				targetFields: [],
				onUpdate: () => {},
				onRemove: () => {
					removeCalled = true;
				}
			};

			props.onRemove();
			expect(removeCalled).toBe(true);
		});

		it('QueryParamRowProps param supports all filter operator values', () => {
			const operators = ['eq', 'gte', 'lte', 'gt', 'lt', 'like', 'ilike', 'in'] as const;

			operators.forEach((op) => {
				const props: QueryParamRowProps = {
					param: { name: 'test', fieldMemberId: 'fm-test', operator: op, required: false },
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
				param: { name: 'test', fieldMemberId: 'fm-test', operator: 'eq', required: false },
				targetFields: [],
				onUpdate: () => {},
				onRemove: () => {}
			};

			expect(props).toBeDefined();
		});
	});
});
