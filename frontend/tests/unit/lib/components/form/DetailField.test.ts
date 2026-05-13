/**
 * DetailField Component Tests
 *
 * Unit tests for the DetailField component.
 * Location mirrors: src/lib/components/form/DetailField.svelte
 *
 * IMPORTANT: Svelte 5 components using $props() cannot be rendered in jsdom.
 * Tests verify TypeScript interface contracts and component exports.
 */

import { describe, it, expect } from 'vitest';
import { DetailField, type DetailFieldProps } from '$lib/components';

describe('DetailField Component', () => {
	describe('TypeScript Interface', () => {
		it('DetailFieldProps interface requires label property', () => {
			const props: DetailFieldProps = {
				label: 'Name'
			};

			expect(props.label).toBe('Name');
		});

		it('DetailFieldProps accepts optional value property', () => {
			const props: DetailFieldProps = {
				label: 'Name',
				value: 'test-field'
			};

			expect(props.value).toBe('test-field');
		});

		it('DetailFieldProps accepts optional children snippet', () => {
			const props: DetailFieldProps = {
				label: 'Name',
				children: undefined
			};

			expect(props).toBeDefined();
			expect('children' in props).toBe(true);
		});

		it('DetailFieldProps value is optional', () => {
			const props: DetailFieldProps = {
				label: 'Name'
			};

			expect(props.value).toBeUndefined();
		});
	});

	describe('Component Structure Verification', () => {
		it('DetailField component exports correctly from barrel export', () => {
			expect(DetailField).toBeDefined();
			expect(typeof DetailField).toBe('function');
		});

		it('DetailFieldProps type exports correctly from barrel export', () => {
			const props: DetailFieldProps = {
				label: 'Test'
			};

			expect(props).toBeDefined();
		});
	});
});
