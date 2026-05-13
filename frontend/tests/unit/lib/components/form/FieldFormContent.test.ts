import { describe, it, expect } from 'vitest';
import { FieldFormContent, type FieldFormContentProps } from '$lib/components';

describe('FieldFormContent Component', () => {
	describe('TypeScript Interface', () => {
		it('FieldFormContentProps requires core properties', () => {
			const props: FieldFormContentProps = {
				editedItem: {
					id: 'f-1',
					name: 'email',
					type: 'str',
					namespaceId: 'ns-1',
					container: null,
					description: '',
					defaultValue: '',
					constraints: [],
					validators: [],
					usedInApis: [],
					usedInObjects: []
				} as any,
				mode: 'creating',
				selectableTypes: [],
				fieldConstraintDefinitions: [],
				fieldValidatorTemplates: [],
				visibleErrors: {}
			};
			expect(props.mode).toBe('creating');
		});

		it('FieldFormContentProps accepts editing mode', () => {
			const props: FieldFormContentProps = {
				editedItem: {} as any,
				mode: 'editing',
				selectableTypes: [],
				fieldConstraintDefinitions: [],
				fieldValidatorTemplates: [],
				visibleErrors: {}
			};
			expect(props.mode).toBe('editing');
		});

		it('FieldFormContentProps accepts optional callbacks', () => {
			const props: FieldFormContentProps = {
				editedItem: {} as any,
				mode: 'creating',
				selectableTypes: [],
				fieldConstraintDefinitions: [],
				fieldValidatorTemplates: [],
				visibleErrors: {},
				onTypeChange: (t: string) => {},
				onContainerChange: (c: string | null) => {}
			};
			expect(props.onTypeChange).toBeDefined();
			expect(props.onContainerChange).toBeDefined();
		});

		it('FieldFormContentProps optional callbacks default to undefined', () => {
			const props: FieldFormContentProps = {
				editedItem: {} as any,
				mode: 'creating',
				selectableTypes: [],
				fieldConstraintDefinitions: [],
				fieldValidatorTemplates: [],
				visibleErrors: {}
			};
			expect(props.onTypeChange).toBeUndefined();
			expect(props.onContainerChange).toBeUndefined();
		});
	});

	describe('Component Structure Verification', () => {
		it('FieldFormContent component exports correctly from barrel export', () => {
			expect(FieldFormContent).toBeDefined();
			expect(typeof FieldFormContent).toBe('function');
		});
	});
});
