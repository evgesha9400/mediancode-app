import { writable, derived, get } from 'svelte/store';
import { fieldsStore } from './fields';
import type { Field } from './fields';
import { getValidatorCategoriesForType } from './types';
import type { PrimitiveTypeName } from './types';
import { checkValidatorDeletion } from '$lib/utils/references';
import type { DeletionResult } from '$lib/types';
import { initialInlineValidators, initialCustomValidators, type ValidatorBase } from './initialData';

// Re-export types from initialData for backwards compatibility
export type { ValidatorBase } from './initialData';

export interface Validator extends ValidatorBase {
	usedInFields: number;
	fieldsUsingValidator: Array<{ name: string; fieldId: string }>;
}

// Use centralized data from initialData module
const inlineValidators = initialInlineValidators;

// Writable store for custom validators (can be modified)
// Initialize with centralized custom validators
const customValidatorsStore = writable(initialCustomValidators);

// Base store that combines inline validators and custom validators
const validatorsBaseStore = derived(
	customValidatorsStore,
	($customValidators) => [...inlineValidators, ...$customValidators]
);

// Derived store that calculates validator usage dynamically based on fieldsStore
export const validatorsStore = derived(
	[validatorsBaseStore, fieldsStore],
	([$validatorsBase, $fields]) => {
		// Calculate usage for each validator
		return $validatorsBase.map(validatorBase => {
			const fieldsUsingValidator: Array<{ name: string; fieldId: string }> = [];

			$fields.forEach(field => {
				const usesValidator = field.validators.some(v => v.name === validatorBase.name);
				if (usesValidator) {
					fieldsUsingValidator.push({
						name: field.name,
						fieldId: field.id
					});
				}
			});

			return {
				...validatorBase,
				usedInFields: fieldsUsingValidator.length,
				fieldsUsingValidator
			} as Validator;
		});
	}
);

export function getTotalValidatorCount(): number {
	return get(validatorsBaseStore).length;
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
 * Delete a custom validator by name
 * Only custom validators can be deleted, inline validators are protected
 * Checks for references before deletion to prevent breaking field validators
 *
 * @param validatorName - The name of the validator to delete
 * @returns DeletionResult - Contains success status and error message if blocked by references
 */
export function deleteValidator(validatorName: string): DeletionResult {
	const currentCustom = get(customValidatorsStore);
	const validator = currentCustom.find(v => v.name === validatorName);

	// Prevent deletion if validator not found in custom validators
	if (!validator) {
		return {
			success: false,
			error: `Validator "${validatorName}" not found or is a built-in validator that cannot be deleted.`
		};
	}

	// Get the full validator with usage information
	const fullValidator = get(validatorsStore).find(v => v.name === validatorName);
	if (!fullValidator) {
		return {
			success: false,
			error: `Unable to retrieve validator information for "${validatorName}".`
		};
	}

	// Check if validator can be safely deleted
	const deletionCheck = checkValidatorDeletion(
		validatorName,
		fullValidator.fieldsUsingValidator
	);

	if (!deletionCheck.success) {
		return deletionCheck;
	}

	// Remove the custom validator from the custom validators store
	customValidatorsStore.update(validators => {
		return validators.filter(v => v.name !== validatorName);
	});

	return { success: true };
}
