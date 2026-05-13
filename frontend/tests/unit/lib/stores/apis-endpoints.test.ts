/**
 * API Generator Page Integration Tests
 *
 * Integration tests that verify the API generator page's data layer
 * works correctly with endpoint management and tag tracking.
 *
 * NOTE: Tags are now derived from endpoint tagName values (not stored on API).
 * Endpoints reference tags by name (tagName string).
 *
 * Location mirrors: src/routes/api-generator/+page.svelte
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
	apisStore,
	endpointsStore,
	getTotalEndpointCount,
	getEndpointCountByTagName
} from '$lib/stores/stores';
import { createMockEndpoint, createMockApi } from '../../../shared/testUtils';

const TEST_API_ID = 'cccccccc-0000-0000-0000-000000000001';

describe('API Generator Page - Store Integration', () => {
	// Reset stores before each test
	beforeEach(() => {
		apisStore.set([createMockApi({ id: TEST_API_ID })]);
		endpointsStore.set([]);
	});

	describe('Tag Tracking (Derived from Endpoints)', () => {
		it('counts endpoints using a specific tag by name', () => {
			endpointsStore.set([
				createMockEndpoint({ id: 'ep-1', path: '/users', tagName: 'Users' }),
				createMockEndpoint({ id: 'ep-2', method: 'POST', path: '/users', tagName: 'Users' }),
				createMockEndpoint({ id: 'ep-3', path: '/posts', tagName: undefined })
			]);

			expect(getEndpointCountByTagName(TEST_API_ID, 'Users')).toBe(2);
		});

		it('derives unique tags from endpoint tagName values', () => {
			endpointsStore.set([
				createMockEndpoint({ id: 'ep-1', path: '/users', tagName: 'Users' }),
				createMockEndpoint({ id: 'ep-2', method: 'POST', path: '/users', tagName: 'Users' }),
				createMockEndpoint({ id: 'ep-3', path: '/posts', tagName: 'Posts' }),
				createMockEndpoint({ id: 'ep-4', path: '/health', tagName: undefined })
			]);

			const endpoints = get(endpointsStore);
			const uniqueTags = [...new Set(endpoints.map(e => e.tagName).filter(Boolean))];

			expect(uniqueTags).toHaveLength(2);
			expect(uniqueTags).toContain('Users');
			expect(uniqueTags).toContain('Posts');
		});
	});

	describe('Endpoint Management', () => {
		it('adds endpoints to store correctly', () => {
			const endpoint = createMockEndpoint({
				path: '/users',
				description: 'Get all users'
			});

			endpointsStore.set([endpoint]);

			const endpoints = get(endpointsStore);
			expect(endpoints).toHaveLength(1);
			expect(endpoints[0]).toEqual(endpoint);
		});

		it('updates endpoint properties including tagName', () => {
			const endpoint = createMockEndpoint({ path: '/users' });
			endpointsStore.set([endpoint]);

			// Update endpoint to set tag name
			endpointsStore.update(eps =>
				eps.map(e => e.id === endpoint.id ? { ...e, tagName: 'Users' } : e)
			);

			const endpoints = get(endpointsStore);
			expect(endpoints[0].tagName).toBe('Users');
		});

		it('tracks endpoint count correctly', () => {
			expect(getTotalEndpointCount()).toBe(0);

			endpointsStore.set([createMockEndpoint({ path: '/users' })]);

			expect(getTotalEndpointCount()).toBe(1);
		});
	});

	describe('Undo Functionality - Tag Synchronization', () => {
		it('restores original tagName when undoing changes', () => {
			const originalEndpoint = createMockEndpoint({
				path: '/users',
				description: 'Get users',
				tagName: 'Users'
			});

			endpointsStore.set([originalEndpoint]);

			// Simulate user editing: change tag to Posts
			endpointsStore.update(eps =>
				eps.map(e => e.id === originalEndpoint.id ? { ...e, tagName: 'Posts' } : e)
			);

			// Verify the change was applied
			let endpoints = get(endpointsStore);
			expect(endpoints[0].tagName).toBe('Posts');

			// Simulate undo: restore to original state
			endpointsStore.update(eps =>
				eps.map(e => e.id === originalEndpoint.id ? { ...originalEndpoint } : e)
			);

			// Verify the original tagName is restored
			endpoints = get(endpointsStore);
			expect(endpoints[0].tagName).toBe('Users');
		});

		it('restores tagName to undefined when undoing tag assignment', () => {
			const originalEndpoint = createMockEndpoint({
				path: '/users',
				tagName: undefined
			});

			endpointsStore.set([originalEndpoint]);

			// Simulate user editing: assign a tag
			endpointsStore.update(eps =>
				eps.map(e => e.id === originalEndpoint.id ? { ...e, tagName: 'Users' } : e)
			);

			// Verify tag was assigned
			let endpoints = get(endpointsStore);
			expect(endpoints[0].tagName).toBe('Users');

			// Simulate undo: restore to no tag
			endpointsStore.update(eps =>
				eps.map(e => e.id === originalEndpoint.id ? { ...originalEndpoint } : e)
			);

			// Verify tagName is back to undefined
			endpoints = get(endpointsStore);
			expect(endpoints[0].tagName).toBeUndefined();
		});
	});

	describe('Store Data Structure', () => {
		it('endpoints have required properties', () => {
			const endpoint = createMockEndpoint({
				method: 'POST',
				path: '/users',
				description: 'Create user'
			});

			endpointsStore.set([endpoint]);

			const endpoints = get(endpointsStore);
			expect(endpoints[0]).toHaveProperty('id');
			expect(endpoints[0]).toHaveProperty('method');
			expect(endpoints[0]).toHaveProperty('path');
			expect(endpoints[0]).toHaveProperty('description');
			expect(endpoints[0]).toHaveProperty('pathParams');
			expect(endpoints[0]).toHaveProperty('queryParamsObjectId');
			expect(endpoints[0]).toHaveProperty('objectId');
			expect(endpoints[0]).toHaveProperty('useEnvelope');
			expect(endpoints[0]).toHaveProperty('responseShape');
		});
	});

	describe('Tag-Endpoint Relationships', () => {
		it('allows multiple endpoints to share the same tag', () => {
			endpointsStore.set([
				createMockEndpoint({ id: 'ep-1', path: '/users', tagName: 'Users' }),
				createMockEndpoint({ id: 'ep-2', method: 'POST', path: '/users', tagName: 'Users' })
			]);

			const endpoints = get(endpointsStore);
			expect(endpoints.filter(e => e.tagName === 'Users')).toHaveLength(2);
		});

		it('clearing tagName removes endpoint from tag group', () => {
			endpointsStore.set([
				createMockEndpoint({ id: 'ep-1', path: '/users', tagName: 'Users' })
			]);

			endpointsStore.update(eps =>
				eps.map(e => e.id === 'ep-1' ? { ...e, tagName: undefined } : e)
			);

			const endpoints = get(endpointsStore);
			expect(endpoints[0].tagName).toBeUndefined();
			expect(getEndpointCountByTagName(TEST_API_ID, 'Users')).toBe(0);
		});
	});
});
