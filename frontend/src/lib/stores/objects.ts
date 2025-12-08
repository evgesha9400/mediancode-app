import { writable, get } from 'svelte/store';
import type { DeletionResult, ObjectDefinition } from '$lib/types';
import { checkObjectDeletion } from '$lib/utils/references';
import { initialObjects, GLOBAL_NAMESPACE_ID } from './initialData';
import { generateId } from '$lib/utils/ids';

// Re-export types from types for backwards compatibility
export type { ObjectDefinition } from '$lib/types';

export const objectsStore = writable<ObjectDefinition[]>(initialObjects);

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

export function updateObject(id: string, updates: Partial<ObjectDefinition>): void {
	objectsStore.update(objects => {
		return objects.map(obj =>
			obj.id === id ? { ...obj, ...updates } : obj
		);
	});
}

/**
 * Delete an object by ID
 * Checks for API references before deletion to prevent breaking API dependencies
 *
 * @param id - The ID of the object to delete
 * @returns DeletionResult - Contains success status and error message if blocked by references
 */
export function deleteObject(id: string): DeletionResult {
	const objectToDelete = getObjectById(id);

	if (!objectToDelete) {
		return {
			success: false,
			error: `Object with ID "${id}" not found.`
		};
	}

	// Check if object can be safely deleted
	const deletionCheck = checkObjectDeletion(objectToDelete.name, objectToDelete.usedInApis);

	if (!deletionCheck.success) {
		return deletionCheck;
	}

	// Remove the object from the store
	objectsStore.update(objects => {
		return objects.filter(obj => obj.id !== id);
	});

	return { success: true };
}

// ============================================================================
// Object Lifecycle Operations
// ============================================================================

/**
 * Create a new object with uniqueness guard within the namespace
 *
 * @param name - The name for the new object
 * @param namespaceId - The namespace to create the object in (defaults to global)
 * @param options - Optional object properties (description, fields, etc.)
 * @returns The created object, or undefined if an object with that name already exists in the namespace
 */
export function createObject(
	name: string,
	namespaceId: string = GLOBAL_NAMESPACE_ID,
	options: Partial<Omit<ObjectDefinition, 'id' | 'name' | 'namespaceId'>> = {}
): ObjectDefinition | undefined {
	const trimmedName = name.trim();

	// Check for existing object with same name in the same namespace (case-insensitive)
	const existingObject = get(objectsStore).find(
		o => o.name.toLowerCase() === trimmedName.toLowerCase() && o.namespaceId === namespaceId
	);

	if (existingObject) {
		return undefined;
	}

	const newObject: ObjectDefinition = {
		id: generateId('object'),
		namespaceId,
		name: trimmedName,
		description: options.description ?? '',
		fields: options.fields ?? [],
		usedInApis: options.usedInApis ?? []
	};

	objectsStore.update(objects => [...objects, newObject]);
	return newObject;
}

/**
 * Add a pre-constructed object (legacy support)
 */
export function addObject(object: ObjectDefinition): void {
	objectsStore.update(objects => [...objects, object]);
}
