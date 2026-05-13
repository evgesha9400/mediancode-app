/**
 * TableListTextCell Component Tests
 *
 * Location mirrors: src/lib/components/table/TableListTextCell.svelte
 */

import { describe, it, expect } from 'vitest';
import { TableListTextCell, type TableListTextCellProps } from '$lib/components';

describe('TableListTextCell Component', () => {
	describe('TypeScript Interface', () => {
		it('TableListTextCellProps accepts col, nowrap, and class', () => {
			const props: Pick<TableListTextCellProps, 'col' | 'nowrap' | 'class'> = {
				col: 'description',
				nowrap: true,
				class: 'truncate'
			};

			expect(props.col).toBe('description');
			expect(props.nowrap).toBe(true);
		});
	});

	describe('Component Structure Verification', () => {
		it('TableListTextCell exports correctly', () => {
			expect(TableListTextCell).toBeDefined();
			expect(typeof TableListTextCell).toBe('function');
		});
	});
});
