/**
 * Clerk Admin API Client
 *
 * Provides administrative operations for Clerk user/org management.
 * Used for cleanup of E2E test data (users created during signup tests, orgs, etc.)
 *
 * Requires CLERK_SECRET_KEY environment variable to be set.
 */

/**
 * Clerk API base URL
 */
const CLERK_API_BASE = 'https://api.clerk.com/v1';

/**
 * Get the Clerk secret key from environment
 */
function getClerkSecretKey(): string {
	const key = process.env.CLERK_SECRET_KEY;
	if (!key) {
		throw new Error(
			'CLERK_SECRET_KEY environment variable is required for Clerk Admin API operations'
		);
	}
	return key;
}

/**
 * Clerk user object (simplified)
 */
export interface ClerkUser {
	id: string;
	email_addresses: Array<{
		id: string;
		email_address: string;
	}>;
	first_name: string | null;
	last_name: string | null;
	created_at: number;
}

/**
 * Clerk organization object (simplified)
 */
export interface ClerkOrganization {
	id: string;
	name: string;
	slug: string;
	created_at: number;
}

/**
 * Response from Clerk list endpoints
 */
interface ClerkListResponse<T> {
	data: T[];
	total_count: number;
}

/**
 * Make an authenticated request to the Clerk Admin API
 */
async function clerkRequest<T>(
	endpoint: string,
	options: RequestInit = {}
): Promise<{ data?: T; error?: string; status: number }> {
	const secretKey = getClerkSecretKey();

	const response = await fetch(`${CLERK_API_BASE}${endpoint}`, {
		...options,
		headers: {
			Authorization: `Bearer ${secretKey}`,
			'Content-Type': 'application/json',
			...options.headers
		}
	});

	if (response.ok) {
		// Some endpoints return no content (204)
		if (response.status === 204) {
			return { status: response.status };
		}
		const data = await response.json();
		return { data, status: response.status };
	}

	const errorText = await response.text();
	return { error: errorText, status: response.status };
}

// ============================================================================
// User Operations
// ============================================================================

/**
 * List all users matching a query
 * @param query Optional search query (email prefix, name, etc.)
 */
export async function listUsers(query?: string): Promise<ClerkUser[]> {
	const params = new URLSearchParams();
	if (query) {
		params.set('query', query);
	}
	params.set('limit', '100');

	const response = await clerkRequest<ClerkListResponse<ClerkUser>>(`/users?${params.toString()}`);

	return response.data?.data ?? [];
}

/**
 * Get a user by ID
 */
export async function getUser(userId: string): Promise<ClerkUser | null> {
	const response = await clerkRequest<ClerkUser>(`/users/${userId}`);
	return response.data ?? null;
}

/**
 * Get a user by email address
 */
export async function getUserByEmail(email: string): Promise<ClerkUser | null> {
	const users = await listUsers(email);
	return (
		users.find((u) => u.email_addresses.some((e) => e.email_address.toLowerCase() === email.toLowerCase())) ??
		null
	);
}

/**
 * Delete a user by ID
 */
export async function deleteUser(userId: string): Promise<boolean> {
	const response = await clerkRequest(`/users/${userId}`, {
		method: 'DELETE'
	});
	return response.status === 200 || response.status === 204;
}

/**
 * Delete a user by email address
 * Commonly used for cleanup of E2E test users
 */
export async function deleteUserByEmail(email: string): Promise<boolean> {
	const user = await getUserByEmail(email);
	if (!user) {
		console.log(`User with email ${email} not found, nothing to delete`);
		return true; // Consider this success - user doesn't exist
	}

	const deleted = await deleteUser(user.id);
	if (deleted) {
		console.log(`Deleted user ${user.id} (${email})`);
	} else {
		console.error(`Failed to delete user ${user.id} (${email})`);
	}
	return deleted;
}

// ============================================================================
// Organization Operations
// ============================================================================

/**
 * List all organizations
 */
export async function listOrganizations(): Promise<ClerkOrganization[]> {
	const response = await clerkRequest<ClerkListResponse<ClerkOrganization>>(
		'/organizations?limit=100'
	);
	return response.data?.data ?? [];
}

/**
 * Get an organization by ID
 */
export async function getOrganization(orgId: string): Promise<ClerkOrganization | null> {
	const response = await clerkRequest<ClerkOrganization>(`/organizations/${orgId}`);
	return response.data ?? null;
}

/**
 * Get an organization by name
 */
export async function getOrganizationByName(name: string): Promise<ClerkOrganization | null> {
	const orgs = await listOrganizations();
	return orgs.find((o) => o.name === name) ?? null;
}

/**
 * Delete an organization by ID
 */
export async function deleteOrganization(orgId: string): Promise<boolean> {
	const response = await clerkRequest(`/organizations/${orgId}`, {
		method: 'DELETE'
	});
	return response.status === 200 || response.status === 204;
}

/**
 * Delete an organization by name
 * Commonly used for cleanup of E2E test organizations
 */
export async function deleteOrganizationByName(name: string): Promise<boolean> {
	const org = await getOrganizationByName(name);
	if (!org) {
		console.log(`Organization "${name}" not found, nothing to delete`);
		return true; // Consider this success - org doesn't exist
	}

	const deleted = await deleteOrganization(org.id);
	if (deleted) {
		console.log(`Deleted organization ${org.id} ("${name}")`);
	} else {
		console.error(`Failed to delete organization ${org.id} ("${name}")`);
	}
	return deleted;
}

// ============================================================================
// Cleanup Utilities
// ============================================================================

/**
 * Delete all users matching a filter
 * @param filter Function that returns true for users to delete
 */
export async function cleanupUsers(filter: (user: ClerkUser) => boolean): Promise<number> {
	const users = await listUsers();
	const toDelete = users.filter(filter);

	let deleted = 0;
	for (const user of toDelete) {
		if (await deleteUser(user.id)) {
			deleted++;
		}
	}

	console.log(`Cleaned up ${deleted} users`);
	return deleted;
}

/**
 * Delete all organizations matching a filter
 * @param filter Function that returns true for orgs to delete
 */
export async function cleanupOrganizations(
	filter: (org: ClerkOrganization) => boolean
): Promise<number> {
	const orgs = await listOrganizations();
	const toDelete = orgs.filter(filter);

	let deleted = 0;
	for (const org of toDelete) {
		if (await deleteOrganization(org.id)) {
			deleted++;
		}
	}

	console.log(`Cleaned up ${deleted} organizations`);
	return deleted;
}

/**
 * Delete all E2E test users (those with test.mediancode.com email domain)
 */
export async function cleanupE2ETestUsers(): Promise<number> {
	return cleanupUsers((user) =>
		user.email_addresses.some((e) => e.email_address.endsWith('@test.mediancode.com'))
	);
}

/**
 * Delete all E2E test organizations (those with "E2E" in the name)
 */
export async function cleanupE2ETestOrganizations(): Promise<number> {
	return cleanupOrganizations((org) => org.name.includes('E2E'));
}
