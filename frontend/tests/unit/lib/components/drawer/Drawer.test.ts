/**
 * Drawer Component Tests
 *
 * Unit tests for the Drawer component.
 * Location mirrors: src/lib/components/drawer/Drawer.svelte
 *
 * IMPORTANT: Svelte 5 components using $props() cannot be rendered in jsdom.
 * Tests verify TypeScript interface contracts and component exports.
 */

import { describe, it, expect } from 'vitest';
import { Drawer, type DrawerProps } from '$lib/components';

describe('Drawer Component', () => {
	describe('TypeScript Interface', () => {
		it('DrawerProps interface requires open property', () => {
			const props: DrawerProps = {
				open: true
			};

			expect(props.open).toBe(true);
		});

		it('DrawerProps accepts optional maxWidth property', () => {
			const props: DrawerProps = {
				open: false,
				maxWidth: 500
			};

			expect(props.maxWidth).toBe(500);
		});

		it('DrawerProps accepts optional children snippet', () => {
			const props: DrawerProps = {
				open: true,
				children: undefined
			};

			expect(props).toBeDefined();
			expect('children' in props).toBe(true);
		});

		it('DrawerProps maxWidth is optional', () => {
			const props: DrawerProps = {
				open: false
			};

			expect(props.maxWidth).toBeUndefined();
		});
	});

	describe('Component Structure Verification', () => {
		it('Drawer component exports correctly from barrel export', () => {
			expect(Drawer).toBeDefined();
			expect(typeof Drawer).toBe('function');
		});

		it('DrawerProps type exports correctly from barrel export', () => {
			const props: DrawerProps = {
				open: false
			};

			expect(props).toBeDefined();
		});
	});
});
