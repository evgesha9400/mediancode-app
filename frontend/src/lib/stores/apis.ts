import { writable, get } from 'svelte/store';
import type { Api, ApiEndpoint } from '$lib/types';

// ============================================================================
// Stores
// ============================================================================

// Store for multiple APIs
export const apisStore = writable<Api[]>([]);

// Store for API endpoints
export const endpointsStore = writable<ApiEndpoint[]>([]);

// ============================================================================
// API Selectors
// ============================================================================

/**
 * Get an API by its ID
 */
export function getApiById(id: string): Api | undefined {
	return get(apisStore).find(a => a.id === id);
}

/**
 * Get all APIs for a specific namespace
 */
export function getApisByNamespace(namespaceId: string): Api[] {
	return get(apisStore).filter(a => a.namespaceId === namespaceId);
}

/**
 * Search APIs by title or description
 */
export function searchApis(apis: Api[], query: string): Api[] {
	if (!query.trim()) return apis;

	const lowerQuery = query.toLowerCase();
	return apis.filter(
		api =>
			api.title.toLowerCase().includes(lowerQuery) ||
			api.description.toLowerCase().includes(lowerQuery) ||
			api.baseUrl.toLowerCase().includes(lowerQuery)
	);
}

// ============================================================================
// Endpoint Selectors
// ============================================================================

/**
 * Get an endpoint by its ID
 */
export function getEndpointById(id: string): ApiEndpoint | undefined {
	return get(endpointsStore).find(e => e.id === id);
}

/**
 * Get endpoint count for a specific API
 */
export function getEndpointCountByApi(apiId: string): number {
	return get(endpointsStore).filter(e => e.apiId === apiId).length;
}

/**
 * Get all endpoints for a specific API
 */
export function getEndpointsByApi(apiId: string): ApiEndpoint[] {
	return get(endpointsStore).filter(e => e.apiId === apiId);
}

/**
 * Count endpoints using a specific tag name in an API
 */
export function getEndpointCountByTagName(apiId: string, tagName: string): number {
	return get(endpointsStore).filter(e => e.apiId === apiId && e.tagName === tagName).length;
}

/**
 * Get total number of endpoints
 */
export function getTotalEndpointCount(): number {
	return get(endpointsStore).length;
}
