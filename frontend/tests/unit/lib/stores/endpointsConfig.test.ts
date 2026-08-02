// tests/unit/lib/stores/endpointsConfig.test.ts
//
// Unit tests for shared endpoint CRUD configuration helpers.

import { describe, it, expect } from 'vitest';
import type { ApiEndpoint } from '$lib/types';
import {
	applyEndpointUpdate,
	createEndpointDraft,
	hydrateStoredEndpoint,
	toCreateEndpointPayload,
	toUpdateEndpointPayload
} from '$lib/stores/endpointsConfig.svelte';

function makeEndpoint(overrides: Partial<ApiEndpoint> = {}): ApiEndpoint {
	return {
		id: 'ep-1',
		apiId: 'api-1',
		method: 'GET',
		path: '/users',
		description: '',
		tagName: undefined,
		targetObjectId: undefined,
		pathParams: [],
		queryParams: [],
		useEnvelope: true,
		responseShape: 'object',
		pagination: false,
		expanded: false,
		...overrides
	};
}

describe('endpointsConfig', () => {
	it('creates a default endpoint draft for an API', () => {
		expect(createEndpointDraft('api-9')).toEqual(
			expect.objectContaining({
				id: '',
				apiId: 'api-9',
				method: 'GET',
				path: '/',
				useEnvelope: true,
				responseShape: 'object',
				pagination: false
			})
		);
	});

	it('maps endpoint draft to create payload', () => {
		const endpoint = makeEndpoint({
			tagName: 'users',
			targetObjectId: 'obj-1'
		});

		expect(toCreateEndpointPayload(endpoint)).toEqual(
			expect.objectContaining({
				apiId: 'api-1',
				tagName: 'users',
				targetObjectId: 'obj-1'
			})
		);
	});

	it('maps endpoint draft to update payload with nulls for cleared optional fields', () => {
		const endpoint = makeEndpoint();

		expect(toUpdateEndpointPayload(endpoint)).toEqual(
			expect.objectContaining({
				tagName: null,
				targetObjectId: undefined
			})
		);
	});

	it('applies endpoint update payload back onto frontend shape', () => {
		const updated = applyEndpointUpdate(
			makeEndpoint({
				tagName: 'users',
				targetObjectId: 'obj-1'
			}),
			{
				path: '/users/v2',
				tagName: null,
				targetObjectId: undefined
			}
		);

		expect(updated.path).toBe('/users/v2');
		expect(updated.tagName).toBeUndefined();
		expect(updated.targetObjectId).toBeUndefined();
	});

	it('hydrates stored endpoint defaults', () => {
		const hydrated = hydrateStoredEndpoint(makeEndpoint({
			pathParams: [{ name: 'user_id', fieldMemberId: 'member-1' }],
			queryParams: [{ name: 'status', fieldMemberId: 'member-2', operator: 'eq' as any, required: undefined as any }]
		}));

		expect(hydrated.pathParams[0].fieldMemberId).toBe('member-1');
		expect(hydrated.queryParams[0].required).toBe(false);
	});

});
