/**
 * Seed Data for Tests
 *
 * Contains all well-known UUIDs, seed entity data, and clone helpers
 * that were previously in src/lib/stores/initialData.ts.
 *
 * This data is used exclusively by test fixtures to construct mock data.
 * Production code does NOT import from this file.
 */

import type { PrimitiveTypeName } from '../../src/lib/stores/types';
import type { Field, FieldConstraintValue, FieldConstraintBase, ObjectDefinition, Namespace } from '../../src/lib/types';
import { GLOBAL_NAMESPACE_ID } from '../../src/lib/constants';

// Re-export for convenience
export { GLOBAL_NAMESPACE_ID } from '../../src/lib/constants';

// ============================================================================
// Namespace Data
// ============================================================================

export const USER_NAMESPACE_ID = '00000000-0000-0000-0000-000000000002';

export const initialNamespaces: Namespace[] = [
	{
		id: GLOBAL_NAMESPACE_ID,
		name: 'global',
		description: 'Immutable global templates and examples',
		isDefault: false
	},
	{
		id: USER_NAMESPACE_ID,
		name: 'user',
		description: 'User-created entities for testing namespace isolation',
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
 * Used for referencing primitive types in test fixtures.
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
 * Built-in field constraint UUIDs - these match the backend's well-known field constraint IDs.
 * Used for referencing built-in field constraints in test fixtures.
 */
export const BUILTIN_FIELD_CONSTRAINT_IDS = {
	max_length: '00000000-0000-0000-0002-000000000001',
	min_length: '00000000-0000-0000-0002-000000000002',
	pattern: '00000000-0000-0000-0002-000000000003',
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
export const SEED_FIELD_IDS = {
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
export const SEED_OBJECT_IDS = {
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
export const SEED_API_IDS = {
	api_1: '30000000-0000-0000-0000-000000000001',
	api_2: '30000000-0000-0000-0000-000000000002',
	api_3: '30000000-0000-0000-0000-000000000003'
} as const;

// ============================================================================
// Field Data
// ============================================================================

export const initialFields: Field[] = [
	{
		id: SEED_FIELD_IDS.email,
		namespaceId: GLOBAL_NAMESPACE_ID,
		name: 'email',
		type: 'str',
		description: 'User email address',
		defaultValue: '',
		constraints: [
			{ name: 'max_length', constraintId: BUILTIN_FIELD_CONSTRAINT_IDS.max_length, value: '255' }
		],
		validators: [],
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
			{ name: 'min_length', constraintId: BUILTIN_FIELD_CONSTRAINT_IDS.min_length, value: '3' },
			{ name: 'max_length', constraintId: BUILTIN_FIELD_CONSTRAINT_IDS.max_length, value: '50' }
		],
		validators: [],
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
			{ name: 'min_length', constraintId: BUILTIN_FIELD_CONSTRAINT_IDS.min_length, value: '8' },
			{ name: 'max_length', constraintId: BUILTIN_FIELD_CONSTRAINT_IDS.max_length, value: '128' }
		],
		validators: [],
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
		validators: [],
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
		validators: [],
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
		validators: [],
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
		validators: [],
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
		validators: [],
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
			{ name: 'min_length', constraintId: BUILTIN_FIELD_CONSTRAINT_IDS.min_length, value: '5' },
			{ name: 'max_length', constraintId: BUILTIN_FIELD_CONSTRAINT_IDS.max_length, value: '255' }
		],
		validators: [],
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
		validators: [],
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
			{ name: 'min_length', constraintId: BUILTIN_FIELD_CONSTRAINT_IDS.min_length, value: '2' },
			{ name: 'max_length', constraintId: BUILTIN_FIELD_CONSTRAINT_IDS.max_length, value: '100' }
		],
		validators: [],
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
			{ name: 'ge', constraintId: BUILTIN_FIELD_CONSTRAINT_IDS.ge, value: '0' }
		],
		validators: [],
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
			{ name: 'gt', constraintId: BUILTIN_FIELD_CONSTRAINT_IDS.gt, value: '0' }
		],
		validators: [],
		usedInApis: []
	}
];

// ============================================================================
// Field Constraint Data
// ============================================================================

export const initialFieldConstraints: FieldConstraintBase[] = [
	{
		id: BUILTIN_FIELD_CONSTRAINT_IDS.max_length,
		namespaceId: GLOBAL_NAMESPACE_ID,
		name: 'max_length',
		description: 'Validates that length does not exceed maximum',
		parameterTypes: ['int'],
		docsUrl: 'https://docs.pydantic.dev/latest/api/fields/#pydantic.fields.Field',
		compatibleTypes: ['str']
	},
	{
		id: BUILTIN_FIELD_CONSTRAINT_IDS.min_length,
		namespaceId: GLOBAL_NAMESPACE_ID,
		name: 'min_length',
		description: 'Validates minimum string length',
		parameterTypes: ['int'],
		docsUrl: 'https://docs.pydantic.dev/latest/api/fields/#pydantic.fields.Field',
		compatibleTypes: ['str']
	},
	{
		id: BUILTIN_FIELD_CONSTRAINT_IDS.pattern,
		namespaceId: GLOBAL_NAMESPACE_ID,
		name: 'pattern',
		description: 'Validates against regex pattern',
		parameterTypes: ['str'],
		docsUrl: 'https://docs.pydantic.dev/latest/api/fields/#pydantic.fields.Field',
		compatibleTypes: ['str']
	},
	{
		id: BUILTIN_FIELD_CONSTRAINT_IDS.gt,
		namespaceId: GLOBAL_NAMESPACE_ID,
		name: 'gt',
		description: 'Greater than validation',
		parameterTypes: ['int', 'float'],
		docsUrl: 'https://docs.pydantic.dev/latest/api/fields/#pydantic.fields.Field',
		compatibleTypes: ['int', 'float']
	},
	{
		id: BUILTIN_FIELD_CONSTRAINT_IDS.ge,
		namespaceId: GLOBAL_NAMESPACE_ID,
		name: 'ge',
		description: 'Greater than or equal validation',
		parameterTypes: ['int', 'float'],
		docsUrl: 'https://docs.pydantic.dev/latest/api/fields/#pydantic.fields.Field',
		compatibleTypes: ['int', 'float']
	},
	{
		id: BUILTIN_FIELD_CONSTRAINT_IDS.lt,
		namespaceId: GLOBAL_NAMESPACE_ID,
		name: 'lt',
		description: 'Less than validation',
		parameterTypes: ['int', 'float'],
		docsUrl: 'https://docs.pydantic.dev/latest/api/fields/#pydantic.fields.Field',
		compatibleTypes: ['int', 'float']
	},
	{
		id: BUILTIN_FIELD_CONSTRAINT_IDS.le,
		namespaceId: GLOBAL_NAMESPACE_ID,
		name: 'le',
		description: 'Less than or equal validation',
		parameterTypes: ['int', 'float'],
		docsUrl: 'https://docs.pydantic.dev/latest/api/fields/#pydantic.fields.Field',
		compatibleTypes: ['int', 'float']
	},
	{
		id: BUILTIN_FIELD_CONSTRAINT_IDS.multiple_of,
		namespaceId: GLOBAL_NAMESPACE_ID,
		name: 'multiple_of',
		description: 'Multiple of validation',
		parameterTypes: ['int', 'float'],
		docsUrl: 'https://docs.pydantic.dev/latest/api/fields/#pydantic.fields.Field',
		compatibleTypes: ['int', 'float']
	}
];

// ============================================================================
// Object Data
// ============================================================================

export const initialObjects: ObjectDefinition[] = [
	{
		id: SEED_OBJECT_IDS.user,
		namespaceId: GLOBAL_NAMESPACE_ID,
		name: 'User',
		description: 'User account information',
		fields: [
			{ fieldId: SEED_FIELD_IDS.user_id, required: true },
			{ fieldId: SEED_FIELD_IDS.username, required: true },
			{ fieldId: SEED_FIELD_IDS.email, required: true },
			{ fieldId: SEED_FIELD_IDS.password, required: true },
			{ fieldId: SEED_FIELD_IDS.created_at, required: true },
			{ fieldId: SEED_FIELD_IDS.updated_at, required: false }
		],
		validators: [],
		usedInApis: [SEED_API_IDS.api_1]
	},
	{
		id: SEED_OBJECT_IDS.product,
		namespaceId: GLOBAL_NAMESPACE_ID,
		name: 'Product',
		description: 'Product catalog item',
		fields: [
			{ fieldId: SEED_FIELD_IDS.price, required: true },
			{ fieldId: SEED_FIELD_IDS.status, required: true },
			{ fieldId: SEED_FIELD_IDS.created_at, required: true },
			{ fieldId: SEED_FIELD_IDS.updated_at, required: false }
		],
		validators: [],
		usedInApis: []
	},
	{
		id: SEED_OBJECT_IDS.order,
		namespaceId: GLOBAL_NAMESPACE_ID,
		name: 'Order',
		description: 'Customer order details',
		fields: [
			{ fieldId: SEED_FIELD_IDS.user_id, required: true },
			{ fieldId: SEED_FIELD_IDS.status, required: true },
			{ fieldId: SEED_FIELD_IDS.price, required: true },
			{ fieldId: SEED_FIELD_IDS.created_at, required: true },
			{ fieldId: SEED_FIELD_IDS.updated_at, required: false }
		],
		validators: [],
		usedInApis: [SEED_API_IDS.api_2]
	},
	{
		id: SEED_OBJECT_IDS.customer,
		namespaceId: GLOBAL_NAMESPACE_ID,
		name: 'Customer',
		description: 'Customer profile information',
		fields: [
			{ fieldId: SEED_FIELD_IDS.email, required: true },
			{ fieldId: SEED_FIELD_IDS.phone, required: false },
			{ fieldId: SEED_FIELD_IDS.created_at, required: true },
		],
		validators: [],
		usedInApis: []
	},
	{
		id: SEED_OBJECT_IDS.payment,
		namespaceId: GLOBAL_NAMESPACE_ID,
		name: 'Payment',
		description: 'Payment transaction record',
		fields: [
			{ fieldId: SEED_FIELD_IDS.price, required: true },
			{ fieldId: SEED_FIELD_IDS.status, required: true },
			{ fieldId: SEED_FIELD_IDS.created_at, required: true },
		],
		validators: [],
		usedInApis: [SEED_API_IDS.api_3]
	},
	{
		id: SEED_OBJECT_IDS.address,
		namespaceId: GLOBAL_NAMESPACE_ID,
		name: 'Address',
		description: 'Physical address information',
		fields: [
			{ fieldId: SEED_FIELD_IDS.website, required: false },
			{ fieldId: SEED_FIELD_IDS.phone, required: false },
		],
		validators: [],
		usedInApis: []
	},
	{
		id: SEED_OBJECT_IDS.company,
		namespaceId: GLOBAL_NAMESPACE_ID,
		name: 'Company',
		description: 'Company profile',
		fields: [
			{ fieldId: SEED_FIELD_IDS.website, required: true },
			{ fieldId: SEED_FIELD_IDS.phone, required: false },
			{ fieldId: SEED_FIELD_IDS.email, required: true },
			{ fieldId: SEED_FIELD_IDS.created_at, required: true },
		],
		validators: [],
		usedInApis: []
	},
	{
		id: SEED_OBJECT_IDS.invoice,
		namespaceId: GLOBAL_NAMESPACE_ID,
		name: 'Invoice',
		description: 'Billing invoice',
		fields: [
			{ fieldId: SEED_FIELD_IDS.price, required: true },
			{ fieldId: SEED_FIELD_IDS.status, required: true },
			{ fieldId: SEED_FIELD_IDS.created_at, required: true },
			{ fieldId: SEED_FIELD_IDS.updated_at, required: false }
		],
		validators: [],
		usedInApis: []
	},
	// User namespace objects for testing isolation
	{
		id: SEED_OBJECT_IDS.product_catalog_item,
		namespaceId: USER_NAMESPACE_ID,
		name: 'ProductCatalogItem',
		description: 'Product catalog item in user namespace',
		fields: [
			{ fieldId: SEED_FIELD_IDS.product_name, required: true },
			{ fieldId: SEED_FIELD_IDS.quantity, required: true },
			{ fieldId: SEED_FIELD_IDS.product_price, required: true }
		],
		validators: [],
		usedInApis: []
	}
];

// ============================================================================
// Clone Helpers
// ============================================================================

/**
 * Create a deep clone of fields data for test isolation
 */
export function cloneFields(fields: Field[] = initialFields): Field[] {
	return fields.map(field => ({
		...field,
		constraints: field.constraints.map(c => ({ ...c })),
		validators: field.validators.map(v => ({ ...v })),
		usedInApis: [...field.usedInApis]
	}));
}

/**
 * Create a deep clone of field constraint bases for test isolation
 */
export function cloneFieldConstraintBases(fieldConstraints: FieldConstraintBase[]): FieldConstraintBase[] {
	return fieldConstraints.map(c => ({ ...c, compatibleTypes: [...c.compatibleTypes] }));
}

/**
 * Create a deep clone of objects data for test isolation
 */
export function cloneObjects(objects: ObjectDefinition[] = initialObjects): ObjectDefinition[] {
	return objects.map(obj => ({
		...obj,
		fields: obj.fields.map(f => ({ ...f })),
		validators: obj.validators.map(v => ({ ...v })),
		usedInApis: [...obj.usedInApis]
	}));
}
