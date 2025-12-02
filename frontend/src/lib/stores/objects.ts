import { writable } from 'svelte/store';
import type { DeletionResult, ObjectDefinition } from '$lib/types';
import { checkObjectDeletion } from '$lib/utils/references';
import { initialObjects } from './initialData';

// Re-export types from types for backwards compatibility
export type { ObjectDefinition } from '$lib/types';

export const objectsStore = writable<ObjectDefinition[]>(initialObjects);

export function getObjectById(id: string): ObjectDefinition | undefined {
	let result: ObjectDefinition | undefined;
	objectsStore.subscribe(objects => {
		result = objects.find(o => o.id === id);
	})();
	return result;
}

export function getTotalObjectCount(): number {
	let count = 0;
	objectsStore.subscribe(objects => {
		count = objects.length;
	})();
	return count;
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
