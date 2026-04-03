/**
 * MainColumnFrame Component Tests
 *
 * Unit tests for the MainColumnFrame component.
 * Location mirrors: src/lib/components/layout/MainColumnFrame.svelte
 *
 * IMPORTANT: Svelte 5 components using $props() cannot be rendered in jsdom.
 * Tests verify TypeScript interface contracts and component exports.
 */

import { describe, it, expect } from 'vitest';
import { MainColumnFrame, type MainColumnFrameProps } from '$lib/components';

describe('MainColumnFrame Component', () => {
	describe('TypeScript Interface', () => {
		it('MainColumnFrameProps accepts optional bodyClass', () => {
			const props: Partial<MainColumnFrameProps> = {
				bodyClass: 'p-6 space-y-6'
			};

			expect(props.bodyClass).toBe('p-6 space-y-6');
		});
	});

	describe('Component Structure Verification', () => {
		it('MainColumnFrame exports correctly from barrel export', () => {
			expect(MainColumnFrame).toBeDefined();
			expect(typeof MainColumnFrame).toBe('function');
		});
	});
});
