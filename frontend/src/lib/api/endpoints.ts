/**
 * Endpoints API Service
 *
 * GET methods for API endpoint operations.
 */

import { apiGet } from './client';
import type { ApiEndpoint, EndpointParameter, HttpMethod, ResponseShape } from '$lib/types';

/**
 * Backend endpoint parameter response
 */
interface EndpointParameterResponse {
	id: string;
	name: string;
	type: string;
	description: string;
	required: boolean;
}

/**
 * Backend API response for Endpoint entity
 */
interface EndpointResponse {
	id: string;
	namespaceId: string;
	apiId: string;
	method: string;
	path: string;
	description: string;
	tagId: string | null;
	pathParams: EndpointParameterResponse[];
	queryParamsObjectId: string | null;
	requestBodyObjectId: string | null;
	responseBodyObjectId: string | null;
	useEnvelope: boolean;
	responseShape: string;
}

/**
 * Transform backend parameter to frontend type
 */
function transformParameter(response: EndpointParameterResponse): EndpointParameter {
	return {
		id: response.id,
		name: response.name,
		type: response.type,
		description: response.description,
		required: response.required
	};
}

/**
 * Transform backend response to frontend ApiEndpoint type
 */
function transformEndpoint(response: EndpointResponse): ApiEndpoint {
	return {
		id: response.id,
		namespaceId: response.namespaceId,
		apiId: response.apiId,
		method: response.method as HttpMethod,
		path: response.path,
		description: response.description,
		tagId: response.tagId ?? undefined,
		pathParams: response.pathParams.map(transformParameter),
		queryParamsObjectId: response.queryParamsObjectId ?? undefined,
		requestBodyObjectId: response.requestBodyObjectId ?? undefined,
		responseBodyObjectId: response.responseBodyObjectId ?? undefined,
		useEnvelope: response.useEnvelope,
		responseShape: response.responseShape as ResponseShape,
		expanded: false
	};
}

/**
 * List all endpoints, optionally filtered by namespace and/or API
 *
 * @param namespaceId - Optional namespace ID to filter by
 * @param apiId - Optional API ID to filter by
 */
export async function listEndpoints(namespaceId?: string, apiId?: string): Promise<ApiEndpoint[]> {
	const searchParams = new URLSearchParams();
	if (namespaceId) searchParams.set('namespaceId', namespaceId);
	if (apiId) searchParams.set('apiId', apiId);
	const query = searchParams.toString();
	const response = await apiGet<EndpointResponse[]>(`/endpoints${query ? `?${query}` : ''}`);
	return response.map(transformEndpoint);
}

/**
 * Get a single endpoint by ID
 */
export async function getEndpoint(id: string): Promise<ApiEndpoint> {
	const response = await apiGet<EndpointResponse>(`/endpoints/${id}`);
	return transformEndpoint(response);
}
