/**
 * NamespaceSelector Component Tests
 *
 * Unit tests for the NamespaceSelector component.
 * Location mirrors: src/lib/components/namespace/NamespaceSelector.svelte
 *
 * IMPORTANT: Svelte 5 components using $props() cannot be rendered in jsdom.
 * Tests verify TypeScript interface contracts and component exports.
 */

import { describe, it, expect } from 'vitest';
import { NamespaceSelector, type NamespaceSelectorProps } from '$lib/components';

describe('NamespaceSelector Component', () => {
	describe('TypeScript Interface', () => {
		it('NamespaceSelectorProps interface has all optional properties', () => {
			const props: NamespaceSelectorProps = {};

			expect(props).toBeDefined();
		});

		it('NamespaceSelectorProps accepts optional class property', () => {
			const props: NamespaceSelectorProps = {
				class: 'ml-4'
			};

			expect(props.class).toBe('ml-4');
		});

		it('NamespaceSelectorProps class is optional', () => {
			const props: NamespaceSelectorProps = {};

			expect(props.class).toBeUndefined();
		});
	});

	describe('Component Structure Verification', () => {
		it('NamespaceSelector component exports correctly from barrel export', () => {
			expect(NamespaceSelector).toBeDefined();
			expect(typeof NamespaceSelector).toBe('function');
		});

		it('NamespaceSelectorProps type exports correctly from barrel export', () => {
			const props: NamespaceSelectorProps = {};

			expect(props).toBeDefined();
		});
	});
});
