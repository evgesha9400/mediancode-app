import { describe, it, expect } from 'vitest';
import { ObjectFormContent, type ObjectFormContentProps } from '$lib/components';

describe('ObjectFormContent Component', () => {
	describe('TypeScript Interface', () => {
		it('ObjectFormContentProps requires core properties', () => {
			const props: ObjectFormContentProps = {
				editedItem: {
					id: 'obj-1',
					name: 'User',
					namespaceId: 'ns-1',
					description: '',
					members: [],
					derivedRelationships: [],
					validators: [],
					usedInApis: []
				},
				mode: 'creating',
				namespaceName: 'default',
				availableFields: [],
				modelValidatorTemplates: [],
				visibleErrors: {}
			};
			expect(props.mode).toBe('creating');
			expect(props.namespaceName).toBe('default');
		});

		it('ObjectFormContentProps accepts editing mode', () => {
			const props: ObjectFormContentProps = {
				editedItem: {} as any,
				mode: 'editing',
				namespaceName: 'default',
				availableFields: [],
				modelValidatorTemplates: [],
				visibleErrors: {}
			};
			expect(props.mode).toBe('editing');
		});

		it('ObjectFormContentProps accepts optional onCreateNewField', () => {
			const props: ObjectFormContentProps = {
				editedItem: {} as any,
				mode: 'creating',
				namespaceName: 'default',
				availableFields: [],
				modelValidatorTemplates: [],
				visibleErrors: {},
				onCreateNewField: () => {}
			};
			expect(props.onCreateNewField).toBeDefined();
		});

		it('ObjectFormContentProps optional properties default to undefined', () => {
			const props: ObjectFormContentProps = {
				editedItem: {} as any,
				mode: 'creating',
				namespaceName: 'default',
				availableFields: [],
				modelValidatorTemplates: [],
				visibleErrors: {}
			};
			expect(props.onCreateNewField).toBeUndefined();
		});
	});

	describe('Component Structure Verification', () => {
		it('ObjectFormContent component exports correctly from barrel export', () => {
			expect(ObjectFormContent).toBeDefined();
			expect(typeof ObjectFormContent).toBe('function');
		});
	});
});
