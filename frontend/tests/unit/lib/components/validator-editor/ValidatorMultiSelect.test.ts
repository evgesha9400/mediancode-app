// tests/unit/lib/components/validator-editor/ValidatorMultiSelect.test.ts

/**
 * ValidatorMultiSelect Component Tests
 *
 * Unit tests for the ValidatorMultiSelect component.
 * Location mirrors: src/lib/components/validator-editor/ValidatorMultiSelect.svelte
 *
 * IMPORTANT: Svelte 5 components using $props() cannot be rendered in jsdom.
 * Tests verify TypeScript interface contracts and component exports.
 */

import { describe, it, expect } from 'vitest';
import { ValidatorMultiSelect, type ValidatorMultiSelectProps } from '$lib/components';

describe('ValidatorMultiSelect Component', () => {
	describe('TypeScript Interface', () => {
		it('ValidatorMultiSelectProps interface requires all mandatory properties', () => {
			const props: ValidatorMultiSelectProps = {
				label: 'Compatible Types',
				selectedItems: ['str', 'int'],
				options: ['str', 'int', 'float', 'bool', 'uuid', 'datetime'],
				placeholder: 'Select types...',
				inputId: 'compatible-types-input'
			};

			expect(props.label).toBe('Compatible Types');
			expect(props.selectedItems).toEqual(['str', 'int']);
			expect(props.options).toHaveLength(6);
			expect(props.placeholder).toBe('Select types...');
			expect(props.inputId).toBe('compatible-types-input');
		});

		it('ValidatorMultiSelectProps accepts empty selectedItems', () => {
			const props: ValidatorMultiSelectProps = {
				label: 'Fields',
				selectedItems: [],
				options: ['field_a', 'field_b'],
				placeholder: 'Select fields...',
				inputId: 'fields-input'
			};

			expect(props.selectedItems).toEqual([]);
		});

		it('ValidatorMultiSelectProps accepts optional isDimmed callback', () => {
			const isDimmedFn = (item: string) => item === 'deprecated';
			const props: ValidatorMultiSelectProps = {
				label: 'Types',
				selectedItems: [],
				options: ['str', 'deprecated'],
				placeholder: 'Select...',
				inputId: 'types-input',
				isDimmed: isDimmedFn
			};

			expect(props.isDimmed).toBe(isDimmedFn);
			expect(props.isDimmed!('deprecated')).toBe(true);
			expect(props.isDimmed!('str')).toBe(false);
		});

		it('ValidatorMultiSelectProps accepts optional onToggle callback', () => {
			const toggleFn = (_item: string) => {};
			const props: ValidatorMultiSelectProps = {
				label: 'Required Fields',
				selectedItems: ['start_date'],
				options: ['start_date', 'end_date'],
				placeholder: 'Select fields...',
				inputId: 'required-fields-input',
				onToggle: toggleFn
			};

			expect(props.onToggle).toBe(toggleFn);
		});

		it('ValidatorMultiSelectProps optional properties default to undefined', () => {
			const props: ValidatorMultiSelectProps = {
				label: 'Label',
				selectedItems: [],
				options: [],
				placeholder: 'Placeholder',
				inputId: 'test-input'
			};

			expect(props.isDimmed).toBeUndefined();
			expect(props.onToggle).toBeUndefined();
		});
	});

	describe('Component Structure Verification', () => {
		it('ValidatorMultiSelect component exports correctly from barrel export', () => {
			expect(ValidatorMultiSelect).toBeDefined();
			expect(typeof ValidatorMultiSelect).toBe('function');
		});

		it('ValidatorMultiSelectProps type exports correctly from barrel export', () => {
			const props: ValidatorMultiSelectProps = {
				label: '',
				selectedItems: [],
				options: [],
				placeholder: '',
				inputId: ''
			};

			expect(props).toBeDefined();
		});
	});
});
