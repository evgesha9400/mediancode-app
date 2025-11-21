import { writable, derived, get } from 'svelte/store';
import { fieldsStore } from './fields';
import type { Field } from './fields';
import { getValidatorCategoriesForType } from './types';
import type { PrimitiveTypeName } from './types';

export interface ValidatorBase {
	name: string;
	category: 'string' | 'numeric' | 'collection';
	description: string;
	type: 'inline' | 'custom';
	parameterType: string;
	exampleUsage: string;
	pydanticDocsUrl: string;
}

export interface Validator extends ValidatorBase {
	usedInFields: number;
	fieldsUsingValidator: Array<{ name: string; fieldId: string }>;
}

const inlineValidators: ValidatorBase[] = [
	{
		name: 'min_length',
		category: 'string',
		description: 'Validates minimum string length. This validator ensures that string fields meet a minimum character count requirement.',
		type: 'inline',
		parameterType: 'Integer',
		exampleUsage: 'Field(..., min_length=3)',
		pydanticDocsUrl: 'https://docs.pydantic.dev/latest/api/fields/#pydantic.fields.Field'
	},
	{
		name: 'max_length',
		category: 'string',
		description: 'Validates maximum string length. Prevents string fields from exceeding a specified character limit.',
		type: 'inline',
		parameterType: 'Integer',
		exampleUsage: 'Field(..., max_length=100)',
		pydanticDocsUrl: 'https://docs.pydantic.dev/latest/api/fields/#pydantic.fields.Field'
	},
	{
		name: 'regex',
		category: 'string',
		description: 'Validates against regex pattern. Ensures string values match a specific regular expression pattern.',
		type: 'inline',
		parameterType: 'String (regex pattern)',
		exampleUsage: 'Field(..., pattern=r"^[A-Za-z0-9]+$")',
		pydanticDocsUrl: 'https://docs.pydantic.dev/latest/api/fields/#pydantic.fields.Field'
	},
	{
		name: 'gt',
		category: 'numeric',
		description: 'Greater than validation. Ensures numeric values are strictly greater than a specified threshold.',
		type: 'inline',
		parameterType: 'Number',
		exampleUsage: 'Field(..., gt=0)',
		pydanticDocsUrl: 'https://docs.pydantic.dev/latest/api/fields/#pydantic.fields.Field'
	},
	{
		name: 'ge',
		category: 'numeric',
		description: 'Greater than or equal validation. Ensures numeric values are greater than or equal to a specified minimum.',
		type: 'inline',
		parameterType: 'Number',
		exampleUsage: 'Field(..., ge=0)',
		pydanticDocsUrl: 'https://docs.pydantic.dev/latest/api/fields/#pydantic.fields.Field'
	},
	{
		name: 'lt',
		category: 'numeric',
		description: 'Less than validation. Ensures numeric values are strictly less than a specified maximum.',
		type: 'inline',
		parameterType: 'Number',
		exampleUsage: 'Field(..., lt=100)',
		pydanticDocsUrl: 'https://docs.pydantic.dev/latest/api/fields/#pydantic.fields.Field'
	},
	{
		name: 'le',
		category: 'numeric',
		description: 'Less than or equal validation. Ensures numeric values are less than or equal to a specified maximum.',
		type: 'inline',
		parameterType: 'Number',
		exampleUsage: 'Field(..., le=100)',
		pydanticDocsUrl: 'https://docs.pydantic.dev/latest/api/fields/#pydantic.fields.Field'
	},
	{
		name: 'multiple_of',
		category: 'numeric',
		description: 'Multiple of validation. Ensures numeric values are multiples of a specified number.',
		type: 'inline',
		parameterType: 'Number',
		exampleUsage: 'Field(..., multiple_of=5)',
		pydanticDocsUrl: 'https://docs.pydantic.dev/latest/api/fields/#pydantic.fields.Field'
	},
	{
		name: 'min_items',
		category: 'collection',
		description: 'Minimum items in collection. Ensures lists or arrays contain at least a specified number of items.',
		type: 'inline',
		parameterType: 'Integer',
		exampleUsage: 'Field(..., min_length=1)',
		pydanticDocsUrl: 'https://docs.pydantic.dev/latest/api/fields/#pydantic.fields.Field'
	},
	{
		name: 'max_items',
		category: 'collection',
		description: 'Maximum items in collection. Limits the number of items allowed in lists or arrays.',
		type: 'inline',
		parameterType: 'Integer',
		exampleUsage: 'Field(..., max_length=10)',
		pydanticDocsUrl: 'https://docs.pydantic.dev/latest/api/fields/#pydantic.fields.Field'
	},
	{
		name: 'unique_items',
		category: 'collection',
		description: 'Ensures unique items in collection. Validates that all items in a list or array are distinct.',
		type: 'inline',
		parameterType: 'Boolean',
		exampleUsage: 'Field(..., unique_items=True)',
		pydanticDocsUrl: 'https://docs.pydantic.dev/latest/api/fields/#pydantic.fields.Field'
	}
];

const customValidators: ValidatorBase[] = [
	{
		name: 'email_format',
		category: 'string',
		description: 'Validates email address format. Custom validator that ensures email addresses are properly formatted and valid.',
		type: 'custom',
		parameterType: 'String',
		exampleUsage: '@field_validator("email")\ndef validate_email(cls, v):\n    if not re.match(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$", v):\n        raise ValueError("Invalid email format")\n    return v',
		pydanticDocsUrl: 'https://docs.pydantic.dev/latest/concepts/validators/'
	},
	{
		name: 'phone_number',
		category: 'string',
		description: 'Validates phone number format. Custom validator that ensures phone numbers match standard international formats.',
		type: 'custom',
		parameterType: 'String',
		exampleUsage: '@field_validator("phone")\ndef validate_phone(cls, v):\n    if not re.match(r"^\\+?[1-9]\\d{1,14}$", v):\n        raise ValueError("Invalid phone number")\n    return v',
		pydanticDocsUrl: 'https://docs.pydantic.dev/latest/concepts/validators/'
	},
	{
		name: 'url_format',
		category: 'string',
		description: 'Validates URL format. Custom validator that ensures URLs are properly formatted and valid.',
		type: 'custom',
		parameterType: 'String',
		exampleUsage: '@field_validator("website")\ndef validate_url(cls, v):\n    if not v.startswith(("http://", "https://")):\n        raise ValueError("Invalid URL format")\n    return v',
		pydanticDocsUrl: 'https://docs.pydantic.dev/latest/concepts/validators/'
	}
];

const allValidatorsBase: ValidatorBase[] = [...inlineValidators, ...customValidators];

// Base store for validator definitions (without usage data)
const validatorsBaseStore = writable<ValidatorBase[]>(allValidatorsBase);

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

export function getValidatorsByType(type: 'inline' | 'custom'): Validator[] {
	return get(validatorsStore).filter(v => v.type === type);
}

export function getTotalValidatorCount(): number {
	return allValidatorsBase.length;
}

export function searchValidators(query: string): Validator[] {
	const lowerQuery = query.toLowerCase().trim();
	const validators = get(validatorsStore);

	if (!lowerQuery) {
		return validators;
	}

	return validators.filter(validator =>
		validator.name.toLowerCase().includes(lowerQuery) ||
		validator.description.toLowerCase().includes(lowerQuery) ||
		validator.category.toLowerCase().includes(lowerQuery)
	);
}

export function getValidatorsByFieldType(fieldType: PrimitiveTypeName): Validator[] {
	const validators = get(validatorsStore);

	// Get compatible validator categories from the centralized types store
	const compatibleCategories = getValidatorCategoriesForType(fieldType);

	// If no compatible categories, return empty array
	if (compatibleCategories.length === 0) {
		return [];
	}

	// Filter validators by compatible categories
	return validators.filter(validator =>
		compatibleCategories.includes(validator.category)
	);
}
