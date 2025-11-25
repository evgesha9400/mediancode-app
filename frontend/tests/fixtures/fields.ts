/**
 * Field Fixtures
 * 
 * Mock field data for testing field registry features.
 * Based on src/lib/stores/fields.ts
 */

import type { PrimitiveTypeName } from './types';

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

export const mockFields: Field[] = [
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
		usedInApis: []
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
		usedInApis: []
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
		usedInApis: []
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
		usedInApis: []
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
		usedInApis: []
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

/**
 * Get a field by ID
 */
export function getFieldById(id: string): Field | undefined {
	return mockFields.find((field) => field.id === id);
}

/**
 * Get a field by name
 */
export function getFieldByName(name: string): Field | undefined {
	return mockFields.find((field) => field.name === name);
}

/**
 * Get fields by type
 */
export function getFieldsByType(type: PrimitiveTypeName): Field[] {
	return mockFields.filter((field) => field.type === type);
}

/**
 * Get fields used in a specific API
 */
export function getFieldsUsedInApi(apiId: string): Field[] {
	return mockFields.filter((field) => field.usedInApis.includes(apiId));
}

/**
 * Get fields that have no API usage
 */
export function getUnusedFields(): Field[] {
	return mockFields.filter((field) => field.usedInApis.length === 0);
}
