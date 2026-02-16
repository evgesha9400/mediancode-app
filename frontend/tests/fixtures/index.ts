/**
 * Fixtures Index
 *
 * Central export point for all test fixtures.
 * Import fixtures from this file to ensure consistency across all tests.
 *
 * Usage:
 *   import { mockFields, mockFieldConstraints, getFieldById } from 'tests/fixtures';
 */

// Export all fixtures
export * from './users';
export * from './types';
export * from './fieldConstraints';
export * from './fields';
export * from './apis';
export * from './permissions';
export * from './seedData';

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
	mockFieldConstraints,
	mockFieldConstraintBases,
	getFieldConstraintByName,
	getFieldConstraintsByCompatibleType,
	type FieldConstraint,
	type FieldConstraintBase
} from './fieldConstraints';

export {
	mockFields,
	getFieldById,
	getFieldByName,
	getFieldsByType,
	getFieldsUsedInApi,
	getUnusedFields,
	type Field,
	type FieldConstraintValue
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

