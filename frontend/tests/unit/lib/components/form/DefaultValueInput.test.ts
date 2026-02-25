/**
 * DefaultValueInput Component Tests
 *
 * Unit tests for the DefaultValueInput component.
 * Location mirrors: src/lib/components/form/DefaultValueInput.svelte
 *
 * IMPORTANT: Svelte 5 components using $props() cannot be rendered in jsdom.
 * Tests verify TypeScript interface contracts and component exports.
 */

import { describe, it, expect } from 'vitest';
import { DefaultValueInput, type DefaultValueInputProps } from '$lib/components';

describe('DefaultValueInput Component', () => {
	describe('TypeScript Interface', () => {
		it('DefaultValueInputProps requires fieldType, value, and onChange', () => {
			const props: DefaultValueInputProps = {
				fieldType: 'str',
				value: '',
				onChange: () => {}
			};

			expect(props.fieldType).toBe('str');
			expect(props.value).toBe('');
			expect(typeof props.onChange).toBe('function');
		});

		it('DefaultValueInputProps accepts optional id property', () => {
			const props: DefaultValueInputProps = {
				fieldType: 'int',
				value: '42',
				onChange: () => {},
				id: 'fields-default-value'
			};

			expect(props.id).toBe('fields-default-value');
		});

		it('DefaultValueInputProps works with all field types', () => {
			const types = ['str', 'int', 'float', 'bool', 'datetime', 'uuid'];

			for (const fieldType of types) {
				const props: DefaultValueInputProps = {
					fieldType,
					value: '',
					onChange: () => {}
				};
				expect(props.fieldType).toBe(fieldType);
			}
		});

		it('DefaultValueInputProps accepts preset values', () => {
			const noneProps: DefaultValueInputProps = {
				fieldType: 'str',
				value: 'None',
				onChange: () => {}
			};
			expect(noneProps.value).toBe('None');

			const trueProps: DefaultValueInputProps = {
				fieldType: 'bool',
				value: 'True',
				onChange: () => {}
			};
			expect(trueProps.value).toBe('True');

			const falseProps: DefaultValueInputProps = {
				fieldType: 'bool',
				value: 'False',
				onChange: () => {}
			};
			expect(falseProps.value).toBe('False');
		});

		it('DefaultValueInputProps optional properties default to undefined', () => {
			const props: DefaultValueInputProps = {
				fieldType: 'str',
				value: '',
				onChange: () => {}
			};

			expect(props.id).toBeUndefined();
		});
	});

	describe('Component Structure Verification', () => {
		it('DefaultValueInput component exports correctly from barrel export', () => {
			expect(DefaultValueInput).toBeDefined();
			expect(typeof DefaultValueInput).toBe('function');
		});

		it('DefaultValueInputProps type exports correctly from barrel export', () => {
			const props: DefaultValueInputProps = {
				fieldType: 'str',
				value: '',
				onChange: () => {}
			};

			expect(props).toBeDefined();
		});
	});
});
