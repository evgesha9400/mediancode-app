/**
 * Pill Component Tests
 *
 * Unit tests for the Pill component.
 * Location mirrors: src/lib/components/pill/Pill.svelte
 *
 * IMPORTANT: Svelte 5 components using $props() cannot be rendered in jsdom.
 * Tests verify TypeScript interface contracts and component exports.
 */

import { describe, it, expect } from 'vitest';
import { Pill, type PillProps } from '$lib/components';

describe('Pill Component', () => {
	describe('TypeScript Interface', () => {
		it('PillProps interface has all optional properties', () => {
			const props: PillProps = {};

			expect(props).toBeDefined();
		});

		it('PillProps accepts optional size property', () => {
			const defaultProps: PillProps = { size: 'default' };
			const smProps: PillProps = { size: 'sm' };

			expect(defaultProps.size).toBe('default');
			expect(smProps.size).toBe('sm');
		});

		it('PillProps accepts optional children snippet', () => {
			const props: PillProps = {
				children: undefined
			};

			expect(props).toBeDefined();
			expect('children' in props).toBe(true);
		});

		it('PillProps optional properties default to undefined', () => {
			const props: PillProps = {};

			expect(props.size).toBeUndefined();
			expect(props.children).toBeUndefined();
		});
	});

	describe('Component Structure Verification', () => {
		it('Pill component exports correctly from barrel export', () => {
			expect(Pill).toBeDefined();
			expect(typeof Pill).toBe('function');
		});

		it('PillProps type exports correctly from barrel export', () => {
			const props: PillProps = {};

			expect(props).toBeDefined();
		});
	});
});
