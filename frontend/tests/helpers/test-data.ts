/**
 * Test Data Generators
 *
 * Provides functions to generate unique test data with identifiable prefixes.
 * All E2E test data should use these functions to ensure:
 * 1. Uniqueness across test runs
 * 2. Easy identification of test data for cleanup
 * 3. Predictable naming patterns
 */

/**
 * E2E test data prefix - all generated names start with this
 */
export const E2E_PREFIX = 'e2e_';

/**
 * E2E test email domain
 */
export const E2E_EMAIL_DOMAIN = 'test.mediancode.com';

/**
 * Generate a unique timestamp-based suffix
 */
function uniqueSuffix(): string {
	return `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Generate a unique field name for E2E tests
 * @param context Optional context to include in the name (e.g., 'crud', 'update')
 * @returns Field name like 'e2e_crud_1706789012345_abc123'
 */
export function fieldName(context?: string): string {
	const suffix = uniqueSuffix();
	return context ? `${E2E_PREFIX}${context}_${suffix}` : `${E2E_PREFIX}field_${suffix}`;
}

/**
 * Generate a unique object name for E2E tests
 * @param context Optional context to include in the name
 * @returns Object name like 'e2e_object_1706789012345_abc123'
 */
export function objectName(context?: string): string {
	const suffix = uniqueSuffix();
	return context ? `${E2E_PREFIX}${context}_${suffix}` : `${E2E_PREFIX}object_${suffix}`;
}

/**
 * Generate a unique API name for E2E tests
 * @param context Optional context to include in the name
 * @returns API name like 'e2e_api_1706789012345_abc123'
 */
export function apiName(context?: string): string {
	const suffix = uniqueSuffix();
	return context ? `${E2E_PREFIX}${context}_${suffix}` : `${E2E_PREFIX}api_${suffix}`;
}

/**
 * Generate a unique endpoint name for E2E tests
 * @param context Optional context to include in the name
 * @returns Endpoint name like 'e2e_endpoint_1706789012345_abc123'
 */
export function endpointName(context?: string): string {
	const suffix = uniqueSuffix();
	return context ? `${E2E_PREFIX}${context}_${suffix}` : `${E2E_PREFIX}endpoint_${suffix}`;
}

/**
 * Generate a unique namespace name for E2E tests
 * @param context Optional context to include in the name
 * @returns Namespace name like 'e2e_namespace_1706789012345_abc123'
 */
export function namespaceName(context?: string): string {
	const suffix = uniqueSuffix();
	return context ? `${E2E_PREFIX}${context}_${suffix}` : `${E2E_PREFIX}namespace_${suffix}`;
}

/**
 * Generate a unique email for E2E test user signup
 * @returns Email like 'e2e-1706789012345-abc123@test.mediancode.com'
 */
export function testEmail(): string {
	const suffix = uniqueSuffix().replace('_', '-');
	return `e2e-${suffix}@${E2E_EMAIL_DOMAIN}`;
}

/**
 * Generate a unique organization name for E2E tests
 * @param context Optional context to include in the name
 * @returns Org name like 'E2E Test Org 1706789012345'
 */
export function organizationName(context?: string): string {
	const timestamp = Date.now();
	return context ? `E2E ${context} Org ${timestamp}` : `E2E Test Org ${timestamp}`;
}

/**
 * Check if a name is from E2E tests
 * @param name The name to check
 * @returns true if the name starts with the E2E prefix
 */
export function isE2ETestData(name: string): boolean {
	return name.startsWith(E2E_PREFIX) || name.startsWith('e2e-') || name.startsWith('E2E ');
}

/**
 * Generate a test password that meets common requirements
 * @returns A secure test password
 */
export function testPassword(): string {
	return `E2E_Test_Pass_${Date.now()}!`;
}

/**
 * Generate unique test data for a complete field
 */
export function testFieldData(context?: string) {
	return {
		name: fieldName(context),
		description: `E2E test field created at ${new Date().toISOString()}`,
		type: 'str',
		defaultValue: 'test_default'
	};
}

/**
 * Generate unique test data for a complete object
 */
export function testObjectData(context?: string) {
	return {
		name: objectName(context),
		description: `E2E test object created at ${new Date().toISOString()}`
	};
}

/**
 * Generate unique test data for a complete API
 */
export function testApiData(context?: string) {
	return {
		title: apiName(context),
		description: `E2E test API created at ${new Date().toISOString()}`,
		version: '1.0.0'
	};
}

/**
 * Generate unique test data for a complete namespace
 */
export function testNamespaceData(context?: string) {
	return {
		name: namespaceName(context),
		description: `E2E test namespace created at ${new Date().toISOString()}`
	};
}
