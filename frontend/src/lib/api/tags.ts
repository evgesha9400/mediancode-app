/**
 * Tags API Service
 *
 * CRUD methods for endpoint tag operations.
 */

import { apiGet, apiPost, apiPut, apiDelete } from './client';
import type { EndpointTag } from '$lib/types';

/**
 * Backend API response for Tag entity
 */
interface TagResponse {
	id: string;
	namespaceId: string;
	apiId: string;
	name: string;
	description: string;
}

/**
 * Transform backend response to frontend EndpointTag type
 */
function transformTag(response: TagResponse): EndpointTag {
	return {
		id: response.id,
		namespaceId: response.namespaceId,
		apiId: response.apiId,
		name: response.name,
		description: response.description
	};
}

/**
 * List all tags, optionally filtered by namespace and/or API
 *
 * @param namespaceId - Optional namespace ID to filter by
 * @param apiId - Optional API ID to filter by
 */
export async function listTags(namespaceId?: string, apiId?: string): Promise<EndpointTag[]> {
	const searchParams = new URLSearchParams();
	if (namespaceId) searchParams.set('namespaceId', namespaceId);
	if (apiId) searchParams.set('apiId', apiId);
	const query = searchParams.toString();
	const response = await apiGet<TagResponse[]>(`/tags${query ? `?${query}` : ''}`);
	return response.map(transformTag);
}

/**
 * Get a single tag by ID
 */
export async function getTag(id: string): Promise<EndpointTag> {
	const response = await apiGet<TagResponse>(`/tags/${id}`);
	return transformTag(response);
}

// ============================================================================
// Mutation Types
// ============================================================================

/**
 * Request payload for creating a tag
 */
export interface CreateTagRequest {
	namespaceId: string;
	apiId: string;
	name: string;
	description?: string;
}

/**
 * Request payload for updating a tag
 */
export interface UpdateTagRequest {
	name?: string;
	description?: string;
}

// ============================================================================
// Mutation Methods
// ============================================================================

/**
 * Create a new tag
 *
 * @param data - Tag creation data
 * @returns The created tag
 */
export async function createTagApi(data: CreateTagRequest): Promise<EndpointTag> {
	const response = await apiPost<TagResponse>('/tags', data);
	return transformTag(response);
}

/**
 * Update an existing tag
 *
 * @param id - Tag ID to update
 * @param data - Partial tag data to update
 * @returns The updated tag
 */
export async function updateTagApi(id: string, data: UpdateTagRequest): Promise<EndpointTag> {
	const response = await apiPut<TagResponse>(`/tags/${id}`, data);
	return transformTag(response);
}

/**
 * Delete a tag
 *
 * @param id - Tag ID to delete
 */
export async function deleteTagApi(id: string): Promise<void> {
	await apiDelete<void>(`/tags/${id}`);
}
