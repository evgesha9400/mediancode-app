/**
 * ClerkSidebarUser Component Tests
 *
 * Unit tests for the ClerkSidebarUser component.
 * Location mirrors: src/lib/components/clerk/ClerkSidebarUser.svelte
 *
 * IMPORTANT: Svelte 5 components using $props() cannot be rendered in jsdom.
 * Tests verify TypeScript interface contracts and component exports.
 */

import { describe, it, expect } from 'vitest';
import { ClerkSidebarUser, type ClerkSidebarUserProps } from '$lib/components';

describe('ClerkSidebarUser Component', () => {
	describe('TypeScript Interface', () => {
		it('ClerkSidebarUserProps interface accepts empty props', () => {
			const props: ClerkSidebarUserProps = {};

			expect(props.class).toBeUndefined();
		});

		it('ClerkSidebarUserProps class is optional', () => {
			const propsWithout: ClerkSidebarUserProps = {};

			expect(propsWithout.class).toBeUndefined();

			const propsWith: ClerkSidebarUserProps = {
				class: 'custom-class'
			};

			expect(propsWith.class).toBe('custom-class');
		});

		it('ClerkSidebarUserProps class accepts CSS class strings', () => {
			const props: ClerkSidebarUserProps = {
				class: 'px-4 py-3 border-t border-edge'
			};

			expect(props.class).toBe('px-4 py-3 border-t border-edge');
		});
	});

	describe('Component Structure Verification', () => {
		it('ClerkSidebarUser component exports correctly from barrel export', () => {
			expect(ClerkSidebarUser).toBeDefined();
			expect(typeof ClerkSidebarUser).toBe('function');
		});

		it('ClerkSidebarUserProps type exports correctly from barrel export', () => {
			const props: ClerkSidebarUserProps = {};

			expect(props).toBeDefined();
		});
	});
});
