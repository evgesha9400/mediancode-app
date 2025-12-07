/**
 * Validator Fixtures
 *
 * Mock validators for testing validator-related features.
 *
 * IMPORTANT: This module now imports from the centralized initialData module
 * to ensure consistency between runtime stores and test fixtures.
 *
 * Single source of truth: src/lib/stores/initialData.ts
 */

import {
	initialInlineValidators,
	initialCustomValidators,
	cloneValidatorBases,
	type ValidatorBase
} from '../../src/lib/stores/initialData';

// Re-export types from centralized module
export type { ValidatorBase } from '../../src/lib/stores/initialData';

export interface Validator extends ValidatorBase {
	usedInFields: number;
	fieldsUsingValidator: Array<{ name: string; fieldId: string }>;
}

/**
 * Mock validators - uses centralized data
 * We clone the data to ensure test isolation
 */
export const mockInlineValidators = cloneValidatorBases(initialInlineValidators);
export const mockCustomValidators = cloneValidatorBases(initialCustomValidators);
export const mockValidatorBases = [...mockInlineValidators, ...mockCustomValidators];

export const mockValidators: Validator[] = mockValidatorBases.map((base, index) => ({
	...base,
	usedInFields: index % 2 === 0 ? 3 : 1,
	fieldsUsingValidator:
		index % 2 === 0
			? [
					{ name: 'email', fieldId: 'field-1' },
					{ name: 'username', fieldId: 'field-2' },
					{ name: 'password', fieldId: 'field-3' }
				]
			: [{ name: 'username', fieldId: 'field-2' }]
}));

/**
 * Get a validator by name
 */
export function getValidatorByName(name: string): Validator | undefined {
	return mockValidators.find((validator) => validator.name === name);
}

/**
 * Get validators by type
 */
export function getValidatorsByType(
	type: 'string' | 'numeric' | 'collection'
): Validator[] {
	return mockValidators.filter((validator) => validator.type === type);
}

/**
 * Get validators by category
 */
export function getValidatorsByCategory(category: 'inline' | 'custom'): Validator[] {
	return mockValidators.filter((validator) => validator.category === category);
}
