/**
 * Endpoints API Service
 *
 * CRUD methods for API endpoint operations.
 */

import { apiGet, apiPost, apiPut, apiDelete } from './client';
import type { ApiEndpoint, PathParam, QueryParam, HttpMethod, ResponseShape, FilterOperator } from '$lib/types';

/**
 * Backend path parameter response
 */
interface PathParamResponse {
	name: string;
	fieldId: string;
	field: string; // field name on target object
}

/**
 * Backend query parameter response
 */
interface QueryParamResponse {
	name: string;
	field: string;
	operator: string;
	pagination: boolean;
}

/**
 * Backend API response for Endpoint entity
 */
interface EndpointResponse {
	id: string;
	apiId: string;
	method: string;
	path: string;
	description: string;
	tagName: string | null;
	pathParams: PathParamResponse[];
	queryParams: QueryParamResponse[]; // NEW
	queryParamsObjectId: string | null; // kept for backward compat
	targetObjectId: string | null; // NEW
	objectId: string | null;
	useEnvelope: boolean;
	responseShape: string;
}

/**
 * Transform backend parameter to frontend type
 */
function transformParameter(response: PathParamResponse): PathParam {
	return {
		name: response.name,
		fieldId: response.fieldId,
		field: response.field ?? ''
	};
}

/**
 * Transform backend query parameter to frontend type
 */
function transformQueryParam(response: QueryParamResponse): QueryParam {
	return {
		name: response.name,
		field: response.field ?? '',
		operator: (response.operator as FilterOperator) ?? 'eq',
		pagination: response.pagination ?? false
	};
}

/**
 * Transform backend response to frontend ApiEndpoint type
 */
function transformEndpoint(response: EndpointResponse): ApiEndpoint {
	return {
		id: response.id,
		apiId: response.apiId,
		method: response.method as HttpMethod,
		path: response.path,
		description: response.description,
		tagName: response.tagName ?? undefined,
		pathParams: response.pathParams.map(transformParameter),
		queryParams: (response.queryParams ?? []).map(transformQueryParam),
		queryParamsObjectId: response.queryParamsObjectId ?? undefined,
		targetObjectId: response.targetObjectId ?? undefined,
		objectId: response.objectId ?? undefined,
		useEnvelope: response.useEnvelope,
		responseShape: response.responseShape as ResponseShape,
		expanded: false
	};
}

/**
 * List all endpoints, optionally filtered by namespace
 *
 * @param namespaceId - Optional namespace ID to filter by
 */
export async function listEndpoints(namespaceId?: string): Promise<ApiEndpoint[]> {
	const params = namespaceId ? `?namespace_id=${encodeURIComponent(namespaceId)}` : '';
	const response = await apiGet<EndpointResponse[]>(`/endpoints${params}`);
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
	apiId: string;
	method: HttpMethod;
	path: string;
	description?: string;
	tagName?: string;
	pathParams?: { name: string; fieldId: string; field: string }[];
	queryParams?: { name: string; field: string; operator: string; pagination: boolean }[];
	queryParamsObjectId?: string; // deprecated, kept for compat
	targetObjectId?: string;
	objectId?: string;
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
	pathParams?: { name: string; fieldId: string; field: string }[];
	queryParams?: { name: string; field: string; operator: string; pagination: boolean }[];
	queryParamsObjectId?: string | null; // deprecated
	targetObjectId?: string | null;
	objectId?: string | null;
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
