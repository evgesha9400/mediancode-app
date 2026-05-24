import { describe, expect, it } from 'vitest';
import type { ApiEndpoint } from '$lib/types';
import {
	formatEndpointBlockReasons,
	getEndpointIssues,
	isEndpointResponseShapeLocked,
	prepareEndpointCommand,
	transitionEndpointDraft
} from '$lib/domain/endpointQuerySemantics';
import type { TargetField } from '$lib/domain/paramInference';

const targetFields: TargetField[] = [
	{ fieldMemberId: 'member-id', name: 'id', type: 'uuid', isPk: true },
	{ fieldMemberId: 'member-user-id', name: 'user_id', type: 'uuid', isPk: false },
	{ fieldMemberId: 'member-status', name: 'status', type: 'str', isPk: false },
	{ fieldMemberId: 'member-price', name: 'price', type: 'float', isPk: false }
];

function makeEndpoint(overrides: Partial<ApiEndpoint> = {}): ApiEndpoint {
	return {
		id: 'ep-1',
		apiId: 'api-1',
		method: 'GET',
		path: '/items',
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

describe('transitionEndpointDraft', () => {
	it('normalizes path, extracts params, and links by Field Member name', () => {
		const result = transitionEndpointDraft(
			makeEndpoint(),
			{ type: 'pathChanged', path: 'items/{user_id}' },
			{ targetFields }
		);

		expect(result.path).toBe('/items/{user_id}');
		expect(result.pathParams).toEqual([
			{ name: 'user_id', fieldMemberId: 'member-user-id' }
		]);
		expect(result.responseShape).toBe('object');
	});

	it('links the final detail path param to the PK when no name match exists', () => {
		const result = transitionEndpointDraft(
			makeEndpoint(),
			{ type: 'pathChanged', path: '/items/{item_id}' },
			{ targetFields }
		);

		expect(result.pathParams).toEqual([
			{ name: 'item_id', fieldMemberId: 'member-id' }
		]);
	});

	it('does not link an unmatched nested path param to the PK for list paths', () => {
		const result = transitionEndpointDraft(
			makeEndpoint(),
			{ type: 'pathChanged', path: '/stores/{store_id}/items' },
			{ targetFields }
		);

		expect(result.pathParams).toEqual([{ name: 'store_id', fieldMemberId: '' }]);
		expect(result.responseShape).toBe('list');
	});

	it('changes non-GET methods to object response shape', () => {
		const result = transitionEndpointDraft(
			makeEndpoint({ responseShape: 'list' }),
			{ type: 'methodChanged', method: 'POST' },
			{ targetFields }
		);

		expect(result.method).toBe('POST');
		expect(result.responseShape).toBe('object');
		expect(isEndpointResponseShapeLocked(result)).toBe(true);
	});

	it('selects a new target object, relinks path params, and clears query state', () => {
		const result = transitionEndpointDraft(
			makeEndpoint({
				path: '/items/{status}',
				pathParams: [{ name: 'status', fieldMemberId: 'old-member' }],
				queryParams: [{ name: 'price', fieldMemberId: 'member-price', operator: 'eq', required: false }],
				pagination: true
			}),
			{ type: 'targetObjectSelected', targetObjectId: 'obj-2', targetFields },
			{ targetFields: [] }
		);

		expect(result.targetObjectId).toBe('obj-2');
		expect(result.pathParams).toEqual([{ name: 'status', fieldMemberId: 'member-status' }]);
		expect(result.queryParams).toEqual([]);
		expect(result.pagination).toBe(false);
	});

	it('adds a query param from a Field Member with required false', () => {
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
	it('blocks commands when target object is missing', () => {
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
		expect(outcome.reasons).toContainEqual(
			expect.objectContaining({
				code: 'endpoint_rule_6',
				location: { kind: 'queryParam', index: 0, field: 'operator' }
			})
		);
	});

	it('blocks DELETE endpoints that still carry query semantics', () => {
		const outcome = prepareEndpointCommand(
			makeEndpoint({
				method: 'DELETE',
				responseShape: 'object',
				queryParams: [{ name: 'status', fieldMemberId: 'member-status', operator: 'eq', required: false }],
				pagination: true
			}),
			{ targetFields }
		);

		expect(outcome.status).toBe('blocked');
		if (outcome.status !== 'blocked') return;
		expect(formatEndpointBlockReasons(outcome.reasons)).toContain('DELETE endpoints cannot have query parameters');
		expect(formatEndpointBlockReasons(outcome.reasons)).toContain('DELETE endpoints cannot have pagination');
	});

	it('returns a ready endpoint when no blockers exist', () => {
		const endpoint = makeEndpoint({
			queryParams: [{ name: 'min_price', fieldMemberId: 'member-price', operator: 'gte', required: true }]
		});
		const outcome = prepareEndpointCommand(endpoint, { targetFields });

		expect(outcome).toEqual({ status: 'ready', endpoint });
	});
});

describe('getEndpointIssues', () => {
	it('reports snake_case path parameter issues at the path param name location', () => {
		const issues = getEndpointIssues(
			makeEndpoint({
				path: '/items/{UserId}',
				pathParams: [{ name: 'UserId', fieldMemberId: 'member-id' }]
			}),
			{ targetFields }
		);

		expect(issues).toContainEqual(
			expect.objectContaining({
				code: 'path_param_name_invalid',
				location: { kind: 'pathParam', name: 'UserId', field: 'name' }
			})
		);
	});
});
