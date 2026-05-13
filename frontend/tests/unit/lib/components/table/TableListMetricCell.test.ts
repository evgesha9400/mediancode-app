/**
 * TableListMetricCell Component Tests
 *
 * Location mirrors: src/lib/components/table/TableListMetricCell.svelte
 */

import { describe, it, expect } from 'vitest';
import { TableListMetricCell, type TableListMetricCellProps } from '$lib/components';

describe('TableListMetricCell Component', () => {
	describe('TypeScript Interface', () => {
		it('TableListMetricCellProps accepts col, label, and class', () => {
			const props: Pick<TableListMetricCellProps, 'col' | 'label' | 'class'> = {
				col: 'usedInApis',
				label: 'APIs',
				class: ''
			};

			expect(props.col).toBe('usedInApis');
			expect(props.label).toBe('APIs');
		});
	});

	describe('Component Structure Verification', () => {
		it('TableListMetricCell exports correctly', () => {
			expect(TableListMetricCell).toBeDefined();
			expect(typeof TableListMetricCell).toBe('function');
		});
	});
});
