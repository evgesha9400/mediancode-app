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
 *
 * ID Format: All IDs use UUIDs to match the backend's UUID-based ID system.
 * Seed data uses well-known UUIDs for predictability and cross-referencing.
 */

import type { PrimitiveTypeName } from './types';
import type { ObjectDefinition, Namespace } from '$lib/types';

// ============================================================================
// Namespace Data
// ============================================================================

/** Global namespace UUID - matches backend well-known UUID */
export const GLOBAL_NAMESPACE_ID = '00000000-0000-0000-0000-000000000001';
export const USER_NAMESPACE_ID = '00000000-0000-0000-0000-000000000002';

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
// Well-Known Built-in UUIDs (from backend)
// ============================================================================

/**
 * Built-in type UUIDs - these match the backend's well-known type IDs.
 * Used for referencing primitive types throughout the application.
 */
export const BUILTIN_TYPE_IDS = {
	str: '00000000-0000-0000-0001-000000000001',
	int: '00000000-0000-0000-0001-000000000002',
	float: '00000000-0000-0000-0001-000000000003',
	bool: '00000000-0000-0000-0001-000000000004',
	datetime: '00000000-0000-0000-0001-000000000005',
	uuid: '00000000-0000-0000-0001-000000000006'
} as const;

/**
 * Built-in constraint UUIDs - these match the backend's well-known constraint IDs.
 * Used for referencing built-in constraints throughout the application.
 */
export const BUILTIN_CONSTRAINT_IDS = {
	max_length: '00000000-0000-0000-0002-000000000001',
	min_length: '00000000-0000-0000-0002-000000000002',
	pattern: '00000000-0000-0000-0002-000000000003',
	email_format: '00000000-0000-0000-0002-000000000004',
	url_format: '00000000-0000-0000-0002-000000000005',
	gt: '00000000-0000-0000-0002-000000000006',
	ge: '00000000-0000-0000-0002-000000000007',
	lt: '00000000-0000-0000-0002-000000000008',
	le: '00000000-0000-0000-0002-000000000009',
	multiple_of: '00000000-0000-0000-0002-000000000010'
} as const;

// ============================================================================
// Seed Data UUIDs
// ============================================================================

/** Seed field UUIDs - used for local development and testing */
const SEED_FIELD_IDS = {
	email: '10000000-0000-0000-0000-000000000001',
	username: '10000000-0000-0000-0000-000000000002',
	password: '10000000-0000-0000-0000-000000000003',
	user_id: '10000000-0000-0000-0000-000000000004',
	created_at: '10000000-0000-0000-0000-000000000005',
	updated_at: '10000000-0000-0000-0000-000000000006',
	price: '10000000-0000-0000-0000-000000000007',
	status: '10000000-0000-0000-0000-000000000008',
	website: '10000000-0000-0000-0000-000000000009',
	phone: '10000000-0000-0000-0000-00000000000a',
	product_name: '10000000-0000-0000-0000-00000000000b',
	quantity: '10000000-0000-0000-0000-00000000000c',
	product_price: '10000000-0000-0000-0000-00000000000d'
} as const;

/** Seed object UUIDs - used for local development and testing */
const SEED_OBJECT_IDS = {
	user: '20000000-0000-0000-0000-000000000001',
	product: '20000000-0000-0000-0000-000000000002',
	order: '20000000-0000-0000-0000-000000000003',
	customer: '20000000-0000-0000-0000-000000000004',
	payment: '20000000-0000-0000-0000-000000000005',
	address: '20000000-0000-0000-0000-000000000006',
	company: '20000000-0000-0000-0000-000000000007',
	invoice: '20000000-0000-0000-0000-000000000008',
	product_catalog_item: '20000000-0000-0000-0000-000000000009'
} as const;

/** Seed API UUIDs - used for local development and testing */
const SEED_API_IDS = {
	api_1: '30000000-0000-0000-0000-000000000001',
	api_2: '30000000-0000-0000-0000-000000000002',
	api_3: '30000000-0000-0000-0000-000000000003'
} as const;

// ============================================================================
// Field Data
// ============================================================================

export interface FieldConstraint {
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
	constraints: FieldConstraint[];
	usedInApis: string[];
}

export const initialFields: Field[] = [
	{
		id: SEED_FIELD_IDS.email,
		namespaceId: GLOBAL_NAMESPACE_ID,
		name: 'email',
		type: 'str',
		description: 'User email address',
		defaultValue: '',
		constraints: [
			{ name: 'max_length', params: { value: 255 } },
			{ name: 'email_format' }
		],
		usedInApis: [SEED_API_IDS.api_1, SEED_API_IDS.api_2]
	},
	{
		id: SEED_FIELD_IDS.username,
		namespaceId: GLOBAL_NAMESPACE_ID,
		name: 'username',
		type: 'str',
		description: 'Unique username for the user account',
		defaultValue: '',
		constraints: [
			{ name: 'min_length', params: { value: 3 } },
			{ name: 'max_length', params: { value: 50 } }
		],
		usedInApis: [SEED_API_IDS.api_1]
	},
	{
		id: SEED_FIELD_IDS.password,
		namespaceId: GLOBAL_NAMESPACE_ID,
		name: 'password',
		type: 'str',
		description: 'Encrypted user password',
		defaultValue: '',
		constraints: [
			{ name: 'min_length', params: { value: 8 } },
			{ name: 'max_length', params: { value: 128 } }
		],
		usedInApis: []
	},
	{
		id: SEED_FIELD_IDS.user_id,
		namespaceId: GLOBAL_NAMESPACE_ID,
		name: 'user_id',
		type: 'uuid',
		description: 'Unique identifier for user',
		defaultValue: 'uuid.uuid4()',
		constraints: [],
		usedInApis: [SEED_API_IDS.api_1]
	},
	{
		id: SEED_FIELD_IDS.created_at,
		namespaceId: GLOBAL_NAMESPACE_ID,
		name: 'created_at',
		type: 'datetime',
		description: 'Timestamp when the record was created',
		defaultValue: 'datetime.now()',
		constraints: [],
		usedInApis: []
	},
	{
		id: SEED_FIELD_IDS.updated_at,
		namespaceId: GLOBAL_NAMESPACE_ID,
		name: 'updated_at',
		type: 'datetime',
		description: 'Timestamp when the record was last updated',
		defaultValue: 'datetime.now()',
		constraints: [],
		usedInApis: [SEED_API_IDS.api_1, SEED_API_IDS.api_2]
	},
	{
		id: SEED_FIELD_IDS.price,
		namespaceId: GLOBAL_NAMESPACE_ID,
		name: 'price',
		type: 'float',
		description: 'Product or service price',
		defaultValue: '0.0',
		constraints: [],
		usedInApis: []
	},
	{
		id: SEED_FIELD_IDS.status,
		namespaceId: GLOBAL_NAMESPACE_ID,
		name: 'status',
		type: 'str',
		description: 'Current status of the entity',
		defaultValue: "'active'",
		constraints: [],
		usedInApis: [SEED_API_IDS.api_1, SEED_API_IDS.api_2, SEED_API_IDS.api_3]
	},
	{
		id: SEED_FIELD_IDS.website,
		namespaceId: GLOBAL_NAMESPACE_ID,
		name: 'website',
		type: 'str',
		description: 'Company website URL',
		defaultValue: '',
		constraints: [
			{ name: 'min_length', params: { value: 5 } },
			{ name: 'max_length', params: { value: 255 } },
			{ name: 'url_format' }
		],
		usedInApis: []
	},
	{
		id: SEED_FIELD_IDS.phone,
		namespaceId: GLOBAL_NAMESPACE_ID,
		name: 'phone',
		type: 'str',
		description: 'Contact phone number',
		defaultValue: '',
		constraints: [],
		usedInApis: []
	},
	// User namespace fields for testing isolation
	{
		id: SEED_FIELD_IDS.product_name,
		namespaceId: USER_NAMESPACE_ID,
		name: 'product_name',
		type: 'str',
		description: 'Product name in user namespace',
		defaultValue: '',
		constraints: [
			{ name: 'min_length', params: { value: 2 } },
			{ name: 'max_length', params: { value: 100 } }
		],
		usedInApis: []
	},
	{
		id: SEED_FIELD_IDS.quantity,
		namespaceId: USER_NAMESPACE_ID,
		name: 'quantity',
		type: 'int',
		description: 'Product quantity in user namespace',
		defaultValue: '0',
		constraints: [
			{ name: 'ge', params: { value: 0 } }
		],
		usedInApis: []
	},
	{
		id: SEED_FIELD_IDS.product_price,
		namespaceId: USER_NAMESPACE_ID,
		name: 'product_price',
		type: 'float',
		description: 'Product price in user namespace',
		defaultValue: '0.0',
		constraints: [
			{ name: 'gt', params: { value: 0 } }
		],
		usedInApis: []
	}
];

// ============================================================================
// Constraint Data
// ============================================================================

export interface ConstraintBase {
	id: string;
	namespaceId: string;
	name: string;
	description: string;
	parameterType: string;
	docsUrl: string | null;
	compatibleTypes: string[];
}

export const initialConstraints: ConstraintBase[] = [
	{
		id: BUILTIN_CONSTRAINT_IDS.max_length,
		namespaceId: GLOBAL_NAMESPACE_ID,
		name: 'max_length',
		description: 'Validates that length does not exceed maximum',
		parameterType: 'int',
		docsUrl: 'https://docs.pydantic.dev/latest/api/fields/#pydantic.fields.Field',
		compatibleTypes: ['str']
	},
	{
		id: BUILTIN_CONSTRAINT_IDS.min_length,
		namespaceId: GLOBAL_NAMESPACE_ID,
		name: 'min_length',
		description: 'Validates minimum string length',
		parameterType: 'int',
		docsUrl: 'https://docs.pydantic.dev/latest/api/fields/#pydantic.fields.Field',
		compatibleTypes: ['str']
	},
	{
		id: BUILTIN_CONSTRAINT_IDS.pattern,
		namespaceId: GLOBAL_NAMESPACE_ID,
		name: 'pattern',
		description: 'Validates against regex pattern',
		parameterType: 'str',
		docsUrl: 'https://docs.pydantic.dev/latest/api/fields/#pydantic.fields.Field',
		compatibleTypes: ['str']
	},
	{
		id: BUILTIN_CONSTRAINT_IDS.email_format,
		namespaceId: GLOBAL_NAMESPACE_ID,
		name: 'email_format',
		description: 'Validates email address format',
		parameterType: 'None',
		docsUrl: 'https://docs.pydantic.dev/latest/concepts/validators/',
		compatibleTypes: ['str']
	},
	{
		id: BUILTIN_CONSTRAINT_IDS.url_format,
		namespaceId: GLOBAL_NAMESPACE_ID,
		name: 'url_format',
		description: 'Validates URL format',
		parameterType: 'None',
		docsUrl: 'https://docs.pydantic.dev/latest/concepts/validators/',
		compatibleTypes: ['str']
	},
	{
		id: BUILTIN_CONSTRAINT_IDS.gt,
		namespaceId: GLOBAL_NAMESPACE_ID,
		name: 'gt',
		description: 'Greater than validation',
		parameterType: 'number',
		docsUrl: 'https://docs.pydantic.dev/latest/api/fields/#pydantic.fields.Field',
		compatibleTypes: ['int', 'float']
	},
	{
		id: BUILTIN_CONSTRAINT_IDS.ge,
		namespaceId: GLOBAL_NAMESPACE_ID,
		name: 'ge',
		description: 'Greater than or equal validation',
		parameterType: 'number',
		docsUrl: 'https://docs.pydantic.dev/latest/api/fields/#pydantic.fields.Field',
		compatibleTypes: ['int', 'float']
	},
	{
		id: BUILTIN_CONSTRAINT_IDS.lt,
		namespaceId: GLOBAL_NAMESPACE_ID,
		name: 'lt',
		description: 'Less than validation',
		parameterType: 'number',
		docsUrl: 'https://docs.pydantic.dev/latest/api/fields/#pydantic.fields.Field',
		compatibleTypes: ['int', 'float']
	},
	{
		id: BUILTIN_CONSTRAINT_IDS.le,
		namespaceId: GLOBAL_NAMESPACE_ID,
		name: 'le',
		description: 'Less than or equal validation',
		parameterType: 'number',
		docsUrl: 'https://docs.pydantic.dev/latest/api/fields/#pydantic.fields.Field',
		compatibleTypes: ['int', 'float']
	},
	{
		id: BUILTIN_CONSTRAINT_IDS.multiple_of,
		namespaceId: GLOBAL_NAMESPACE_ID,
		name: 'multiple_of',
		description: 'Multiple of validation',
		parameterType: 'number',
		docsUrl: 'https://docs.pydantic.dev/latest/api/fields/#pydantic.fields.Field',
		compatibleTypes: ['int', 'float']
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
		constraints: field.constraints.map(c => ({ ...c, params: c.params ? { ...c.params } : undefined })),
		usedInApis: [...field.usedInApis]
	}));
}

/**
 * Create a deep clone of constraint bases for test isolation
 */
export function cloneConstraintBases(constraints: ConstraintBase[]): ConstraintBase[] {
	return constraints.map(c => ({ ...c, compatibleTypes: [...c.compatibleTypes] }));
}

// ============================================================================
// Object Data
// ============================================================================

// Types imported from $lib/types (ObjectDefinition, ObjectFieldReference)

export const initialObjects: ObjectDefinition[] = [
	{
		id: SEED_OBJECT_IDS.user,
		namespaceId: GLOBAL_NAMESPACE_ID,
		name: 'User',
		description: 'User account information',
		fields: [
			{ fieldId: SEED_FIELD_IDS.user_id, required: true },   // user_id
			{ fieldId: SEED_FIELD_IDS.username, required: true },   // username
			{ fieldId: SEED_FIELD_IDS.email, required: true },      // email
			{ fieldId: SEED_FIELD_IDS.password, required: true },   // password
			{ fieldId: SEED_FIELD_IDS.created_at, required: true }, // created_at
			{ fieldId: SEED_FIELD_IDS.updated_at, required: false } // updated_at
		],
		usedInApis: [SEED_API_IDS.api_1]
	},
	{
		id: SEED_OBJECT_IDS.product,
		namespaceId: GLOBAL_NAMESPACE_ID,
		name: 'Product',
		description: 'Product catalog item',
		fields: [
			{ fieldId: SEED_FIELD_IDS.price, required: true },      // price
			{ fieldId: SEED_FIELD_IDS.status, required: true },     // status
			{ fieldId: SEED_FIELD_IDS.created_at, required: true }, // created_at
			{ fieldId: SEED_FIELD_IDS.updated_at, required: false } // updated_at
		],
		usedInApis: []
	},
	{
		id: SEED_OBJECT_IDS.order,
		namespaceId: GLOBAL_NAMESPACE_ID,
		name: 'Order',
		description: 'Customer order details',
		fields: [
			{ fieldId: SEED_FIELD_IDS.user_id, required: true },    // user_id (repurposed as order_id)
			{ fieldId: SEED_FIELD_IDS.status, required: true },     // status
			{ fieldId: SEED_FIELD_IDS.price, required: true },      // price (total)
			{ fieldId: SEED_FIELD_IDS.created_at, required: true }, // created_at
			{ fieldId: SEED_FIELD_IDS.updated_at, required: false } // updated_at
		],
		usedInApis: [SEED_API_IDS.api_2]
	},
	{
		id: SEED_OBJECT_IDS.customer,
		namespaceId: GLOBAL_NAMESPACE_ID,
		name: 'Customer',
		description: 'Customer profile information',
		fields: [
			{ fieldId: SEED_FIELD_IDS.email, required: true },      // email
			{ fieldId: SEED_FIELD_IDS.phone, required: false },     // phone
			{ fieldId: SEED_FIELD_IDS.created_at, required: true }, // created_at
		],
		usedInApis: []
	},
	{
		id: SEED_OBJECT_IDS.payment,
		namespaceId: GLOBAL_NAMESPACE_ID,
		name: 'Payment',
		description: 'Payment transaction record',
		fields: [
			{ fieldId: SEED_FIELD_IDS.price, required: true },      // price (amount)
			{ fieldId: SEED_FIELD_IDS.status, required: true },     // status
			{ fieldId: SEED_FIELD_IDS.created_at, required: true }, // created_at
		],
		usedInApis: [SEED_API_IDS.api_3]
	},
	{
		id: SEED_OBJECT_IDS.address,
		namespaceId: GLOBAL_NAMESPACE_ID,
		name: 'Address',
		description: 'Physical address information',
		fields: [
			{ fieldId: SEED_FIELD_IDS.website, required: false }, // website (repurposed)
			{ fieldId: SEED_FIELD_IDS.phone, required: false },   // phone
		],
		usedInApis: []
	},
	{
		id: SEED_OBJECT_IDS.company,
		namespaceId: GLOBAL_NAMESPACE_ID,
		name: 'Company',
		description: 'Company profile',
		fields: [
			{ fieldId: SEED_FIELD_IDS.website, required: true },    // website
			{ fieldId: SEED_FIELD_IDS.phone, required: false },     // phone
			{ fieldId: SEED_FIELD_IDS.email, required: true },      // email
			{ fieldId: SEED_FIELD_IDS.created_at, required: true }, // created_at
		],
		usedInApis: []
	},
	{
		id: SEED_OBJECT_IDS.invoice,
		namespaceId: GLOBAL_NAMESPACE_ID,
		name: 'Invoice',
		description: 'Billing invoice',
		fields: [
			{ fieldId: SEED_FIELD_IDS.price, required: true },      // price (total)
			{ fieldId: SEED_FIELD_IDS.status, required: true },     // status
			{ fieldId: SEED_FIELD_IDS.created_at, required: true }, // created_at
			{ fieldId: SEED_FIELD_IDS.updated_at, required: false } // updated_at
		],
		usedInApis: []
	},
	// User namespace objects for testing isolation
	{
		id: SEED_OBJECT_IDS.product_catalog_item,
		namespaceId: USER_NAMESPACE_ID,
		name: 'ProductCatalogItem',
		description: 'Product catalog item in user namespace',
		fields: [
			{ fieldId: SEED_FIELD_IDS.product_name, required: true },  // product_name
			{ fieldId: SEED_FIELD_IDS.quantity, required: true },      // quantity
			{ fieldId: SEED_FIELD_IDS.product_price, required: true }  // product_price
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
