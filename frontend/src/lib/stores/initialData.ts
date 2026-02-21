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
import type { ObjectDefinition, Namespace } from '$lib/types';

// ============================================================================
// Namespace Data
// ============================================================================

/** Global namespace ID constant - used across all seed data */
export const GLOBAL_NAMESPACE_ID = 'namespace-global';
export const USER_NAMESPACE_ID = 'namespace-user';

export const initialNamespaces: Namespace[] = [
	{
		id: GLOBAL_NAMESPACE_ID,
		name: 'global',
		description: 'Immutable global templates and examples',
		locked: true,
		isDefault: false
	},
	{
		id: USER_NAMESPACE_ID,
		name: 'user',
		description: 'User-created entities for testing namespace isolation',
		locked: false,
		isDefault: true
	}
];

/**
 * Create a deep clone of namespaces data for test isolation
 */
export function cloneNamespaces(namespaces: Namespace[] = initialNamespaces): Namespace[] {
	return namespaces.map(ns => ({ ...ns }));
}

// ============================================================================
// Field Data
// ============================================================================

export interface FieldValidator {
	name: string;
	params?: Record<string, any>;
}

export interface Field {
	id: string;
	namespaceId: string;
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
		namespaceId: GLOBAL_NAMESPACE_ID,
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
		namespaceId: GLOBAL_NAMESPACE_ID,
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
		namespaceId: GLOBAL_NAMESPACE_ID,
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
		namespaceId: GLOBAL_NAMESPACE_ID,
		name: 'user_id',
		type: 'uuid',
		description: 'Unique identifier for user',
		defaultValue: 'uuid.uuid4()',
		validators: [],
		usedInApis: ['api-1']
	},
	{
		id: 'field-5',
		namespaceId: GLOBAL_NAMESPACE_ID,
		name: 'created_at',
		type: 'datetime',
		description: 'Timestamp when the record was created',
		defaultValue: 'datetime.now()',
		validators: [],
		usedInApis: []
	},
	{
		id: 'field-6',
		namespaceId: GLOBAL_NAMESPACE_ID,
		name: 'updated_at',
		type: 'datetime',
		description: 'Timestamp when the record was last updated',
		defaultValue: 'datetime.now()',
		validators: [],
		usedInApis: ['api-1', 'api-2']
	},
	{
		id: 'field-7',
		namespaceId: GLOBAL_NAMESPACE_ID,
		name: 'price',
		type: 'float',
		description: 'Product or service price',
		defaultValue: '0.0',
		validators: [],
		usedInApis: []
	},
	{
		id: 'field-8',
		namespaceId: GLOBAL_NAMESPACE_ID,
		name: 'status',
		type: 'str',
		description: 'Current status of the entity',
		defaultValue: "'active'",
		validators: [],
		usedInApis: ['api-1', 'api-2', 'api-3']
	},
	{
		id: 'field-9',
		namespaceId: GLOBAL_NAMESPACE_ID,
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
		namespaceId: GLOBAL_NAMESPACE_ID,
		name: 'phone',
		type: 'str',
		description: 'Contact phone number',
		defaultValue: '',
		validators: [
			{ name: 'phone_number' }
		],
		usedInApis: []
	},
	// User namespace fields for testing isolation
	{
		id: 'field-user-1',
		namespaceId: USER_NAMESPACE_ID,
		name: 'product_name',
		type: 'str',
		description: 'Product name in user namespace',
		defaultValue: '',
		validators: [
			{ name: 'min_length', params: { value: 2 } },
			{ name: 'max_length', params: { value: 100 } }
		],
		usedInApis: []
	},
	{
		id: 'field-user-2',
		namespaceId: USER_NAMESPACE_ID,
		name: 'quantity',
		type: 'int',
		description: 'Product quantity in user namespace',
		defaultValue: '0',
		validators: [
			{ name: 'ge', params: { value: 0 } }
		],
		usedInApis: []
	},
	{
		id: 'field-user-3',
		namespaceId: USER_NAMESPACE_ID,
		name: 'product_price',
		type: 'float',
		description: 'Product price in user namespace',
		defaultValue: '0.0',
		validators: [
			{ name: 'gt', params: { value: 0 } }
		],
		usedInApis: []
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

// ============================================================================
// Object Data
// ============================================================================

// Types imported from $lib/types (ObjectDefinition, ObjectFieldReference)

export const initialObjects: ObjectDefinition[] = [
	{
		id: 'object-1',
		namespaceId: GLOBAL_NAMESPACE_ID,
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
		namespaceId: GLOBAL_NAMESPACE_ID,
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
		namespaceId: GLOBAL_NAMESPACE_ID,
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
		namespaceId: GLOBAL_NAMESPACE_ID,
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
		namespaceId: GLOBAL_NAMESPACE_ID,
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
		namespaceId: GLOBAL_NAMESPACE_ID,
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
		namespaceId: GLOBAL_NAMESPACE_ID,
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
		namespaceId: GLOBAL_NAMESPACE_ID,
		name: 'Invoice',
		description: 'Billing invoice',
		fields: [
			{ fieldId: 'field-7', required: true },  // price (total)
			{ fieldId: 'field-8', required: true },  // status
			{ fieldId: 'field-5', required: true },  // created_at
			{ fieldId: 'field-6', required: false }  // updated_at
		],
		usedInApis: []
	},
	// User namespace objects for testing isolation
	{
		id: 'object-user-1',
		namespaceId: USER_NAMESPACE_ID,
		name: 'ProductCatalogItem',
		description: 'Product catalog item in user namespace',
		fields: [
			{ fieldId: 'field-user-1', required: true },  // product_name
			{ fieldId: 'field-user-2', required: true },  // quantity
			{ fieldId: 'field-user-3', required: true }   // product_price
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
