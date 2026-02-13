import { writable, get } from 'svelte/store';
import { checkConstraintDeletion } from '$lib/utils/references';
import type { DeletionResult } from '$lib/types';
import type { ConstraintBase } from './initialData';

// Re-export types from initialData for backwards compatibility
export type { ConstraintBase } from './initialData';

export interface Constraint extends ConstraintBase {
	usedInFields: number;
	fieldsUsingConstraint: Array<{ name: string; fieldId: string }>;
}

// Main constraints store - data will be loaded from API via loader.ts
// The API returns constraints with usage information already calculated
export const constraintsStore = writable<Constraint[]>([]);

export function getTotalConstraintCount(): number {
	return get(constraintsStore).length;
}

// ============================================================================
// Search
// ============================================================================

export function searchConstraints(constraints: Constraint[], query: string): Constraint[] {
	const lowerQuery = query.toLowerCase().trim();

	if (!lowerQuery) {
		return constraints;
	}

	return constraints.filter(constraint =>
		constraint.name.toLowerCase().includes(lowerQuery) ||
		constraint.description.toLowerCase().includes(lowerQuery) ||
		constraint.parameterType.toLowerCase().includes(lowerQuery) ||
		constraint.compatibleTypes.some(t => t.toLowerCase().includes(lowerQuery))
	);
}

export function getConstraintsByFieldType(fieldTypeName: string): Constraint[] {
	const constraints = get(constraintsStore);

	return constraints.filter(constraint =>
		constraint.compatibleTypes.includes(fieldTypeName)
	);
}

/**
 * Delete a constraint by name
 * Checks for references before deletion to prevent breaking field constraints
 *
 * @param constraintName - The name of the constraint to delete
 * @returns DeletionResult - Contains success status and error message if blocked by references
 */
export function deleteConstraint(constraintName: string): DeletionResult {
	const allConstraints = get(constraintsStore);
	const constraint = allConstraints.find(c => c.name === constraintName);

	// Prevent deletion if constraint not found
	if (!constraint) {
		return {
			success: false,
			error: `Constraint "${constraintName}" not found.`
		};
	}

	// Check if constraint can be safely deleted
	const deletionCheck = checkConstraintDeletion(
		constraintName,
		constraint.fieldsUsingConstraint
	);

	if (!deletionCheck.success) {
		return deletionCheck;
	}

	// Remove the constraint from the store
	constraintsStore.update(constraints => {
		return constraints.filter(c => c.name !== constraintName);
	});

	return { success: true };
}

/**
 * Add a pre-constructed constraint (for API data loading)
 */
export function addConstraint(constraint: Constraint): void {
	constraintsStore.update(constraints => [...constraints, constraint]);
}
