import type { GraphMutationResult } from '$lib/types';
import { objectsStore } from './objects';
import { fieldsStore } from './fields';

/**
 * Apply a graph mutation result across all affected stores.
 *
 * Relationship create/delete operations touch multiple entities (objects, fields).
 * This function reconciles all stores atomically instead of each model
 * patching its own store in isolation.
 */
export function applyGraphMutation(result: GraphMutationResult): void {
	// 1. Upsert updated objects
	if (result.updatedObjects.length > 0) {
		objectsStore.update(objects => {
			const updatedMap = new Map(result.updatedObjects.map(o => [o.id, o]));
			return objects.map(o => updatedMap.get(o.id) ?? o);
		});
	}

	// 2. Remove deleted fields, then upsert new/updated fields
	if (result.deletedFieldIds.length > 0 || result.createdFields.length > 0) {
		fieldsStore.update(fields => {
			let next = fields;

			// Remove deleted
			if (result.deletedFieldIds.length > 0) {
				const deletedSet = new Set(result.deletedFieldIds);
				next = next.filter(f => !deletedSet.has(f.id));
			}

			// Upsert created/updated
			if (result.createdFields.length > 0) {
				const existingIds = new Set(next.map(f => f.id));
				const newFields = result.createdFields.filter(f => !existingIds.has(f.id));
				next = [...next, ...newFields];
			}

			return next;
		});
	}
}
