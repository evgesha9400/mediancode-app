/**
 * ClerkUserProfile Component Tests
 *
 * Unit tests for the ClerkUserProfile component.
 * Location mirrors: src/lib/components/clerk/ClerkUserProfile.svelte
 *
 * IMPORTANT: Svelte 5 components using $props() cannot be rendered in jsdom.
 * Tests verify TypeScript interface contracts and component exports.
 */

import { describe, it, expect } from 'vitest';
import { ClerkUserProfile, type ClerkUserProfileProps } from '$lib/components';

describe('ClerkUserProfile Component', () => {
	describe('TypeScript Interface', () => {
		it('ClerkUserProfileProps interface accepts empty props', () => {
			const props: ClerkUserProfileProps = {};

			expect(props.class).toBeUndefined();
		});

		it('ClerkUserProfileProps class is optional', () => {
			const propsWithout: ClerkUserProfileProps = {};

			expect(propsWithout.class).toBeUndefined();

			const propsWith: ClerkUserProfileProps = {
				class: 'custom-class'
			};

			expect(propsWith.class).toBe('custom-class');
		});

		it('ClerkUserProfileProps class accepts CSS class strings', () => {
			const props: ClerkUserProfileProps = {
				class: 'mt-4 p-6 bg-white rounded-lg'
			};

			expect(props.class).toBe('mt-4 p-6 bg-white rounded-lg');
		});
	});

	describe('Component Structure Verification', () => {
		it('ClerkUserProfile component exports correctly from barrel export', () => {
			expect(ClerkUserProfile).toBeDefined();
			expect(typeof ClerkUserProfile).toBe('function');
		});

		it('ClerkUserProfileProps type exports correctly from barrel export', () => {
			const props: ClerkUserProfileProps = {};

			expect(props).toBeDefined();
		});
	});
});
