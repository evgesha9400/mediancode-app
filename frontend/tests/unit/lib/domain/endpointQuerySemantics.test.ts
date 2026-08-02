import { describe, expect, it } from 'vitest';
import type { ApiEndpoint } from '$lib/types';
import {
	formatEndpointBlockReasons,
	getEndpointQueryAvailability,
	getEndpointQueryControls,
	getEndpointQueryDraft,
	getEndpointQueryIssues,
	prepareEndpointDuplicate,
	prepareEndpointSave,
	transitionEndpointDraft,
	type EndpointTarget
} from '$lib/domain/endpointQuerySemantics';

const endpointTarget: EndpointTarget = {
	status: 'found',
	objectId: 'obj-1',
	objectName: 'Product',
	fieldMembers: [
		{ id: 'member-id', name: 'id', type: 'uuid', isPrimary: true },
		{ id: 'member-store-id', name: 'store_id', type: 'uuid', isPrimary: false },
		{ id: 'member-status', name: 'status', type: 'str', isPrimary: false },
		{ id: 'member-price', name: 'price', type: 'float', isPrimary: false }
	]
};

const missingEndpointTarget: EndpointTarget = {
	status: 'missing',
	objectId: undefined,
	fieldMembers: []
};

function makeEndpoint(overrides: Partial<ApiEndpoint> = {}): ApiEndpoint {
	return {
		id: 'ep-1',
		apiId: 'api-1',
		method: 'GET',
		path: '/products',
		description: '',
		targetObjectId: 'obj-1',
		pathParams: [],
		queryParams: [],
		pagination: false,
		useEnvelope: true,
		responseShape: 'list',
		expanded: false,
		...overrides
	};
}

describe('getEndpointQueryDraft', () => {
	it('marks GET collection endpoints available when a target Object is selected and no path params exist', () => {
		const draft = getEndpointQueryDraft(
			makeEndpoint({ responseShape: 'object' }),
			endpointTarget
		);

		expect(draft.availability).toBe('available');
		expect(draft.endpoint.responseShape).toBe('list');
		expect(draft.controls.queryParameters.mode).toBe('editable');
		expect(draft.controls.pagination.mode).toBe('editable');
		expect(draft.controls.responseShape).toEqual({
			mode: 'locked',
			value: 'list',
			reason: 'Queryable endpoints return a list'
		});
		expect(draft.issues).toEqual([]);
	});

	it('keeps nested collection endpoints unresolved until path params are explicitly linked', () => {
		const endpoint = makeEndpoint({
			path: '/stores/{store_id}/products',
			pathParams: [{ name: 'store_id', fieldMemberId: '' }]
		});

		const draft = getEndpointQueryDraft(endpoint, endpointTarget);

		expect(draft.availability).toBe('unresolved');
		expect(draft.endpoint.pathParams).toEqual([{ name: 'store_id', fieldMemberId: '' }]);
		expect(draft.controls.queryParameters.mode).toBe('blocked');
		expect(draft.suggestions).toEqual([
			{
				type: 'linkPathParam',
				paramName: 'store_id',
				fieldMemberId: 'member-store-id',
				label: 'Link store_id to Product.store_id'
			}
		]);
	});

	it('marks nested collection endpoints available after explicit non-primary path links', () => {
		const draft = getEndpointQueryDraft(
			makeEndpoint({
				path: '/stores/{store_id}/products',
				pathParams: [{ name: 'store_id', fieldMemberId: 'member-store-id' }]
			}),
			endpointTarget
		);

		expect(draft.availability).toBe('available');
		expect(draft.endpoint.responseShape).toBe('list');
		expect(draft.controls.queryParameters.mode).toBe('editable');
	});

	it('keeps target primary-key paths unresolved until the final path param is explicitly linked', () => {
		const draft = getEndpointQueryDraft(
			makeEndpoint({
				path: '/products/{id}',
				pathParams: [{ name: 'id', fieldMemberId: '' }],
				queryParams: [{ name: 'status', fieldMemberId: 'member-status', operator: 'eq', required: false }],
				pagination: true
			}),
			endpointTarget
		);

		expect(draft.availability).toBe('unresolved');
		expect(draft.endpoint.queryParams).toHaveLength(1);
		expect(draft.endpoint.pagination).toBe(true);
		expect(draft.suggestions[0]).toEqual(
			expect.objectContaining({
				type: 'linkPathParam',
				paramName: 'id',
				fieldMemberId: 'member-id'
			})
		);
	});

	it('marks target primary-key paths not applicable after explicit final primary Field Member links and clears query facts', () => {
		const draft = getEndpointQueryDraft(
			makeEndpoint({
				path: '/products/{id}',
				pathParams: [{ name: 'id', fieldMemberId: 'member-id' }],
				responseShape: 'list',
				queryParams: [{ name: 'status', fieldMemberId: 'member-status', operator: 'eq', required: false }],
				pagination: true
			}),
			endpointTarget
		);

		expect(draft.availability).toBe('notApplicable');
		expect(draft.endpoint.queryParams).toEqual([]);
		expect(draft.endpoint.pagination).toBe(false);
		expect(draft.endpoint.responseShape).toBe('object');
		expect(draft.controls.queryParameters.mode).toBe('hidden');
		expect(draft.controls.pagination.mode).toBe('hidden');
		expect(draft.controls.responseShape).toEqual({
			mode: 'locked',
			value: 'object',
			reason: 'Primary-key endpoints return a single object'
		});
	});

	it.each(['POST', 'PUT', 'PATCH', 'DELETE'] as const)(
		'marks %s endpoints not applicable and clears query facts',
		(method) => {
			const draft = getEndpointQueryDraft(
				makeEndpoint({
					method,
					responseShape: 'list',
					queryParams: [{ name: 'status', fieldMemberId: 'member-status', operator: 'eq', required: false }],
					pagination: true
				}),
				endpointTarget
			);

			expect(draft.availability).toBe('notApplicable');
			expect(draft.endpoint.responseShape).toBe('object');
			expect(draft.endpoint.queryParams).toEqual([]);
			expect(draft.endpoint.pagination).toBe(false);
		}
	);

	it('does not use persisted response shape as the availability classifier', () => {
		const collection = getEndpointQueryDraft(
			makeEndpoint({ responseShape: 'object' }),
			endpointTarget
		);
		const detail = getEndpointQueryDraft(
			makeEndpoint({
				path: '/products/{id}',
				pathParams: [{ name: 'id', fieldMemberId: 'member-id' }],
				responseShape: 'list'
			}),
			endpointTarget
		);

		expect(collection.availability).toBe('available');
		expect(collection.endpoint.responseShape).toBe('list');
		expect(detail.availability).toBe('notApplicable');
		expect(detail.endpoint.responseShape).toBe('object');
	});

	it('reports incompatible query operators while availability remains available', () => {
		const draft = getEndpointQueryDraft(
			makeEndpoint({
				queryParams: [{ name: 'price_like', fieldMemberId: 'member-price', operator: 'like', required: false }]
			}),
			endpointTarget
		);

		expect(draft.availability).toBe('available');
		expect(draft.issues).toContainEqual(
			expect.objectContaining({
				code: 'endpoint_rule_6',
				location: { kind: 'queryParam', index: 0, field: 'operator' }
			})
		);
	});
});

describe('getEndpointQueryAvailability', () => {
	it('answers whether this Endpoint can have query parameters', () => {
		expect(getEndpointQueryAvailability(makeEndpoint(), endpointTarget)).toBe('available');
		expect(getEndpointQueryAvailability(makeEndpoint({ method: 'POST' }), endpointTarget)).toBe('notApplicable');
		expect(getEndpointQueryAvailability(makeEndpoint({ targetObjectId: undefined }), missingEndpointTarget)).toBe('unresolved');
	});
});

describe('getEndpointQueryControls', () => {
	it('owns response preview applicability instead of leaving it to UI modules', () => {
		const postControls = getEndpointQueryControls(makeEndpoint({ method: 'POST' }), endpointTarget);
		const deleteControls = getEndpointQueryControls(makeEndpoint({ method: 'DELETE' }), endpointTarget);

		expect(postControls.responsePreview.requestBodyVisible).toBe(true);
		expect(postControls.responsePreview.responseBodyVisible).toBe(true);
		expect(deleteControls.responsePreview.requestBodyVisible).toBe(false);
		expect(deleteControls.responsePreview.responseBodyVisible).toBe(false);
		expect(deleteControls.responsePreview.emptyMessage).toContain('204 No Content');
	});
});

describe('transitionEndpointDraft', () => {
	it('normalizes paths and extracts path params without name-based Field Member mutation', () => {
		const result = transitionEndpointDraft(
			makeEndpoint(),
			{ type: 'pathChanged', path: 'stores/{store_id}/products' },
			endpointTarget
		);

		expect(result.path).toBe('/stores/{store_id}/products');
		expect(result.pathParams).toEqual([{ name: 'store_id', fieldMemberId: '' }]);
	});

	it('sanitizes query facts when method changes to not applicable', () => {
		const result = transitionEndpointDraft(
			makeEndpoint({
				queryParams: [{ name: 'price', fieldMemberId: 'member-price', operator: 'eq', required: false }],
				pagination: true
			}),
			{ type: 'methodChanged', method: 'POST' },
			endpointTarget
		);

		expect(result.method).toBe('POST');
		expect(result.responseShape).toBe('object');
		expect(result.queryParams).toEqual([]);
		expect(result.pagination).toBe(false);
	});

	it('adds a query param from a Field Member only when query semantics are available', () => {
		const result = transitionEndpointDraft(
			makeEndpoint(),
			{ type: 'queryParamAddedFromField', fieldMemberId: 'member-price' },
			endpointTarget
		);

		expect(result.queryParams).toEqual([
			{ name: 'price', fieldMemberId: 'member-price', operator: 'eq', required: false }
		]);
	});
});

describe('prepareEndpointSave', () => {
	it('blocks saves when availability is unresolved', () => {
		const outcome = prepareEndpointSave(
			makeEndpoint({ targetObjectId: undefined }),
			missingEndpointTarget
		);

		expect(outcome.status).toBe('blocked');
		if (outcome.status !== 'blocked') return;
		expect(outcome.reasons).toContainEqual(
			expect.objectContaining({
				code: 'endpoint_rule_1',
				location: { kind: 'targetObject', field: 'targetObjectId' }
			})
		);
	});

	it('blocks saves when a query operator is incompatible with its Field Member type', () => {
		const outcome = prepareEndpointSave(
			makeEndpoint({
				queryParams: [{ name: 'price_like', fieldMemberId: 'member-price', operator: 'like', required: false }]
			}),
			endpointTarget
		);

		expect(outcome.status).toBe('blocked');
		if (outcome.status !== 'blocked') return;
		expect(formatEndpointBlockReasons(outcome.reasons)).toContain('Operator "like" is not valid');
	});

	it('returns a sanitized ready endpoint when no blockers exist', () => {
		const outcome = prepareEndpointSave(
			makeEndpoint({
				responseShape: 'object',
				queryParams: [{ name: 'min_price', fieldMemberId: 'member-price', operator: 'gte', required: true }]
			}),
			endpointTarget
		);

		expect(outcome).toEqual({
			status: 'ready',
			endpoint: expect.objectContaining({
				responseShape: 'list',
				queryParams: [{ name: 'min_price', fieldMemberId: 'member-price', operator: 'gte', required: true }]
			})
		});
	});
});

describe('prepareEndpointDuplicate', () => {
	it('duplicates through the same query checks as save', () => {
		const outcome = prepareEndpointDuplicate(
			makeEndpoint({ path: '/products', responseShape: 'object' }),
			endpointTarget
		);

		expect(outcome.status).toBe('ready');
		if (outcome.status !== 'ready') return;
		expect(outcome.endpoint.path).toBe('/products-copy');
		expect(outcome.endpoint.responseShape).toBe('list');
	});

	it('blocks duplicate when the copied Endpoint would have unresolved Endpoint Query Semantics', () => {
		const outcome = prepareEndpointDuplicate(
			makeEndpoint({ targetObjectId: undefined }),
			missingEndpointTarget
		);

		expect(outcome.status).toBe('blocked');
	});
});

describe('getEndpointQueryIssues', () => {
	it('reports snake_case path parameter issues at the path param name location', () => {
		const issues = getEndpointQueryIssues(
			makeEndpoint({
				path: '/products/{ProductId}',
				pathParams: [{ name: 'ProductId', fieldMemberId: 'member-id' }]
			}),
			endpointTarget
		);

		expect(issues).toContainEqual(
			expect.objectContaining({
				code: 'path_param_name_invalid',
				location: { kind: 'pathParam', name: 'ProductId', field: 'name' }
			})
		);
	});
});
