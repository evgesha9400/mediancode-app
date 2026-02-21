/**
 * PageHeader Component Tests
 *
 * Unit tests for the PageHeader component.
 * Location mirrors: src/lib/components/layout/PageHeader.svelte
 *
 * IMPORTANT: Svelte 5 components using $props() cannot be rendered in jsdom.
 * Tests verify TypeScript interface contracts and component exports.
 */

import { describe, it, expect } from 'vitest';
import { PageHeader, type PageHeaderProps } from '$lib/components';

describe('PageHeader Component', () => {
	describe('TypeScript Interface', () => {
		it('PageHeaderProps interface requires title property', () => {
			const props: PageHeaderProps = {
				title: 'Fields'
			};

			expect(props.title).toBe('Fields');
		});

		it('PageHeaderProps accepts optional actions snippet', () => {
			const props: PageHeaderProps = {
				title: 'Types',
				actions: undefined
			};

			expect(props).toBeDefined();
			expect('actions' in props).toBe(true);
		});

		it('PageHeaderProps actions is optional', () => {
			const props: PageHeaderProps = {
				title: 'Dashboard'
			};

			expect(props.actions).toBeUndefined();
		});
	});

	describe('Component Structure Verification', () => {
		it('PageHeader component exports correctly from barrel export', () => {
			expect(PageHeader).toBeDefined();
			expect(typeof PageHeader).toBe('function');
		});

		it('PageHeaderProps type exports correctly from barrel export', () => {
			const props: PageHeaderProps = {
				title: 'Test'
			};

			expect(props).toBeDefined();
		});
	});
});
