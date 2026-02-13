/**
 * Fixtures Index
 *
 * Central export point for all test fixtures.
 * Import fixtures from this file to ensure consistency across all tests.
 *
 * Usage:
 *   import { mockFields, mockConstraints, getFieldById } from 'tests/fixtures';
 */

// Export all fixtures
export * from './users';
export * from './types';
export * from './constraints';
export * from './fields';
export * from './apis';
export * from './permissions';

// Re-export commonly used fixtures as named exports for convenience
export {
	mockUsers,
	getDefaultUser,
	getUserById,
	getUserByEmail,
	type MockUser
} from './users';

export {
	mockTypes,
	mockPrimitiveTypes,
	mockAbstractTypes,
	mockFieldTypes,
	getTypeByName,
	getPrimitiveTypes,
	getAbstractTypes,
	type TypeBase,
	type FieldType,
	type TypeName,
	type PrimitiveTypeName,
	type AbstractTypeName
} from './types';

export {
	mockConstraints,
	mockConstraintBases,
	getConstraintByName,
	getConstraintsByCompatibleType,
	type Constraint,
	type ConstraintBase
} from './constraints';

export {
	mockFields,
	getFieldById,
	getFieldByName,
	getFieldsByType,
	getFieldsUsedInApi,
	getUnusedFields,
	type Field,
	type FieldConstraint
} from './fields';

export {
	mockApis,
	getApiById,
	getApisByMethod,
	getApisUsingField,
	type ApiEndpoint
} from './apis';

export {
	mockPermissions,
	mockRoles,
	getPermissionsForRole,
	roleHasPermission,
	type Permission,
	type Role
} from './permissions';
