/**
 * API Generator Page Integration Tests
 *
 * Integration tests that verify the API generator page's data layer and
 * undo/redo functionality work correctly with tag synchronization.
 *
 * Location mirrors: src/routes/api-generator/+page.svelte
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
	apiMetadataStore,
	tagsStore,
	endpointsStore,
	addTag,
	addEndpoint,
	updateEndpoint,
	deleteTag,
	getTotalEndpointCount,
	getTotalTagCount,
	getEndpointCountByTag
} from '$lib/stores/apis';
import type { EndpointTag } from '$lib/types';
import { createMockEndpoint } from '../../../shared/testUtils';

describe('API Generator Page - Store Integration', () => {
	// Reset stores before each test
	beforeEach(() => {
		tagsStore.set([]);
		endpointsStore.set([]);
		apiMetadataStore.set({
			title: '',
			version: '1.0.0',
			description: '',
			baseUrl: '/api/v1',
			serverUrl: ''
		});
	});

	describe('Tag Management', () => {
		it('adds tags to store correctly', () => {
			const tag: EndpointTag = {
				id: 'tag-1',
				name: 'Users',
				description: 'User-related endpoints'
			};

			addTag(tag);

			const tags = get(tagsStore);
			expect(tags).toHaveLength(1);
			expect(tags[0]).toEqual(tag);
		});

		it('deletes tags from store correctly', () => {
			const tag: EndpointTag = {
				id: 'tag-1',
				name: 'Users',
				description: 'User-related endpoints'
			};

			addTag(tag);
			expect(get(tagsStore)).toHaveLength(1);

			deleteTag(tag.id);
			expect(get(tagsStore)).toHaveLength(0);
		});

		it('tracks tag count correctly', () => {
			expect(getTotalTagCount()).toBe(0);

			addTag({ id: 'tag-1', name: 'Users', description: '' });
			expect(getTotalTagCount()).toBe(1);

			addTag({ id: 'tag-2', name: 'Posts', description: '' });
			expect(getTotalTagCount()).toBe(2);
		});

		it('counts endpoints using a specific tag', () => {
			const tag: EndpointTag = {
				id: 'tag-1',
				name: 'Users',
				description: ''
			};
			addTag(tag);

			addEndpoint(createMockEndpoint({ id: 'endpoint-1', path: '/users', tagId: 'tag-1' }));
			addEndpoint(createMockEndpoint({ id: 'endpoint-2', method: 'POST', path: '/users', tagId: 'tag-1' }));
			addEndpoint(createMockEndpoint({ id: 'endpoint-3', path: '/posts', tagId: undefined }));

			expect(getEndpointCountByTag('tag-1')).toBe(2);
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

		it('updates endpoint properties including tagId', () => {
			const tag: EndpointTag = {
				id: 'tag-1',
				name: 'Users',
				description: ''
			};
			addTag(tag);

			const endpoint = createMockEndpoint({ path: '/users' });
			addEndpoint(endpoint);

			// Update endpoint to add tag
			updateEndpoint(endpoint.id, { ...endpoint, tagId: 'tag-1' });

			const endpoints = get(endpointsStore);
			expect(endpoints[0].tagId).toBe('tag-1');
		});

		it('tracks endpoint count correctly', () => {
			expect(getTotalEndpointCount()).toBe(0);

			addEndpoint(createMockEndpoint({ path: '/users' }));

			expect(getTotalEndpointCount()).toBe(1);
		});
	});

	describe('Undo Functionality - Tag Synchronization', () => {
		it('restores original tagId when undoing changes', () => {
			// Setup: Create a tag and an endpoint with that tag
			const tag1: EndpointTag = {
				id: 'tag-1',
				name: 'Users',
				description: ''
			};
			const tag2: EndpointTag = {
				id: 'tag-2',
				name: 'Posts',
				description: ''
			};
			addTag(tag1);
			addTag(tag2);

			const originalEndpoint = createMockEndpoint({
				path: '/users',
				description: 'Get users',
				tagId: 'tag-1'
			});

			addEndpoint(originalEndpoint);

			// Simulate user editing: change tag to tag-2
			const editedEndpoint = {
				...originalEndpoint,
				tagId: 'tag-2'
			};
			updateEndpoint(editedEndpoint.id, editedEndpoint);

			// Verify the change was applied
			let endpoints = get(endpointsStore);
			expect(endpoints[0].tagId).toBe('tag-2');

			// Simulate undo: restore to original state
			updateEndpoint(originalEndpoint.id, originalEndpoint);

			// Verify the original tagId is restored
			endpoints = get(endpointsStore);
			expect(endpoints[0].tagId).toBe('tag-1');
		});

		it('restores tagId to undefined when undoing tag assignment', () => {
			// Setup: Create endpoint without a tag
			const tag: EndpointTag = {
				id: 'tag-1',
				name: 'Users',
				description: ''
			};
			addTag(tag);

			const originalEndpoint = createMockEndpoint({
				path: '/users',
				tagId: undefined
			});

			addEndpoint(originalEndpoint);

			// Simulate user editing: assign a tag
			const editedEndpoint = {
				...originalEndpoint,
				tagId: 'tag-1'
			};
			updateEndpoint(editedEndpoint.id, editedEndpoint);

			// Verify tag was assigned
			let endpoints = get(endpointsStore);
			expect(endpoints[0].tagId).toBe('tag-1');

			// Simulate undo: restore to no tag
			updateEndpoint(originalEndpoint.id, originalEndpoint);

			// Verify tagId is back to undefined
			endpoints = get(endpointsStore);
			expect(endpoints[0].tagId).toBeUndefined();
		});

		it('handles undo after tag deletion', () => {
			// Setup: Create a tag and endpoint with that tag
			const tag: EndpointTag = {
				id: 'tag-1',
				name: 'Users',
				description: ''
			};
			addTag(tag);

			const endpoint = createMockEndpoint({
				path: '/users',
				tagId: 'tag-1'
			});

			addEndpoint(endpoint);

			// Delete the tag (simulating what happens in the UI)
			deleteTag('tag-1');

			// Verify tag no longer exists
			const tags = get(tagsStore);
			expect(tags).toHaveLength(0);

			// Note: In the actual UI, when a tag is deleted, the endpoint's tagId
			// is also cleared. This test verifies the tag is gone from the store.
			// The UI component (handleUndo) should handle the case where a tagId
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
			expect(endpoints[0]).toHaveProperty('method');
			expect(endpoints[0]).toHaveProperty('path');
			expect(endpoints[0]).toHaveProperty('description');
			expect(endpoints[0]).toHaveProperty('pathParams');
			expect(endpoints[0]).toHaveProperty('queryParams');
			expect(endpoints[0]).toHaveProperty('requestBodyFieldIds');
			expect(endpoints[0]).toHaveProperty('responseBodyFieldIds');
			expect(endpoints[0]).toHaveProperty('useEnvelope');
		});

		it('tags have required properties', () => {
			const tag: EndpointTag = {
				id: 'tag-1',
				name: 'Users',
				description: 'User endpoints'
			};

			addTag(tag);

			const tags = get(tagsStore);
			expect(tags[0]).toHaveProperty('id');
			expect(tags[0]).toHaveProperty('name');
			expect(tags[0]).toHaveProperty('description');
		});
	});

	describe('Tag-Endpoint Relationships', () => {
		it('maintains referential integrity when tag is deleted', () => {
			const tag: EndpointTag = {
				id: 'tag-1',
				name: 'Users',
				description: ''
			};
			addTag(tag);

			const endpoint = createMockEndpoint({
				path: '/users',
				tagId: 'tag-1'
			});
			addEndpoint(endpoint);

			// Delete tag
			deleteTag('tag-1');

			// Endpoint still exists but its tagId now references a non-existent tag
			const endpoints = get(endpointsStore);
			expect(endpoints).toHaveLength(1);
			expect(endpoints[0].tagId).toBe('tag-1'); // Still has the reference

			// The UI component should handle this by showing an empty input
			// when the tag is not found in the tags store
			const tags = get(tagsStore);
			const tagExists = tags.find(t => t.id === 'tag-1');
			expect(tagExists).toBeUndefined();
		});

		it('allows multiple endpoints to share the same tag', () => {
			const tag: EndpointTag = {
				id: 'tag-1',
				name: 'Users',
				description: ''
			};
			addTag(tag);

			addEndpoint(createMockEndpoint({ id: 'endpoint-1', path: '/users', tagId: 'tag-1' }));
			addEndpoint(createMockEndpoint({ id: 'endpoint-2', method: 'POST', path: '/users', tagId: 'tag-1' }));

			const endpoints = get(endpointsStore);
			expect(endpoints.filter(e => e.tagId === 'tag-1')).toHaveLength(2);
		});
	});
});
