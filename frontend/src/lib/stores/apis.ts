import { writable, get } from 'svelte/store';
import type { Api, ApiEndpoint, PathParam, DeletionResult } from '$lib/types';
import { extractPathParameters } from '$lib/utils/urlParser';
import { generateId, deepClone } from '$lib/utils/ids';
import { fieldsStore } from './fields';

// ============================================================================
// Stores
// ============================================================================

// Store for multiple APIs
export const apisStore = writable<Api[]>([]);

// Store for API endpoints
export const endpointsStore = writable<ApiEndpoint[]>([]);

// ============================================================================
// API CRUD Operations
// ============================================================================

/**
 * Create a new API
 */
export function createApi(namespaceId: string): Api {
	const now = new Date().toISOString();
	const newApi: Api = {
		id: generateId('api'),
		namespaceId,
		title: 'Untitled API',
		version: '1.0.0',
		description: '',
		baseUrl: '/api/v1',
		serverUrl: '',
		createdAt: now,
		updatedAt: now
	};

	apisStore.update(apis => [...apis, newApi]);
	return newApi;
}

/**
 * Add an existing API object to the store (for draft mode)
 */
export function addApi(api: Api): void {
	apisStore.update(apis => [...apis, api]);
}

/**
 * Update an API's properties
 */
export function updateApi(id: string, updates: Partial<Api>): void {
	apisStore.update(apis =>
		apis.map(api => api.id === id ? { ...api, ...updates, updatedAt: new Date().toISOString() } : api)
	);
}

/**
 * Delete an API and all its endpoints
 */
export function deleteApi(id: string): DeletionResult {
	const api = getApiById(id);

	if (!api) {
		return {
			success: false,
			error: `API with ID "${id}" not found.`
		};
	}

	// Delete all endpoints belonging to this API
	endpointsStore.update(endpoints => endpoints.filter(e => e.apiId !== id));

	// Delete the API
	apisStore.update(apis => apis.filter(a => a.id !== id));

	return {
		success: true,
		error: `API "${api.title}" and all its endpoints deleted`
	};
}

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

// ============================================================================
// Selectors and Derived Queries
// ============================================================================

/**
 * Get an endpoint by its ID
 */
export function getEndpointById(id: string): ApiEndpoint | undefined {
	return get(endpointsStore).find(e => e.id === id);
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

// ============================================================================
// Endpoint Lifecycle Operations
// ============================================================================

/**
 * Create a new default endpoint
 *
 * @param apiId - The API this endpoint belongs to
 * @returns The newly created endpoint
 */
export function createDefaultEndpoint(apiId: string): ApiEndpoint {
	const newEndpoint: ApiEndpoint = {
		id: generateId('endpoint'),
		apiId,
		method: 'GET',
		path: '/',
		description: '',
		tagName: undefined,
		pathParams: [],
		queryParamsObjectId: undefined,
		requestBodyObjectId: undefined,
		responseBodyObjectId: undefined,
		useEnvelope: true,
		responseShape: 'object',
		expanded: false
	};

	endpointsStore.update(endpoints => [...endpoints, newEndpoint]);
	return newEndpoint;
}

/**
 * Add a pre-constructed endpoint (legacy support)
 */
export function addEndpoint(endpoint: ApiEndpoint): void {
	endpointsStore.update(endpoints => [...endpoints, endpoint]);
}

/**
 * Update an endpoint's properties
 */
export function updateEndpoint(id: string, updates: Partial<ApiEndpoint>): void {
	endpointsStore.update(endpoints =>
		endpoints.map(endpoint => (endpoint.id === id ? { ...endpoint, ...updates } : endpoint))
	);
}

/**
 * Normalize an endpoint to ensure all required response shape fields exist
 * This provides backward compatibility for endpoints created before response shape simplification
 *
 * @param endpoint - The endpoint to normalize
 * @returns The normalized endpoint with all required fields
 */
export function normalizeEndpoint(endpoint: ApiEndpoint): ApiEndpoint {
	return {
		...endpoint,
		// Default to 'object' shape if missing
		responseShape: endpoint.responseShape ?? 'object'
	};
}

/**
 * Duplicate an endpoint with a new ID
 *
 * @param endpointId - The ID of the endpoint to duplicate
 * @returns The duplicated endpoint, or undefined if original not found
 */
export function duplicateEndpoint(endpointId: string): ApiEndpoint | undefined {
	const original = getEndpointById(endpointId);

	if (!original) {
		return undefined;
	}

	// Normalize before duplicating to ensure all fields are present
	const normalized = normalizeEndpoint(original);

	const duplicated: ApiEndpoint = {
		...deepClone(normalized),
		id: generateId('endpoint'),
		path: `${original.path}-copy`,
		expanded: false,
		// PathParams are simple {name, fieldId} — just clone them directly
		pathParams: original.pathParams.map(p => ({ ...p }))
	};

	endpointsStore.update(endpoints => [...endpoints, duplicated]);
	return duplicated;
}

/**
 * Delete an endpoint
 *
 * @param id - The ID of the endpoint to delete
 * @returns DeletionResult with success status
 */
export function deleteEndpoint(id: string): DeletionResult {
	const endpoint = getEndpointById(id);

	if (!endpoint) {
		return {
			success: false,
			error: `Endpoint with ID "${id}" not found.`
		};
	}

	endpointsStore.update(endpoints => endpoints.filter(e => e.id !== id));

	return {
		success: true,
		error: 'Endpoint deleted successfully'
	};
}

// ============================================================================
// Path and Parameter Operations
// ============================================================================

/**
 * Result of reconciling a path with its parameters
 */
export interface PathReconciliationResult {
	path: string;
	pathParams: PathParam[];
}

/**
 * Pure function to reconcile a path with its parameters.
 * Extracts parameter names from the path and merges with existing definitions.
 * For new params, attempts best-effort field matching by name.
 *
 * @param newPath - The new path (will be normalized to start with '/')
 * @param existingParams - Current path parameters to preserve definitions from
 * @returns The normalized path and reconciled parameters
 */
export function reconcilePathParams(
	newPath: string,
	existingParams: PathParam[]
): PathReconciliationResult {
	// Ensure path always starts with '/'
	const path = newPath.startsWith('/') ? newPath : '/' + newPath;

	// Extract parameter names from the path
	const paramNames = extractPathParameters(path);

	// Create new parameters for newly discovered param names
	const pathParams: PathParam[] = [];
	const fields = get(fieldsStore);

	paramNames.forEach(paramName => {
		const existingParam = existingParams.find(p => p.name === paramName);
		if (existingParam) {
			// Keep existing parameter (preserves fieldId)
			pathParams.push(existingParam);
		} else {
			// Best-effort: find a field whose name matches the param name
			const matchedField = fields.find(f => f.name === paramName);
			pathParams.push({
				name: paramName,
				fieldId: matchedField?.id ?? ''
			});
		}
	});

	return { path, pathParams };
}

/**
 * Update an endpoint's path and reconcile path parameters
 * Extracts parameters from the path and creates/updates parameter definitions
 *
 * @param endpointId - The ID of the endpoint to update
 * @param newPath - The new path (will be normalized to start with '/')
 * @returns The updated endpoint, or undefined if endpoint not found
 */
export function updateEndpointPath(endpointId: string, newPath: string): ApiEndpoint | undefined {
	const endpoint = getEndpointById(endpointId);

	if (!endpoint) {
		return undefined;
	}

	const { path, pathParams } = reconcilePathParams(newPath, endpoint.pathParams);

	// Update endpoint with new path and reconciled parameters
	const updated: ApiEndpoint = {
		...endpoint,
		path,
		pathParams
	};

	updateEndpoint(endpointId, updated);
	return updated;
}

/**
 * Update a specific path parameter's fieldId by param name
 */
export function updatePathParameter(
	endpointId: string,
	paramName: string,
	fieldId: string
): void {
	const endpoint = getEndpointById(endpointId);

	if (!endpoint) return;

	const updatedParams = endpoint.pathParams.map(p =>
		p.name === paramName ? { ...p, fieldId } : p
	);

	updateEndpoint(endpointId, { pathParams: updatedParams });
}
