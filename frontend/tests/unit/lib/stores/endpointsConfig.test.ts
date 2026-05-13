// tests/unit/lib/stores/endpointsConfig.test.ts
//
// Unit tests for shared endpoint CRUD configuration helpers.

import { describe, it, expect } from 'vitest';
import type { ApiEndpoint, Field, ObjectDefinition } from '$lib/types';
import {
	applyEndpointUpdate,
	createEndpointDraft,
	hydrateStoredEndpoint,
	toCreateEndpointPayload,
	toDuplicateEndpointPayload,
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
		pathParams: [],
		queryParams: [],
		queryParamsObjectId: undefined,
		objectId: undefined,
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
			objectId: 'obj-1',
			queryParamsObjectId: 'obj-2'
		});

		expect(toCreateEndpointPayload(endpoint)).toEqual(
			expect.objectContaining({
				apiId: 'api-1',
				tagName: 'users',
				objectId: 'obj-1',
				queryParamsObjectId: 'obj-2'
			})
		);
	});

	it('maps endpoint draft to update payload with nulls for cleared optional fields', () => {
		const endpoint = makeEndpoint();

		expect(toUpdateEndpointPayload(endpoint)).toEqual(
			expect.objectContaining({
				tagName: null,
				objectId: null,
				queryParamsObjectId: null
			})
		);
	});

	it('applies endpoint update payload back onto frontend shape', () => {
		const updated = applyEndpointUpdate(
			makeEndpoint({
				tagName: 'users',
				objectId: 'obj-1',
				queryParamsObjectId: 'obj-2'
			}),
			{
				path: '/users/v2',
				tagName: null,
				objectId: null,
				queryParamsObjectId: null
			}
		);

		expect(updated.path).toBe('/users/v2');
		expect(updated.tagName).toBeUndefined();
		expect(updated.objectId).toBeUndefined();
		expect(updated.queryParamsObjectId).toBeUndefined();
	});

	it('hydrates stored endpoint path param names from the target object', () => {
		const field: Field = {
			id: 'field-1',
			namespaceId: 'ns-1',
			name: 'user_id',
			type: 'uuid',
			container: null,
			constraints: [],
			validators: [],
			usedInApis: [],
			description: '',
			defaultValue: ''
		};
		const object: ObjectDefinition = {
			id: 'obj-1',
			namespaceId: 'ns-1',
			name: 'User',
			description: '',
			members: [
				{
					id: 'member-1',
					memberType: 'scalar',
					name: 'user_id',
					fieldId: 'field-1',
					role: 'pk',
					isNullable: false
				}
			],
			derivedRelationships: [],
			validators: [],
			usedInApis: []
		};

		const hydrated = hydrateStoredEndpoint(
			makeEndpoint({
				objectId: 'obj-1',
				pathParams: [{ name: 'user_id', fieldId: 'field-1', field: '' }]
			}),
			[object],
			[field]
		);

		expect(hydrated.pathParams[0].field).toBe('user_id');
	});

	it('builds duplicate create payload from an existing endpoint', () => {
		const payload = toDuplicateEndpointPayload(
			makeEndpoint({
				path: '/users',
				queryParams: [{ name: 'status', field: 'status', operator: 'eq' }]
			})
		);

		expect(payload.path).toBe('/users-copy');
		expect(payload.queryParams).toEqual([{ name: 'status', field: 'status', operator: 'eq' }]);
	});
});
