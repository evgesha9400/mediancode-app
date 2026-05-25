import { describe, expect, it } from 'vitest';
import type { ApiEndpoint } from '$lib/types';
import {
	formatEndpointBlockReasons,
	getEndpointIssues,
	prepareEndpointCommand,
	resolveEndpointQuerySemantics,
	transitionEndpointDraft
} from '$lib/domain/endpointQuerySemantics';
import type { TargetField } from '$lib/domain/paramInference';

const targetFields: TargetField[] = [
	{ fieldMemberId: 'member-id', name: 'id', type: 'uuid', isPk: true },
	{ fieldMemberId: 'member-store-id', name: 'store_id', type: 'uuid', isPk: false },
	{ fieldMemberId: 'member-status', name: 'status', type: 'str', isPk: false },
	{ fieldMemberId: 'member-price', name: 'price', type: 'float', isPk: false }
];

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

describe('resolveEndpointQuerySemantics', () => {
	it('marks GET collection endpoints available when a target Object is selected and no path params exist', () => {
		const resolution = resolveEndpointQuerySemantics(
			makeEndpoint({ responseShape: 'object' }),
			{ targetFields }
		);

		expect(resolution.availability).toBe('available');
		expect(resolution.endpoint.responseShape).toBe('list');
		expect(resolution.policy).toEqual({
			queryParams: 'editable',
			pagination: 'editable',
			responseShape: 'locked'
		});
		expect(resolution.issues).toEqual([]);
	});

	it('keeps nested collection endpoints unresolved until path params are explicitly linked', () => {
		const endpoint = makeEndpoint({
			path: '/stores/{store_id}/products',
			pathParams: [{ name: 'store_id', fieldMemberId: '' }]
		});

		const resolution = resolveEndpointQuerySemantics(endpoint, { targetFields });

		expect(resolution.availability).toBe('unresolved');
		expect(resolution.endpoint.pathParams).toEqual([{ name: 'store_id', fieldMemberId: '' }]);
		expect(resolution.policy.queryParams).toBe('blocked');
		expect(resolution.suggestions).toEqual([
			{
				type: 'linkPathParam',
				paramName: 'store_id',
				fieldMemberId: 'member-store-id',
				label: 'Link store_id to store_id'
			}
		]);
	});

	it('marks nested collection endpoints available after explicit non-PK path links', () => {
		const resolution = resolveEndpointQuerySemantics(
			makeEndpoint({
				path: '/stores/{store_id}/products',
				pathParams: [{ name: 'store_id', fieldMemberId: 'member-store-id' }]
			}),
			{ targetFields }
		);

		expect(resolution.availability).toBe('available');
		expect(resolution.endpoint.responseShape).toBe('list');
		expect(resolution.policy.queryParams).toBe('editable');
	});

	it('keeps target primary-key paths unresolved until the final path param is explicitly linked', () => {
		const resolution = resolveEndpointQuerySemantics(
			makeEndpoint({
				path: '/products/{id}',
				pathParams: [{ name: 'id', fieldMemberId: '' }],
				queryParams: [{ name: 'status', fieldMemberId: 'member-status', operator: 'eq', required: false }],
				pagination: true
			}),
			{ targetFields }
		);

		expect(resolution.availability).toBe('unresolved');
		expect(resolution.endpoint.queryParams).toHaveLength(1);
		expect(resolution.endpoint.pagination).toBe(true);
		expect(resolution.suggestions[0]).toEqual(
			expect.objectContaining({
				type: 'linkPathParam',
				paramName: 'id',
				fieldMemberId: 'member-id'
			})
		);
	});

	it('marks target primary-key paths not applicable after explicit final PK links and clears query facts', () => {
		const resolution = resolveEndpointQuerySemantics(
			makeEndpoint({
				path: '/products/{id}',
				pathParams: [{ name: 'id', fieldMemberId: 'member-id' }],
				responseShape: 'list',
				queryParams: [{ name: 'status', fieldMemberId: 'member-status', operator: 'eq', required: false }],
				pagination: true
			}),
			{ targetFields }
		);

		expect(resolution.availability).toBe('notApplicable');
		expect(resolution.endpoint.queryParams).toEqual([]);
		expect(resolution.endpoint.pagination).toBe(false);
		expect(resolution.endpoint.responseShape).toBe('object');
		expect(resolution.policy).toEqual({
			queryParams: 'hidden',
			pagination: 'hidden',
			responseShape: 'locked'
		});
	});

	it.each(['POST', 'PUT', 'PATCH', 'DELETE'] as const)(
		'marks %s endpoints not applicable and clears query facts',
		(method) => {
			const resolution = resolveEndpointQuerySemantics(
				makeEndpoint({
					method,
					responseShape: 'list',
					queryParams: [{ name: 'status', fieldMemberId: 'member-status', operator: 'eq', required: false }],
					pagination: true
				}),
				{ targetFields }
			);

			expect(resolution.availability).toBe('notApplicable');
			expect(resolution.endpoint.responseShape).toBe('object');
			expect(resolution.endpoint.queryParams).toEqual([]);
			expect(resolution.endpoint.pagination).toBe(false);
		}
	);

	it('does not use persisted response shape as the availability classifier', () => {
		const collection = resolveEndpointQuerySemantics(
			makeEndpoint({ responseShape: 'object' }),
			{ targetFields }
		);
		const detail = resolveEndpointQuerySemantics(
			makeEndpoint({
				path: '/products/{id}',
				pathParams: [{ name: 'id', fieldMemberId: 'member-id' }],
				responseShape: 'list'
			}),
			{ targetFields }
		);

		expect(collection.availability).toBe('available');
		expect(collection.endpoint.responseShape).toBe('list');
		expect(detail.availability).toBe('notApplicable');
		expect(detail.endpoint.responseShape).toBe('object');
	});

	it('reports incompatible query operators while availability remains available', () => {
		const resolution = resolveEndpointQuerySemantics(
			makeEndpoint({
				queryParams: [{ name: 'price_like', fieldMemberId: 'member-price', operator: 'like', required: false }]
			}),
			{ targetFields }
		);

		expect(resolution.availability).toBe('available');
		expect(resolution.issues).toContainEqual(
			expect.objectContaining({
				code: 'endpoint_rule_6',
				location: { kind: 'queryParam', index: 0, field: 'operator' }
			})
		);
	});
});

describe('transitionEndpointDraft', () => {
	it('normalizes paths and extracts path params without name-based Field Member mutation', () => {
		const result = transitionEndpointDraft(
			makeEndpoint(),
			{ type: 'pathChanged', path: 'stores/{store_id}/products' },
			{ targetFields }
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
			{ targetFields }
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
			{ targetFields }
		);

		expect(result.queryParams).toEqual([
			{ name: 'price', fieldMemberId: 'member-price', operator: 'eq', required: false }
		]);
	});
});

describe('prepareEndpointCommand', () => {
	it('blocks commands when availability is unresolved', () => {
		const outcome = prepareEndpointCommand(
			makeEndpoint({ targetObjectId: undefined }),
			{ targetFields: [] }
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

	it('blocks commands when a query operator is incompatible with its Field Member type', () => {
		const outcome = prepareEndpointCommand(
			makeEndpoint({
				queryParams: [{ name: 'price_like', fieldMemberId: 'member-price', operator: 'like', required: false }]
			}),
			{ targetFields }
		);

		expect(outcome.status).toBe('blocked');
		if (outcome.status !== 'blocked') return;
		expect(formatEndpointBlockReasons(outcome.reasons)).toContain('Operator "like" is not valid');
	});

	it('returns a sanitized ready endpoint when no blockers exist', () => {
		const outcome = prepareEndpointCommand(
			makeEndpoint({
				responseShape: 'object',
				queryParams: [{ name: 'min_price', fieldMemberId: 'member-price', operator: 'gte', required: true }]
			}),
			{ targetFields }
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

describe('getEndpointIssues', () => {
	it('reports snake_case path parameter issues at the path param name location', () => {
		const issues = getEndpointIssues(
			makeEndpoint({
				path: '/products/{ProductId}',
				pathParams: [{ name: 'ProductId', fieldMemberId: 'member-id' }]
			}),
			{ targetFields }
		);

		expect(issues).toContainEqual(
			expect.objectContaining({
				code: 'path_param_name_invalid',
				location: { kind: 'pathParam', name: 'ProductId', field: 'name' }
			})
		);
	});
});
