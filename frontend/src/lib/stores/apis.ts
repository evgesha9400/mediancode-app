import { writable, get } from 'svelte/store';
import type { ApiMetadata, EndpointTag, ApiEndpoint, EndpointParameter, DeletionResult } from '$lib/types';
import { extractPathParameters } from '$lib/utils/urlParser';
import { generateId, generateParamId, deepClone } from '$lib/utils/ids';

// Initial empty state for API metadata
export const initialApiMetadata: ApiMetadata = {
	title: '',
	version: '1.0.0',
	description: '',
	baseUrl: '/api/v1',
	serverUrl: ''
};

// Store for API metadata
export const apiMetadataStore = writable<ApiMetadata>(initialApiMetadata);

// Store for endpoint tags
export const tagsStore = writable<EndpointTag[]>([]);

// Store for API endpoints
export const endpointsStore = writable<ApiEndpoint[]>([]);

// ============================================================================
// API Metadata Operations
// ============================================================================

export function updateApiMetadata(updates: Partial<ApiMetadata>): void {
	apiMetadataStore.update(metadata => ({
		...metadata,
		...updates
	}));
}

// ============================================================================
// Selectors and Derived Queries
// ============================================================================

/**
 * Get a tag by its ID
 */
export function getTagById(id: string): EndpointTag | undefined {
	return get(tagsStore).find(t => t.id === id);
}

/**
 * Get an endpoint by its ID
 */
export function getEndpointById(id: string): ApiEndpoint | undefined {
	return get(endpointsStore).find(e => e.id === id);
}

/**
 * Get all endpoints that belong to a specific tag
 */
export function getEndpointsByTagId(tagId: string): ApiEndpoint[] {
	return get(endpointsStore).filter(e => e.tagId === tagId);
}

/**
 * Count endpoints using a specific tag
 */
export function getEndpointCountByTag(tagId: string): number {
	return get(endpointsStore).filter(e => e.tagId === tagId).length;
}

/**
 * Get total number of endpoints
 */
export function getTotalEndpointCount(): number {
	return get(endpointsStore).length;
}

/**
 * Get total number of tags
 */
export function getTotalTagCount(): number {
	return get(tagsStore).length;
}

// ============================================================================
// Tag Lifecycle Operations
// ============================================================================

/**
 * Create a new tag with uniqueness guard
 *
 * @param name - The name for the new tag
 * @param description - Optional description for the tag
 * @returns The created tag, or undefined if a tag with that name already exists
 */
export function createTag(name: string, description: string = ''): EndpointTag | undefined {
	const trimmedName = name.trim();

	// Check for existing tag with same name (case-insensitive)
	const existingTag = get(tagsStore).find(
		t => t.name.toLowerCase() === trimmedName.toLowerCase()
	);

	if (existingTag) {
		return undefined;
	}

	const newTag: EndpointTag = {
		id: generateId('tag'),
		name: trimmedName,
		description
	};

	tagsStore.update(tags => [...tags, newTag]);
	return newTag;
}

/**
 * Add a pre-constructed tag (legacy support)
 */
export function addTag(tag: EndpointTag): void {
	tagsStore.update(tags => [...tags, tag]);
}

/**
 * Update a tag's properties
 */
export function updateTag(id: string, updates: Partial<EndpointTag>): void {
	tagsStore.update(tags =>
		tags.map(tag => (tag.id === id ? { ...tag, ...updates } : tag))
	);
}

/**
 * Delete a tag and detach it from all endpoints
 *
 * @param tagId - The ID of the tag to delete
 * @returns DeletionResult with success status and informational message
 */
export function deleteTagWithCleanup(tagId: string): DeletionResult {
	const tag = getTagById(tagId);

	if (!tag) {
		return {
			success: false,
			error: `Tag with ID "${tagId}" not found.`
		};
	}

	const affectedCount = getEndpointCountByTag(tagId);

	// Remove tag from all endpoints that use it
	endpointsStore.update(endpoints =>
		endpoints.map(endpoint =>
			endpoint.tagId === tagId ? { ...endpoint, tagId: undefined } : endpoint
		)
	);

	// Delete the tag
	tagsStore.update(tags => tags.filter(t => t.id !== tagId));

	// Return success with informational message
	const message = affectedCount > 0
		? `Tag "${tag.name}" deleted and removed from ${affectedCount} endpoint${affectedCount > 1 ? 's' : ''}`
		: `Tag "${tag.name}" deleted`;

	return {
		success: true,
		error: message // Using 'error' field for the message to match DeletionResult interface
	};
}

/**
 * Legacy function for compatibility
 */
export function deleteTag(id: string): void {
	tagsStore.update(tags => tags.filter(tag => tag.id !== id));
}

/**
 * Legacy function for compatibility
 */
export function deleteTagAndClearEndpoints(tagId: string): void {
	deleteTagWithCleanup(tagId);
}

// ============================================================================
// Endpoint Lifecycle Operations
// ============================================================================

/**
 * Create a new default endpoint
 *
 * @returns The newly created endpoint
 */
export function createDefaultEndpoint(): ApiEndpoint {
	const newEndpoint: ApiEndpoint = {
		id: generateId('endpoint'),
		method: 'GET',
		path: '/',
		description: '',
		tagId: undefined,
		pathParams: [],
		queryParams: [],
		// Legacy fields (kept for backwards compatibility)
		requestBody: undefined,
		responseBody: '{\n  "message": "Success"\n}',
		// New structured body fields
		requestBodyMode: 'none',
		requestBodyFields: [],
		requestBodyJson: '',
		responseBodyMode: 'fields',
		responseBodyFields: [
			{
				id: generateParamId(),
				name: 'message',
				type: 'string',
				description: 'Success message',
				required: true
			}
		],
		responseBodyJson: '',
		useEnvelope: true,
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
 * Duplicate an endpoint with new IDs for the endpoint and all parameters
 *
 * @param endpointId - The ID of the endpoint to duplicate
 * @returns The duplicated endpoint, or undefined if original not found
 */
export function duplicateEndpoint(endpointId: string): ApiEndpoint | undefined {
	const original = getEndpointById(endpointId);

	if (!original) {
		return undefined;
	}

	const duplicated: ApiEndpoint = {
		...deepClone(original),
		id: generateId('endpoint'),
		path: `${original.path}-copy`,
		expanded: false,
		pathParams: original.pathParams.map(p => ({ ...p, id: generateParamId() })),
		queryParams: original.queryParams.map(p => ({ ...p, id: generateParamId() })),
		// Clone body fields with new IDs
		requestBodyFields: original.requestBodyFields.map(p => ({ ...p, id: generateParamId() })),
		responseBodyFields: original.responseBodyFields.map(p => ({ ...p, id: generateParamId() }))
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

/**
 * Toggle an endpoint's expanded state
 */
export function toggleEndpointExpanded(id: string): void {
	endpointsStore.update(endpoints =>
		endpoints.map(endpoint =>
			endpoint.id === id ? { ...endpoint, expanded: !endpoint.expanded } : endpoint
		)
	);
}

// ============================================================================
// Path and Parameter Operations
// ============================================================================

/**
 * Result of reconciling a path with its parameters
 */
export interface PathReconciliationResult {
	path: string;
	pathParams: EndpointParameter[];
}

/**
 * Pure function to reconcile a path with its parameters.
 * Extracts parameter names from the path and merges with existing definitions.
 * This is the centralized domain logic for path/param reconciliation.
 *
 * @param newPath - The new path (will be normalized to start with '/')
 * @param existingParams - Current path parameters to preserve definitions from
 * @returns The normalized path and reconciled parameters
 */
export function reconcilePathParams(
	newPath: string,
	existingParams: EndpointParameter[]
): PathReconciliationResult {
	// Ensure path always starts with '/'
	const path = newPath.startsWith('/') ? newPath : '/' + newPath;

	// Extract parameter names from the path
	const paramNames = extractPathParameters(path);

	// Create new parameters for newly discovered param names
	const pathParams: EndpointParameter[] = [];

	paramNames.forEach(paramName => {
		const existingParam = existingParams.find(p => p.name === paramName);
		if (existingParam) {
			// Keep existing parameter (preserves type, description, etc.)
			pathParams.push(existingParam);
		} else {
			// Create new parameter without a type (user needs to select)
			pathParams.push({
				id: generateParamId(),
				name: paramName,
				type: '', // No type selected yet
				description: '',
				required: true // Path parameters are always required
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
 * Update a specific path parameter
 */
export function updatePathParameter(
	endpointId: string,
	paramId: string,
	updates: Partial<EndpointParameter>
): void {
	const endpoint = getEndpointById(endpointId);

	if (!endpoint) return;

	const updatedParams = endpoint.pathParams.map(p =>
		p.id === paramId ? { ...p, ...updates } : p
	);

	updateEndpoint(endpointId, { pathParams: updatedParams });
}

/**
 * Delete a path parameter
 */
export function deletePathParameter(endpointId: string, paramId: string): void {
	const endpoint = getEndpointById(endpointId);

	if (!endpoint) return;

	const updatedParams = endpoint.pathParams.filter(p => p.id !== paramId);
	updateEndpoint(endpointId, { pathParams: updatedParams });
}

/**
 * Add a new query parameter to an endpoint
 */
export function addQueryParameter(endpointId: string): EndpointParameter | undefined {
	const endpoint = getEndpointById(endpointId);

	if (!endpoint) return undefined;

	const newParam: EndpointParameter = {
		id: generateParamId(),
		name: 'new_param',
		type: '',
		description: '',
		required: false
	};

	const updatedParams = [...endpoint.queryParams, newParam];
	updateEndpoint(endpointId, { queryParams: updatedParams });

	return newParam;
}

/**
 * Update a specific query parameter
 */
export function updateQueryParameter(
	endpointId: string,
	paramId: string,
	updates: Partial<EndpointParameter>
): void {
	const endpoint = getEndpointById(endpointId);

	if (!endpoint) return;

	const updatedParams = endpoint.queryParams.map(p =>
		p.id === paramId ? { ...p, ...updates } : p
	);

	updateEndpoint(endpointId, { queryParams: updatedParams });
}

/**
 * Delete a query parameter
 */
export function deleteQueryParameter(endpointId: string, paramId: string): void {
	const endpoint = getEndpointById(endpointId);

	if (!endpoint) return;

	const updatedParams = endpoint.queryParams.filter(p => p.id !== paramId);
	updateEndpoint(endpointId, { queryParams: updatedParams });
}

