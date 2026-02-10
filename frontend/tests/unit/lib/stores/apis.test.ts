import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
	apiMetadataStore,
	apisStore,
	endpointsStore,
	updateApiMetadata,
	getApiById,
	getTagByName,
	getEndpointById,
	getEndpointCountByTagName,
	getTotalEndpointCount,
	addTagToApi,
	updateTagInApi,
	deleteTagFromApi,
	createDefaultEndpoint,
	addEndpoint,
	updateEndpoint,
	duplicateEndpoint,
	deleteEndpoint,
	updateEndpointPath,
	updatePathParameter,
	deletePathParameter,
	initialApiMetadata
} from '$lib/stores/apis';
import { seedIdGenerator } from '$lib/utils/ids';
import { GLOBAL_NAMESPACE_ID } from '$lib/stores/initialData';
import type { ApiTag } from '$lib/types';
import { createMockEndpoint, createMockApi } from '../../../shared/testUtils';

// Test API ID for all endpoint and tag operations
const TEST_API_ID = 'cccccccc-0000-0000-0000-000000000001';

describe('apis store - Metadata Operations', () => {
	beforeEach(() => {
		// Reset stores to initial state
		apiMetadataStore.set(initialApiMetadata);
	});

	it('should update API metadata', () => {
		updateApiMetadata({ title: 'My API', version: '2.0.0' });

		const metadata = get(apiMetadataStore);
		expect(metadata.title).toBe('My API');
		expect(metadata.version).toBe('2.0.0');
		expect(metadata.baseUrl).toBe('/api/v1'); // Unchanged
	});
});

describe('apis store - Tag Operations (Embedded in API)', () => {
	beforeEach(() => {
		// Reset stores and ID generator
		apisStore.set([createMockApi({ id: TEST_API_ID, tags: [] })]);
		endpointsStore.set([]);
		seedIdGenerator({ counter: 0 });
	});

	it('should add a new tag to API with uniqueness guard', () => {
		const tag = addTagToApi(TEST_API_ID, 'Users', 'User management');

		expect(tag).toBeDefined();
		expect(tag?.name).toBe('Users');
		expect(tag?.description).toBe('User management');

		const api = get(apisStore).find(a => a.id === TEST_API_ID);
		expect(api?.tags).toHaveLength(1);
	});

	it('should prevent duplicate tag creation (case-insensitive)', () => {
		addTagToApi(TEST_API_ID, 'Users');
		const duplicate = addTagToApi(TEST_API_ID, 'users');

		expect(duplicate).toBeUndefined();

		const api = get(apisStore).find(a => a.id === TEST_API_ID);
		expect(api?.tags).toHaveLength(1);
	});

	it('should trim tag names', () => {
		const tag = addTagToApi(TEST_API_ID, '  Users  ');

		expect(tag?.name).toBe('Users');
	});

	it('should get tag by name', () => {
		addTagToApi(TEST_API_ID, 'Users', 'User management');
		const found = getTagByName(TEST_API_ID, 'Users');

		expect(found).toBeDefined();
		expect(found?.name).toBe('Users');
	});

	it('should return undefined for non-existent tag', () => {
		const found = getTagByName(TEST_API_ID, 'non-existent');

		expect(found).toBeUndefined();
	});

	it('should update a tag', () => {
		addTagToApi(TEST_API_ID, 'Users');
		updateTagInApi(TEST_API_ID, 'Users', { description: 'Updated description' });

		const updated = getTagByName(TEST_API_ID, 'Users');
		expect(updated?.description).toBe('Updated description');
	});

	it('should delete tag and detach from endpoints', () => {
		addTagToApi(TEST_API_ID, 'Users');

		// Create endpoints using this tag (by name)
		const endpoint1 = createDefaultEndpoint(GLOBAL_NAMESPACE_ID, TEST_API_ID);
		updateEndpoint(endpoint1.id, { tagName: 'Users' });

		const endpoint2 = createDefaultEndpoint(GLOBAL_NAMESPACE_ID, TEST_API_ID);
		updateEndpoint(endpoint2.id, { tagName: 'Users' });

		const result = deleteTagFromApi(TEST_API_ID, 'Users');

		expect(result.success).toBe(true);
		expect(result.error).toContain('deleted and removed from 2 endpoints');

		// Tag should be deleted
		expect(getTagByName(TEST_API_ID, 'Users')).toBeUndefined();

		// Endpoints should have tagName cleared
		expect(getEndpointById(endpoint1.id)?.tagName).toBeUndefined();
		expect(getEndpointById(endpoint2.id)?.tagName).toBeUndefined();
	});

	it('should handle deleting tag with no endpoints', () => {
		addTagToApi(TEST_API_ID, 'Users');
		const result = deleteTagFromApi(TEST_API_ID, 'Users');

		expect(result.success).toBe(true);
		expect(result.error).toBe('Tag "Users" deleted');
	});

	it('should handle deleting non-existent tag', () => {
		const result = deleteTagFromApi(TEST_API_ID, 'non-existent');

		expect(result.success).toBe(false);
		expect(result.error).toContain('not found');
	});

	it('should count tags in API', () => {
		const api = get(apisStore).find(a => a.id === TEST_API_ID);
		expect(api?.tags.length).toBe(0);

		addTagToApi(TEST_API_ID, 'Users');
		addTagToApi(TEST_API_ID, 'Posts');

		const updatedApi = get(apisStore).find(a => a.id === TEST_API_ID);
		expect(updatedApi?.tags.length).toBe(2);
	});
});

describe('apis store - Endpoint Operations', () => {
	beforeEach(() => {
		apisStore.set([createMockApi({ id: TEST_API_ID, tags: [] })]);
		endpointsStore.set([]);
		seedIdGenerator({ counter: 0 });
	});

	it('should create a default endpoint', () => {
		const endpoint = createDefaultEndpoint(GLOBAL_NAMESPACE_ID, TEST_API_ID);

		expect(endpoint.id).toBe('00000000-0000-4000-a000-000000000000');
		expect(endpoint.method).toBe('GET');
		expect(endpoint.path).toBe('/');
		expect(endpoint.pathParams).toHaveLength(0);
		expect(endpoint.queryParamsObjectId).toBeUndefined();

		const endpoints = get(endpointsStore);
		expect(endpoints).toHaveLength(1);
	});

	it('should get endpoint by ID', () => {
		const created = createDefaultEndpoint(GLOBAL_NAMESPACE_ID, TEST_API_ID);
		const found = getEndpointById(created.id);

		expect(found).toEqual(created);
	});

	it('should count endpoints by tag name', () => {
		addTagToApi(TEST_API_ID, 'Users');

		expect(getEndpointCountByTagName(TEST_API_ID, 'Users')).toBe(0);

		const endpoint1 = createDefaultEndpoint(GLOBAL_NAMESPACE_ID, TEST_API_ID);
		updateEndpoint(endpoint1.id, { tagName: 'Users' });

		expect(getEndpointCountByTagName(TEST_API_ID, 'Users')).toBe(1);

		const endpoint2 = createDefaultEndpoint(GLOBAL_NAMESPACE_ID, TEST_API_ID);
		updateEndpoint(endpoint2.id, { tagName: 'Users' });

		expect(getEndpointCountByTagName(TEST_API_ID, 'Users')).toBe(2);
	});

	it('should update an endpoint', () => {
		const endpoint = createDefaultEndpoint(GLOBAL_NAMESPACE_ID, TEST_API_ID);
		updateEndpoint(endpoint.id, { method: 'POST', description: 'Create user' });

		const updated = getEndpointById(endpoint.id);
		expect(updated?.method).toBe('POST');
		expect(updated?.description).toBe('Create user');
	});

	it('should duplicate an endpoint with new IDs', () => {
		const original = createDefaultEndpoint(GLOBAL_NAMESPACE_ID, TEST_API_ID);
		updateEndpoint(original.id, {
			path: '/users/{user_id}',
			pathParams: [{ id: 'dddddddd-0000-0000-0000-000000000001', name: 'user_id', type: 'integer', description: '', required: true }],
			queryParamsObjectId: 'eeeeeeee-0000-0000-0000-000000000001'
		});

		const duplicated = duplicateEndpoint(original.id);

		expect(duplicated).toBeDefined();
		expect(duplicated!.id).not.toBe(original.id);
		expect(duplicated!.path).toBe('/users/{user_id}-copy');
		expect(duplicated!.pathParams[0].id).not.toBe('dddddddd-0000-0000-0000-000000000001');
		expect(duplicated!.queryParamsObjectId).toBe('eeeeeeee-0000-0000-0000-000000000001');

		// Original should be unchanged
		const originalCheck = getEndpointById(original.id);
		expect(originalCheck?.pathParams[0].id).toBe('dddddddd-0000-0000-0000-000000000001');
	});

	it('should delete an endpoint', () => {
		const endpoint = createDefaultEndpoint(GLOBAL_NAMESPACE_ID, TEST_API_ID);
		const result = deleteEndpoint(endpoint.id);

		expect(result.success).toBe(true);
		expect(getEndpointById(endpoint.id)).toBeUndefined();
	});

	it('should handle deleting non-existent endpoint', () => {
		const result = deleteEndpoint('non-existent');

		expect(result.success).toBe(false);
		expect(result.error).toContain('not found');
	});

	it('should count total endpoints', () => {
		expect(getTotalEndpointCount()).toBe(0);

		createDefaultEndpoint(GLOBAL_NAMESPACE_ID, TEST_API_ID);
		createDefaultEndpoint(GLOBAL_NAMESPACE_ID, TEST_API_ID);

		expect(getTotalEndpointCount()).toBe(2);
	});
});

describe('apis store - Path Parameter Operations', () => {
	beforeEach(() => {
		apisStore.set([createMockApi({ id: TEST_API_ID, tags: [] })]);
		endpointsStore.set([]);
		seedIdGenerator({ counter: 0 });
	});

	it('should update endpoint path and extract path parameters', () => {
		const endpoint = createDefaultEndpoint(GLOBAL_NAMESPACE_ID, TEST_API_ID);

		const updated = updateEndpointPath(endpoint.id, '/users/{user_id}/posts/{post_id}');

		expect(updated?.path).toBe('/users/{user_id}/posts/{post_id}');
		expect(updated?.pathParams).toHaveLength(2);
		expect(updated?.pathParams[0].name).toBe('user_id');
		expect(updated?.pathParams[0].required).toBe(true);
		expect(updated?.pathParams[1].name).toBe('post_id');
	});

	it('should normalize path to start with /', () => {
		const endpoint = createDefaultEndpoint(GLOBAL_NAMESPACE_ID, TEST_API_ID);

		const updated = updateEndpointPath(endpoint.id, 'users');

		expect(updated?.path).toBe('/users');
	});

	it('should preserve existing parameter definitions when path changes', () => {
		const endpoint = createDefaultEndpoint(GLOBAL_NAMESPACE_ID, TEST_API_ID);

		// Set initial path with parameters
		let updated = updateEndpointPath(endpoint.id, '/users/{user_id}')!;

		// Update the parameter with type info
		updatePathParameter(endpoint.id, updated.pathParams[0].id, {
			type: 'integer',
			description: 'User ID'
		});

		// Change path to add more parameters
		updated = updateEndpointPath(endpoint.id, '/users/{user_id}/posts/{post_id}')!;

		// Original parameter should preserve its type
		expect(updated.pathParams[0].name).toBe('user_id');
		expect(updated.pathParams[0].type).toBe('integer');
		expect(updated.pathParams[0].description).toBe('User ID');

		// New parameter should have no type
		expect(updated.pathParams[1].name).toBe('post_id');
		expect(updated.pathParams[1].type).toBe('');
	});

	it('should remove parameters when they are removed from path', () => {
		const endpoint = createDefaultEndpoint(GLOBAL_NAMESPACE_ID, TEST_API_ID);

		// Set path with two parameters
		updateEndpointPath(endpoint.id, '/users/{user_id}/posts/{post_id}');

		// Change path to have only one parameter
		const updated = updateEndpointPath(endpoint.id, '/users/{user_id}');

		expect(updated?.pathParams).toHaveLength(1);
		expect(updated?.pathParams[0].name).toBe('user_id');
	});

	it('should update a path parameter', () => {
		const endpoint = createDefaultEndpoint(GLOBAL_NAMESPACE_ID, TEST_API_ID);
		const updated = updateEndpointPath(endpoint.id, '/users/{user_id}')!;

		const paramId = updated.pathParams[0].id;

		updatePathParameter(endpoint.id, paramId, {
			type: 'integer',
			description: 'User identifier'
		});

		const result = getEndpointById(endpoint.id);
		expect(result?.pathParams[0].type).toBe('integer');
		expect(result?.pathParams[0].description).toBe('User identifier');
	});

	it('should delete a path parameter', () => {
		const endpoint = createDefaultEndpoint(GLOBAL_NAMESPACE_ID, TEST_API_ID);
		const updated = updateEndpointPath(endpoint.id, '/users/{user_id}')!;

		const paramId = updated.pathParams[0].id;
		deletePathParameter(endpoint.id, paramId);

		const result = getEndpointById(endpoint.id);
		expect(result?.pathParams).toHaveLength(0);
	});
});


describe('apis store - Legacy Functions', () => {
	beforeEach(() => {
		apisStore.set([createMockApi({ id: TEST_API_ID, tags: [] })]);
		endpointsStore.set([]);
	});

	it('should support legacy addEndpoint function', () => {
		const endpoint = createMockEndpoint({
			id: 'bbbbbbbb-0000-0000-0000-000000000099',
			method: 'POST',
			path: '/test',
			description: 'Test endpoint',
			tagName: undefined
		});

		addEndpoint(endpoint);

		const endpoints = get(endpointsStore);
		expect(endpoints).toHaveLength(1);
		expect(endpoints[0]).toEqual(endpoint);
	});
});
