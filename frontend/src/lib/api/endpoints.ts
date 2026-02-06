/**
 * Endpoints API Service
 *
 * CRUD methods for API endpoint operations.
 */

import { apiGet, apiPost, apiPut, apiDelete } from './client';
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
	tagName: string | null;
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
		tagName: response.tagName ?? undefined,
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

// ============================================================================
// Mutation Types
// ============================================================================

/**
 * Request payload for creating an endpoint
 */
export interface CreateEndpointRequest {
	namespaceId: string;
	apiId: string;
	method: HttpMethod;
	path: string;
	description?: string;
	tagName?: string;
	pathParams?: { name: string; type: string; description?: string; required?: boolean }[];
	queryParamsObjectId?: string;
	requestBodyObjectId?: string;
	responseBodyObjectId?: string;
	useEnvelope?: boolean;
	responseShape?: ResponseShape;
}

/**
 * Request payload for updating an endpoint
 */
export interface UpdateEndpointRequest {
	method?: HttpMethod;
	path?: string;
	description?: string;
	tagName?: string | null;
	pathParams?: { id?: string; name: string; type: string; description?: string; required?: boolean }[];
	queryParamsObjectId?: string | null;
	requestBodyObjectId?: string | null;
	responseBodyObjectId?: string | null;
	useEnvelope?: boolean;
	responseShape?: ResponseShape;
}

// ============================================================================
// Mutation Methods
// ============================================================================

/**
 * Create a new endpoint
 *
 * @param data - Endpoint creation data
 * @returns The created endpoint
 */
export async function createEndpointApi(data: CreateEndpointRequest): Promise<ApiEndpoint> {
	const response = await apiPost<EndpointResponse>('/endpoints', data);
	return transformEndpoint(response);
}

/**
 * Update an existing endpoint
 *
 * @param id - Endpoint ID to update
 * @param data - Partial endpoint data to update
 * @returns The updated endpoint
 */
export async function updateEndpointApi(id: string, data: UpdateEndpointRequest): Promise<ApiEndpoint> {
	const response = await apiPut<EndpointResponse>(`/endpoints/${id}`, data);
	return transformEndpoint(response);
}

/**
 * Delete an endpoint
 *
 * @param id - Endpoint ID to delete
 */
export async function deleteEndpointApi(id: string): Promise<void> {
	await apiDelete<void>(`/endpoints/${id}`);
}
