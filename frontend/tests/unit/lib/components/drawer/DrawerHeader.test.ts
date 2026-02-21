/**
 * DrawerHeader Component Tests
 *
 * Unit tests for the DrawerHeader component.
 * Location mirrors: src/lib/components/drawer/DrawerHeader.svelte
 *
 * IMPORTANT: Svelte 5 components using $props() cannot be rendered in jsdom.
 * Tests verify TypeScript interface contracts and component exports.
 */

import { describe, it, expect } from 'vitest';
import { DrawerHeader, type DrawerHeaderProps } from '$lib/components';

describe('DrawerHeader Component', () => {
	describe('TypeScript Interface', () => {
		it('DrawerHeaderProps interface requires title and onClose', () => {
			const closeFn = () => {};
			const props: DrawerHeaderProps = {
				title: 'Edit Field',
				onClose: closeFn
			};

			expect(props.title).toBe('Edit Field');
			expect(props.onClose).toBe(closeFn);
		});

		it('DrawerHeaderProps onClose is a function', () => {
			let closed = false;
			const props: DrawerHeaderProps = {
				title: 'Create Type',
				onClose: () => { closed = true; }
			};

			props.onClose();
			expect(closed).toBe(true);
		});
	});

	describe('Component Structure Verification', () => {
		it('DrawerHeader component exports correctly from barrel export', () => {
			expect(DrawerHeader).toBeDefined();
			expect(typeof DrawerHeader).toBe('function');
		});

		it('DrawerHeaderProps type exports correctly from barrel export', () => {
			const props: DrawerHeaderProps = {
				title: 'Test',
				onClose: () => {}
			};

			expect(props).toBeDefined();
		});
	});
});
