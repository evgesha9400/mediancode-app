import { writable, derived, get } from 'svelte/store';
import type { Organization, OrganizationMembership } from '$lib/types';

// ============================================================================
// Organization Store
// ============================================================================

/**
 * Store for the currently active organization (null = personal account)
 * This is primarily used for API headers and context tracking
 */
export const activeOrganizationStore = writable<Organization | null>(null);

/**
 * Store for the user's organization memberships
 */
export const organizationMembershipsStore = writable<OrganizationMembership[]>([]);

/**
 * Derived store indicating if the user is in personal account context
 */
export const isPersonalContext = derived(
	activeOrganizationStore,
	($activeOrg) => $activeOrg === null
);

/**
 * Derived store for the list of organizations (extracted from memberships)
 */
export const organizationsStore = derived(
	organizationMembershipsStore,
	($memberships) => $memberships.map(m => m.organization)
);

// ============================================================================
// Initialization and State Management
// ============================================================================

/**
 * Initialize organization state from Clerk instance
 * Call this after Clerk is loaded and user is signed in
 *
 * @param clerk - The Clerk instance
 */
export async function initOrgState(clerk: any): Promise<void> {
	if (!clerk?.user) {
		// No user signed in, reset state
		activeOrganizationStore.set(null);
		organizationMembershipsStore.set([]);
		return;
	}

	try {
		// Get active organization from Clerk
		const activeOrg = clerk.organization;
		activeOrganizationStore.set(activeOrg ? mapClerkOrganization(activeOrg) : null);

		// Get user's organization memberships
		const memberships = await clerk.user.getOrganizationMemberships();
		const mappedMemberships = memberships.data?.map(mapClerkMembership) ?? [];
		organizationMembershipsStore.set(mappedMemberships);
	} catch (error) {
		console.error('[Organization Store] Failed to initialize org state:', error);
		activeOrganizationStore.set(null);
		organizationMembershipsStore.set([]);
	}
}

/**
 * Refresh organization state from Clerk instance
 * Call this after organization changes (create, switch, leave)
 *
 * @param clerk - The Clerk instance
 */
export async function refreshOrgState(clerk: any): Promise<void> {
	// Delegate to initOrgState as the logic is the same
	await initOrgState(clerk);
}

// ============================================================================
// Selectors (for API headers)
// ============================================================================

/**
 * Get the current active organization
 */
export function getActiveOrganization(): Organization | null {
	return get(activeOrganizationStore);
}

/**
 * Get the current active organization ID
 * This is the primary function used for API headers
 */
export function getActiveOrganizationId(): string | null {
	const org = get(activeOrganizationStore);
	return org?.id ?? null;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Map Clerk's organization object to our Organization type
 */
function mapClerkOrganization(clerkOrg: any): Organization {
	return {
		id: clerkOrg.id,
		name: clerkOrg.name,
		slug: clerkOrg.slug || undefined,
		imageUrl: clerkOrg.imageUrl || undefined,
		createdAt: clerkOrg.createdAt,
		updatedAt: clerkOrg.updatedAt
	};
}

/**
 * Map Clerk's membership object to our OrganizationMembership type
 */
function mapClerkMembership(clerkMembership: any): OrganizationMembership {
	return {
		id: clerkMembership.id,
		role: clerkMembership.role,
		organization: mapClerkOrganization(clerkMembership.organization),
		createdAt: clerkMembership.createdAt,
		updatedAt: clerkMembership.updatedAt
	};
}
