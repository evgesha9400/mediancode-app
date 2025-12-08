import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
	namespacesStore,
	activeNamespaceId,
	activeNamespace,
	getNamespaceById,
	getTotalNamespaceCount,
	searchNamespaces,
	getNamespaceEntityCount,
	getNamespaceEntityDetails,
	createNamespace,
	updateNamespace,
	deleteNamespace,
	setActiveNamespace,
	GLOBAL_NAMESPACE_ID
} from '$lib/stores/namespaces';
import { initialNamespaces } from '$lib/stores/initialData';
import { seedIdGenerator } from '$lib/utils/ids';
import { fieldsStore } from '$lib/stores/fields';
import { objectsStore } from '$lib/stores/objects';
import { endpointsStore, tagsStore } from '$lib/stores/apis';

describe('namespaces store - Basic Operations', () => {
	beforeEach(() => {
		// Reset stores to initial state
		namespacesStore.set([...initialNamespaces]);
		activeNamespaceId.set(GLOBAL_NAMESPACE_ID);
		seedIdGenerator({ counter: 0, timestamp: 1000000 });
	});

	it('should have global namespace by default', () => {
		const namespaces = get(namespacesStore);
		expect(namespaces).toHaveLength(2); // global + user namespace
		const globalNs = namespaces.find(ns => ns.id === GLOBAL_NAMESPACE_ID);
		expect(globalNs).toBeDefined();
		expect(globalNs?.name).toBe('global');
		expect(globalNs?.locked).toBe(true);
	});

	it('should have active namespace set to global by default', () => {
		expect(get(activeNamespaceId)).toBe(GLOBAL_NAMESPACE_ID);
		expect(get(activeNamespace)?.id).toBe(GLOBAL_NAMESPACE_ID);
	});

	it('should get namespace by ID', () => {
		const namespace = getNamespaceById(GLOBAL_NAMESPACE_ID);
		expect(namespace).toBeDefined();
		expect(namespace?.name).toBe('global');
	});

	it('should return undefined for non-existent namespace', () => {
		const namespace = getNamespaceById('non-existent');
		expect(namespace).toBeUndefined();
	});

	it('should count total namespaces', () => {
		expect(getTotalNamespaceCount()).toBe(2); // global + user namespace
	});
});

describe('namespaces store - CRUD Operations', () => {
	beforeEach(() => {
		namespacesStore.set([...initialNamespaces]);
		activeNamespaceId.set(GLOBAL_NAMESPACE_ID);
		seedIdGenerator({ counter: 0, timestamp: 1000000 });
	});

	it('should create a new namespace', () => {
		const namespace = createNamespace('development', 'Dev environment');

		expect(namespace).toBeDefined();
		expect(namespace?.id).toBe('namespace-1000000-0');
		expect(namespace?.name).toBe('development');
		expect(namespace?.description).toBe('Dev environment');
		expect(namespace?.locked).toBe(false);

		expect(getTotalNamespaceCount()).toBe(3); // global + user + development
	});

	it('should prevent duplicate namespace creation (case-insensitive)', () => {
		createNamespace('development');
		const duplicate = createNamespace('Development');

		expect(duplicate).toBeUndefined();
		expect(getTotalNamespaceCount()).toBe(3); // global + user + development
	});

	it('should not allow creating namespace with same name as global', () => {
		const duplicate = createNamespace('global');
		expect(duplicate).toBeUndefined();
		expect(getTotalNamespaceCount()).toBe(2); // global + user (unchanged)
	});

	it('should trim namespace names', () => {
		const namespace = createNamespace('  development  ');
		expect(namespace?.name).toBe('development');
	});

	it('should update a namespace', () => {
		const namespace = createNamespace('development');
		updateNamespace(namespace!.id, { description: 'Updated description' });

		const updated = getNamespaceById(namespace!.id);
		expect(updated?.description).toBe('Updated description');
	});

	it('should not update locked namespaces', () => {
		updateNamespace(GLOBAL_NAMESPACE_ID, { name: 'new-name' });

		const globalNs = getNamespaceById(GLOBAL_NAMESPACE_ID);
		expect(globalNs?.name).toBe('global');
	});

	it('should delete a namespace', () => {
		const namespace = createNamespace('development');
		const result = deleteNamespace(namespace!.id);

		expect(result.success).toBe(true);
		expect(getNamespaceById(namespace!.id)).toBeUndefined();
		expect(getTotalNamespaceCount()).toBe(2); // global + user (back to initial)
	});

	it('should not delete locked namespaces', () => {
		const result = deleteNamespace(GLOBAL_NAMESPACE_ID);

		expect(result.success).toBe(false);
		expect(result.error).toContain('locked');
		expect(getTotalNamespaceCount()).toBe(2); // global + user (unchanged)
	});

	it('should return error for non-existent namespace deletion', () => {
		const result = deleteNamespace('non-existent');

		expect(result.success).toBe(false);
		expect(result.error).toContain('not found');
	});
});

describe('namespaces store - Active Namespace', () => {
	beforeEach(() => {
		namespacesStore.set([...initialNamespaces]);
		activeNamespaceId.set(GLOBAL_NAMESPACE_ID);
		seedIdGenerator({ counter: 0, timestamp: 1000000 });
	});

	it('should set active namespace', () => {
		const namespace = createNamespace('development');
		setActiveNamespace(namespace!.id);

		expect(get(activeNamespaceId)).toBe(namespace!.id);
		expect(get(activeNamespace)?.name).toBe('development');
	});

	it('should not set active namespace to non-existent namespace', () => {
		setActiveNamespace('non-existent');

		expect(get(activeNamespaceId)).toBe(GLOBAL_NAMESPACE_ID);
	});

	it('should reset active namespace to global when deleting active namespace', () => {
		const namespace = createNamespace('development');
		setActiveNamespace(namespace!.id);
		expect(get(activeNamespaceId)).toBe(namespace!.id);

		deleteNamespace(namespace!.id);
		expect(get(activeNamespaceId)).toBe(GLOBAL_NAMESPACE_ID);
	});
});

describe('namespaces store - Search', () => {
	beforeEach(() => {
		namespacesStore.set([...initialNamespaces]);
		seedIdGenerator({ counter: 0, timestamp: 1000000 });
		createNamespace('development', 'Dev environment');
		createNamespace('staging', 'Staging environment');
		createNamespace('production', 'Prod environment');
	});

	it('should search namespaces by name', () => {
		const namespaces = get(namespacesStore);
		const results = searchNamespaces(namespaces, 'dev');

		expect(results).toHaveLength(1);
		expect(results[0].name).toBe('development');
	});

	it('should search namespaces by description', () => {
		const namespaces = get(namespacesStore);
		const results = searchNamespaces(namespaces, 'environment');

		expect(results).toHaveLength(3);
	});

	it('should return all namespaces for empty query', () => {
		const namespaces = get(namespacesStore);
		const results = searchNamespaces(namespaces, '');

		expect(results).toHaveLength(5); // global + user + 3 created
	});

	it('should be case insensitive', () => {
		const namespaces = get(namespacesStore);
		const results = searchNamespaces(namespaces, 'DEVELOPMENT');

		expect(results).toHaveLength(1);
		expect(results[0].name).toBe('development');
	});
});

describe('namespaces store - Entity Count', () => {
	beforeEach(() => {
		namespacesStore.set([...initialNamespaces]);
		activeNamespaceId.set(GLOBAL_NAMESPACE_ID);
		fieldsStore.set([]);
		objectsStore.set([]);
		endpointsStore.set([]);
		tagsStore.set([]);
		seedIdGenerator({ counter: 0, timestamp: 1000000 });
	});

	it('should count entities in a namespace', () => {
		// Get initial count (validators store has inline validators that are always present)
		const initialCount = getNamespaceEntityCount(GLOBAL_NAMESPACE_ID);

		// Add a field to global namespace
		fieldsStore.update(fields => [
			...fields,
			{
				id: 'field-1',
				namespaceId: GLOBAL_NAMESPACE_ID,
				name: 'test_field',
				type: 'str' as const,
				validators: [],
				usedInApis: []
			}
		]);

		expect(getNamespaceEntityCount(GLOBAL_NAMESPACE_ID)).toBe(initialCount + 1);
	});

	it('should get detailed entity counts', () => {
		// Get initial validator count (inline validators always exist)
		const initialDetails = getNamespaceEntityDetails(GLOBAL_NAMESPACE_ID);
		const initialValidatorCount = initialDetails.validators;

		// Add entities
		fieldsStore.update(fields => [
			...fields,
			{
				id: 'field-1',
				namespaceId: GLOBAL_NAMESPACE_ID,
				name: 'test_field',
				type: 'str' as const,
				validators: [],
				usedInApis: []
			}
		]);

		endpointsStore.update(endpoints => [
			...endpoints,
			{
				id: 'endpoint-1',
				namespaceId: GLOBAL_NAMESPACE_ID,
				method: 'GET' as const,
				path: '/test',
				description: '',
				pathParams: [],
				useEnvelope: true,
				responseShape: 'object' as const
			}
		]);

		const details = getNamespaceEntityDetails(GLOBAL_NAMESPACE_ID);

		expect(details.fields).toBe(1);
		expect(details.endpoints).toBe(1);
		expect(details.validators).toBe(initialValidatorCount); // Inline validators still present
		expect(details.objects).toBe(0);
		expect(details.tags).toBe(0);
		expect(details.total).toBe(2 + initialValidatorCount);
	});

	it('should not delete namespace with entities', () => {
		const namespace = createNamespace('development');

		// Add an entity to the new namespace
		fieldsStore.update(fields => [
			...fields,
			{
				id: 'field-1',
				namespaceId: namespace!.id,
				name: 'test_field',
				type: 'str' as const,
				validators: [],
				usedInApis: []
			}
		]);

		const result = deleteNamespace(namespace!.id);

		expect(result.success).toBe(false);
		expect(result.error).toContain('contains');
		expect(result.error).toContain('1 field');
	});
});
