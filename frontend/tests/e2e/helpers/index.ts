/**
 * E2E Test Helpers
 *
 * Barrel export for all test helper utilities.
 */

// Test data generators
export {
	E2E_PREFIX,
	E2E_EMAIL_DOMAIN,
	fieldName,
	objectName,
	apiName,
	endpointName,
	namespaceName,
	testEmail,
	organizationName,
	isE2ETestData,
	testPassword,
	testFieldData,
	testObjectData,
	testApiData,
	testNamespaceData
} from './test-data';

// API client for direct backend interaction
export { E2EApiClient } from './api-client';
export type {
	ApiField,
	ApiObject,
	ApiEntity,
	ApiNamespace,
	ApiEndpoint
} from './api-client';

// Clerk Admin API for auth flow cleanup
export {
	listUsers,
	getUser,
	getUserByEmail,
	deleteUser,
	deleteUserByEmail,
	listOrganizations,
	getOrganization,
	getOrganizationByName,
	deleteOrganization,
	deleteOrganizationByName,
	cleanupUsers,
	cleanupOrganizations,
	cleanupE2ETestUsers,
	cleanupE2ETestOrganizations
} from './clerk-admin';
export type { ClerkUser, ClerkOrganization } from './clerk-admin';
