import { writable, get } from 'svelte/store';
import type { FieldConstraintBase } from '$lib/types';

// Re-export types for backwards compatibility
export type { FieldConstraintBase } from '$lib/types';

export interface FieldConstraint extends FieldConstraintBase {
	usedInFields: number;
}

// Main field constraints store - data will be loaded from API via loader.ts
// The API returns field constraints with usage information already calculated
export const fieldConstraintsStore = writable<FieldConstraint[]>([]);

export function getTotalFieldConstraintCount(): number {
	return get(fieldConstraintsStore).length;
}

// ============================================================================
// Search
// ============================================================================

export function searchFieldConstraints(fieldConstraints: FieldConstraint[], query: string): FieldConstraint[] {
	const lowerQuery = query.toLowerCase().trim();

	if (!lowerQuery) {
		return fieldConstraints;
	}

	return fieldConstraints.filter(fieldConstraint =>
		fieldConstraint.name.toLowerCase().includes(lowerQuery) ||
		fieldConstraint.description.toLowerCase().includes(lowerQuery) ||
		fieldConstraint.parameterTypes.some(t => t.toLowerCase().includes(lowerQuery)) ||
		fieldConstraint.compatibleTypes.some(t => t.toLowerCase().includes(lowerQuery))
	);
}

export function getFieldConstraintsByFieldType(fieldTypeName: string): FieldConstraint[] {
	const fieldConstraints = get(fieldConstraintsStore);

	return fieldConstraints.filter(fieldConstraint =>
		fieldConstraint.compatibleTypes.includes(fieldTypeName)
	);
}

/**
 * Add a pre-constructed field constraint (for API data loading)
 */
export function addFieldConstraint(fieldConstraint: FieldConstraint): void {
	fieldConstraintsStore.update(fieldConstraints => [...fieldConstraints, fieldConstraint]);
}
