/**
 * Endpoints API Service
 *
 * CRUD methods for API endpoint operations.
 */

import { apiGet, apiPost, apiPut, apiDelete } from './client';
import type { ApiEndpoint, PathParam, QueryParam, HttpMethod, ResponseShape, FilterOperator } from '$lib/types';

interface PathParamResponse {
	name: string;
	fieldMemberId: string;
}

interface QueryParamResponse {
	name: string;
	fieldMemberId: string;
	operator: string;
	required: boolean;
}

interface EndpointResponse {
	id: string;
	apiId: string;
	method: string;
	path: string;
	description: string;
	tagName: string | null;
	targetObjectId: string;
	pathParams: PathParamResponse[];
	queryParams: QueryParamResponse[];
	pagination: boolean;
	useEnvelope: boolean;
	responseShape: string;
}

function transformPathParam(response: PathParamResponse): PathParam {
	return {
		name: response.name,
		fieldMemberId: response.fieldMemberId
	};
}

function transformQueryParam(response: QueryParamResponse): QueryParam {
	return {
		name: response.name,
		fieldMemberId: response.fieldMemberId,
		operator: response.operator as FilterOperator,
		required: response.required
	};
}

function transformEndpoint(response: EndpointResponse): ApiEndpoint {
	return {
		id: response.id,
		apiId: response.apiId,
		method: response.method as HttpMethod,
		path: response.path,
		description: response.description,
		tagName: response.tagName ?? undefined,
		targetObjectId: response.targetObjectId,
		pathParams: response.pathParams.map(transformPathParam),
		queryParams: response.queryParams.map(transformQueryParam),
		pagination: response.pagination,
		useEnvelope: response.useEnvelope,
		responseShape: response.responseShape as ResponseShape,
		expanded: false
	};
}

export async function listEndpoints(namespaceId?: string): Promise<ApiEndpoint[]> {
	const params = namespaceId ? `?namespace_id=${encodeURIComponent(namespaceId)}` : '';
	const response = await apiGet<EndpointResponse[]>(`/endpoints${params}`);
	return response.map(transformEndpoint);
}

export async function getEndpoint(id: string): Promise<ApiEndpoint> {
	const response = await apiGet<EndpointResponse>(`/endpoints/${id}`);
	return transformEndpoint(response);
}

export interface CreateEndpointRequest {
	apiId: string;
	method: HttpMethod;
	path: string;
	description?: string;
	tagName?: string;
	targetObjectId: string;
	pathParams?: { name: string; fieldMemberId: string }[];
	queryParams?: { name: string; fieldMemberId: string; operator: string; required: boolean }[];
	pagination?: boolean;
	useEnvelope?: boolean;
	responseShape?: ResponseShape;
}

export interface UpdateEndpointRequest {
	method?: HttpMethod;
	path?: string;
	description?: string;
	tagName?: string | null;
	targetObjectId?: string;
	pathParams?: { name: string; fieldMemberId: string }[];
	queryParams?: { name: string; fieldMemberId: string; operator: string; required: boolean }[];
	pagination?: boolean;
	useEnvelope?: boolean;
	responseShape?: ResponseShape;
}

export async function createEndpointApi(data: CreateEndpointRequest): Promise<ApiEndpoint> {
	const response = await apiPost<EndpointResponse>('/endpoints', data);
	return transformEndpoint(response);
}

export async function updateEndpointApi(id: string, data: UpdateEndpointRequest): Promise<ApiEndpoint> {
	const response = await apiPut<EndpointResponse>(`/endpoints/${id}`, data);
	return transformEndpoint(response);
}

export async function deleteEndpointApi(id: string): Promise<void> {
	await apiDelete<void>(`/endpoints/${id}`);
}
