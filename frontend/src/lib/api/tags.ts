/**
 * Tags API Service
 *
 * GET methods for endpoint tag operations.
 */

import { apiGet } from './client';
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
