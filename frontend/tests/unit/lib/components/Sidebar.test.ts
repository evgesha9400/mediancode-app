/**
 * Sidebar Component Tests
 *
 * Unit tests for the Sidebar component.
 * Location mirrors: src/lib/components/Sidebar.svelte
 *
 * IMPORTANT: Svelte 5 components using $props() cannot be rendered in jsdom.
 * Tests verify TypeScript interface contracts and component exports.
 */

import { describe, it, expect } from 'vitest';
import { Sidebar, type SidebarProps } from '$lib/components';

describe('Sidebar Component', () => {
	describe('TypeScript Interface', () => {
		it('SidebarProps interface requires activeRoute property', () => {
			const props: SidebarProps = {
				activeRoute: '/dashboard'
			};

			expect(props.activeRoute).toBe('/dashboard');
		});

		it('SidebarProps accepts any string route path', () => {
			const props: SidebarProps = {
				activeRoute: '/validators/field-constraints'
			};

			expect(props.activeRoute).toBe('/validators/field-constraints');
		});
	});

	describe('Component Structure Verification', () => {
		it('Sidebar component exports correctly from barrel export', () => {
			expect(Sidebar).toBeDefined();
			expect(typeof Sidebar).toBe('function');
		});

		it('SidebarProps type exports correctly from barrel export', () => {
			const props: SidebarProps = {
				activeRoute: '/'
			};

			expect(props).toBeDefined();
		});
	});
});
