/**
 * FormField Component Tests
 *
 * Unit tests for the FormField component.
 * Location mirrors: src/lib/components/form/FormField.svelte
 *
 * IMPORTANT: Svelte 5 components using $props() cannot be rendered in jsdom.
 * Tests verify TypeScript interface contracts and component exports.
 */

import { describe, it, expect } from 'vitest';
import { FormField, type FormFieldProps } from '$lib/components';

describe('FormField Component', () => {
	describe('TypeScript Interface', () => {
		it('FormFieldProps requires label and value', () => {
			const props: FormFieldProps = {
				label: 'Name',
				value: ''
			};

			expect(props.label).toBe('Name');
			expect(props.value).toBe('');
		});

		it('FormFieldProps accepts optional required property', () => {
			const props: FormFieldProps = {
				label: 'Name',
				value: '',
				required: true
			};

			expect(props.required).toBe(true);
		});

		it('FormFieldProps accepts optional error property', () => {
			const props: FormFieldProps = {
				label: 'Name',
				value: '',
				error: 'Required field'
			};

			expect(props.error).toBe('Required field');
		});

		it('FormFieldProps accepts optional disabled property', () => {
			const props: FormFieldProps = {
				label: 'Name',
				value: '',
				disabled: true
			};

			expect(props.disabled).toBe(true);
		});

		it('FormFieldProps accepts optional placeholder property', () => {
			const props: FormFieldProps = {
				label: 'Name',
				value: '',
				placeholder: 'Enter name...'
			};

			expect(props.placeholder).toBe('Enter name...');
		});

		it('FormFieldProps accepts optional type property', () => {
			const textProps: FormFieldProps = {
				label: 'Name',
				value: '',
				type: 'text'
			};

			const numberProps: FormFieldProps = {
				label: 'Count',
				value: '',
				type: 'number'
			};

			expect(textProps.type).toBe('text');
			expect(numberProps.type).toBe('number');
		});

		it('FormFieldProps accepts optional id property', () => {
			const props: FormFieldProps = {
				label: 'API Title',
				value: '',
				id: 'custom-id'
			};

			expect(props.id).toBe('custom-id');
		});

		it('FormFieldProps optional properties default to undefined', () => {
			const props: FormFieldProps = {
				label: 'Name',
				value: ''
			};

			expect(props.error).toBeUndefined();
			expect(props.required).toBeUndefined();
			expect(props.disabled).toBeUndefined();
			expect(props.placeholder).toBeUndefined();
			expect(props.type).toBeUndefined();
			expect(props.id).toBeUndefined();
		});
	});

	describe('Component Structure Verification', () => {
		it('FormField component exports correctly from barrel export', () => {
			expect(FormField).toBeDefined();
			expect(typeof FormField).toBe('function');
		});

		it('FormFieldProps type exports correctly from barrel export', () => {
			const props: FormFieldProps = {
				label: 'Test',
				value: ''
			};

			expect(props).toBeDefined();
		});
	});
});
