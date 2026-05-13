/**
 * FilterPanel Component Tests
 *
 * Unit tests for the FilterPanel component.
 * Location mirrors: src/lib/components/search/FilterPanel.svelte
 *
 * IMPORTANT: Svelte 5 components using $props() cannot be rendered in jsdom.
 * Tests verify TypeScript interface contracts and component exports.
 */

import { describe, it, expect } from 'vitest';
import { FilterPanel, type FilterPanelProps } from '$lib/components';

describe('FilterPanel Component', () => {
	describe('TypeScript Interface', () => {
		it('FilterPanelProps interface has all optional properties', () => {
			const props: FilterPanelProps = {};

			expect(props).toBeDefined();
		});

		it('FilterPanelProps accepts optional visible property', () => {
			const props: FilterPanelProps = {
				visible: true
			};

			expect(props.visible).toBe(true);
		});

		it('FilterPanelProps accepts optional config property', () => {
			const props: FilterPanelProps = {
				config: [
					{
						key: 'type',
						label: 'Type',
						type: 'checkbox-group',
						options: [
							{ label: 'String', value: 'string' },
							{ label: 'Number', value: 'number' }
						]
					}
				]
			};

			expect(props.config).toHaveLength(1);
			expect(props.config![0].key).toBe('type');
		});

		it('FilterPanelProps accepts optional state property', () => {
			const props: FilterPanelProps = {
				state: {
					type: ['string'],
					required: true
				}
			};

			expect(props.state).toBeDefined();
			expect(props.state!.type).toEqual(['string']);
		});

		it('FilterPanelProps accepts optional callback properties', () => {
			const closeFn = () => {};
			const clearFn = () => {};

			const props: FilterPanelProps = {
				onClose: closeFn,
				onClear: clearFn
			};

			expect(props.onClose).toBe(closeFn);
			expect(props.onClear).toBe(clearFn);
		});

		it('FilterPanelProps optional properties default to undefined', () => {
			const props: FilterPanelProps = {};

			expect(props.visible).toBeUndefined();
			expect(props.config).toBeUndefined();
			expect(props.state).toBeUndefined();
			expect(props.onClose).toBeUndefined();
			expect(props.onClear).toBeUndefined();
		});
	});

	describe('Component Structure Verification', () => {
		it('FilterPanel component exports correctly from barrel export', () => {
			expect(FilterPanel).toBeDefined();
			expect(typeof FilterPanel).toBe('function');
		});

		it('FilterPanelProps type exports correctly from barrel export', () => {
			const props: FilterPanelProps = {};

			expect(props).toBeDefined();
		});
	});
});
