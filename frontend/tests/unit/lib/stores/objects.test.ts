import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
	objectsStore,
	getObjectById,
	getTotalObjectCount,
	getObjectsByNamespace,
	getObjectCountByNamespace,
	searchObjects,
	updateObject,
	deleteObject,
	createObject,
	type ObjectDefinition
} from '$lib/stores/objects';
import { GLOBAL_NAMESPACE_ID } from '$lib/stores/initialData';
import { seedIdGenerator } from '$lib/utils/ids';

describe('objects store - Basic Operations', () => {
	beforeEach(() => {
		// Reset store to empty for predictable tests
		objectsStore.set([]);
		seedIdGenerator({ counter: 0, timestamp: 1000000 });
	});

	it('should start with empty objects', () => {
		const objects = get(objectsStore);
		expect(objects).toHaveLength(0);
	});

	it('should return undefined for non-existent object', () => {
		const object = getObjectById('non-existent');
		expect(object).toBeUndefined();
	});

	it('should count total objects', () => {
		expect(getTotalObjectCount()).toBe(0);

		createObject('TestObject');
		expect(getTotalObjectCount()).toBe(1);
	});
});

describe('objects store - createObject', () => {
	beforeEach(() => {
		objectsStore.set([]);
		seedIdGenerator({ counter: 0, timestamp: 1000000 });
	});

	it('should create a new object with default options', () => {
		const object = createObject('TestObject');

		expect(object).toBeDefined();
		expect(object?.id).toBe('object-1000000-0');
		expect(object?.name).toBe('TestObject');
		expect(object?.namespaceId).toBe(GLOBAL_NAMESPACE_ID);
		expect(object?.fields).toEqual([]);
		expect(object?.usedInApis).toEqual([]);
		expect(object?.description).toBe('');

		expect(getTotalObjectCount()).toBe(1);
	});

	it('should create an object with custom namespace', () => {
		const object = createObject('TestObject', 'custom-namespace');

		expect(object?.namespaceId).toBe('custom-namespace');
	});

	it('should create an object with description', () => {
		const object = createObject('TestObject', GLOBAL_NAMESPACE_ID, {
			description: 'A test object'
		});

		expect(object?.description).toBe('A test object');
	});

	it('should create an object with fields', () => {
		const fields = [
			{ fieldId: 'field-1', required: true },
			{ fieldId: 'field-2', required: false }
		];
		const object = createObject('TestObject', GLOBAL_NAMESPACE_ID, {
			fields
		});

		expect(object?.fields).toEqual(fields);
		expect(object?.fields).toHaveLength(2);
	});

	it('should create an object with all options', () => {
		const object = createObject('TestObject', 'custom-namespace', {
			description: 'A test object',
			fields: [
				{ fieldId: 'field-1', required: true },
				{ fieldId: 'field-2', required: false }
			],
			usedInApis: ['api-1', 'api-2']
		});

		expect(object?.name).toBe('TestObject');
		expect(object?.namespaceId).toBe('custom-namespace');
		expect(object?.description).toBe('A test object');
		expect(object?.fields).toHaveLength(2);
		expect(object?.usedInApis).toEqual(['api-1', 'api-2']);
	});

	it('should trim object names', () => {
		const object = createObject('  TestObject  ');
		expect(object?.name).toBe('TestObject');
	});

	it('should prevent duplicate object creation in same namespace (case-insensitive)', () => {
		createObject('TestObject', GLOBAL_NAMESPACE_ID);
		const duplicate = createObject('testobject', GLOBAL_NAMESPACE_ID);

		expect(duplicate).toBeUndefined();
		expect(getTotalObjectCount()).toBe(1);
	});

	it('should allow same object name in different namespaces', () => {
		const object1 = createObject('TestObject', 'namespace-1');
		const object2 = createObject('TestObject', 'namespace-2');

		expect(object1).toBeDefined();
		expect(object2).toBeDefined();
		expect(getTotalObjectCount()).toBe(2);
	});

	it('should generate unique IDs for each object', () => {
		const object1 = createObject('Object1');
		const object2 = createObject('Object2');

		expect(object1?.id).not.toBe(object2?.id);
	});

	it('should persist fields with required flags', () => {
		const object = createObject('TestObject', GLOBAL_NAMESPACE_ID, {
			fields: [
				{ fieldId: 'email', required: true },
				{ fieldId: 'name', required: true },
				{ fieldId: 'phone', required: false }
			]
		});

		expect(object?.fields).toHaveLength(3);
		expect(object?.fields[0]).toEqual({ fieldId: 'email', required: true });
		expect(object?.fields[1]).toEqual({ fieldId: 'name', required: true });
		expect(object?.fields[2]).toEqual({ fieldId: 'phone', required: false });
	});
});

describe('objects store - Namespace Filtering', () => {
	beforeEach(() => {
		objectsStore.set([]);
		seedIdGenerator({ counter: 0, timestamp: 1000000 });

		// Create objects in different namespaces
		createObject('GlobalObject', GLOBAL_NAMESPACE_ID);
		createObject('NS1Object1', 'namespace-1');
		createObject('NS1Object2', 'namespace-1');
		createObject('NS2Object', 'namespace-2');
	});

	it('should get objects by namespace', () => {
		const globalObjects = getObjectsByNamespace(GLOBAL_NAMESPACE_ID);
		expect(globalObjects).toHaveLength(1);
		expect(globalObjects[0].name).toBe('GlobalObject');

		const ns1Objects = getObjectsByNamespace('namespace-1');
		expect(ns1Objects).toHaveLength(2);
	});

	it('should count objects by namespace', () => {
		expect(getObjectCountByNamespace(GLOBAL_NAMESPACE_ID)).toBe(1);
		expect(getObjectCountByNamespace('namespace-1')).toBe(2);
		expect(getObjectCountByNamespace('namespace-2')).toBe(1);
		expect(getObjectCountByNamespace('non-existent')).toBe(0);
	});
});

describe('objects store - Search', () => {
	beforeEach(() => {
		objectsStore.set([]);
		seedIdGenerator({ counter: 0, timestamp: 1000000 });

		createObject('UserProfile', GLOBAL_NAMESPACE_ID, { description: 'User profile data' });
		createObject('AdminSettings', GLOBAL_NAMESPACE_ID);
		createObject('ProductCatalog', GLOBAL_NAMESPACE_ID, { description: 'Product catalog entries' });
	});

	it('should search objects by name', () => {
		const objects = get(objectsStore);
		const results = searchObjects(objects, 'User');

		expect(results).toHaveLength(1);
		expect(results[0].name).toBe('UserProfile');
	});

	it('should search objects by description', () => {
		const objects = get(objectsStore);
		const results = searchObjects(objects, 'catalog');

		expect(results).toHaveLength(1);
		expect(results[0].name).toBe('ProductCatalog');
	});

	it('should return all objects for empty query', () => {
		const objects = get(objectsStore);
		const results = searchObjects(objects, '');

		expect(results).toHaveLength(3);
	});

	it('should be case insensitive', () => {
		const objects = get(objectsStore);
		const results = searchObjects(objects, 'ADMIN');

		expect(results).toHaveLength(1);
		expect(results[0].name).toBe('AdminSettings');
	});
});

describe('objects store - CRUD Operations', () => {
	beforeEach(() => {
		objectsStore.set([]);
		seedIdGenerator({ counter: 0, timestamp: 1000000 });
	});

	it('should update an object', () => {
		const object = createObject('TestObject');
		updateObject(object!.id, {
			description: 'Updated description',
			fields: [{ fieldId: 'field-1', required: true }]
		});

		const updated = getObjectById(object!.id);
		expect(updated?.description).toBe('Updated description');
		expect(updated?.fields).toHaveLength(1);
	});

	it('should delete an object', () => {
		const object = createObject('TestObject');
		const result = deleteObject(object!.id);

		expect(result.success).toBe(true);
		expect(getObjectById(object!.id)).toBeUndefined();
		expect(getTotalObjectCount()).toBe(0);
	});

	it('should return error for non-existent object deletion', () => {
		const result = deleteObject('non-existent');

		expect(result.success).toBe(false);
		expect(result.error).toContain('not found');
	});

	it('should not delete objects used in APIs', () => {
		const object = createObject('TestObject', GLOBAL_NAMESPACE_ID, {
			usedInApis: ['api-1']
		});

		const result = deleteObject(object!.id);

		expect(result.success).toBe(false);
		expect(result.error).toContain('used in');
	});
});

describe('objects store - Namespace Assignment', () => {
	beforeEach(() => {
		objectsStore.set([]);
		seedIdGenerator({ counter: 0, timestamp: 1000000 });
	});

	it('should assign object to specified namespace during creation', () => {
		const object = createObject('TestObject', 'custom-namespace');

		expect(object?.namespaceId).toBe('custom-namespace');
	});

	it('should default to global namespace if not specified', () => {
		const object = createObject('TestObject');

		expect(object?.namespaceId).toBe(GLOBAL_NAMESPACE_ID);
	});

	it('should enforce namespace-scoped uniqueness', () => {
		const object1 = createObject('TestObject', 'namespace-1');
		const object2 = createObject('TestObject', 'namespace-1'); // Duplicate in same namespace
		const object3 = createObject('TestObject', 'namespace-2'); // Same name, different namespace

		expect(object1).toBeDefined();
		expect(object2).toBeUndefined(); // Should fail due to duplicate
		expect(object3).toBeDefined(); // Should succeed in different namespace
	});
});
