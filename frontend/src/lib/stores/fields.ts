import { writable } from 'svelte/store';
import type { PrimitiveTypeName } from './types';
import { checkFieldDeletion } from '$lib/utils/references';
import type { DeletionResult } from '$lib/types';
import { initialFields, type Field, type FieldValidator } from './initialData';

// Re-export types from initialData for backwards compatibility
export type { Field, FieldValidator } from './initialData';

export const fieldsStore = writable<Field[]>(initialFields);

export function getFieldById(id: string): Field | undefined {
	let result: Field | undefined;
	fieldsStore.subscribe(fields => {
		result = fields.find(f => f.id === id);
	})();
	return result;
}

export function getTotalFieldCount(): number {
	let count = 0;
	fieldsStore.subscribe(fields => {
		count = fields.length;
	})();
	return count;
}

export function getTotalApiCount(): number {
	let apiCount = 0;
	fieldsStore.subscribe(fields => {
		// Collect all unique API IDs from all fields
		const uniqueApis = new Set<string>();
		fields.forEach(field => {
			field.usedInApis.forEach(apiId => {
				uniqueApis.add(apiId);
			});
		});
		apiCount = uniqueApis.size;
	})();
	return apiCount;
}

export function searchFields(fields: Field[], query: string): Field[] {
	const lowerQuery = query.toLowerCase().trim();

	if (!lowerQuery) {
		return fields;
	}

	return fields.filter(field =>
		field.name.toLowerCase().includes(lowerQuery) ||
		field.type.toLowerCase().includes(lowerQuery) ||
		field.description?.toLowerCase().includes(lowerQuery) ||
		field.validators.some(v => v.name.toLowerCase().includes(lowerQuery))
	);
}

export function updateField(id: string, updates: Partial<Field>): void {
	fieldsStore.update(fields => {
		return fields.map(field =>
			field.id === id ? { ...field, ...updates } : field
		);
	});
}

/**
 * Delete a field by ID
 * Checks for API references before deletion to prevent breaking API dependencies
 *
 * @param id - The ID of the field to delete
 * @returns DeletionResult - Contains success status and error message if blocked by references
 */
export function deleteField(id: string): DeletionResult {
	// Reuse centralized getFieldById helper
	const fieldToDelete = getFieldById(id);

	if (!fieldToDelete) {
		return {
			success: false,
			error: `Field with ID "${id}" not found.`
		};
	}

	// Check if field can be safely deleted
	const deletionCheck = checkFieldDeletion(fieldToDelete.name, fieldToDelete.usedInApis);

	if (!deletionCheck.success) {
		return deletionCheck;
	}

	// Remove the field from the store
	fieldsStore.update(fields => {
		return fields.filter(field => field.id !== id);
	});

	return { success: true };
}
