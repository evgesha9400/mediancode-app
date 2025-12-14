import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
	fieldsStore,
	getFieldById,
	getTotalFieldCount,
	getFieldsByNamespace,
	getFieldCountByNamespace,
	searchFields,
	updateField,
	deleteField,
	createField,
	type Field
} from '$lib/stores/fields';
import { GLOBAL_NAMESPACE_ID } from '$lib/stores/initialData';
import { seedIdGenerator } from '$lib/utils/ids';

describe('fields store - Basic Operations', () => {
	beforeEach(() => {
		// Reset store to empty for predictable tests
		fieldsStore.set([]);
		seedIdGenerator({ counter: 0, timestamp: 1000000 });
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

		createField('test_field', 'str');
		expect(getTotalFieldCount()).toBe(1);
	});
});

describe('fields store - createField', () => {
	beforeEach(() => {
		fieldsStore.set([]);
		seedIdGenerator({ counter: 0, timestamp: 1000000 });
	});

	it('should create a new field with default options', () => {
		const field = createField('test_field', 'str');

		expect(field).toBeDefined();
		expect(field?.id).toBe('field-1000000-0');
		expect(field?.name).toBe('test_field');
		expect(field?.type).toBe('str');
		expect(field?.namespaceId).toBe(GLOBAL_NAMESPACE_ID);
		expect(field?.validators).toEqual([]);
		expect(field?.usedInApis).toEqual([]);
		expect(field?.description).toBe('');
		expect(field?.defaultValue).toBe('');

		expect(getTotalFieldCount()).toBe(1);
	});

	it('should create a field with custom namespace', () => {
		const field = createField('test_field', 'int', 'custom-namespace');

		expect(field?.namespaceId).toBe('custom-namespace');
	});

	it('should create a field with description', () => {
		const field = createField('test_field', 'str', GLOBAL_NAMESPACE_ID, {
			description: 'A test field'
		});

		expect(field?.description).toBe('A test field');
	});

	it('should create a field with defaultValue', () => {
		const field = createField('test_field', 'str', GLOBAL_NAMESPACE_ID, {
			defaultValue: 'default_value'
		});

		expect(field?.defaultValue).toBe('default_value');
	});

	it('should create a field with validators', () => {
		const validators = [{ name: 'min_length', params: { value: 5 } }];
		const field = createField('test_field', 'str', GLOBAL_NAMESPACE_ID, {
			validators
		});

		expect(field?.validators).toEqual(validators);
	});

	it('should create a field with all options', () => {
		const field = createField('test_field', 'int', 'custom-namespace', {
			description: 'A test field',
			defaultValue: '42',
			validators: [{ name: 'min', params: { value: 0 } }],
			usedInApis: ['api-1']
		});

		expect(field?.name).toBe('test_field');
		expect(field?.type).toBe('int');
		expect(field?.namespaceId).toBe('custom-namespace');
		expect(field?.description).toBe('A test field');
		expect(field?.defaultValue).toBe('42');
		expect(field?.validators).toHaveLength(1);
		expect(field?.usedInApis).toEqual(['api-1']);
	});

	it('should trim field names', () => {
		const field = createField('  test_field  ', 'str');
		expect(field?.name).toBe('test_field');
	});

	it('should prevent duplicate field creation in same namespace (case-insensitive)', () => {
		createField('test_field', 'str', GLOBAL_NAMESPACE_ID);
		const duplicate = createField('Test_Field', 'int', GLOBAL_NAMESPACE_ID);

		expect(duplicate).toBeUndefined();
		expect(getTotalFieldCount()).toBe(1);
	});

	it('should allow same field name in different namespaces', () => {
		const field1 = createField('test_field', 'str', 'namespace-1');
		const field2 = createField('test_field', 'str', 'namespace-2');

		expect(field1).toBeDefined();
		expect(field2).toBeDefined();
		expect(getTotalFieldCount()).toBe(2);
	});

	it('should generate unique IDs for each field', () => {
		const field1 = createField('field_1', 'str');
		const field2 = createField('field_2', 'str');

		expect(field1?.id).not.toBe(field2?.id);
	});
});

describe('fields store - Namespace Filtering', () => {
	beforeEach(() => {
		fieldsStore.set([]);
		seedIdGenerator({ counter: 0, timestamp: 1000000 });

		// Create fields in different namespaces
		createField('global_field', 'str', GLOBAL_NAMESPACE_ID);
		createField('ns1_field_1', 'str', 'namespace-1');
		createField('ns1_field_2', 'int', 'namespace-1');
		createField('ns2_field', 'bool', 'namespace-2');
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
		fieldsStore.set([]);
		seedIdGenerator({ counter: 0, timestamp: 1000000 });

		createField('email', 'str', GLOBAL_NAMESPACE_ID, { description: 'User email address' });
		createField('phone_number', 'str', GLOBAL_NAMESPACE_ID);
		createField('age', 'int', GLOBAL_NAMESPACE_ID);
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
});

describe('fields store - CRUD Operations', () => {
	beforeEach(() => {
		fieldsStore.set([]);
		seedIdGenerator({ counter: 0, timestamp: 1000000 });
	});

	it('should update a field', () => {
		const field = createField('test_field', 'str');
		updateField(field!.id, { description: 'Updated description', defaultValue: 'new_default' });

		const updated = getFieldById(field!.id);
		expect(updated?.description).toBe('Updated description');
		expect(updated?.defaultValue).toBe('new_default');
	});

	it('should delete a field', () => {
		const field = createField('test_field', 'str');
		const result = deleteField(field!.id);

		expect(result.success).toBe(true);
		expect(getFieldById(field!.id)).toBeUndefined();
		expect(getTotalFieldCount()).toBe(0);
	});

	it('should return error for non-existent field deletion', () => {
		const result = deleteField('non-existent');

		expect(result.success).toBe(false);
		expect(result.error).toContain('not found');
	});

	it('should not delete fields used in APIs', () => {
		const field = createField('test_field', 'str', GLOBAL_NAMESPACE_ID, {
			usedInApis: ['api-1']
		});

		const result = deleteField(field!.id);

		expect(result.success).toBe(false);
		expect(result.error).toContain('used in');
	});
});
