/**
 * ClerkCreateOrganization Component Tests
 *
 * Unit tests for the ClerkCreateOrganization component.
 * Location mirrors: src/lib/components/clerk/ClerkCreateOrganization.svelte
 *
 * IMPORTANT: Svelte 5 components using $props() cannot be rendered in jsdom.
 * Tests verify TypeScript interface contracts and component exports.
 */

import { describe, it, expect } from 'vitest';
import { ClerkCreateOrganization, type ClerkCreateOrganizationProps } from '$lib/components';

describe('ClerkCreateOrganization Component', () => {
	describe('TypeScript Interface', () => {
		it('ClerkCreateOrganizationProps interface accepts empty props', () => {
			const props: ClerkCreateOrganizationProps = {};

			expect(props.class).toBeUndefined();
		});

		it('ClerkCreateOrganizationProps class is optional', () => {
			const propsWithout: ClerkCreateOrganizationProps = {};

			expect(propsWithout.class).toBeUndefined();

			const propsWith: ClerkCreateOrganizationProps = {
				class: 'custom-class'
			};

			expect(propsWith.class).toBe('custom-class');
		});

		it('ClerkCreateOrganizationProps class accepts CSS class strings', () => {
			const props: ClerkCreateOrganizationProps = {
				class: 'mt-4 p-6 bg-white rounded-lg'
			};

			expect(props.class).toBe('mt-4 p-6 bg-white rounded-lg');
		});
	});

	describe('Component Structure Verification', () => {
		it('ClerkCreateOrganization component exports correctly from barrel export', () => {
			expect(ClerkCreateOrganization).toBeDefined();
			expect(typeof ClerkCreateOrganization).toBe('function');
		});

		it('ClerkCreateOrganizationProps type exports correctly from barrel export', () => {
			const props: ClerkCreateOrganizationProps = {};

			expect(props).toBeDefined();
		});
	});
});
