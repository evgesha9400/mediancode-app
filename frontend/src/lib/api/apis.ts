/**
 * APIs API Service
 *
 * GET methods for API operations.
 */

import { apiGet } from './client';
import type { Api } from '$lib/types';

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
	createdAt: string;
	updatedAt: string;
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
