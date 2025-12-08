import { writable, get } from 'svelte/store';
import type { PrimitiveTypeName } from './types';
import { checkFieldDeletion } from '$lib/utils/references';
import type { DeletionResult } from '$lib/types';
import { initialFields, GLOBAL_NAMESPACE_ID, type Field, type FieldValidator } from './initialData';
import { generateId } from '$lib/utils/ids';

// Re-export types from initialData for backwards compatibility
export type { Field, FieldValidator } from './initialData';

export const fieldsStore = writable<Field[]>(initialFields);

export function getFieldById(id: string): Field | undefined {
	return get(fieldsStore).find(f => f.id === id);
}

export function getTotalFieldCount(): number {
	return get(fieldsStore).length;
}

// ============================================================================
// Namespace Filtering
// ============================================================================

/**
 * Get all fields for a specific namespace
 */
export function getFieldsByNamespace(namespaceId: string): Field[] {
	return get(fieldsStore).filter(f => f.namespaceId === namespaceId);
}

/**
 * Get the count of fields in a specific namespace
 */
export function getFieldCountByNamespace(namespaceId: string): number {
	return get(fieldsStore).filter(f => f.namespaceId === namespaceId).length;
}

export function getTotalApiCount(): number {
	const fields = get(fieldsStore);
	// Collect all unique API IDs from all fields
	const uniqueApis = new Set<string>();
	fields.forEach(field => {
		field.usedInApis.forEach(apiId => {
			uniqueApis.add(apiId);
		});
	});
	return uniqueApis.size;
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

// ============================================================================
// Field Lifecycle Operations
// ============================================================================

/**
 * Create a new field with uniqueness guard within the namespace
 *
 * @param name - The name for the new field
 * @param type - The primitive type for the field
 * @param namespaceId - The namespace to create the field in (defaults to global)
 * @param options - Optional field properties (description, validators, etc.)
 * @returns The created field, or undefined if a field with that name already exists in the namespace
 */
export function createField(
	name: string,
	type: PrimitiveTypeName,
	namespaceId: string = GLOBAL_NAMESPACE_ID,
	options: Partial<Omit<Field, 'id' | 'name' | 'type' | 'namespaceId'>> = {}
): Field | undefined {
	const trimmedName = name.trim();

	// Check for existing field with same name in the same namespace (case-insensitive)
	const existingField = get(fieldsStore).find(
		f => f.name.toLowerCase() === trimmedName.toLowerCase() && f.namespaceId === namespaceId
	);

	if (existingField) {
		return undefined;
	}

	const newField: Field = {
		id: generateId('field'),
		namespaceId,
		name: trimmedName,
		type,
		validators: options.validators ?? [],
		usedInApis: options.usedInApis ?? [],
		description: options.description ?? ''
	};

	fieldsStore.update(fields => [...fields, newField]);
	return newField;
}

/**
 * Add a pre-constructed field (legacy support)
 */
export function addField(field: Field): void {
	fieldsStore.update(fields => [...fields, field]);
}
