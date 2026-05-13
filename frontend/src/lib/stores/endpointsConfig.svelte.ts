// src/lib/stores/endpointsConfig.svelte.ts
//
// Shared endpoint CRUD configuration helpers for the API detail page.

import type { ApiEndpoint, Field, ObjectDefinition } from '$lib/types';
import {
	createEndpointApi,
	updateEndpointApi,
	deleteEndpointApi,
	type CreateEndpointRequest,
	type UpdateEndpointRequest
} from '$lib/api/endpoints';
import {
	buildDuplicateEndpoint,
	hydratePathParamsForEndpoint,
	normalizeEndpoint
} from '$lib/domain/endpointReducer';

export const endpointApi = {
	create: createEndpointApi,
	update: updateEndpointApi,
	delete: deleteEndpointApi
};

export function createEndpointDraft(apiId: string): ApiEndpoint {
	return {
		id: '',
		apiId,
		method: 'GET',
		path: '/',
		description: '',
		tagName: undefined,
		pathParams: [],
		queryParams: [],
		queryParamsObjectId: undefined,
		objectId: undefined,
		useEnvelope: true,
		responseShape: 'object',
		pagination: false,
		expanded: false
	};
}

export function hydrateStoredEndpoint(
	endpoint: ApiEndpoint,
	objects: ObjectDefinition[],
	fields: Field[]
): ApiEndpoint {
	return hydratePathParamsForEndpoint(normalizeEndpoint(endpoint), objects, fields);
}

export function toCreateEndpointPayload(endpoint: ApiEndpoint): CreateEndpointRequest {
	return {
		apiId: endpoint.apiId,
		method: endpoint.method,
		path: endpoint.path,
		description: endpoint.description,
		tagName: endpoint.tagName,
		pathParams: endpoint.pathParams,
		queryParams: endpoint.queryParams ?? [],
		queryParamsObjectId: endpoint.queryParamsObjectId,
		objectId: endpoint.objectId,
		useEnvelope: endpoint.useEnvelope,
		responseShape: endpoint.responseShape,
		pagination: endpoint.pagination ?? false
	};
}

export function toUpdateEndpointPayload(endpoint: ApiEndpoint): UpdateEndpointRequest {
	return {
		method: endpoint.method,
		path: endpoint.path,
		description: endpoint.description,
		tagName: endpoint.tagName ?? null,
		pathParams: endpoint.pathParams,
		queryParams: endpoint.queryParams ?? [],
		queryParamsObjectId: endpoint.queryParamsObjectId ?? null,
		objectId: endpoint.objectId ?? null,
		useEnvelope: endpoint.useEnvelope,
		responseShape: endpoint.responseShape,
		pagination: endpoint.pagination ?? false
	};
}

export function applyEndpointUpdate(
	endpoint: ApiEndpoint,
	payload: UpdateEndpointRequest
): ApiEndpoint {
	return normalizeEndpoint({
		...endpoint,
		...payload,
		queryParams: payload.queryParams
			? payload.queryParams.map((param) => ({
					...param,
					operator: param.operator as ApiEndpoint['queryParams'][number]['operator']
				}))
			: endpoint.queryParams,
		tagName: payload.tagName === null ? undefined : payload.tagName,
		queryParamsObjectId:
			payload.queryParamsObjectId === null ? undefined : payload.queryParamsObjectId,
		objectId: payload.objectId === null ? undefined : payload.objectId
	});
}

export function toDuplicateEndpointPayload(endpoint: ApiEndpoint): CreateEndpointRequest {
	return toCreateEndpointPayload(buildDuplicateEndpoint(endpoint));
}
