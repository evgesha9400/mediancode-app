import { writable, get } from 'svelte/store';
import type { Field, FieldConstraintValue } from '$lib/types';

// Re-export types for backwards compatibility
export type { Field, FieldConstraintValue } from '$lib/types';

// Initialize with empty array - data will be loaded from API via loader.ts
export const fieldsStore = writable<Field[]>([]);

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
		(field.container && field.container.toLowerCase().includes(lowerQuery)) ||
		field.description?.toLowerCase().includes(lowerQuery) ||
		field.constraints.some(c => c.name.toLowerCase().includes(lowerQuery))
	);
}
