/**
 * Field Constraint Fixtures
 *
 * Mock field constraints for testing field constraint-related features.
 *
 * Single source of truth for test seed data: tests/fixtures/seedData.ts
 */

import {
	initialFieldConstraints,
	cloneFieldConstraintBases
} from './seedData';
import type { FieldConstraintBase } from '../../src/lib/types';

// Re-export types from centralized module
export type { FieldConstraintBase } from '../../src/lib/types';

export interface FieldConstraint extends FieldConstraintBase {
	usedInFields: number;
}

/**
 * Mock field constraints - uses centralized data
 * We clone the data to ensure test isolation
 */
export const mockFieldConstraintBases = cloneFieldConstraintBases(initialFieldConstraints);

export const mockFieldConstraints: FieldConstraint[] = mockFieldConstraintBases.map((base, index) => ({
	...base,
	usedInFields: index % 2 === 0 ? 3 : 1
}));

/**
 * Get a field constraint by name
 */
export function getFieldConstraintByName(name: string): FieldConstraint | undefined {
	return mockFieldConstraints.find((fc) => fc.name === name);
}

/**
 * Get field constraints by compatible type
 */
export function getFieldConstraintsByCompatibleType(typeName: string): FieldConstraint[] {
	return mockFieldConstraints.filter((fc) => fc.compatibleTypes.includes(typeName));
}
