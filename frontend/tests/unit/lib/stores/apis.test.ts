import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
	apisStore,
	endpointsStore,
	getApiById,
	getEndpointById,
	getEndpointCountByTagName,
	getTotalEndpointCount,
	createDefaultEndpoint,
	addEndpoint,
	updateEndpoint,
	duplicateEndpoint,
	deleteEndpoint,
	updateEndpointPath,
	updatePathParameter
} from '$lib/stores/apis';
import { seedIdGenerator } from '$lib/utils/ids';
import { GLOBAL_NAMESPACE_ID } from '$lib/constants';
import { createMockEndpoint, createMockApi } from '../../../shared/testUtils';

// Test API ID for all endpoint operations
const TEST_API_ID = 'cccccccc-0000-0000-0000-000000000001';

describe('apis store - Endpoint Operations', () => {
	beforeEach(() => {
		apisStore.set([createMockApi({ id: TEST_API_ID })]);
		endpointsStore.set([]);
		seedIdGenerator({ counter: 0 });
	});

	it('should create a default endpoint', () => {
		const endpoint = createDefaultEndpoint(TEST_API_ID);

		expect(endpoint.id).toBe('00000000-0000-4000-a000-000000000000');
		expect(endpoint.method).toBe('GET');
		expect(endpoint.path).toBe('/');
		expect(endpoint.pathParams).toHaveLength(0);
		expect(endpoint.queryParamsObjectId).toBeUndefined();

		const endpoints = get(endpointsStore);
		expect(endpoints).toHaveLength(1);
	});

	it('should get endpoint by ID', () => {
		const created = createDefaultEndpoint(TEST_API_ID);
		const found = getEndpointById(created.id);

		expect(found).toEqual(created);
	});

	it('should count endpoints by tag name', () => {
		expect(getEndpointCountByTagName(TEST_API_ID, 'Users')).toBe(0);

		const endpoint1 = createDefaultEndpoint(TEST_API_ID);
		updateEndpoint(endpoint1.id, { tagName: 'Users' });

		expect(getEndpointCountByTagName(TEST_API_ID, 'Users')).toBe(1);

		const endpoint2 = createDefaultEndpoint(TEST_API_ID);
		updateEndpoint(endpoint2.id, { tagName: 'Users' });

		expect(getEndpointCountByTagName(TEST_API_ID, 'Users')).toBe(2);
	});

	it('should update an endpoint', () => {
		const endpoint = createDefaultEndpoint(TEST_API_ID);
		updateEndpoint(endpoint.id, { method: 'POST', description: 'Create user' });

		const updated = getEndpointById(endpoint.id);
		expect(updated?.method).toBe('POST');
		expect(updated?.description).toBe('Create user');
	});

	it('should duplicate an endpoint with new IDs', () => {
		const original = createDefaultEndpoint(TEST_API_ID);
		updateEndpoint(original.id, {
			path: '/users/{user_id}',
			pathParams: [{ name: 'user_id', fieldId: '' }],
			queryParamsObjectId: 'eeeeeeee-0000-0000-0000-000000000001'
		});

		const duplicated = duplicateEndpoint(original.id);

		expect(duplicated).toBeDefined();
		expect(duplicated!.id).not.toBe(original.id);
		expect(duplicated!.path).toBe('/users/{user_id}-copy');
		expect(duplicated!.pathParams[0].name).toBe('user_id');
		expect(duplicated!.pathParams[0].fieldId).toBe('');
		expect(duplicated!.queryParamsObjectId).toBe('eeeeeeee-0000-0000-0000-000000000001');
	});

	it('should delete an endpoint', () => {
		const endpoint = createDefaultEndpoint(TEST_API_ID);
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

		createDefaultEndpoint(TEST_API_ID);
		createDefaultEndpoint(TEST_API_ID);

		expect(getTotalEndpointCount()).toBe(2);
	});
});

describe('apis store - Path Parameter Operations', () => {
	beforeEach(() => {
		apisStore.set([createMockApi({ id: TEST_API_ID })]);
		endpointsStore.set([]);
		seedIdGenerator({ counter: 0 });
	});

	it('should update endpoint path and extract path parameters', () => {
		const endpoint = createDefaultEndpoint(TEST_API_ID);

		const updated = updateEndpointPath(endpoint.id, '/users/{user_id}/posts/{post_id}');

		expect(updated?.path).toBe('/users/{user_id}/posts/{post_id}');
		expect(updated?.pathParams).toHaveLength(2);
		expect(updated?.pathParams[0].name).toBe('user_id');
		expect(updated?.pathParams[0].fieldId).toBeDefined();
		expect(updated?.pathParams[1].name).toBe('post_id');
	});

	it('should normalize path to start with /', () => {
		const endpoint = createDefaultEndpoint(TEST_API_ID);

		const updated = updateEndpointPath(endpoint.id, 'users');

		expect(updated?.path).toBe('/users');
	});

	it('should preserve existing fieldId when path changes', () => {
		const endpoint = createDefaultEndpoint(TEST_API_ID);

		// Set initial path with parameters
		updateEndpointPath(endpoint.id, '/users/{user_id}');

		// Update the parameter with a fieldId
		updatePathParameter(endpoint.id, 'user_id', 'field-123');

		// Change path to add more parameters
		const updated = updateEndpointPath(endpoint.id, '/users/{user_id}/posts/{post_id}')!;

		// Original parameter should preserve its fieldId
		expect(updated.pathParams[0].name).toBe('user_id');
		expect(updated.pathParams[0].fieldId).toBe('field-123');

		// New parameter should have empty fieldId (or auto-matched)
		expect(updated.pathParams[1].name).toBe('post_id');
	});

	it('should remove parameters when they are removed from path', () => {
		const endpoint = createDefaultEndpoint(TEST_API_ID);

		// Set path with two parameters
		updateEndpointPath(endpoint.id, '/users/{user_id}/posts/{post_id}');

		// Change path to have only one parameter
		const updated = updateEndpointPath(endpoint.id, '/users/{user_id}');

		expect(updated?.pathParams).toHaveLength(1);
		expect(updated?.pathParams[0].name).toBe('user_id');
	});

	it('should update a path parameter fieldId', () => {
		const endpoint = createDefaultEndpoint(TEST_API_ID);
		updateEndpointPath(endpoint.id, '/users/{user_id}');

		updatePathParameter(endpoint.id, 'user_id', 'field-abc');

		const result = getEndpointById(endpoint.id);
		expect(result?.pathParams[0].fieldId).toBe('field-abc');
	});
});


describe('apis store - Legacy Functions', () => {
	beforeEach(() => {
		apisStore.set([createMockApi({ id: TEST_API_ID })]);
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
