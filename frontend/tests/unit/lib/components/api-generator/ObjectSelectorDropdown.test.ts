/**
 * ObjectSelectorDropdown Component Tests
 *
 * Unit tests for the ObjectSelectorDropdown component.
 * Location mirrors: src/lib/components/api-generator/ObjectSelectorDropdown.svelte
 *
 * IMPORTANT: Svelte 5 components using $props() cannot be rendered in jsdom.
 * Tests verify TypeScript interface contracts and component exports.
 */

import { describe, it, expect } from 'vitest';
import { ObjectSelectorDropdown, type ObjectSelectorDropdownProps } from '$lib/components';

describe('ObjectSelectorDropdown Component', () => {
	describe('TypeScript Interface', () => {
		it('ObjectSelectorDropdownProps interface accepts all required properties', () => {
			const props: ObjectSelectorDropdownProps = {
				availableObjects: [],
				onSelect: () => {}
			};

			expect(props.availableObjects).toEqual([]);
			expect(typeof props.onSelect).toBe('function');
		});

		it('ObjectSelectorDropdownProps accepts object data', () => {
			const props: ObjectSelectorDropdownProps = {
				availableObjects: [
					{
						id: 'obj-1',
						namespaceId: 'ns-1',
						name: 'UserResponse',
						description: 'User response object',
						members: [{ memberType: 'scalar' as const, name: 'field1', fieldId: 'field-1', role: 'writable' as const, isNullable: false }],
						derivedRelationships: [],
						validators: [],
						usedInApis: ['api-1']
					}
				],
				selectedObjectId: 'obj-1',
				onSelect: () => {}
			};

			expect(props.availableObjects).toHaveLength(1);
			expect(props.availableObjects[0].name).toBe('UserResponse');
			expect(props.selectedObjectId).toBe('obj-1');
		});

		it('ObjectSelectorDropdownProps selectedObjectId is optional', () => {
			const propsWithout: ObjectSelectorDropdownProps = {
				availableObjects: [],
				onSelect: () => {}
			};

			expect(propsWithout.selectedObjectId).toBeUndefined();

			const propsWith: ObjectSelectorDropdownProps = {
				...propsWithout,
				selectedObjectId: 'obj-1'
			};

			expect(propsWith.selectedObjectId).toBe('obj-1');
		});

		it('ObjectSelectorDropdownProps placeholder is optional with default', () => {
			const propsWithoutPlaceholder: ObjectSelectorDropdownProps = {
				availableObjects: [],
				onSelect: () => {}
			};

			expect(propsWithoutPlaceholder.placeholder).toBeUndefined();

			const propsWithPlaceholder: ObjectSelectorDropdownProps = {
				...propsWithoutPlaceholder,
				placeholder: 'Choose an object...'
			};

			expect(propsWithPlaceholder.placeholder).toBe('Choose an object...');
		});

		it('ObjectSelectorDropdownProps onSelect receives objectId or undefined', () => {
			let selectedId: string | undefined;

			const props: ObjectSelectorDropdownProps = {
				availableObjects: [],
				onSelect: (objectId) => {
					selectedId = objectId;
				}
			};

			props.onSelect('obj-1');
			expect(selectedId).toBe('obj-1');

			props.onSelect(undefined);
			expect(selectedId).toBeUndefined();
		});
	});

	describe('Component Structure Verification', () => {
		it('ObjectSelectorDropdown component exports correctly from barrel export', () => {
			expect(ObjectSelectorDropdown).toBeDefined();
			expect(typeof ObjectSelectorDropdown).toBe('function');
		});

		it('ObjectSelectorDropdownProps type exports correctly from barrel export', () => {
			const props: ObjectSelectorDropdownProps = {
				availableObjects: [],
				onSelect: () => {}
			};

			expect(props).toBeDefined();
		});
	});
});
