import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
	apiMetadataStore,
	tagsStore,
	endpointsStore,
	updateApiMetadata,
	getTagById,
	getEndpointById,
	getEndpointCountByTag,
	getTotalEndpointCount,
	getTotalTagCount,
	createTag,
	addTag,
	updateTag,
	deleteTagWithCleanup,
	deleteTag,
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
import type { EndpointTag } from '$lib/types';
import { createMockEndpoint } from '../../../shared/testUtils';

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

describe('apis store - Tag Operations', () => {
	beforeEach(() => {
		// Reset stores and ID generator
		tagsStore.set([]);
		endpointsStore.set([]);
		seedIdGenerator({ counter: 0, timestamp: 1000000 });
	});

	it('should create a new tag with uniqueness guard', () => {
		const tag = createTag('Users', 'User management');

		expect(tag).toBeDefined();
		expect(tag?.id).toBe('tag-1000000-0');
		expect(tag?.name).toBe('Users');
		expect(tag?.description).toBe('User management');

		const tags = get(tagsStore);
		expect(tags).toHaveLength(1);
	});

	it('should prevent duplicate tag creation (case-insensitive)', () => {
		createTag('Users');
		const duplicate = createTag('users');

		expect(duplicate).toBeUndefined();

		const tags = get(tagsStore);
		expect(tags).toHaveLength(1);
	});

	it('should trim tag names', () => {
		const tag = createTag('  Users  ');

		expect(tag?.name).toBe('Users');
	});

	it('should get tag by ID', () => {
		const created = createTag('Users');
		const found = getTagById(created!.id);

		expect(found).toEqual(created);
	});

	it('should return undefined for non-existent tag', () => {
		const found = getTagById('non-existent');

		expect(found).toBeUndefined();
	});

	it('should update a tag', () => {
		const tag = createTag('Users');
		updateTag(tag!.id, { description: 'Updated description' });

		const updated = getTagById(tag!.id);
		expect(updated?.description).toBe('Updated description');
	});

	it('should delete tag and detach from endpoints', () => {
		const tag = createTag('Users')!;

		// Create endpoints using this tag
		const endpoint1 = createDefaultEndpoint();
		updateEndpoint(endpoint1.id, { tagId: tag.id });

		const endpoint2 = createDefaultEndpoint();
		updateEndpoint(endpoint2.id, { tagId: tag.id });

		const result = deleteTagWithCleanup(tag.id);

		expect(result.success).toBe(true);
		expect(result.error).toContain('deleted and removed from 2 endpoints');

		// Tag should be deleted
		expect(getTagById(tag.id)).toBeUndefined();

		// Endpoints should have tagId cleared
		expect(getEndpointById(endpoint1.id)?.tagId).toBeUndefined();
		expect(getEndpointById(endpoint2.id)?.tagId).toBeUndefined();
	});

	it('should handle deleting tag with no endpoints', () => {
		const tag = createTag('Users')!;
		const result = deleteTagWithCleanup(tag.id);

		expect(result.success).toBe(true);
		expect(result.error).toBe('Tag "Users" deleted');
	});

	it('should handle deleting non-existent tag', () => {
		const result = deleteTagWithCleanup('non-existent');

		expect(result.success).toBe(false);
		expect(result.error).toContain('not found');
	});

	it('should count total tags', () => {
		expect(getTotalTagCount()).toBe(0);

		createTag('Users');
		createTag('Posts');

		expect(getTotalTagCount()).toBe(2);
	});
});

describe('apis store - Endpoint Operations', () => {
	beforeEach(() => {
		endpointsStore.set([]);
		tagsStore.set([]);
		seedIdGenerator({ counter: 0, timestamp: 1000000 });
	});

	it('should create a default endpoint', () => {
		const endpoint = createDefaultEndpoint();

		expect(endpoint.id).toBe('endpoint-1000000-0');
		expect(endpoint.method).toBe('GET');
		expect(endpoint.path).toBe('/');
		expect(endpoint.pathParams).toHaveLength(0);
		expect(endpoint.queryParamsObjectId).toBeUndefined();

		const endpoints = get(endpointsStore);
		expect(endpoints).toHaveLength(1);
	});

	it('should get endpoint by ID', () => {
		const created = createDefaultEndpoint();
		const found = getEndpointById(created.id);

		expect(found).toEqual(created);
	});

	it('should count endpoints by tag', () => {
		const tag = createTag('Users')!;

		expect(getEndpointCountByTag(tag.id)).toBe(0);

		const endpoint1 = createDefaultEndpoint();
		updateEndpoint(endpoint1.id, { tagId: tag.id });

		expect(getEndpointCountByTag(tag.id)).toBe(1);

		const endpoint2 = createDefaultEndpoint();
		updateEndpoint(endpoint2.id, { tagId: tag.id });

		expect(getEndpointCountByTag(tag.id)).toBe(2);
	});

	it('should update an endpoint', () => {
		const endpoint = createDefaultEndpoint();
		updateEndpoint(endpoint.id, { method: 'POST', description: 'Create user' });

		const updated = getEndpointById(endpoint.id);
		expect(updated?.method).toBe('POST');
		expect(updated?.description).toBe('Create user');
	});

	it('should duplicate an endpoint with new IDs', () => {
		const original = createDefaultEndpoint();
		updateEndpoint(original.id, {
			path: '/users/{user_id}',
			pathParams: [{ id: 'param-1', name: 'user_id', type: 'integer', description: '', required: true }],
			queryParamsObjectId: 'object-123'
		});

		const duplicated = duplicateEndpoint(original.id);

		expect(duplicated).toBeDefined();
		expect(duplicated!.id).not.toBe(original.id);
		expect(duplicated!.path).toBe('/users/{user_id}-copy');
		expect(duplicated!.pathParams[0].id).not.toBe('param-1');
		expect(duplicated!.queryParamsObjectId).toBe('object-123');

		// Original should be unchanged
		const originalCheck = getEndpointById(original.id);
		expect(originalCheck?.pathParams[0].id).toBe('param-1');
	});

	it('should delete an endpoint', () => {
		const endpoint = createDefaultEndpoint();
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

		createDefaultEndpoint();
		createDefaultEndpoint();

		expect(getTotalEndpointCount()).toBe(2);
	});
});

describe('apis store - Path Parameter Operations', () => {
	beforeEach(() => {
		endpointsStore.set([]);
		seedIdGenerator({ counter: 0, timestamp: 1000000 });
	});

	it('should update endpoint path and extract path parameters', () => {
		const endpoint = createDefaultEndpoint();

		const updated = updateEndpointPath(endpoint.id, '/users/{user_id}/posts/{post_id}');

		expect(updated?.path).toBe('/users/{user_id}/posts/{post_id}');
		expect(updated?.pathParams).toHaveLength(2);
		expect(updated?.pathParams[0].name).toBe('user_id');
		expect(updated?.pathParams[0].required).toBe(true);
		expect(updated?.pathParams[1].name).toBe('post_id');
	});

	it('should normalize path to start with /', () => {
		const endpoint = createDefaultEndpoint();

		const updated = updateEndpointPath(endpoint.id, 'users');

		expect(updated?.path).toBe('/users');
	});

	it('should preserve existing parameter definitions when path changes', () => {
		const endpoint = createDefaultEndpoint();

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
		const endpoint = createDefaultEndpoint();

		// Set path with two parameters
		updateEndpointPath(endpoint.id, '/users/{user_id}/posts/{post_id}');

		// Change path to have only one parameter
		const updated = updateEndpointPath(endpoint.id, '/users/{user_id}');

		expect(updated?.pathParams).toHaveLength(1);
		expect(updated?.pathParams[0].name).toBe('user_id');
	});

	it('should update a path parameter', () => {
		const endpoint = createDefaultEndpoint();
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
		const endpoint = createDefaultEndpoint();
		const updated = updateEndpointPath(endpoint.id, '/users/{user_id}')!;

		const paramId = updated.pathParams[0].id;
		deletePathParameter(endpoint.id, paramId);

		const result = getEndpointById(endpoint.id);
		expect(result?.pathParams).toHaveLength(0);
	});
});


describe('apis store - Legacy Functions', () => {
	beforeEach(() => {
		tagsStore.set([]);
		endpointsStore.set([]);
	});

	it('should support legacy addTag function', () => {
		const tag: EndpointTag = {
			id: 'custom-id',
			name: 'Custom',
			description: 'Test'
		};

		addTag(tag);

		const tags = get(tagsStore);
		expect(tags).toHaveLength(1);
		expect(tags[0]).toEqual(tag);
	});

	it('should support legacy deleteTag function', () => {
		const tag: EndpointTag = {
			id: 'test-id',
			name: 'Test',
			description: ''
		};

		addTag(tag);
		deleteTag(tag.id);

		expect(getTagById(tag.id)).toBeUndefined();
	});

	it('should support legacy addEndpoint function', () => {
		const endpoint = createMockEndpoint({
			id: 'custom-endpoint',
			method: 'POST',
			path: '/test',
			description: 'Test endpoint',
			tagId: undefined
		});

		addEndpoint(endpoint);

		const endpoints = get(endpointsStore);
		expect(endpoints).toHaveLength(1);
		expect(endpoints[0]).toEqual(endpoint);
	});
});
