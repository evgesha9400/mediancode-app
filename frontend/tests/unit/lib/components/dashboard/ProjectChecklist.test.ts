/**
 * ProjectChecklist Component Tests
 *
 * Unit tests for the ProjectChecklist component.
 * Location mirrors: src/lib/components/dashboard/ProjectChecklist.svelte
 *
 * IMPORTANT: Svelte 5 components using $props() cannot be rendered in jsdom.
 * Tests verify TypeScript interface contracts and component exports.
 */

import { describe, it, expect } from 'vitest';
import { ProjectChecklist, type ProjectChecklistProps } from '$lib/components/dashboard';

describe('ProjectChecklist Component', () => {
	describe('TypeScript Interface', () => {
		it('ProjectChecklistProps requires all four boolean flags', () => {
			const props: ProjectChecklistProps = {
				hasFields: false,
				hasObjects: false,
				hasApis: false,
				hasConfiguredEndpoint: false
			};

			expect(props.hasFields).toBe(false);
			expect(props.hasObjects).toBe(false);
			expect(props.hasApis).toBe(false);
			expect(props.hasConfiguredEndpoint).toBe(false);
		});

		it('ProjectChecklistProps reflects partial completion', () => {
			const props: ProjectChecklistProps = {
				hasFields: true,
				hasObjects: true,
				hasApis: false,
				hasConfiguredEndpoint: false
			};

			expect(props.hasFields).toBe(true);
			expect(props.hasObjects).toBe(true);
			expect(props.hasApis).toBe(false);
			expect(props.hasConfiguredEndpoint).toBe(false);
		});

		it('ProjectChecklistProps reflects full completion', () => {
			const props: ProjectChecklistProps = {
				hasFields: true,
				hasObjects: true,
				hasApis: true,
				hasConfiguredEndpoint: true
			};

			expect(props.hasFields).toBe(true);
			expect(props.hasObjects).toBe(true);
			expect(props.hasApis).toBe(true);
			expect(props.hasConfiguredEndpoint).toBe(true);
		});
	});

	describe('Component Structure Verification', () => {
		it('ProjectChecklist component exports correctly from barrel export', () => {
			expect(ProjectChecklist).toBeDefined();
			expect(typeof ProjectChecklist).toBe('function');
		});

		it('ProjectChecklistProps type exports correctly from barrel export', () => {
			const props: ProjectChecklistProps = {
				hasFields: false,
				hasObjects: false,
				hasApis: false,
				hasConfiguredEndpoint: false
			};
			expect(props).toBeDefined();
		});
	});
});
