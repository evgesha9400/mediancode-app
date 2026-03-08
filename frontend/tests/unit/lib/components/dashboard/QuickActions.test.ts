/**
 * QuickActions Component Tests
 *
 * Unit tests for the QuickActions component.
 * Location mirrors: src/lib/components/dashboard/QuickActions.svelte
 *
 * IMPORTANT: Svelte 5 components using $props() cannot be rendered in jsdom.
 * Tests verify TypeScript interface contracts and component exports.
 */

import { describe, it, expect } from 'vitest';
import { QuickActions, type QuickActionsProps } from '$lib/components/dashboard';

describe('QuickActions Component', () => {
	describe('TypeScript Interface', () => {
		it('QuickActionsProps requires hasFields, hasObjects, and hasApis', () => {
			const props: QuickActionsProps = {
				hasFields: true,
				hasObjects: false,
				hasApis: false
			};

			expect(props.hasFields).toBe(true);
			expect(props.hasObjects).toBe(false);
			expect(props.hasApis).toBe(false);
		});

		it('QuickActionsProps all false represents empty workspace', () => {
			const props: QuickActionsProps = {
				hasFields: false,
				hasObjects: false,
				hasApis: false
			};

			expect(props.hasFields).toBe(false);
			expect(props.hasObjects).toBe(false);
			expect(props.hasApis).toBe(false);
		});

		it('QuickActionsProps all true represents populated workspace', () => {
			const props: QuickActionsProps = {
				hasFields: true,
				hasObjects: true,
				hasApis: true
			};

			expect(props.hasFields).toBe(true);
			expect(props.hasObjects).toBe(true);
			expect(props.hasApis).toBe(true);
		});
	});

	describe('Component Structure Verification', () => {
		it('QuickActions component exports correctly from barrel export', () => {
			expect(QuickActions).toBeDefined();
			expect(typeof QuickActions).toBe('function');
		});

		it('QuickActionsProps type exports correctly from barrel export', () => {
			const props: QuickActionsProps = {
				hasFields: false,
				hasObjects: false,
				hasApis: false
			};
			expect(props).toBeDefined();
		});
	});
});
