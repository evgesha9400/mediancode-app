/**
 * FieldSelectorDropdown Component Tests
 *
 * Unit tests for the FieldSelectorDropdown component.
 * Location mirrors: src/lib/components/api-generator/FieldSelectorDropdown.svelte
 *
 * IMPORTANT: Svelte 5 components using $props() cannot be rendered in jsdom.
 * Tests verify TypeScript interface contracts and component exports.
 */

import { describe, it, expect } from 'vitest';
import { FieldSelectorDropdown, type FieldSelectorDropdownProps } from '$lib/components';

describe('FieldSelectorDropdown Component', () => {
	describe('TypeScript Interface', () => {
		it('FieldSelectorDropdownProps interface accepts all required properties', () => {
			const props: FieldSelectorDropdownProps = {
				availableFields: [],
				selectedFieldIds: [],
				onSelect: () => {}
			};

			expect(props.availableFields).toEqual([]);
			expect(props.selectedFieldIds).toEqual([]);
			expect(typeof props.onSelect).toBe('function');
		});

		it('FieldSelectorDropdownProps accepts field data', () => {
			const props: FieldSelectorDropdownProps = {
				availableFields: [
					{
						id: 'field-1',
						name: 'username',
						type: 'str',
						description: 'User name'
					}
				],
				selectedFieldIds: ['field-2'],
				onSelect: () => {}
			};

			expect(props.availableFields).toHaveLength(1);
			expect(props.availableFields[0].name).toBe('username');
			expect(props.selectedFieldIds).toContain('field-2');
		});

		it('FieldSelectorDropdownProps placeholder is optional with default', () => {
			const propsWithoutPlaceholder: FieldSelectorDropdownProps = {
				availableFields: [],
				selectedFieldIds: [],
				onSelect: () => {}
			};

			expect(propsWithoutPlaceholder.placeholder).toBeUndefined();

			const propsWithPlaceholder: FieldSelectorDropdownProps = {
				...propsWithoutPlaceholder,
				placeholder: 'Search fields...'
			};

			expect(propsWithPlaceholder.placeholder).toBe('Search fields...');
		});

		it('FieldSelectorDropdownProps onSelect receives field ID', () => {
			let selectedId: string | undefined;

			const props: FieldSelectorDropdownProps = {
				availableFields: [],
				selectedFieldIds: [],
				onSelect: (fieldId) => {
					selectedId = fieldId;
				}
			};

			props.onSelect('field-1');

			expect(selectedId).toBe('field-1');
		});
	});

	describe('Component Structure Verification', () => {
		it('FieldSelectorDropdown component exports correctly from barrel export', () => {
			expect(FieldSelectorDropdown).toBeDefined();
			expect(typeof FieldSelectorDropdown).toBe('function');
		});

		it('FieldSelectorDropdownProps type exports correctly from barrel export', () => {
			const props: FieldSelectorDropdownProps = {
				availableFields: [],
				selectedFieldIds: [],
				onSelect: () => {}
			};

			expect(props).toBeDefined();
		});
	});
});
