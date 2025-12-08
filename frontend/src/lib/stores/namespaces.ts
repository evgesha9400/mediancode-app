import { writable, derived, get } from 'svelte/store';
import type { Namespace, DeletionResult } from '$lib/types';
import { initialNamespaces, GLOBAL_NAMESPACE_ID } from './initialData';
import { generateId } from '$lib/utils/ids';
import { fieldsStore } from './fields';
import { validatorsStore } from './validators';
import { objectsStore } from './objects';
import { endpointsStore, tagsStore } from './apis';

// ============================================================================
// Namespace Store
// ============================================================================

export const namespacesStore = writable<Namespace[]>(initialNamespaces);

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
	const validators = get(validatorsStore).filter(v => v.namespaceId === namespaceId);
	const objects = get(objectsStore).filter(o => o.namespaceId === namespaceId);
	const endpoints = get(endpointsStore).filter(e => e.namespaceId === namespaceId);
	const tags = get(tagsStore).filter(t => t.namespaceId === namespaceId);

	return fields.length + validators.length + objects.length + endpoints.length + tags.length;
}

/**
 * Get detailed entity counts for a namespace
 */
export function getNamespaceEntityDetails(namespaceId: string): {
	fields: number;
	validators: number;
	objects: number;
	endpoints: number;
	tags: number;
	total: number;
} {
	const fields = get(fieldsStore).filter(f => f.namespaceId === namespaceId).length;
	const validators = get(validatorsStore).filter(v => v.namespaceId === namespaceId).length;
	const objects = get(objectsStore).filter(o => o.namespaceId === namespaceId).length;
	const endpoints = get(endpointsStore).filter(e => e.namespaceId === namespaceId).length;
	const tags = get(tagsStore).filter(t => t.namespaceId === namespaceId).length;

	return {
		fields,
		validators,
		objects,
		endpoints,
		tags,
		total: fields + validators + objects + endpoints + tags
	};
}

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Create a new namespace with uniqueness guard
 *
 * @param name - The name for the new namespace
 * @param description - Optional description for the namespace
 * @returns The created namespace, or undefined if a namespace with that name already exists
 */
export function createNamespace(name: string, description: string = ''): Namespace | undefined {
	const trimmedName = name.trim();

	// Check for existing namespace with same name (case-insensitive)
	const existingNamespace = get(namespacesStore).find(
		ns => ns.name.toLowerCase() === trimmedName.toLowerCase()
	);

	if (existingNamespace) {
		return undefined;
	}

	const newNamespace: Namespace = {
		id: generateId('namespace'),
		name: trimmedName,
		description,
		locked: false
	};

	namespacesStore.update(namespaces => [...namespaces, newNamespace]);
	return newNamespace;
}

/**
 * Update a namespace's properties
 * Locked namespaces (like global) cannot be updated
 *
 * @param id - The ID of the namespace to update
 * @param updates - Partial namespace object with properties to update
 */
export function updateNamespace(id: string, updates: Partial<Namespace>): void {
	namespacesStore.update(namespaces => {
		return namespaces.map(ns => {
			if (ns.id !== id) return ns;
			// Locked namespaces cannot be updated
			if (ns.locked) return ns;
			// Cannot set locked to true via updates
			const { locked, ...safeUpdates } = updates;
			return { ...ns, ...safeUpdates };
		});
	});
}

/**
 * Delete a namespace
 * Cannot delete locked namespaces (like global)
 * Cannot delete namespaces that contain entities
 *
 * @param id - The ID of the namespace to delete
 * @returns DeletionResult with success status and error message if blocked
 */
export function deleteNamespace(id: string): DeletionResult {
	const namespace = getNamespaceById(id);

	if (!namespace) {
		return {
			success: false,
			error: `Namespace with ID "${id}" not found.`
		};
	}

	if (namespace.locked) {
		return {
			success: false,
			error: `Cannot delete the "${namespace.name}" namespace because it is locked.`
		};
	}

	const entityCount = getNamespaceEntityCount(id);

	if (entityCount > 0) {
		const details = getNamespaceEntityDetails(id);
		const parts: string[] = [];
		if (details.fields > 0) parts.push(`${details.fields} field${details.fields > 1 ? 's' : ''}`);
		if (details.validators > 0) parts.push(`${details.validators} validator${details.validators > 1 ? 's' : ''}`);
		if (details.objects > 0) parts.push(`${details.objects} object${details.objects > 1 ? 's' : ''}`);
		if (details.endpoints > 0) parts.push(`${details.endpoints} endpoint${details.endpoints > 1 ? 's' : ''}`);
		if (details.tags > 0) parts.push(`${details.tags} tag${details.tags > 1 ? 's' : ''}`);

		return {
			success: false,
			error: `Cannot delete namespace "${namespace.name}" because it contains ${parts.join(', ')}. Remove all entities before deleting.`
		};
	}

	// If this is the active namespace, switch to global
	if (get(activeNamespaceId) === id) {
		activeNamespaceId.set(GLOBAL_NAMESPACE_ID);
	}

	namespacesStore.update(namespaces => namespaces.filter(ns => ns.id !== id));

	return { success: true };
}

/**
 * Set the active namespace
 *
 * @param namespaceId - The ID of the namespace to make active
 */
export function setActiveNamespace(namespaceId: string): void {
	const namespace = getNamespaceById(namespaceId);
	if (namespace) {
		activeNamespaceId.set(namespaceId);
	}
}

// Re-export the global namespace ID constant
export { GLOBAL_NAMESPACE_ID } from './initialData';
