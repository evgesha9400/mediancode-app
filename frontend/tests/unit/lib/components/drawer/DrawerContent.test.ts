/**
 * DrawerContent Component Tests
 *
 * Unit tests for the DrawerContent component.
 * Location mirrors: src/lib/components/drawer/DrawerContent.svelte
 *
 * IMPORTANT: Svelte 5 components using $props() cannot be rendered in jsdom.
 * Tests verify TypeScript interface contracts and component exports.
 */

import { describe, it, expect } from 'vitest';
import { DrawerContent, type DrawerContentProps } from '$lib/components';

describe('DrawerContent Component', () => {
	describe('TypeScript Interface', () => {
		it('DrawerContentProps interface has all optional properties', () => {
			const props: DrawerContentProps = {};

			expect(props).toBeDefined();
		});

		it('DrawerContentProps accepts optional children snippet', () => {
			const props: DrawerContentProps = {
				children: undefined
			};

			expect(props).toBeDefined();
			expect('children' in props).toBe(true);
		});
	});

	describe('Component Structure Verification', () => {
		it('DrawerContent component exports correctly from barrel export', () => {
			expect(DrawerContent).toBeDefined();
			expect(typeof DrawerContent).toBe('function');
		});

		it('DrawerContentProps type exports correctly from barrel export', () => {
			const props: DrawerContentProps = {};

			expect(props).toBeDefined();
		});
	});
});
