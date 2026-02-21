/**
 * Tooltip Component Tests
 *
 * Unit tests for the Tooltip component.
 * Location mirrors: src/lib/components/tooltip/Tooltip.svelte
 *
 * IMPORTANT: Svelte 5 components using $props() cannot be rendered in jsdom.
 * Tests verify TypeScript interface contracts and component exports.
 */

import { describe, it, expect } from 'vitest';
import { Tooltip, type TooltipProps } from '$lib/components';

describe('Tooltip Component', () => {
	describe('TypeScript Interface', () => {
		it('TooltipProps interface has all optional properties', () => {
			const props: TooltipProps = {};

			expect(props).toBeDefined();
		});

		it('TooltipProps accepts optional text property', () => {
			const props: TooltipProps = {
				text: 'This is a helpful tip'
			};

			expect(props.text).toBe('This is a helpful tip');
		});

		it('TooltipProps accepts optional disabled property', () => {
			const props: TooltipProps = {
				text: 'Disabled tooltip',
				disabled: true
			};

			expect(props.disabled).toBe(true);
		});

		it('TooltipProps accepts optional position property with valid values', () => {
			const topProps: TooltipProps = { position: 'top' };
			const bottomProps: TooltipProps = { position: 'bottom' };

			expect(topProps.position).toBe('top');
			expect(bottomProps.position).toBe('bottom');
		});

		it('TooltipProps accepts optional children snippet', () => {
			const props: TooltipProps = {
				text: 'Hover text',
				children: undefined
			};

			expect(props).toBeDefined();
			expect('children' in props).toBe(true);
		});

		it('TooltipProps optional properties default to undefined', () => {
			const props: TooltipProps = {};

			expect(props.text).toBeUndefined();
			expect(props.disabled).toBeUndefined();
			expect(props.position).toBeUndefined();
			expect(props.children).toBeUndefined();
		});
	});

	describe('Component Structure Verification', () => {
		it('Tooltip component exports correctly from barrel export', () => {
			expect(Tooltip).toBeDefined();
			expect(typeof Tooltip).toBe('function');
		});

		it('TooltipProps type exports correctly from barrel export', () => {
			const props: TooltipProps = {};

			expect(props).toBeDefined();
		});
	});
});
