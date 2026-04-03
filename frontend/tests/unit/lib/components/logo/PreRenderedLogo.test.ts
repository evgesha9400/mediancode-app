/**
 * PreRenderedLogo Component Tests
 *
 * Unit tests for the PreRenderedLogo component.
 * Location mirrors: src/lib/components/logo/PreRenderedLogo.svelte
 *
 * IMPORTANT: Svelte 5 components using $props() cannot be rendered in jsdom.
 * Tests verify TypeScript interface contracts and component exports.
 */

import { describe, it, expect } from 'vitest';
import { PreRenderedLogo, type PreRenderedLogoProps } from '$lib/components';

describe('PreRenderedLogo Component', () => {
	describe('TypeScript Interface', () => {
		it('PreRenderedLogoProps accepts optional size and variant', () => {
			const props: PreRenderedLogoProps = {
				size: 'lg',
				variant: 'light'
			};

			expect(props.size).toBe('lg');
			expect(props.variant).toBe('light');
		});

		it('PreRenderedLogoProps accepts optional showText and class', () => {
			const props: PreRenderedLogoProps = {
				showText: true,
				class: 'opacity-90'
			};

			expect(props.showText).toBe(true);
			expect(props.class).toBe('opacity-90');
		});
	});

	describe('Component Structure Verification', () => {
		it('PreRenderedLogo exports correctly from barrel export', () => {
			expect(PreRenderedLogo).toBeDefined();
			expect(typeof PreRenderedLogo).toBe('function');
		});
	});
});
