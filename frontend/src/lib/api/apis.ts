/**
 * APIs API Service
 *
 * CRUD methods for API operations.
 */

import { apiGet, apiPost, apiPut, apiDelete } from './client';
import type { Api, ApiTag } from '$lib/types';

/**
 * Backend tag embedded in API response
 */
interface ApiTagResponse {
	name: string;
	description: string;
}

/**
 * Backend API response for Api entity
 */
interface ApiResponse {
	id: string;
	namespaceId: string;
	title: string;
	version: string;
	description: string;
	baseUrl: string;
	serverUrl: string;
	tags: ApiTagResponse[];
	createdAt: string;
	updatedAt: string;
}

/**
 * Transform backend tag to frontend ApiTag type
 */
function transformTag(response: ApiTagResponse): ApiTag {
	return {
		name: response.name,
		description: response.description
	};
}

/**
 * Transform backend response to frontend Api type
 */
function transformApi(response: ApiResponse): Api {
	return {
		id: response.id,
		namespaceId: response.namespaceId,
		title: response.title,
		version: response.version,
		description: response.description,
		baseUrl: response.baseUrl,
		serverUrl: response.serverUrl,
		tags: (response.tags || []).map(transformTag),
		createdAt: response.createdAt,
		updatedAt: response.updatedAt
	};
}

/**
 * List all APIs, optionally filtered by namespace
 *
 * @param namespaceId - Optional namespace ID to filter by
 */
export async function listApis(namespaceId?: string): Promise<Api[]> {
	const params = namespaceId ? `?namespaceId=${encodeURIComponent(namespaceId)}` : '';
	const response = await apiGet<ApiResponse[]>(`/apis${params}`);
	return response.map(transformApi);
}

/**
 * Get a single API by ID
 */
export async function getApi(id: string): Promise<Api> {
	const response = await apiGet<ApiResponse>(`/apis/${id}`);
	return transformApi(response);
}

// ============================================================================
// Mutation Types
// ============================================================================

/**
 * Tag data for API requests
 */
export interface ApiTagRequest {
	name: string;
	description?: string;
}

/**
 * Request payload for creating an API
 */
export interface CreateApiRequest {
	namespaceId: string;
	title: string;
	version?: string;
	description?: string;
	baseUrl?: string;
	serverUrl?: string;
	tags?: ApiTagRequest[];
}

/**
 * Request payload for updating an API
 */
export interface UpdateApiRequest {
	title?: string;
	version?: string;
	description?: string;
	baseUrl?: string;
	serverUrl?: string;
	tags?: ApiTagRequest[];
}

// ============================================================================
// Mutation Methods
// ============================================================================

/**
 * Create a new API
 *
 * @param data - API creation data
 * @returns The created API
 */
export async function createApiApi(data: CreateApiRequest): Promise<Api> {
	const response = await apiPost<ApiResponse>('/apis', data);
	return transformApi(response);
}

/**
 * Update an existing API
 *
 * @param id - API ID to update
 * @param data - Partial API data to update
 * @returns The updated API
 */
export async function updateApiApi(id: string, data: UpdateApiRequest): Promise<Api> {
	const response = await apiPut<ApiResponse>(`/apis/${id}`, data);
	return transformApi(response);
}

/**
 * Delete an API
 *
 * @param id - API ID to delete
 */
export async function deleteApiApi(id: string): Promise<void> {
	await apiDelete<void>(`/apis/${id}`);
}
