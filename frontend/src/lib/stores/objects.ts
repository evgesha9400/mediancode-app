import { writable, get } from 'svelte/store';
import type { ObjectDefinition } from '$lib/types';

// Re-export types from types for backwards compatibility
export type { ObjectDefinition } from '$lib/types';

// Initialize with empty array - data will be loaded from API via loader.ts
export const objectsStore = writable<ObjectDefinition[]>([]);

export function getObjectById(id: string): ObjectDefinition | undefined {
	return get(objectsStore).find(o => o.id === id);
}

export function getTotalObjectCount(): number {
	return get(objectsStore).length;
}

// ============================================================================
// Namespace Filtering
// ============================================================================

/**
 * Get all objects for a specific namespace
 */
export function getObjectsByNamespace(namespaceId: string): ObjectDefinition[] {
	return get(objectsStore).filter(o => o.namespaceId === namespaceId);
}

/**
 * Get the count of objects in a specific namespace
 */
export function getObjectCountByNamespace(namespaceId: string): number {
	return get(objectsStore).filter(o => o.namespaceId === namespaceId).length;
}

export function searchObjects(objects: ObjectDefinition[], query: string): ObjectDefinition[] {
	const lowerQuery = query.toLowerCase().trim();

	if (!lowerQuery) {
		return objects;
	}

	return objects.filter(obj =>
		obj.name.toLowerCase().includes(lowerQuery) ||
		obj.description?.toLowerCase().includes(lowerQuery)
	);
}
