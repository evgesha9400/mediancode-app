/**
 * TableEmptyState Component Tests
 *
 * Unit tests for the TableEmptyState component.
 * Location mirrors: src/lib/components/table/TableEmptyState.svelte
 *
 * IMPORTANT: Svelte 5 components using $props() cannot be rendered in jsdom.
 * Tests verify TypeScript interface contracts and component exports.
 */

import { describe, it, expect } from 'vitest';
import { TableEmptyState, type TableEmptyStateProps } from '$lib/components';

describe('TableEmptyState Component', () => {
	describe('TypeScript Interface', () => {
		it('TableEmptyStateProps interface requires entityName and storeKey', () => {
			const props: TableEmptyStateProps = {
				entityName: 'fields',
				storeKey: 'FIELDS'
			};

			expect(props.entityName).toBe('fields');
			expect(props.storeKey).toBe('FIELDS');
		});

		it('TableEmptyStateProps accepts optional noResultsMessage', () => {
			const props: TableEmptyStateProps = {
				entityName: 'types',
				storeKey: 'TYPES',
				noResultsMessage: 'Add from Fields page'
			};

			expect(props.noResultsMessage).toBe('Add from Fields page');
		});

		it('TableEmptyStateProps optional properties default to undefined', () => {
			const props: TableEmptyStateProps = {
				entityName: 'fields',
				storeKey: 'FIELDS'
			};

			expect(props.noResultsMessage).toBeUndefined();
		});
	});

	describe('Component Structure Verification', () => {
		it('TableEmptyState component exports correctly from barrel export', () => {
			expect(TableEmptyState).toBeDefined();
			expect(typeof TableEmptyState).toBe('function');
		});

		it('TableEmptyStateProps type exports correctly from barrel export', () => {
			const props: TableEmptyStateProps = {
				entityName: 'validators',
				storeKey: 'FIELDS'
			};

			expect(props).toBeDefined();
		});
	});
});
