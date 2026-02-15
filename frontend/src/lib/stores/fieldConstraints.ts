import { writable, get } from 'svelte/store';
import { checkFieldConstraintDeletion } from '$lib/utils/references';
import type { DeletionResult } from '$lib/types';
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
		fieldConstraint.parameterType.toLowerCase().includes(lowerQuery) ||
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
 * Delete a field constraint by name
 * Checks for references before deletion to prevent breaking field constraint values
 *
 * @param fieldConstraintName - The name of the field constraint to delete
 * @returns DeletionResult - Contains success status and error message if blocked by references
 */
export function deleteFieldConstraint(fieldConstraintName: string): DeletionResult {
	const allFieldConstraints = get(fieldConstraintsStore);
	const fieldConstraint = allFieldConstraints.find(c => c.name === fieldConstraintName);

	// Prevent deletion if field constraint not found
	if (!fieldConstraint) {
		return {
			success: false,
			error: `Field constraint "${fieldConstraintName}" not found.`
		};
	}

	// Check if field constraint can be safely deleted
	const deletionCheck = checkFieldConstraintDeletion(
		fieldConstraintName,
		fieldConstraint.usedInFields
	);

	if (!deletionCheck.success) {
		return deletionCheck;
	}

	// Remove the field constraint from the store
	fieldConstraintsStore.update(fieldConstraints => {
		return fieldConstraints.filter(c => c.name !== fieldConstraintName);
	});

	return { success: true };
}

/**
 * Add a pre-constructed field constraint (for API data loading)
 */
export function addFieldConstraint(fieldConstraint: FieldConstraint): void {
	fieldConstraintsStore.update(fieldConstraints => [...fieldConstraints, fieldConstraint]);
}
