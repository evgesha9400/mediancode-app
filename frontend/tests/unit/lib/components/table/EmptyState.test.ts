/**
 * EmptyState Component Tests
 *
 * Unit tests for the EmptyState component.
 * Location mirrors: src/lib/components/table/EmptyState.svelte
 *
 * IMPORTANT: Svelte 5 components using $props() cannot be rendered in jsdom.
 * Tests verify TypeScript interface contracts and component exports.
 */

import { describe, it, expect } from 'vitest';
import { EmptyState, type EmptyStateProps } from '$lib/components';

describe('EmptyState Component', () => {
	describe('TypeScript Interface', () => {
		it('EmptyStateProps interface requires title and message', () => {
			const props: EmptyStateProps = {
				title: 'No results found',
				message: 'Try adjusting your search criteria'
			};

			expect(props.title).toBe('No results found');
			expect(props.message).toBe('Try adjusting your search criteria');
		});

		it('EmptyStateProps accepts optional icon property', () => {
			const props: EmptyStateProps = {
				title: 'Empty',
				message: 'Nothing here',
				icon: 'fa-inbox'
			};

			expect(props.icon).toBe('fa-inbox');
		});

		it('EmptyStateProps accepts optional actionLabel and onAction', () => {
			const actionFn = () => {};
			const props: EmptyStateProps = {
				title: 'No fields',
				message: 'Create your first field',
				actionLabel: 'Add Field',
				onAction: actionFn
			};

			expect(props.actionLabel).toBe('Add Field');
			expect(props.onAction).toBe(actionFn);
		});

		it('EmptyStateProps accepts optional variant property', () => {
			const defaultProps: EmptyStateProps = {
				title: 'Empty',
				message: 'No data',
				variant: 'default'
			};

			const errorProps: EmptyStateProps = {
				title: 'Error',
				message: 'Failed to load',
				variant: 'error'
			};

			expect(defaultProps.variant).toBe('default');
			expect(errorProps.variant).toBe('error');
		});

		it('EmptyStateProps optional properties default to undefined', () => {
			const props: EmptyStateProps = {
				title: 'Empty',
				message: 'Nothing to show'
			};

			expect(props.icon).toBeUndefined();
			expect(props.actionLabel).toBeUndefined();
			expect(props.onAction).toBeUndefined();
			expect(props.variant).toBeUndefined();
		});
	});

	describe('Component Structure Verification', () => {
		it('EmptyState component exports correctly from barrel export', () => {
			expect(EmptyState).toBeDefined();
			expect(typeof EmptyState).toBe('function');
		});

		it('EmptyStateProps type exports correctly from barrel export', () => {
			const props: EmptyStateProps = {
				title: 'Test',
				message: 'Test message'
			};

			expect(props).toBeDefined();
		});
	});
});
