import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
	objectsStore,
	getObjectById,
	getTotalObjectCount,
	getObjectsByNamespace,
	getObjectCountByNamespace,
	searchObjects,
	type ObjectDefinition
} from '$lib/stores/objects';
import { GLOBAL_NAMESPACE_ID } from '$lib/utils/namespace';

// Helper to create an object definition for seeding the store directly
function makeObject(overrides: Partial<ObjectDefinition> & { id: string; name: string }): ObjectDefinition {
	return {
		namespaceId: GLOBAL_NAMESPACE_ID,
		description: '',
		members: [],
		derivedRelationships: [],
		validators: [],
		usedInApis: [],
		...overrides
	};
}

describe('objects store - Basic Operations', () => {
	beforeEach(() => {
		objectsStore.set([]);
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

		objectsStore.set([makeObject({ id: 'o-1', name: 'TestObject' })]);
		expect(getTotalObjectCount()).toBe(1);
	});

	it('should get object by ID', () => {
		objectsStore.set([
			makeObject({ id: 'o-1', name: 'User' }),
			makeObject({ id: 'o-2', name: 'Product' })
		]);

		const obj = getObjectById('o-1');
		expect(obj).toBeDefined();
		expect(obj?.name).toBe('User');

		expect(getObjectById('o-999')).toBeUndefined();
	});
});

describe('objects store - Namespace Filtering', () => {
	beforeEach(() => {
		objectsStore.set([
			makeObject({ id: 'o-1', name: 'GlobalObject', namespaceId: GLOBAL_NAMESPACE_ID }),
			makeObject({ id: 'o-2', name: 'NS1Object1', namespaceId: 'namespace-1' }),
			makeObject({ id: 'o-3', name: 'NS1Object2', namespaceId: 'namespace-1' }),
			makeObject({ id: 'o-4', name: 'NS2Object', namespaceId: 'namespace-2' })
		]);
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
		objectsStore.set([
			makeObject({ id: 'o-1', name: 'UserProfile', description: 'User profile data' }),
			makeObject({ id: 'o-2', name: 'AdminSettings' }),
			makeObject({ id: 'o-3', name: 'ProductCatalog', description: 'Product catalog entries' })
		]);
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
