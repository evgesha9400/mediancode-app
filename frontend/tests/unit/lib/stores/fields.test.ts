import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
	fieldsStore,
	getFieldById,
	getTotalFieldCount,
	getFieldsByNamespace,
	getFieldCountByNamespace,
	searchFields,
	type Field
} from '$lib/stores/fields';
import { GLOBAL_NAMESPACE_ID } from '$lib/constants';

// Helper to create a field object for seeding the store directly
function makeField(overrides: Partial<Field> & { id: string; name: string; type: Field['type'] }): Field {
	return {
		namespaceId: GLOBAL_NAMESPACE_ID,
		description: '',
		defaultValue: '',
		constraints: [],
		validators: [],
		usedInApis: [],
		...overrides
	};
}

describe('fields store - Basic Operations', () => {
	beforeEach(() => {
		fieldsStore.set([]);
	});

	it('should start with empty fields', () => {
		const fields = get(fieldsStore);
		expect(fields).toHaveLength(0);
	});

	it('should return undefined for non-existent field', () => {
		const field = getFieldById('non-existent');
		expect(field).toBeUndefined();
	});

	it('should count total fields', () => {
		expect(getTotalFieldCount()).toBe(0);

		fieldsStore.set([makeField({ id: 'f-1', name: 'test_field', type: 'str' })]);
		expect(getTotalFieldCount()).toBe(1);
	});

	it('should get field by ID', () => {
		fieldsStore.set([
			makeField({ id: 'f-1', name: 'email', type: 'str' }),
			makeField({ id: 'f-2', name: 'age', type: 'int' })
		]);

		const field = getFieldById('f-1');
		expect(field).toBeDefined();
		expect(field?.name).toBe('email');

		expect(getFieldById('f-999')).toBeUndefined();
	});
});

describe('fields store - Namespace Filtering', () => {
	beforeEach(() => {
		fieldsStore.set([
			makeField({ id: 'f-1', name: 'global_field', type: 'str', namespaceId: GLOBAL_NAMESPACE_ID }),
			makeField({ id: 'f-2', name: 'ns1_field_1', type: 'str', namespaceId: 'namespace-1' }),
			makeField({ id: 'f-3', name: 'ns1_field_2', type: 'int', namespaceId: 'namespace-1' }),
			makeField({ id: 'f-4', name: 'ns2_field', type: 'bool', namespaceId: 'namespace-2' })
		]);
	});

	it('should get fields by namespace', () => {
		const globalFields = getFieldsByNamespace(GLOBAL_NAMESPACE_ID);
		expect(globalFields).toHaveLength(1);
		expect(globalFields[0].name).toBe('global_field');

		const ns1Fields = getFieldsByNamespace('namespace-1');
		expect(ns1Fields).toHaveLength(2);
	});

	it('should count fields by namespace', () => {
		expect(getFieldCountByNamespace(GLOBAL_NAMESPACE_ID)).toBe(1);
		expect(getFieldCountByNamespace('namespace-1')).toBe(2);
		expect(getFieldCountByNamespace('namespace-2')).toBe(1);
		expect(getFieldCountByNamespace('non-existent')).toBe(0);
	});
});

describe('fields store - Search', () => {
	beforeEach(() => {
		fieldsStore.set([
			makeField({ id: 'f-1', name: 'email', type: 'str', description: 'User email address' }),
			makeField({ id: 'f-2', name: 'phone_number', type: 'str' }),
			makeField({ id: 'f-3', name: 'age', type: 'int' })
		]);
	});

	it('should search fields by name', () => {
		const fields = get(fieldsStore);
		const results = searchFields(fields, 'email');

		expect(results).toHaveLength(1);
		expect(results[0].name).toBe('email');
	});

	it('should search fields by description', () => {
		const fields = get(fieldsStore);
		const results = searchFields(fields, 'address');

		expect(results).toHaveLength(1);
		expect(results[0].name).toBe('email');
	});

	it('should search fields by type', () => {
		const fields = get(fieldsStore);
		const results = searchFields(fields, 'int');

		expect(results).toHaveLength(1);
		expect(results[0].name).toBe('age');
	});

	it('should return all fields for empty query', () => {
		const fields = get(fieldsStore);
		const results = searchFields(fields, '');

		expect(results).toHaveLength(3);
	});

	it('should be case insensitive', () => {
		const fields = get(fieldsStore);
		const results = searchFields(fields, 'EMAIL');

		expect(results).toHaveLength(1);
		expect(results[0].name).toBe('email');
	});

	it('should search fields by constraint name', () => {
		fieldsStore.set([
			makeField({
				id: 'f-1',
				name: 'name',
				type: 'str',
				constraints: [{ name: 'max_length', constraintId: 'c-1', value: '100' }]
			}),
			makeField({ id: 'f-2', name: 'age', type: 'int' })
		]);

		const fields = get(fieldsStore);
		const results = searchFields(fields, 'max_length');

		expect(results).toHaveLength(1);
		expect(results[0].name).toBe('name');
	});
});
