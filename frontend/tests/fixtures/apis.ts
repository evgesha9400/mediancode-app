/**
 * API Fixtures
 *
 * Mock API endpoint data for testing API-related features.
 *
 * ID Format: All IDs use UUIDs to match the backend's UUID-based ID system.
 */

export interface ApiEndpoint {
	id: string;
	name: string;
	method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
	path: string;
	description: string;
	usedFields: string[]; // Field IDs
	createdAt: string;
	updatedAt: string;
}

export const mockApis: ApiEndpoint[] = [
	{
		id: '30000000-0000-0000-0000-000000000001',
		name: 'Create User',
		method: 'POST',
		path: '/api/users',
		description: 'Creates a new user account',
		usedFields: [
			'10000000-0000-0000-0000-000000000001', // email
			'10000000-0000-0000-0000-000000000002', // username
			'10000000-0000-0000-0000-000000000004', // user_id
			'10000000-0000-0000-0000-000000000006', // updated_at
			'10000000-0000-0000-0000-000000000008'  // status
		],
		createdAt: '2025-01-01T00:00:00Z',
		updatedAt: '2025-01-01T00:00:00Z'
	},
	{
		id: '30000000-0000-0000-0000-000000000002',
		name: 'Get User',
		method: 'GET',
		path: '/api/users/{id}',
		description: 'Retrieves user information by ID',
		usedFields: [
			'10000000-0000-0000-0000-000000000001', // email
			'10000000-0000-0000-0000-000000000006', // updated_at
			'10000000-0000-0000-0000-000000000008'  // status
		],
		createdAt: '2025-01-02T00:00:00Z',
		updatedAt: '2025-01-02T00:00:00Z'
	},
	{
		id: '30000000-0000-0000-0000-000000000003',
		name: 'Update User',
		method: 'PUT',
		path: '/api/users/{id}',
		description: 'Updates existing user information',
		usedFields: [
			'10000000-0000-0000-0000-000000000008'  // status
		],
		createdAt: '2025-01-03T00:00:00Z',
		updatedAt: '2025-01-03T00:00:00Z'
	},
	{
		id: '30000000-0000-0000-0000-000000000004',
		name: 'Delete User',
		method: 'DELETE',
		path: '/api/users/{id}',
		description: 'Deletes a user account',
		usedFields: [],
		createdAt: '2025-01-04T00:00:00Z',
		updatedAt: '2025-01-04T00:00:00Z'
	}
];

/**
 * Get an API by ID
 */
export function getApiById(id: string): ApiEndpoint | undefined {
	return mockApis.find((api) => api.id === id);
}

/**
 * Get APIs by method
 */
export function getApisByMethod(
	method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
): ApiEndpoint[] {
	return mockApis.filter((api) => api.method === method);
}

/**
 * Get APIs that use a specific field
 */
export function getApisUsingField(fieldId: string): ApiEndpoint[] {
	return mockApis.filter((api) => api.usedFields.includes(fieldId));
}
