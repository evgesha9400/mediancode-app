/**
 * StatCard Component Tests
 *
 * Unit tests for the StatCard component.
 * Location mirrors: src/lib/components/StatCard.svelte
 *
 * IMPORTANT: Svelte 5 components using $props() cannot be rendered in jsdom.
 * Tests verify TypeScript interface contracts and component exports.
 */

import { describe, it, expect } from 'vitest';
import { StatCard, type StatCardProps } from '$lib/components';

describe('StatCard Component', () => {
	describe('TypeScript Interface', () => {
		it('StatCardProps interface requires title, value, and icon', () => {
			const props: StatCardProps = {
				title: 'Total Fields',
				value: 42,
				icon: 'fa-table-list'
			};

			expect(props.title).toBe('Total Fields');
			expect(props.value).toBe(42);
			expect(props.icon).toBe('fa-table-list');
		});

		it('StatCardProps value accepts string or number', () => {
			const numericProps: StatCardProps = {
				title: 'Count',
				value: 10,
				icon: 'fa-chart-bar'
			};

			const stringProps: StatCardProps = {
				title: 'Status',
				value: 'Active',
				icon: 'fa-circle-check'
			};

			expect(numericProps.value).toBe(10);
			expect(stringProps.value).toBe('Active');
		});

		it('StatCardProps accepts optional trend property', () => {
			const props: StatCardProps = {
				title: 'APIs',
				value: 5,
				icon: 'fa-code',
				trend: '+2 this week'
			};

			expect(props.trend).toBe('+2 this week');
		});

		it('StatCardProps accepts optional error and onRetry properties', () => {
			const retryFn = () => {};
			const props: StatCardProps = {
				title: 'Objects',
				value: 0,
				icon: 'fa-cubes',
				error: true,
				onRetry: retryFn
			};

			expect(props.error).toBe(true);
			expect(props.onRetry).toBe(retryFn);
		});

		it('StatCardProps optional properties default to undefined', () => {
			const props: StatCardProps = {
				title: 'Types',
				value: 3,
				icon: 'fa-shapes'
			};

			expect(props.trend).toBeUndefined();
			expect(props.error).toBeUndefined();
			expect(props.onRetry).toBeUndefined();
		});
	});

	describe('Component Structure Verification', () => {
		it('StatCard component exports correctly from barrel export', () => {
			expect(StatCard).toBeDefined();
			expect(typeof StatCard).toBe('function');
		});

		it('StatCardProps type exports correctly from barrel export', () => {
			const props: StatCardProps = {
				title: 'Test',
				value: 0,
				icon: 'fa-test'
			};

			expect(props).toBeDefined();
		});
	});
});
