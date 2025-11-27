import { writable } from 'svelte/store';
import type { ApiMetadata, EndpointTag, ApiEndpoint } from '$lib/types';

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
// Tag CRUD Operations
// ============================================================================

export function addTag(tag: EndpointTag): void {
	tagsStore.update(tags => [...tags, tag]);
}

export function updateTag(id: string, updates: Partial<EndpointTag>): void {
	tagsStore.update(tags =>
		tags.map(tag => (tag.id === id ? { ...tag, ...updates } : tag))
	);
}

export function deleteTag(id: string): void {
	tagsStore.update(tags => tags.filter(tag => tag.id !== id));
}

export function deleteTagAndClearEndpoints(tagId: string): void {
	// Clear tagId from all endpoints using this tag
	endpointsStore.update(endpoints =>
		endpoints.map(endpoint =>
			endpoint.tagId === tagId ? { ...endpoint, tagId: undefined } : endpoint
		)
	);

	// Then delete the tag
	deleteTag(tagId);
}

export function getTagById(id: string): EndpointTag | undefined {
	let result: EndpointTag | undefined;
	tagsStore.subscribe(tags => {
		result = tags.find(t => t.id === id);
	})();
	return result;
}

// ============================================================================
// Endpoint CRUD Operations
// ============================================================================

export function addEndpoint(endpoint: ApiEndpoint): void {
	endpointsStore.update(endpoints => [...endpoints, endpoint]);
}

export function updateEndpoint(id: string, updates: Partial<ApiEndpoint>): void {
	endpointsStore.update(endpoints =>
		endpoints.map(endpoint => (endpoint.id === id ? { ...endpoint, ...updates } : endpoint))
	);
}

export function deleteEndpoint(id: string): void {
	endpointsStore.update(endpoints => endpoints.filter(endpoint => endpoint.id !== id));
}

export function getEndpointById(id: string): ApiEndpoint | undefined {
	let result: ApiEndpoint | undefined;
	endpointsStore.subscribe(endpoints => {
		result = endpoints.find(e => e.id === id);
	})();
	return result;
}

export function toggleEndpointExpanded(id: string): void {
	endpointsStore.update(endpoints =>
		endpoints.map(endpoint =>
			endpoint.id === id ? { ...endpoint, expanded: !endpoint.expanded } : endpoint
		)
	);
}

// ============================================================================
// Helper Functions
// ============================================================================

export function getTotalEndpointCount(): number {
	let count = 0;
	endpointsStore.subscribe(endpoints => {
		count = endpoints.length;
	})();
	return count;
}

export function getTotalTagCount(): number {
	let count = 0;
	tagsStore.subscribe(tags => {
		count = tags.length;
	})();
	return count;
}

export function getEndpointCountByTag(tagId: string): number {
	let count = 0;
	endpointsStore.subscribe(endpoints => {
		count = endpoints.filter(e => e.tagId === tagId).length;
	})();
	return count;
}
