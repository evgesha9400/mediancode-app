import { describe, it, expect, beforeEach } from 'vitest';
import {
	getExampleValueForType,
	buildObjectFromObjectId,
	buildRequestBodyFromObjectId,
	buildResponseBodyFromObjectId,
	buildRequestPreviewFromObject,
	buildResponsePreviewFromObject
} from '$lib/utils/examples';
import { fieldsStore } from '$lib/stores/stores';
import { objectsStore } from '$lib/stores/stores';
import { initialFields } from '../../../fixtures/seedData';
import type { ResponseShape, ObjectDefinition, Field } from '$lib/types';

import { initialObjects, SEED_OBJECT_IDS } from '../../../fixtures/seedData';

// Test object with mixed role values
const ROLE_TEST_OBJECT_ID = 'test-role-obj';
const testFieldId = (name: string) => `test-field-${name}`;

const roleTestFields: Field[] = [
	{ id: testFieldId('id'), namespaceId: 'ns-1', name: 'id', type: 'uuid', container: null, constraints: [], validators: [], usedInApis: [] },
	{ id: testFieldId('name'), namespaceId: 'ns-1', name: 'name', type: 'str', container: null, constraints: [], validators: [], usedInApis: [] },
	{ id: testFieldId('password'), namespaceId: 'ns-1', name: 'password', type: 'str', container: null, constraints: [], validators: [], usedInApis: [] },
	{ id: testFieldId('created_at'), namespaceId: 'ns-1', name: 'created_at', type: 'datetime', container: null, constraints: [], validators: [], usedInApis: [] },
];

const roleTestObject: ObjectDefinition = {
	id: ROLE_TEST_OBJECT_ID,
	namespaceId: 'ns-1',
	name: 'TestObj',
	members: [
		{ memberType: 'field', name: 'id', fieldId: testFieldId('id'), role: 'pk', isNullable: false },
		{ memberType: 'field', name: 'name', fieldId: testFieldId('name'), role: 'writable', isNullable: false },
		{ memberType: 'field', name: 'password', fieldId: testFieldId('password'), role: 'write_only', isNullable: false },
		{ memberType: 'field', name: 'created_at', fieldId: testFieldId('created_at'), role: 'read_only', isNullable: false },
	],
	derivedRelationships: [],
	validators: [],
	usedInApis: []
};

// Object with a relationship member (should not produce direct fields)
const REL_TEST_OBJECT_ID = 'test-rel-obj';
const relTestObject: ObjectDefinition = {
	id: REL_TEST_OBJECT_ID,
	namespaceId: 'ns-1',
	name: 'RelTestObj',
	members: [
		{ memberType: 'field', name: 'id', fieldId: testFieldId('id'), role: 'pk', isNullable: false },
		{ memberType: 'field', name: 'name', fieldId: testFieldId('name'), role: 'writable', isNullable: false },
		{ memberType: 'relationship', name: 'orders', targetObjectId: 'some-obj', kind: 'one_to_many', inverseName: 'parent', required: true },
	],
	derivedRelationships: [
		{
			name: 'customer',
			sourceObjectId: 'customer-obj-id',
			sourceObject: 'Customer',
			sourceField: 'orders',
			kind: 'one_to_many',
			side: 'many',
			required: true
		}
	],
	validators: [],
	usedInApis: []
};

describe('examples - getExampleValueForType', () => {
	it('should return correct example for string types', () => {
		expect(getExampleValueForType('str')).toBe('string');
		expect(getExampleValueForType('string')).toBe('string');
		expect(getExampleValueForType('String')).toBe('string');
		expect(getExampleValueForType('STR')).toBe('string');
	});

	it('should return correct example for integer types', () => {
		expect(getExampleValueForType('int')).toBe(0);
		expect(getExampleValueForType('integer')).toBe(0);
		expect(getExampleValueForType('Integer')).toBe(0);
		expect(getExampleValueForType('INT')).toBe(0);
	});

	it('should return correct example for float types', () => {
		expect(getExampleValueForType('float')).toBe(0.0);
		expect(getExampleValueForType('number')).toBe(0.0);
		expect(getExampleValueForType('Float')).toBe(0.0);
		expect(getExampleValueForType('FLOAT')).toBe(0.0);
	});

	it('should return correct example for boolean types', () => {
		expect(getExampleValueForType('bool')).toBe(true);
		expect(getExampleValueForType('boolean')).toBe(true);
		expect(getExampleValueForType('Boolean')).toBe(true);
		expect(getExampleValueForType('BOOL')).toBe(true);
	});

	it('should return correct example for uuid type', () => {
		expect(getExampleValueForType('uuid')).toBe('00000000-0000-0000-0000-000000000000');
		expect(getExampleValueForType('UUID')).toBe('00000000-0000-0000-0000-000000000000');
	});

	it('should return correct example for datetime type', () => {
		expect(getExampleValueForType('datetime')).toBe('2024-01-01T00:00:00Z');
		expect(getExampleValueForType('DateTime')).toBe('2024-01-01T00:00:00Z');
	});

	it('should return correct example for date type', () => {
		expect(getExampleValueForType('date')).toBe('2024-01-01');
		expect(getExampleValueForType('Date')).toBe('2024-01-01');
	});

	it('should return correct example for time type', () => {
		expect(getExampleValueForType('time')).toBe('00:00:00');
		expect(getExampleValueForType('Time')).toBe('00:00:00');
	});

	it('should return null for unknown types', () => {
		expect(getExampleValueForType('unknown')).toBe(null);
		expect(getExampleValueForType('custom')).toBe(null);
		expect(getExampleValueForType('nonsense')).toBe(null);
		expect(getExampleValueForType('')).toBe(null);
	});

	it('should handle case-insensitive type matching', () => {
		expect(getExampleValueForType('sTrInG')).toBe('string');
		expect(getExampleValueForType('iNtEgEr')).toBe(0);
		expect(getExampleValueForType('bOoLeAn')).toBe(true);
	});
});

describe('examples - buildObjectFromObjectId', () => {
	beforeEach(() => {
		fieldsStore.set(initialFields);
		objectsStore.set(initialObjects as any);
	});

	it('should build object from object ID', () => {
		const obj = buildObjectFromObjectId(SEED_OBJECT_IDS.user);

		expect(obj).toHaveProperty('email');
		expect(obj).toHaveProperty('username');
		expect(Object.keys(obj).length).toBeGreaterThan(0);
	});

	it('should return empty object for undefined object definition ID', () => {
		expect(buildObjectFromObjectId(undefined)).toEqual({});
	});

	it('should return empty object for non-existent object definition ID', () => {
		expect(buildObjectFromObjectId('non-existent')).toEqual({});
	});
});

describe('examples - buildRequestPreviewFromObject', () => {
	beforeEach(() => {
		fieldsStore.set(initialFields);
		objectsStore.set(initialObjects as any);
	});

	it('should generate request preview from object ID', () => {
		const preview = buildRequestPreviewFromObject(SEED_OBJECT_IDS.user);

		const parsed = JSON.parse(preview);
		expect(parsed).toHaveProperty('email');
	});

	it('should return empty object JSON for undefined object definition ID', () => {
		const preview = buildRequestPreviewFromObject(undefined);

		expect(JSON.parse(preview)).toEqual({});
	});
});

describe('examples - buildResponsePreviewFromObject', () => {
	beforeEach(() => {
		fieldsStore.set(initialFields);
		objectsStore.set(initialObjects as any);
	});

	it('should generate object shape response from object ID', () => {
		const preview = buildResponsePreviewFromObject('object', SEED_OBJECT_IDS.user, false);

		const parsed = JSON.parse(preview);
		expect(parsed).toHaveProperty('email');
	});

	it('should generate list shape response from object ID', () => {
		const preview = buildResponsePreviewFromObject('list', SEED_OBJECT_IDS.user, false);

		const parsed = JSON.parse(preview);
		expect(Array.isArray(parsed)).toBe(true);
		expect(parsed).toHaveLength(2);
	});

	it('should return empty array for list shape with undefined object', () => {
		const preview = buildResponsePreviewFromObject('list', undefined, false);

		const parsed = JSON.parse(preview);
		expect(parsed).toEqual([]);
	});

	it('should wrap in envelope when enabled', () => {
		const preview = buildResponsePreviewFromObject('object', SEED_OBJECT_IDS.user, true);

		const parsed = JSON.parse(preview);
		expect(parsed).toHaveProperty('data');
		expect(parsed.data).toHaveProperty('email');
	});

	it('should wrap list in envelope when enabled', () => {
		const preview = buildResponsePreviewFromObject('list', SEED_OBJECT_IDS.user, true);

		const parsed = JSON.parse(preview);
		expect(parsed).toHaveProperty('data');
		expect(Array.isArray(parsed.data)).toBe(true);
		expect(parsed.data).toHaveLength(2);
	});
});

describe('examples - buildRequestBodyFromObjectId (role filtering)', () => {
	beforeEach(() => {
		fieldsStore.set([...initialFields, ...roleTestFields]);
		objectsStore.set([...(initialObjects as any), roleTestObject]);
	});

	it('should exclude PK fields from request preview', () => {
		const obj = buildRequestBodyFromObjectId(ROLE_TEST_OBJECT_ID);
		expect(obj).not.toHaveProperty('id');
	});

	it('should exclude read-only fields from request preview', () => {
		const obj = buildRequestBodyFromObjectId(ROLE_TEST_OBJECT_ID);
		expect(obj).not.toHaveProperty('created_at');
	});

	it('should include write-only fields in request preview', () => {
		const obj = buildRequestBodyFromObjectId(ROLE_TEST_OBJECT_ID);
		expect(obj).toHaveProperty('password');
	});

	it('should include writable fields in request preview', () => {
		const obj = buildRequestBodyFromObjectId(ROLE_TEST_OBJECT_ID);
		expect(obj).toHaveProperty('name');
	});

	it('should return empty object for undefined object definition ID', () => {
		expect(buildRequestBodyFromObjectId(undefined)).toEqual({});
	});
});

describe('examples - buildResponseBodyFromObjectId (role filtering)', () => {
	beforeEach(() => {
		fieldsStore.set([...initialFields, ...roleTestFields]);
		objectsStore.set([...(initialObjects as any), roleTestObject]);
	});

	it('should exclude write-only fields from response preview', () => {
		const obj = buildResponseBodyFromObjectId(ROLE_TEST_OBJECT_ID);
		expect(obj).not.toHaveProperty('password');
	});

	it('should include read-only fields in response preview', () => {
		const obj = buildResponseBodyFromObjectId(ROLE_TEST_OBJECT_ID);
		expect(obj).toHaveProperty('created_at');
	});

	it('should include PK fields in response preview', () => {
		const obj = buildResponseBodyFromObjectId(ROLE_TEST_OBJECT_ID);
		expect(obj).toHaveProperty('id');
	});

	it('should include writable fields in response preview', () => {
		const obj = buildResponseBodyFromObjectId(ROLE_TEST_OBJECT_ID);
		expect(obj).toHaveProperty('name');
	});

	it('should return empty object for undefined object definition ID', () => {
		expect(buildResponseBodyFromObjectId(undefined)).toEqual({});
	});
});

describe('examples - relationship members and derived relationships in previews', () => {
	beforeEach(() => {
		fieldsStore.set([...initialFields, ...roleTestFields]);
		objectsStore.set([...(initialObjects as any), roleTestObject, relTestObject]);
	});

	it('should not produce direct fields from relationship members', () => {
		const obj = buildRequestBodyFromObjectId(REL_TEST_OBJECT_ID);
		// 'orders' is a relationship member -- it should not appear as a field
		expect(obj).not.toHaveProperty('orders');
		// field members should still appear
		expect(obj).toHaveProperty('name');
	});

	it('should not produce target-specific FK columns from derivedRelationships', () => {
		const obj = buildRequestBodyFromObjectId(REL_TEST_OBJECT_ID);
		expect(obj).not.toHaveProperty('customer_id');
	});

	it('should keep response preview target-neutral for derivedRelationships', () => {
		const obj = buildResponseBodyFromObjectId(REL_TEST_OBJECT_ID);
		expect(obj).not.toHaveProperty('customer_id');
	});
});
