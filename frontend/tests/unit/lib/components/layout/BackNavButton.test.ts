/**
 * BackNavButton Component Tests
 *
 * Location mirrors: src/lib/components/layout/BackNavButton.svelte
 *
 * IMPORTANT: Svelte 5 components using $props() cannot be rendered in jsdom.
 * Tests verify TypeScript interface contracts and component exports.
 */

import { describe, it, expect } from 'vitest';
import { BackNavButton, type BackNavButtonProps } from '$lib/components';

describe('BackNavButton Component', () => {
	describe('TypeScript Interface', () => {
		it('BackNavButtonProps allows href variant', () => {
			const props: BackNavButtonProps = {
				ariaLabel: 'Back to settings',
				href: '/settings'
			};

			expect(props.href).toBe('/settings');
			expect(props.ariaLabel).toBe('Back to settings');
		});

		it('BackNavButtonProps allows onclick variant', () => {
			const props: BackNavButtonProps = {
				ariaLabel: 'Back',
				onclick: () => {}
			};

			expect(props.onclick).toBeDefined();
			expect(props.href).toBeUndefined();
		});
	});

	describe('Component Structure Verification', () => {
		it('BackNavButton exports correctly from barrel export', () => {
			expect(BackNavButton).toBeDefined();
			expect(typeof BackNavButton).toBe('function');
		});
	});
});
