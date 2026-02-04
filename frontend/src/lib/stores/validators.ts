import { writable, get } from 'svelte/store';
import { getValidatorCategoriesForType } from './types';
import type { PrimitiveTypeName } from './types';
import { checkValidatorDeletion } from '$lib/utils/references';
import type { DeletionResult } from '$lib/types';
import { GLOBAL_NAMESPACE_ID, type ValidatorBase } from './initialData';
import { generateId } from '$lib/utils/ids';

// Re-export types from initialData for backwards compatibility
export type { ValidatorBase } from './initialData';

export interface Validator extends ValidatorBase {
	usedInFields: number;
	fieldsUsingValidator: Array<{ name: string; fieldId: string }>;
}

// Main validators store - data will be loaded from API via loader.ts
// The API returns validators with usage information already calculated
export const validatorsStore = writable<Validator[]>([]);

export function getTotalValidatorCount(): number {
	return get(validatorsStore).length;
}

// ============================================================================
// Namespace Filtering
// ============================================================================

/**
 * Get all validators for a specific namespace
 */
export function getValidatorsByNamespace(namespaceId: string): Validator[] {
	return get(validatorsStore).filter(v => v.namespaceId === namespaceId);
}

/**
 * Get the count of validators in a specific namespace
 */
export function getValidatorCountByNamespace(namespaceId: string): number {
	return get(validatorsStore).filter(v => v.namespaceId === namespaceId).length;
}

export function searchValidators(validators: Validator[], query: string): Validator[] {
	const lowerQuery = query.toLowerCase().trim();

	if (!lowerQuery) {
		return validators;
	}

	return validators.filter(validator =>
		validator.name.toLowerCase().includes(lowerQuery) ||
		validator.description.toLowerCase().includes(lowerQuery) ||
		validator.type.toLowerCase().includes(lowerQuery)
	);
}

export function getValidatorsByFieldType(fieldType: PrimitiveTypeName): Validator[] {
	const validators = get(validatorsStore);

	// Get compatible validator types from the centralized types store
	const compatibleTypes = getValidatorCategoriesForType(fieldType);

	// If no compatible types, return empty array
	if (compatibleTypes.length === 0) {
		return [];
	}

	// Filter validators by compatible types
	return validators.filter(validator =>
		compatibleTypes.includes(validator.type)
	);
}

/**
 * Get validators filtered by both namespace and field type compatibility
 * This follows the namespace isolation rule: validators must be in the same namespace as the field
 *
 * @param fieldType - The field type to match validators against
 * @param namespaceId - The namespace to filter validators by
 * @returns Array of validators that match both namespace and type
 */
export function getValidatorsByFieldTypeAndNamespace(
	fieldType: PrimitiveTypeName,
	namespaceId: string
): Validator[] {
	const validators = get(validatorsStore);

	// Get compatible validator types from the centralized types store
	const compatibleTypes = getValidatorCategoriesForType(fieldType);

	// If no compatible types, return empty array
	if (compatibleTypes.length === 0) {
		return [];
	}

	// Filter validators by namespace AND compatible types
	return validators.filter(validator =>
		validator.namespaceId === namespaceId &&
		compatibleTypes.includes(validator.type)
	);
}

/**
 * Delete a custom validator by name
 * Only custom validators can be deleted, inline validators are protected
 * Checks for references before deletion to prevent breaking field validators
 *
 * @param validatorName - The name of the validator to delete
 * @returns DeletionResult - Contains success status and error message if blocked by references
 */
export function deleteValidator(validatorName: string): DeletionResult {
	const allValidators = get(validatorsStore);
	const validator = allValidators.find(v => v.name === validatorName);

	// Prevent deletion if validator not found
	if (!validator) {
		return {
			success: false,
			error: `Validator "${validatorName}" not found.`
		};
	}

	// Prevent deletion of inline validators
	if (validator.category === 'inline') {
		return {
			success: false,
			error: `Validator "${validatorName}" is a built-in validator that cannot be deleted.`
		};
	}

	// Check if validator can be safely deleted
	const deletionCheck = checkValidatorDeletion(
		validatorName,
		validator.fieldsUsingValidator
	);

	if (!deletionCheck.success) {
		return deletionCheck;
	}

	// Remove the validator from the store
	validatorsStore.update(validators => {
		return validators.filter(v => v.name !== validatorName);
	});

	return { success: true };
}

// ============================================================================
// Validator Lifecycle Operations
// ============================================================================

/**
 * Create a new custom validator with uniqueness guard within the namespace
 *
 * @param name - The name for the new validator
 * @param type - The validator type (string, numeric, or collection)
 * @param description - Description of the validator
 * @param namespaceId - The namespace to create the validator in (defaults to global)
 * @returns The created validator, or undefined if a validator with that name already exists in the namespace
 */
export function createValidator(
	name: string,
	type: 'string' | 'numeric' | 'collection',
	description: string,
	namespaceId: string = GLOBAL_NAMESPACE_ID
): Validator | undefined {
	const trimmedName = name.trim();

	// Check for existing validator with same name in the same namespace (case-insensitive)
	const existingValidator = get(validatorsStore).find(
		v => v.name.toLowerCase() === trimmedName.toLowerCase() && v.namespaceId === namespaceId
	);

	if (existingValidator) {
		return undefined;
	}

	const newValidator: Validator = {
		name: trimmedName,
		namespaceId,
		type,
		description,
		category: 'custom',
		parameterType: '',
		exampleUsage: '',
		pydanticDocsUrl: '',
		usedInFields: 0,
		fieldsUsingValidator: []
	};

	validatorsStore.update(validators => [...validators, newValidator]);
	return newValidator;
}

/**
 * Add a pre-constructed validator (for API data loading)
 */
export function addValidator(validator: Validator): void {
	validatorsStore.update(validators => [...validators, validator]);
}
