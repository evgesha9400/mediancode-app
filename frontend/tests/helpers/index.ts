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

// Backend health check
export { assertBackendHealthy } from './health-check';
export { assertFrontendHealthy } from './frontend-check';

// E2E delay configuration
export { ACTION_DELAY_MS } from './e2e-delays';
