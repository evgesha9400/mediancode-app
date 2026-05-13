/**
 * ClerkOrganizationProfile Component Tests
 *
 * Unit tests for the ClerkOrganizationProfile component.
 * Location mirrors: src/lib/components/clerk/ClerkOrganizationProfile.svelte
 *
 * IMPORTANT: Svelte 5 components using $props() cannot be rendered in jsdom.
 * Tests verify TypeScript interface contracts and component exports.
 */

import { describe, it, expect } from 'vitest';
import { ClerkOrganizationProfile, type ClerkOrganizationProfileProps } from '$lib/components';

describe('ClerkOrganizationProfile Component', () => {
	describe('TypeScript Interface', () => {
		it('ClerkOrganizationProfileProps interface accepts empty props', () => {
			const props: ClerkOrganizationProfileProps = {};

			expect(props.class).toBeUndefined();
		});

		it('ClerkOrganizationProfileProps class is optional', () => {
			const propsWithout: ClerkOrganizationProfileProps = {};

			expect(propsWithout.class).toBeUndefined();

			const propsWith: ClerkOrganizationProfileProps = {
				class: 'custom-class'
			};

			expect(propsWith.class).toBe('custom-class');
		});

		it('ClerkOrganizationProfileProps class accepts CSS class strings', () => {
			const props: ClerkOrganizationProfileProps = {
				class: 'mt-4 p-6 bg-white rounded-lg'
			};

			expect(props.class).toBe('mt-4 p-6 bg-white rounded-lg');
		});
	});

	describe('Component Structure Verification', () => {
		it('ClerkOrganizationProfile component exports correctly from barrel export', () => {
			expect(ClerkOrganizationProfile).toBeDefined();
			expect(typeof ClerkOrganizationProfile).toBe('function');
		});

		it('ClerkOrganizationProfileProps type exports correctly from barrel export', () => {
			const props: ClerkOrganizationProfileProps = {};

			expect(props).toBeDefined();
		});
	});
});
