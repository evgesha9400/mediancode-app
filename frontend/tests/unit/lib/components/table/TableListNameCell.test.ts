/**
 * TableListNameCell Component Tests
 *
 * Location mirrors: src/lib/components/table/TableListNameCell.svelte
 */

import { describe, it, expect } from 'vitest';
import { TableListNameCell, type TableListNameCellProps } from '$lib/components';

describe('TableListNameCell Component', () => {
	describe('TypeScript Interface', () => {
		it('TableListNameCellProps accepts col, captionText, and class', () => {
			const props: Pick<TableListNameCellProps, 'col' | 'captionText' | 'class'> = {
				col: 'name',
				captionText: 'A subtitle',
				class: 'max-w-xs'
			};

			expect(props.col).toBe('name');
			expect(props.captionText).toBe('A subtitle');
		});
	});

	describe('Component Structure Verification', () => {
		it('TableListNameCell exports correctly', () => {
			expect(TableListNameCell).toBeDefined();
			expect(typeof TableListNameCell).toBe('function');
		});
	});
});
