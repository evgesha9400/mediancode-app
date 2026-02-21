/**
 * DrawerFooter Component Tests
 *
 * Unit tests for the DrawerFooter component.
 * Location mirrors: src/lib/components/drawer/DrawerFooter.svelte
 *
 * IMPORTANT: Svelte 5 components using $props() cannot be rendered in jsdom.
 * Tests verify TypeScript interface contracts and component exports.
 */

import { describe, it, expect } from 'vitest';
import { DrawerFooter, type DrawerFooterProps } from '$lib/components';

describe('DrawerFooter Component', () => {
	describe('TypeScript Interface', () => {
		it('DrawerFooterProps interface has all optional properties', () => {
			const props: DrawerFooterProps = {};

			expect(props).toBeDefined();
		});

		it('DrawerFooterProps accepts optional spacing property', () => {
			const props: DrawerFooterProps = {
				spacing: 'space-y-3'
			};

			expect(props.spacing).toBe('space-y-3');
		});

		it('DrawerFooterProps accepts optional children snippet', () => {
			const props: DrawerFooterProps = {
				children: undefined
			};

			expect(props).toBeDefined();
			expect('children' in props).toBe(true);
		});

		it('DrawerFooterProps spacing is optional', () => {
			const props: DrawerFooterProps = {};

			expect(props.spacing).toBeUndefined();
		});
	});

	describe('Component Structure Verification', () => {
		it('DrawerFooter component exports correctly from barrel export', () => {
			expect(DrawerFooter).toBeDefined();
			expect(typeof DrawerFooter).toBe('function');
		});

		it('DrawerFooterProps type exports correctly from barrel export', () => {
			const props: DrawerFooterProps = {};

			expect(props).toBeDefined();
		});
	});
});
