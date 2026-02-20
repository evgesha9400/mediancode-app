import { writable, get } from 'svelte/store';
import type { FieldValidator } from '$lib/types';

// Re-export type for backwards compatibility
export type { FieldValidator } from '$lib/types';

// Initialize with empty array - data will be loaded from API via loader.ts
export const fieldValidatorsStore = writable<FieldValidator[]>([]);

export function getFieldValidatorById(id: string): FieldValidator | undefined {
	return get(fieldValidatorsStore).find(fv => fv.id === id);
}

export function getTotalFieldValidatorCount(): number {
	return get(fieldValidatorsStore).length;
}

// ============================================================================
// Namespace Filtering
// ============================================================================

/**
 * Get all field validators for a specific namespace
 */
export function getFieldValidatorsByNamespace(namespaceId: string): FieldValidator[] {
	return get(fieldValidatorsStore).filter(fv => fv.namespaceId === namespaceId);
}

// ============================================================================
// Search
// ============================================================================

export function searchFieldValidators(fieldValidators: FieldValidator[], query: string): FieldValidator[] {
	const lowerQuery = query.toLowerCase().trim();

	if (!lowerQuery) {
		return fieldValidators;
	}

	return fieldValidators.filter(fv =>
		fv.name.toLowerCase().includes(lowerQuery) ||
		fv.description.toLowerCase().includes(lowerQuery) ||
		fv.compatibleTypes.some(t => t.toLowerCase().includes(lowerQuery)) ||
		fv.mode.toLowerCase().includes(lowerQuery) ||
		fv.code.toLowerCase().includes(lowerQuery)
	);
}
