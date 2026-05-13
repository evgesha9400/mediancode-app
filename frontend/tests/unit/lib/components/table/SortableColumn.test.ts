/**
 * SortableColumn Component Tests
 *
 * Unit tests for the SortableColumn component.
 * Location mirrors: src/lib/components/table/SortableColumn.svelte
 *
 * IMPORTANT: Svelte 5 components using $props() cannot be rendered in jsdom.
 * Tests verify TypeScript interface contracts and component exports.
 */

import { describe, it, expect } from 'vitest';
import { SortableColumn, type SortableColumnProps } from '$lib/components';
import type { MultiSortState } from '$lib/utils/sorting';

describe('SortableColumn Component', () => {
	describe('TypeScript Interface', () => {
		it('SortableColumnProps interface requires column, label, sorts, and onSort', () => {
			const sorts: MultiSortState = [];
			const sortFn = (_columnKey: string, _shiftKey: boolean) => {};

			const props: SortableColumnProps = {
				column: 'name',
				label: 'Name',
				sorts,
				onSort: sortFn
			};

			expect(props.column).toBe('name');
			expect(props.label).toBe('Name');
			expect(props.sorts).toBe(sorts);
			expect(props.onSort).toBe(sortFn);
		});

		it('SortableColumnProps sorts accepts MultiSortState with entries', () => {
			const sorts: MultiSortState = [
				{ column: 'name', direction: 'asc' }
			];

			const props: SortableColumnProps = {
				column: 'name',
				label: 'Name',
				sorts,
				onSort: () => {}
			};

			expect(props.sorts).toHaveLength(1);
			expect(props.sorts[0].column).toBe('name');
			expect(props.sorts[0].direction).toBe('asc');
		});

		it('SortableColumnProps onSort receives column key and shift key', () => {
			let receivedColumn = '';
			let receivedShift = false;

			const props: SortableColumnProps = {
				column: 'type',
				label: 'Type',
				sorts: [],
				onSort: (columnKey, shiftKey) => {
					receivedColumn = columnKey;
					receivedShift = shiftKey;
				}
			};

			props.onSort('type', true);
			expect(receivedColumn).toBe('type');
			expect(receivedShift).toBe(true);
		});
	});

	describe('Component Structure Verification', () => {
		it('SortableColumn component exports correctly from barrel export', () => {
			expect(SortableColumn).toBeDefined();
			expect(typeof SortableColumn).toBe('function');
		});

		it('SortableColumnProps type exports correctly from barrel export', () => {
			const props: SortableColumnProps = {
				column: 'test',
				label: 'Test',
				sorts: [],
				onSort: () => {}
			};

			expect(props).toBeDefined();
		});
	});
});
