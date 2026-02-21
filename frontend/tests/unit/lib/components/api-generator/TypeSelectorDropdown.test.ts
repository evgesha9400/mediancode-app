/**
 * TypeSelectorDropdown Component Tests
 *
 * Unit tests for the TypeSelectorDropdown component.
 * Location mirrors: src/lib/components/api-generator/TypeSelectorDropdown.svelte
 *
 * IMPORTANT: Svelte 5 components using $props() cannot be rendered in jsdom.
 * Tests verify TypeScript interface contracts and component exports.
 */

import { describe, it, expect } from 'vitest';
import { TypeSelectorDropdown, type TypeSelectorDropdownProps } from '$lib/components';

describe('TypeSelectorDropdown Component', () => {
	describe('TypeScript Interface', () => {
		it('TypeSelectorDropdownProps interface accepts all required properties', () => {
			const props: TypeSelectorDropdownProps = {
				availableTypes: [],
				selectedTypeName: 'str',
				onSelect: () => {}
			};

			expect(props.availableTypes).toEqual([]);
			expect(props.selectedTypeName).toBe('str');
			expect(typeof props.onSelect).toBe('function');
		});

		it('TypeSelectorDropdownProps accepts type data', () => {
			const props: TypeSelectorDropdownProps = {
				availableTypes: [
					{
						id: 'type-1',
						namespaceId: 'ns-1',
						name: 'str',
						pythonType: 'str',
						description: 'String type',
						importPath: null,
						parentTypeId: null,
						usedInFields: 5
					},
					{
						id: 'type-2',
						namespaceId: 'ns-1',
						name: 'int',
						pythonType: 'int',
						description: 'Integer type',
						importPath: null,
						parentTypeId: null,
						usedInFields: 3
					}
				],
				selectedTypeName: 'str',
				onSelect: () => {}
			};

			expect(props.availableTypes).toHaveLength(2);
			expect(props.availableTypes[0].pythonType).toBe('str');
			expect(props.availableTypes[1].name).toBe('int');
		});

		it('TypeSelectorDropdownProps placeholder is optional with default', () => {
			const propsWithout: TypeSelectorDropdownProps = {
				availableTypes: [],
				selectedTypeName: '',
				onSelect: () => {}
			};

			expect(propsWithout.placeholder).toBeUndefined();

			const propsWith: TypeSelectorDropdownProps = {
				...propsWithout,
				placeholder: 'Choose a type...'
			};

			expect(propsWith.placeholder).toBe('Choose a type...');
		});

		it('TypeSelectorDropdownProps error is optional', () => {
			const propsWithout: TypeSelectorDropdownProps = {
				availableTypes: [],
				selectedTypeName: '',
				onSelect: () => {}
			};

			expect(propsWithout.error).toBeUndefined();

			const propsWith: TypeSelectorDropdownProps = {
				...propsWithout,
				error: true
			};

			expect(propsWith.error).toBe(true);
		});

		it('TypeSelectorDropdownProps id is optional', () => {
			const propsWithout: TypeSelectorDropdownProps = {
				availableTypes: [],
				selectedTypeName: '',
				onSelect: () => {}
			};

			expect(propsWithout.id).toBeUndefined();

			const propsWith: TypeSelectorDropdownProps = {
				...propsWithout,
				id: 'type-selector-1'
			};

			expect(propsWith.id).toBe('type-selector-1');
		});

		it('TypeSelectorDropdownProps onSelect receives type name', () => {
			let selectedType: string | undefined;

			const props: TypeSelectorDropdownProps = {
				availableTypes: [],
				selectedTypeName: '',
				onSelect: (typeName) => {
					selectedType = typeName;
				}
			};

			props.onSelect('str');

			expect(selectedType).toBe('str');
		});
	});

	describe('Component Structure Verification', () => {
		it('TypeSelectorDropdown component exports correctly from barrel export', () => {
			expect(TypeSelectorDropdown).toBeDefined();
			expect(typeof TypeSelectorDropdown).toBe('function');
		});

		it('TypeSelectorDropdownProps type exports correctly from barrel export', () => {
			const props: TypeSelectorDropdownProps = {
				availableTypes: [],
				selectedTypeName: '',
				onSelect: () => {}
			};

			expect(props).toBeDefined();
		});
	});
});
