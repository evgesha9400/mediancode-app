/**
 * Constraint Fixtures
 *
 * Mock constraints for testing constraint-related features.
 *
 * IMPORTANT: This module now imports from the centralized initialData module
 * to ensure consistency between runtime stores and test fixtures.
 *
 * Single source of truth: src/lib/stores/initialData.ts
 */

import {
	initialConstraints,
	cloneConstraintBases,
	type ConstraintBase
} from '../../src/lib/stores/initialData';

// Re-export types from centralized module
export type { ConstraintBase } from '../../src/lib/stores/initialData';

export interface Constraint extends ConstraintBase {
	usedInFields: number;
	fieldsUsingConstraint: Array<{ name: string; fieldId: string }>;
}

/**
 * Mock constraints - uses centralized data
 * We clone the data to ensure test isolation
 */
export const mockConstraintBases = cloneConstraintBases(initialConstraints);

export const mockConstraints: Constraint[] = mockConstraintBases.map((base, index) => ({
	...base,
	usedInFields: index % 2 === 0 ? 3 : 1,
	fieldsUsingConstraint:
		index % 2 === 0
			? [
					{ name: 'email', fieldId: '10000000-0000-0000-0000-000000000001' },
					{ name: 'username', fieldId: '10000000-0000-0000-0000-000000000002' },
					{ name: 'password', fieldId: '10000000-0000-0000-0000-000000000003' }
				]
			: [{ name: 'username', fieldId: '10000000-0000-0000-0000-000000000002' }]
}));

/**
 * Get a constraint by name
 */
export function getConstraintByName(name: string): Constraint | undefined {
	return mockConstraints.find((constraint) => constraint.name === name);
}

/**
 * Get constraints by compatible type
 */
export function getConstraintsByCompatibleType(typeName: string): Constraint[] {
	return mockConstraints.filter((constraint) => constraint.compatibleTypes.includes(typeName));
}
