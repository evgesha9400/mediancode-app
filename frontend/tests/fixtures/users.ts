/**
 * User Fixtures
 * 
 * Mock user data for testing authentication and user-related features.
 */

export interface MockUser {
	id: string;
	email: string;
	username: string;
	firstName: string;
	lastName: string;
	createdAt: string;
	updatedAt: string;
}

export const mockUsers: MockUser[] = [
	{
		id: 'user-1',
		email: 'john.doe@example.com',
		username: 'johndoe',
		firstName: 'John',
		lastName: 'Doe',
		createdAt: '2025-01-01T00:00:00Z',
		updatedAt: '2025-01-01T00:00:00Z'
	},
	{
		id: 'user-2',
		email: 'jane.smith@example.com',
		username: 'janesmith',
		firstName: 'Jane',
		lastName: 'Smith',
		createdAt: '2025-01-02T00:00:00Z',
		updatedAt: '2025-01-02T00:00:00Z'
	},
	{
		id: 'user-3',
		email: 'test@mediancode.com',
		username: 'testuser',
		firstName: 'Test',
		lastName: 'User',
		createdAt: '2025-01-03T00:00:00Z',
		updatedAt: '2025-01-03T00:00:00Z'
	}
];

/**
 * Get a user by ID
 */
export function getUserById(id: string): MockUser | undefined {
	return mockUsers.find((user) => user.id === id);
}

/**
 * Get a user by email
 */
export function getUserByEmail(email: string): MockUser | undefined {
	return mockUsers.find((user) => user.email === email);
}

/**
 * Get default test user (user-1)
 */
export function getDefaultUser(): MockUser {
	return mockUsers[0];
}
