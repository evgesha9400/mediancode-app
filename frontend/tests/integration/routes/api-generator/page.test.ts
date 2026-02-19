/**
 * API Generator Page Integration Tests
 *
 * Integration tests that verify the API generator page's data layer and
 * undo/redo functionality work correctly with tag synchronization.
 *
 * NOTE: Tags are now embedded in APIs (not separate entities).
 * Endpoints reference tags by name (tagName) instead of ID (tagId).
 *
 * Location mirrors: src/routes/api-generator/+page.svelte
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
	apiMetadataStore,
	apisStore,
	endpointsStore,
	addEndpoint,
	updateEndpoint,
	getTotalEndpointCount,
	initialApiMetadata,
	addTagToApi,
	deleteTagFromApi,
	getTagByName,
	getEndpointCountByTagName,
	createApi
} from '$lib/stores/apis';
import type { ApiTag } from '$lib/types';
import { createMockEndpoint, createMockApi } from '../../../shared/testUtils';
import { GLOBAL_NAMESPACE_ID } from '$lib/stores/initialData';

const TEST_API_ID = 'api-test-1';

describe('API Generator Page - Store Integration', () => {
	// Reset stores before each test
	beforeEach(() => {
		apisStore.set([createMockApi({ id: TEST_API_ID, tags: [] })]);
		endpointsStore.set([]);
		apiMetadataStore.set(initialApiMetadata);
	});

	describe('Tag Management (Embedded in API)', () => {
		it('adds tags to API correctly', () => {
			const tag = addTagToApi(TEST_API_ID, 'Users', 'User-related endpoints');

			expect(tag).toBeDefined();
			expect(tag?.name).toBe('Users');
			expect(tag?.description).toBe('User-related endpoints');

			const api = get(apisStore).find(a => a.id === TEST_API_ID);
			expect(api?.tags).toHaveLength(1);
			expect(api?.tags[0]).toEqual(tag);
		});

		it('deletes tags from API correctly', () => {
			addTagToApi(TEST_API_ID, 'Users', 'User-related endpoints');
			const api = get(apisStore).find(a => a.id === TEST_API_ID);
			expect(api?.tags).toHaveLength(1);

			deleteTagFromApi(TEST_API_ID, 'Users');

			const updatedApi = get(apisStore).find(a => a.id === TEST_API_ID);
			expect(updatedApi?.tags).toHaveLength(0);
		});

		it('tracks tag count in API correctly', () => {
			const api = get(apisStore).find(a => a.id === TEST_API_ID);
			expect(api?.tags.length).toBe(0);

			addTagToApi(TEST_API_ID, 'Users', '');
			expect(get(apisStore).find(a => a.id === TEST_API_ID)?.tags.length).toBe(1);

			addTagToApi(TEST_API_ID, 'Posts', '');
			expect(get(apisStore).find(a => a.id === TEST_API_ID)?.tags.length).toBe(2);
		});

		it('counts endpoints using a specific tag by name', () => {
			addTagToApi(TEST_API_ID, 'Users', '');

			addEndpoint(createMockEndpoint({ id: 'endpoint-1', path: '/users', tagName: 'Users' }));
			addEndpoint(createMockEndpoint({ id: 'endpoint-2', method: 'POST', path: '/users', tagName: 'Users' }));
			addEndpoint(createMockEndpoint({ id: 'endpoint-3', path: '/posts', tagName: undefined }));

			expect(getEndpointCountByTagName(TEST_API_ID, 'Users')).toBe(2);
		});
	});

	describe('Endpoint Management', () => {
		it('adds endpoints to store correctly', () => {
			const endpoint = createMockEndpoint({
				path: '/users',
				description: 'Get all users'
			});

			addEndpoint(endpoint);

			const endpoints = get(endpointsStore);
			expect(endpoints).toHaveLength(1);
			expect(endpoints[0]).toEqual(endpoint);
		});

		it('updates endpoint properties including tagName', () => {
			addTagToApi(TEST_API_ID, 'Users', '');

			const endpoint = createMockEndpoint({ path: '/users' });
			addEndpoint(endpoint);

			// Update endpoint to add tag by name
			updateEndpoint(endpoint.id, { ...endpoint, tagName: 'Users' });

			const endpoints = get(endpointsStore);
			expect(endpoints[0].tagName).toBe('Users');
		});

		it('tracks endpoint count correctly', () => {
			expect(getTotalEndpointCount()).toBe(0);

			addEndpoint(createMockEndpoint({ path: '/users' }));

			expect(getTotalEndpointCount()).toBe(1);
		});
	});

	describe('Undo Functionality - Tag Synchronization', () => {
		it('restores original tagName when undoing changes', () => {
			// Setup: Create tags and an endpoint with a tag
			addTagToApi(TEST_API_ID, 'Users', '');
			addTagToApi(TEST_API_ID, 'Posts', '');

			const originalEndpoint = createMockEndpoint({
				path: '/users',
				description: 'Get users',
				tagName: 'Users'
			});

			addEndpoint(originalEndpoint);

			// Simulate user editing: change tag to Posts
			const editedEndpoint = {
				...originalEndpoint,
				tagName: 'Posts'
			};
			updateEndpoint(editedEndpoint.id, editedEndpoint);

			// Verify the change was applied
			let endpoints = get(endpointsStore);
			expect(endpoints[0].tagName).toBe('Posts');

			// Simulate undo: restore to original state
			updateEndpoint(originalEndpoint.id, originalEndpoint);

			// Verify the original tagName is restored
			endpoints = get(endpointsStore);
			expect(endpoints[0].tagName).toBe('Users');
		});

		it('restores tagName to undefined when undoing tag assignment', () => {
			// Setup: Create endpoint without a tag
			addTagToApi(TEST_API_ID, 'Users', '');

			const originalEndpoint = createMockEndpoint({
				path: '/users',
				tagName: undefined
			});

			addEndpoint(originalEndpoint);

			// Simulate user editing: assign a tag
			const editedEndpoint = {
				...originalEndpoint,
				tagName: 'Users'
			};
			updateEndpoint(editedEndpoint.id, editedEndpoint);

			// Verify tag was assigned
			let endpoints = get(endpointsStore);
			expect(endpoints[0].tagName).toBe('Users');

			// Simulate undo: restore to no tag
			updateEndpoint(originalEndpoint.id, originalEndpoint);

			// Verify tagName is back to undefined
			endpoints = get(endpointsStore);
			expect(endpoints[0].tagName).toBeUndefined();
		});

		it('handles undo after tag deletion', () => {
			// Setup: Create a tag and endpoint with that tag
			addTagToApi(TEST_API_ID, 'Users', '');

			const endpoint = createMockEndpoint({
				path: '/users',
				tagName: 'Users'
			});

			addEndpoint(endpoint);

			// Delete the tag (simulating what happens in the UI)
			deleteTagFromApi(TEST_API_ID, 'Users');

			// Verify tag no longer exists in API
			const api = get(apisStore).find(a => a.id === TEST_API_ID);
			expect(api?.tags).toHaveLength(0);

			// Note: In the actual UI, when a tag is deleted, the endpoint's tagName
			// is also cleared. This test verifies the tag is gone from the API.
			// The UI component (handleUndo) should handle the case where a tagName
			// references a non-existent tag by showing empty string in the input.
		});
	});

	describe('Store Data Structure', () => {
		it('endpoints have required properties', () => {
			const endpoint = createMockEndpoint({
				method: 'POST',
				path: '/users',
				description: 'Create user'
			});

			addEndpoint(endpoint);

			const endpoints = get(endpointsStore);
			expect(endpoints[0]).toHaveProperty('id');
			expect(endpoints[0]).toHaveProperty('namespaceId');
			expect(endpoints[0]).toHaveProperty('method');
			expect(endpoints[0]).toHaveProperty('path');
			expect(endpoints[0]).toHaveProperty('description');
			expect(endpoints[0]).toHaveProperty('pathParams');
			expect(endpoints[0]).toHaveProperty('queryParamsObjectId');
			expect(endpoints[0]).toHaveProperty('requestBodyObjectId');
			expect(endpoints[0]).toHaveProperty('responseBodyObjectId');
			expect(endpoints[0]).toHaveProperty('useEnvelope');
			expect(endpoints[0]).toHaveProperty('responseShape');
		});

		it('API tags have required properties', () => {
			const tag = addTagToApi(TEST_API_ID, 'Users', 'User endpoints');

			expect(tag).toHaveProperty('name');
			expect(tag).toHaveProperty('description');
			expect(tag?.name).toBe('Users');
			expect(tag?.description).toBe('User endpoints');
		});
	});

	describe('Tag-Endpoint Relationships', () => {
		it('maintains referential integrity when tag is deleted', () => {
			addTagToApi(TEST_API_ID, 'Users', '');

			const endpoint = createMockEndpoint({
				path: '/users',
				tagName: 'Users'
			});
			addEndpoint(endpoint);

			// Delete tag
			const result = deleteTagFromApi(TEST_API_ID, 'Users');
			expect(result.success).toBe(true);

			// Endpoint still exists but its tagName now references a non-existent tag
			const endpoints = get(endpointsStore);
			expect(endpoints).toHaveLength(1);
			// Note: The deleteTagFromApi function clears tagName from endpoints
			expect(endpoints[0].tagName).toBeUndefined();

			// Verify tag no longer exists in API
			const tag = getTagByName(TEST_API_ID, 'Users');
			expect(tag).toBeUndefined();
		});

		it('allows multiple endpoints to share the same tag', () => {
			addTagToApi(TEST_API_ID, 'Users', '');

			addEndpoint(createMockEndpoint({ id: 'endpoint-1', path: '/users', tagName: 'Users' }));
			addEndpoint(createMockEndpoint({ id: 'endpoint-2', method: 'POST', path: '/users', tagName: 'Users' }));

			const endpoints = get(endpointsStore);
			expect(endpoints.filter(e => e.tagName === 'Users')).toHaveLength(2);
		});
	});
});
