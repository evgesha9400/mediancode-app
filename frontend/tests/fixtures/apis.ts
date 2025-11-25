/**
 * API Fixtures
 * 
 * Mock API endpoint data for testing API-related features.
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
		id: 'api-1',
		name: 'Create User',
		method: 'POST',
		path: '/api/users',
		description: 'Creates a new user account',
		usedFields: ['field-1', 'field-2', 'field-4', 'field-6', 'field-8'],
		createdAt: '2025-01-01T00:00:00Z',
		updatedAt: '2025-01-01T00:00:00Z'
	},
	{
		id: 'api-2',
		name: 'Get User',
		method: 'GET',
		path: '/api/users/{id}',
		description: 'Retrieves user information by ID',
		usedFields: ['field-1', 'field-6', 'field-8'],
		createdAt: '2025-01-02T00:00:00Z',
		updatedAt: '2025-01-02T00:00:00Z'
	},
	{
		id: 'api-3',
		name: 'Update User',
		method: 'PUT',
		path: '/api/users/{id}',
		description: 'Updates existing user information',
		usedFields: ['field-8'],
		createdAt: '2025-01-03T00:00:00Z',
		updatedAt: '2025-01-03T00:00:00Z'
	},
	{
		id: 'api-4',
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
