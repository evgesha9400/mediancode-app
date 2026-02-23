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
	setActiveNamespace,
	GLOBAL_NAMESPACE_ID
} from '$lib/stores/namespaces';
import { initialNamespaces } from '../../../fixtures/seedData';
import { fieldsStore } from '$lib/stores/fields';
import { objectsStore } from '$lib/stores/objects';
import { endpointsStore, apisStore } from '$lib/stores/apis';
import type { Namespace } from '$lib/types';

// Helper to create a namespace for seeding the store directly
function makeNamespace(overrides: Partial<Namespace> & { id: string; name: string }): Namespace {
	return {
		description: '',
		locked: false,
		isDefault: false,
		...overrides
	};
}

describe('namespaces store - Basic Operations', () => {
	beforeEach(() => {
		namespacesStore.set([...initialNamespaces]);
		activeNamespaceId.set(GLOBAL_NAMESPACE_ID);
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

describe('namespaces store - Active Namespace', () => {
	beforeEach(() => {
		namespacesStore.set([
			...initialNamespaces,
			makeNamespace({ id: 'ns-dev', name: 'development' })
		]);
		activeNamespaceId.set(GLOBAL_NAMESPACE_ID);
	});

	it('should set active namespace', () => {
		setActiveNamespace('ns-dev');

		expect(get(activeNamespaceId)).toBe('ns-dev');
		expect(get(activeNamespace)?.name).toBe('development');
	});

	it('should not set active namespace to non-existent namespace', () => {
		setActiveNamespace('non-existent');

		expect(get(activeNamespaceId)).toBe(GLOBAL_NAMESPACE_ID);
	});
});

describe('namespaces store - Search', () => {
	beforeEach(() => {
		namespacesStore.set([
			...initialNamespaces,
			makeNamespace({ id: 'ns-dev', name: 'development', description: 'Dev environment' }),
			makeNamespace({ id: 'ns-stg', name: 'staging', description: 'Staging environment' }),
			makeNamespace({ id: 'ns-prd', name: 'production', description: 'Prod environment' })
		]);
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
		apisStore.set([]);
	});

	it('should count entities in a namespace', () => {
		// Get initial count (constraints store has constraints that are always present)
		const initialCount = getNamespaceEntityCount(GLOBAL_NAMESPACE_ID);

		// Add a field to global namespace
		fieldsStore.update(fields => [
			...fields,
			{
				id: 'aaaaaaaa-0000-0000-0000-000000000001',
				namespaceId: GLOBAL_NAMESPACE_ID,
				name: 'test_field',
				type: 'str' as const,
				constraints: [],
				validators: [],
				usedInApis: []
			}
		]);

		expect(getNamespaceEntityCount(GLOBAL_NAMESPACE_ID)).toBe(initialCount + 1);
	});

	it('should get detailed entity counts', () => {
		// Get initial constraint count (constraints always exist)
		const initialDetails = getNamespaceEntityDetails(GLOBAL_NAMESPACE_ID);
		const initialConstraintCount = initialDetails.fieldConstraints;

		// Add entities
		fieldsStore.update(fields => [
			...fields,
			{
				id: 'aaaaaaaa-0000-0000-0000-000000000001',
				namespaceId: GLOBAL_NAMESPACE_ID,
				name: 'test_field',
				type: 'str' as const,
				constraints: [],
				validators: [],
				usedInApis: []
			}
		]);

		// Add an API in the global namespace so the endpoint can be matched
		apisStore.update(apis => [
			...apis,
			{
				id: 'cccccccc-0000-0000-0000-000000000001',
				namespaceId: GLOBAL_NAMESPACE_ID,
				title: 'Test API',
				version: '1.0.0',
				description: '',
				baseUrl: '/api/v1',
				serverUrl: 'http://localhost:8000',
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			}
		]);

		endpointsStore.update(endpoints => [
			...endpoints,
			{
				id: 'bbbbbbbb-0000-0000-0000-000000000001',
				apiId: 'cccccccc-0000-0000-0000-000000000001',
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
		expect(details.fieldConstraints).toBe(initialConstraintCount); // Constraints still present
		expect(details.objects).toBe(0);
		expect(details.apis).toBe(1); // Now counts the API we added
		expect(details.total).toBe(3 + initialConstraintCount);
	});
});
