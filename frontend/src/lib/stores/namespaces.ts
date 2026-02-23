import { writable, derived, get } from 'svelte/store';
import type { Namespace } from '$lib/types';
import { GLOBAL_NAMESPACE_ID } from '$lib/constants';
import { fieldsStore } from './fields';
import { fieldConstraintsStore } from './fieldConstraints';
import { objectsStore } from './objects';
import { endpointsStore, apisStore } from './apis';
// ============================================================================
// Namespace Store
// ============================================================================

// Initialize with empty array - data will be loaded from API via loader.ts
export const namespacesStore = writable<Namespace[]>([]);

// Active namespace selector (global by default)
export const activeNamespaceId = writable<string>(GLOBAL_NAMESPACE_ID);

// Derived store for active namespace
export const activeNamespace = derived(
	[namespacesStore, activeNamespaceId],
	([$namespaces, $activeId]) => {
		return $namespaces.find(ns => ns.id === $activeId);
	}
);

// ============================================================================
// Selectors
// ============================================================================

/**
 * Get a namespace by its ID
 */
export function getNamespaceById(id: string): Namespace | undefined {
	return get(namespacesStore).find(ns => ns.id === id);
}

/**
 * Get the total number of namespaces
 */
export function getTotalNamespaceCount(): number {
	return get(namespacesStore).length;
}

/**
 * Search namespaces by name or description
 */
export function searchNamespaces(namespaces: Namespace[], query: string): Namespace[] {
	const lowerQuery = query.toLowerCase().trim();

	if (!lowerQuery) {
		return namespaces;
	}

	return namespaces.filter(ns =>
		ns.name.toLowerCase().includes(lowerQuery) ||
		ns.description?.toLowerCase().includes(lowerQuery)
	);
}

// ============================================================================
// Reference Counting
// ============================================================================

/**
 * Count all entities within a namespace
 */
export function getNamespaceEntityCount(namespaceId: string): number {
	const fields = get(fieldsStore).filter(f => f.namespaceId === namespaceId);
	const fieldConstraints = get(fieldConstraintsStore).filter(v => v.namespaceId === namespaceId);
	const objects = get(objectsStore).filter(o => o.namespaceId === namespaceId);
	const namespaceApiIds = new Set(get(apisStore).filter(a => a.namespaceId === namespaceId).map(a => a.id));
	const endpoints = get(endpointsStore).filter(e => namespaceApiIds.has(e.apiId));
	const apis = namespaceApiIds.size;

	return fields.length + fieldConstraints.length + objects.length + endpoints.length + apis;
}

/**
 * Get detailed entity counts for a namespace
 */
export function getNamespaceEntityDetails(namespaceId: string): {
	fields: number;
	fieldConstraints: number;
	objects: number;
	endpoints: number;
	apis: number;
	total: number;
} {
	const fields = get(fieldsStore).filter(f => f.namespaceId === namespaceId).length;
	const fieldConstraints = get(fieldConstraintsStore).filter(v => v.namespaceId === namespaceId).length;
	const objects = get(objectsStore).filter(o => o.namespaceId === namespaceId).length;
	const namespaceApiIds = new Set(get(apisStore).filter(a => a.namespaceId === namespaceId).map(a => a.id));
	const endpoints = get(endpointsStore).filter(e => namespaceApiIds.has(e.apiId)).length;
	const apis = namespaceApiIds.size;

	return {
		fields,
		fieldConstraints,
		objects,
		endpoints,
		apis,
		total: fields + fieldConstraints + objects + endpoints + apis
	};
}

// ============================================================================
// Active Namespace Management
// ============================================================================

/**
 * Set the active namespace
 */
export function setActiveNamespace(namespaceId: string): void {
	const namespace = getNamespaceById(namespaceId);
	if (namespace) {
		activeNamespaceId.set(namespaceId);
	}
}

// Re-export the global namespace ID constant
export { GLOBAL_NAMESPACE_ID } from '$lib/constants';
