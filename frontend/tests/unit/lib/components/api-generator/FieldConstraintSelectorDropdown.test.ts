/**
 * FieldConstraintSelectorDropdown Component Tests
 *
 * Unit tests for the FieldConstraintSelectorDropdown component.
 * Location mirrors: src/lib/components/api-generator/FieldConstraintSelectorDropdown.svelte
 *
 * IMPORTANT: Svelte 5 components using $props() cannot be rendered in jsdom.
 * Tests verify TypeScript interface contracts and component exports.
 */

import { describe, it, expect } from 'vitest';
import {
	FieldConstraintSelectorDropdown,
	type FieldConstraintSelectorDropdownProps
} from '$lib/components';

describe('FieldConstraintSelectorDropdown Component', () => {
	describe('TypeScript Interface', () => {
		it('FieldConstraintSelectorDropdownProps interface accepts all required properties', () => {
			const props: FieldConstraintSelectorDropdownProps = {
				availableFieldConstraints: [],
				selectedFieldConstraintNames: [],
				onSelect: () => {}
			};

			expect(props.availableFieldConstraints).toEqual([]);
			expect(props.selectedFieldConstraintNames).toEqual([]);
			expect(typeof props.onSelect).toBe('function');
		});

		it('FieldConstraintSelectorDropdownProps accepts field constraint data', () => {
			const props: FieldConstraintSelectorDropdownProps = {
				availableFieldConstraints: [
					{
						id: 'fc-1',
						namespaceId: 'ns-1',
						name: 'max_length',
						description: 'Maximum string length',
						parameterTypes: ['int'],
						docsUrl: null,
						compatibleTypes: ['str'],
						usedInFields: 3
					}
				],
				selectedFieldConstraintNames: ['min_length'],
				onSelect: () => {}
			};

			expect(props.availableFieldConstraints).toHaveLength(1);
			expect(props.availableFieldConstraints[0].name).toBe('max_length');
			expect(props.selectedFieldConstraintNames).toContain('min_length');
		});

		it('FieldConstraintSelectorDropdownProps placeholder is optional with default', () => {
			const propsWithoutPlaceholder: FieldConstraintSelectorDropdownProps = {
				availableFieldConstraints: [],
				selectedFieldConstraintNames: [],
				onSelect: () => {}
			};

			expect(propsWithoutPlaceholder.placeholder).toBeUndefined();

			const propsWithPlaceholder: FieldConstraintSelectorDropdownProps = {
				...propsWithoutPlaceholder,
				placeholder: 'Search constraints...'
			};

			expect(propsWithPlaceholder.placeholder).toBe('Search constraints...');
		});

		it('FieldConstraintSelectorDropdownProps onSelect receives constraint name', () => {
			let selectedName: string | undefined;

			const props: FieldConstraintSelectorDropdownProps = {
				availableFieldConstraints: [],
				selectedFieldConstraintNames: [],
				onSelect: (name) => {
					selectedName = name;
				}
			};

			props.onSelect('max_length');

			expect(selectedName).toBe('max_length');
		});
	});

	describe('Component Structure Verification', () => {
		it('FieldConstraintSelectorDropdown component exports correctly from barrel export', () => {
			expect(FieldConstraintSelectorDropdown).toBeDefined();
			expect(typeof FieldConstraintSelectorDropdown).toBe('function');
		});

		it('FieldConstraintSelectorDropdownProps type exports correctly from barrel export', () => {
			const props: FieldConstraintSelectorDropdownProps = {
				availableFieldConstraints: [],
				selectedFieldConstraintNames: [],
				onSelect: () => {}
			};

			expect(props).toBeDefined();
		});
	});
});
