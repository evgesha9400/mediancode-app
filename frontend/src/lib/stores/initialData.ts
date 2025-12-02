/**
 * Centralized Initial Data Module
 *
 * This module serves as the single source of truth for all seed data used across
 * the application and tests. By centralizing data here, we ensure consistency
 * between runtime stores and test fixtures.
 *
 * Usage:
 * - Stores import this data for initial state
 * - Test fixtures re-export or clone this data
 * - Any data changes happen in ONE place
 *
 * Pattern: This follows CLAUDE.md rules - shared data belongs in a central module.
 */

import type { PrimitiveTypeName } from './types';
import type { ObjectDefinition } from '$lib/types';

// ============================================================================
// Field Data
// ============================================================================

export interface FieldValidator {
	name: string;
	params?: Record<string, any>;
}

export interface Field {
	id: string;
	name: string;
	type: PrimitiveTypeName;
	description?: string;
	defaultValue?: string;
	validators: FieldValidator[];
	usedInApis: string[];
}

export const initialFields: Field[] = [
	{
		id: 'field-1',
		name: 'email',
		type: 'str',
		description: 'User email address',
		defaultValue: '',
		validators: [
			{ name: 'max_length', params: { value: 255 } },
			{ name: 'email_format' }
		],
		usedInApis: ['api-1', 'api-2']
	},
	{
		id: 'field-2',
		name: 'username',
		type: 'str',
		description: 'Unique username for the user account',
		defaultValue: '',
		validators: [
			{ name: 'min_length', params: { value: 3 } },
			{ name: 'max_length', params: { value: 50 } }
		],
		usedInApis: ['api-1']
	},
	{
		id: 'field-3',
		name: 'password',
		type: 'str',
		description: 'Encrypted user password',
		defaultValue: '',
		validators: [
			{ name: 'min_length', params: { value: 8 } },
			{ name: 'max_length', params: { value: 128 } }
		],
		usedInApis: []
	},
	{
		id: 'field-4',
		name: 'user_id',
		type: 'uuid',
		description: 'Unique identifier for user',
		defaultValue: 'uuid.uuid4()',
		validators: [],
		usedInApis: ['api-1']
	},
	{
		id: 'field-5',
		name: 'created_at',
		type: 'datetime',
		description: 'Timestamp when the record was created',
		defaultValue: 'datetime.now()',
		validators: [],
		usedInApis: []
	},
	{
		id: 'field-6',
		name: 'updated_at',
		type: 'datetime',
		description: 'Timestamp when the record was last updated',
		defaultValue: 'datetime.now()',
		validators: [],
		usedInApis: ['api-1', 'api-2']
	},
	{
		id: 'field-7',
		name: 'price',
		type: 'float',
		description: 'Product or service price',
		defaultValue: '0.0',
		validators: [],
		usedInApis: []
	},
	{
		id: 'field-8',
		name: 'status',
		type: 'str',
		description: 'Current status of the entity',
		defaultValue: "'active'",
		validators: [],
		usedInApis: ['api-1', 'api-2', 'api-3']
	},
	{
		id: 'field-9',
		name: 'website',
		type: 'str',
		description: 'Company website URL',
		defaultValue: '',
		validators: [
			{ name: 'min_length', params: { value: 5 } },
			{ name: 'max_length', params: { value: 255 } },
			{ name: 'url_format' }
		],
		usedInApis: []
	},
	{
		id: 'field-10',
		name: 'phone',
		type: 'str',
		description: 'Contact phone number',
		defaultValue: '',
		validators: [
			{ name: 'phone_number' }
		],
		usedInApis: []
	}
];

// ============================================================================
// Validator Data
// ============================================================================

export interface ValidatorBase {
	name: string;
	category: 'string' | 'numeric' | 'collection';
	description: string;
	type: 'inline' | 'custom';
	parameterType: string;
	exampleUsage: string;
	pydanticDocsUrl: string;
}

export const initialInlineValidators: ValidatorBase[] = [
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

export const initialCustomValidators: ValidatorBase[] = [
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

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a deep clone of fields data for test isolation
 */
export function cloneFields(fields: Field[] = initialFields): Field[] {
	return fields.map(field => ({
		...field,
		validators: field.validators.map(v => ({ ...v, params: v.params ? { ...v.params } : undefined })),
		usedInApis: [...field.usedInApis]
	}));
}

/**
 * Create a deep clone of validator bases for test isolation
 */
export function cloneValidatorBases(validators: ValidatorBase[]): ValidatorBase[] {
	return validators.map(v => ({ ...v }));
}

// ============================================================================
// Object Data
// ============================================================================

// Types imported from $lib/types (ObjectDefinition, ObjectFieldReference)

export const initialObjects: ObjectDefinition[] = [
	{
		id: 'object-1',
		name: 'User',
		description: 'User account information',
		fields: [
			{ fieldId: 'field-4', required: true },  // user_id
			{ fieldId: 'field-2', required: true },  // username
			{ fieldId: 'field-1', required: true },  // email
			{ fieldId: 'field-3', required: true },  // password
			{ fieldId: 'field-5', required: true },  // created_at
			{ fieldId: 'field-6', required: false }  // updated_at
		],
		usedInApis: ['api-1']
	},
	{
		id: 'object-2',
		name: 'Product',
		description: 'Product catalog item',
		fields: [
			{ fieldId: 'field-7', required: true },  // price
			{ fieldId: 'field-8', required: true },  // status
			{ fieldId: 'field-5', required: true },  // created_at
			{ fieldId: 'field-6', required: false }  // updated_at
		],
		usedInApis: []
	},
	{
		id: 'object-3',
		name: 'Order',
		description: 'Customer order details',
		fields: [
			{ fieldId: 'field-4', required: true },  // user_id (repurposed as order_id)
			{ fieldId: 'field-8', required: true },  // status
			{ fieldId: 'field-7', required: true },  // price (total)
			{ fieldId: 'field-5', required: true },  // created_at
			{ fieldId: 'field-6', required: false }  // updated_at
		],
		usedInApis: ['api-2']
	},
	{
		id: 'object-4',
		name: 'Customer',
		description: 'Customer profile information',
		fields: [
			{ fieldId: 'field-1', required: true },  // email
			{ fieldId: 'field-10', required: false }, // phone
			{ fieldId: 'field-5', required: true },  // created_at
		],
		usedInApis: []
	},
	{
		id: 'object-5',
		name: 'Payment',
		description: 'Payment transaction record',
		fields: [
			{ fieldId: 'field-7', required: true },  // price (amount)
			{ fieldId: 'field-8', required: true },  // status
			{ fieldId: 'field-5', required: true },  // created_at
		],
		usedInApis: ['api-3']
	},
	{
		id: 'object-6',
		name: 'Address',
		description: 'Physical address information',
		fields: [
			{ fieldId: 'field-9', required: false }, // website (repurposed)
			{ fieldId: 'field-10', required: false }, // phone
		],
		usedInApis: []
	},
	{
		id: 'object-7',
		name: 'Company',
		description: 'Company profile',
		fields: [
			{ fieldId: 'field-9', required: true },  // website
			{ fieldId: 'field-10', required: false }, // phone
			{ fieldId: 'field-1', required: true },  // email
			{ fieldId: 'field-5', required: true },  // created_at
		],
		usedInApis: []
	},
	{
		id: 'object-8',
		name: 'Invoice',
		description: 'Billing invoice',
		fields: [
			{ fieldId: 'field-7', required: true },  // price (total)
			{ fieldId: 'field-8', required: true },  // status
			{ fieldId: 'field-5', required: true },  // created_at
			{ fieldId: 'field-6', required: false }  // updated_at
		],
		usedInApis: []
	}
];

/**
 * Create a deep clone of objects data for test isolation
 */
export function cloneObjects(objects: ObjectDefinition[] = initialObjects): ObjectDefinition[] {
	return objects.map(obj => ({
		...obj,
		fields: obj.fields.map(f => ({ ...f })),
		usedInApis: [...obj.usedInApis]
	}));
}
