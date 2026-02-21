import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import {
  activeOrganizationStore,
  organizationMembershipsStore,
  isPersonalContext,
  organizationsStore,
  getActiveOrganization,
  getActiveOrganizationId,
  initOrgState,
  refreshOrgState
} from '$lib/stores/organization';

// Helper to create a mock Clerk organization
function mockClerkOrg(overrides: Record<string, any> = {}) {
  return {
    id: 'org-1',
    name: 'Test Org',
    slug: 'test-org',
    imageUrl: 'https://example.com/logo.png',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-15T00:00:00Z',
    ...overrides
  };
}

// Helper to create a mock Clerk membership
function mockClerkMembership(overrides: Record<string, any> = {}) {
  return {
    id: 'mem-1',
    role: 'admin',
    organization: mockClerkOrg(),
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-15T00:00:00Z',
    ...overrides
  };
}

describe('organization store - Store Defaults', () => {
  beforeEach(() => {
    activeOrganizationStore.set(null);
    organizationMembershipsStore.set([]);
  });

  it('should start with null active organization', () => {
    expect(get(activeOrganizationStore)).toBeNull();
  });

  it('should start with empty memberships', () => {
    expect(get(organizationMembershipsStore)).toHaveLength(0);
  });
});

describe('organization store - Derived Stores', () => {
  beforeEach(() => {
    activeOrganizationStore.set(null);
    organizationMembershipsStore.set([]);
  });

  it('should derive isPersonalContext as true when no org', () => {
    expect(get(isPersonalContext)).toBe(true);
  });

  it('should derive isPersonalContext as false when org is set', () => {
    activeOrganizationStore.set({
      id: 'org-1',
      name: 'Test Org',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-15T00:00:00Z'
    });
    expect(get(isPersonalContext)).toBe(false);
  });

  it('should derive organizations from memberships', () => {
    organizationMembershipsStore.set([
      {
        id: 'mem-1',
        role: 'admin',
        organization: { id: 'org-1', name: 'Org A', createdAt: '', updatedAt: '' },
        createdAt: '',
        updatedAt: ''
      },
      {
        id: 'mem-2',
        role: 'member',
        organization: { id: 'org-2', name: 'Org B', createdAt: '', updatedAt: '' },
        createdAt: '',
        updatedAt: ''
      }
    ]);

    const orgs = get(organizationsStore);
    expect(orgs).toHaveLength(2);
    expect(orgs[0].name).toBe('Org A');
    expect(orgs[1].name).toBe('Org B');
  });
});

describe('organization store - Selectors', () => {
  beforeEach(() => {
    activeOrganizationStore.set(null);
  });

  it('should return null when no active organization', () => {
    expect(getActiveOrganization()).toBeNull();
    expect(getActiveOrganizationId()).toBeNull();
  });

  it('should return organization and ID when set', () => {
    activeOrganizationStore.set({
      id: 'org-1',
      name: 'Test Org',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-15T00:00:00Z'
    });

    expect(getActiveOrganization()?.id).toBe('org-1');
    expect(getActiveOrganizationId()).toBe('org-1');
  });
});

describe('organization store - initOrgState', () => {
  beforeEach(() => {
    activeOrganizationStore.set(null);
    organizationMembershipsStore.set([]);
  });

  it('should reset state when clerk is null', async () => {
    activeOrganizationStore.set({
      id: 'org-1',
      name: 'Test',
      createdAt: '',
      updatedAt: ''
    });

    await initOrgState(null);

    expect(get(activeOrganizationStore)).toBeNull();
    expect(get(organizationMembershipsStore)).toHaveLength(0);
  });

  it('should reset state when clerk has no user', async () => {
    await initOrgState({ user: null });

    expect(get(activeOrganizationStore)).toBeNull();
    expect(get(organizationMembershipsStore)).toHaveLength(0);
  });

  it('should set active org and memberships from clerk', async () => {
    const clerk = {
      user: {
        getOrganizationMemberships: vi.fn().mockResolvedValue({
          data: [mockClerkMembership()]
        })
      },
      organization: mockClerkOrg()
    };

    await initOrgState(clerk);

    const activeOrg = get(activeOrganizationStore);
    expect(activeOrg).not.toBeNull();
    expect(activeOrg!.id).toBe('org-1');
    expect(activeOrg!.name).toBe('Test Org');

    const memberships = get(organizationMembershipsStore);
    expect(memberships).toHaveLength(1);
    expect(memberships[0].role).toBe('admin');
  });

  it('should set null active org when clerk has no organization', async () => {
    const clerk = {
      user: {
        getOrganizationMemberships: vi.fn().mockResolvedValue({ data: [] })
      },
      organization: null
    };

    await initOrgState(clerk);

    expect(get(activeOrganizationStore)).toBeNull();
    expect(get(organizationMembershipsStore)).toHaveLength(0);
  });

  it('should reset state on error', async () => {
    activeOrganizationStore.set({
      id: 'org-1',
      name: 'Test',
      createdAt: '',
      updatedAt: ''
    });

    const clerk = {
      user: {
        getOrganizationMemberships: vi.fn().mockRejectedValue(new Error('API error'))
      },
      organization: mockClerkOrg()
    };

    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await initOrgState(clerk);

    expect(get(activeOrganizationStore)).toBeNull();
    expect(get(organizationMembershipsStore)).toHaveLength(0);

    consoleSpy.mockRestore();
  });
});

describe('organization store - refreshOrgState', () => {
  beforeEach(() => {
    activeOrganizationStore.set(null);
    organizationMembershipsStore.set([]);
  });

  it('should delegate to initOrgState', async () => {
    const clerk = {
      user: {
        getOrganizationMemberships: vi.fn().mockResolvedValue({
          data: [mockClerkMembership()]
        })
      },
      organization: mockClerkOrg()
    };

    await refreshOrgState(clerk);

    expect(get(activeOrganizationStore)).not.toBeNull();
    expect(get(organizationMembershipsStore)).toHaveLength(1);
  });
});
