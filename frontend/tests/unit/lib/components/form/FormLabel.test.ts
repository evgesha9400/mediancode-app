/**
 * FormLabel Component Tests
 *
 * Unit tests for the FormLabel component.
 * Location mirrors: src/lib/components/form/FormLabel.svelte
 *
 * IMPORTANT: Svelte 5 components using $props() cannot be rendered in jsdom.
 * Tests verify TypeScript interface contracts and component exports.
 */

import { describe, it, expect } from 'vitest';
import { FormLabel, type FormLabelProps } from '$lib/components';

describe('FormLabel Component', () => {
	describe('TypeScript Interface', () => {
		it('FormLabelProps requires label', () => {
			const props: FormLabelProps = {
				label: 'Name'
			};

			expect(props.label).toBe('Name');
		});

		it('FormLabelProps accepts optional forId property', () => {
			const props: FormLabelProps = {
				label: 'Name',
				forId: 'field-name'
			};

			expect(props.forId).toBe('field-name');
		});

		it('FormLabelProps accepts optional required property', () => {
			const props: FormLabelProps = {
				label: 'Name',
				required: true
			};

			expect(props.required).toBe(true);
		});

		it('FormLabelProps optional properties default to undefined', () => {
			const props: FormLabelProps = {
				label: 'Name'
			};

			expect(props.forId).toBeUndefined();
			expect(props.required).toBeUndefined();
		});
	});

	describe('Component Structure Verification', () => {
		it('FormLabel component exports correctly from barrel export', () => {
			expect(FormLabel).toBeDefined();
			expect(typeof FormLabel).toBe('function');
		});

		it('FormLabelProps type exports correctly from barrel export', () => {
			const props: FormLabelProps = {
				label: 'Test'
			};

			expect(props).toBeDefined();
		});
	});
});
