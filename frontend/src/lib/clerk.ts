import { writable, type Writable } from 'svelte/store';
import { env } from '$env/dynamic/public';
import { initOrgState, refreshOrgState } from '$lib/stores/organization';

export interface ClerkState {
  isLoaded: boolean;
  isSignedIn: boolean;
  user: any | null;
}

/**
 * Shared Clerk appearance configuration using the mono color scheme
 * This can be passed to any Clerk component mount method
 */
export const clerkAppearance = {
  variables: {
    colorPrimary: '#171717',      // mono-900
    colorText: '#171717',         // mono-900
    colorTextSecondary: '#525252', // mono-600
    colorBackground: '#ffffff',
    colorInputBackground: '#fafafa', // mono-50
    colorInputText: '#171717',    // mono-900
    borderRadius: '0.5rem',
    colorDanger: '#dc2626',       // red-600
    colorSuccess: '#16a34a',      // green-600
    colorWarning: '#d97706',      // amber-600
  },
  elements: {
    // Card styling
    card: 'shadow-lg border border-mono-200',
    // Button styling
    formButtonPrimary: 'bg-mono-900 hover:bg-mono-800',
    // Input styling
    formFieldInput: 'border-mono-300 focus:ring-mono-900 focus:border-mono-900',
    // Avatar styling
    avatarBox: 'border-2 border-mono-200',
  }
};

export const clerkState: Writable<ClerkState> = writable({
  isLoaded: false,
  isSignedIn: false,
  user: null
});

let clerkInstance: any = null;
let isMockMode = false;

/**
 * Check if we should use mock mode for testing
 * Mock mode is enabled when PUBLIC_CLERK_MOCK_MODE is set to 'true'
 */
function shouldUseMockMode(): boolean {
  if (typeof window === 'undefined') return false;
  return (window as any).__CLERK_MOCK_MODE__ === true ||
         env.PUBLIC_CLERK_MOCK_MODE === 'true';
}

export async function initializeClerk(publishableKey: string): Promise<any> {
  if (clerkInstance) {
    return clerkInstance;
  }

  // Check if we should use mock mode
  isMockMode = shouldUseMockMode();

  if (isMockMode) {
    // Mock mode for E2E testing
    console.log('[Clerk] Running in mock mode for testing');
    clerkInstance = createMockClerk();

    // Immediately set loaded state
    clerkState.set({
      isLoaded: true,
      isSignedIn: false,
      user: null
    });

    return clerkInstance;
  }

  // Real Clerk initialization
  try {
    // Dynamic import - only runs in browser
    const { Clerk } = await import('@clerk/clerk-js');

    clerkInstance = new Clerk(publishableKey);
    await clerkInstance.load({
      signInUrl: '/signin',
      signUpUrl: '/signup',
      fallbackRedirectUrl: '/dashboard'
    });

    // Update store with initial state
    clerkState.set({
      isLoaded: true,
      isSignedIn: !!clerkInstance.user,
      user: clerkInstance.user
    });

    // Initialize organization state if user is signed in
    if (clerkInstance.user) {
      await initOrgState(clerkInstance);
    }

    // Listen for auth changes
    clerkInstance.addListener(async (resources: any) => {
      clerkState.set({
        isLoaded: true,
        isSignedIn: !!resources.user,
        user: resources.user
      });

      // Update organization state when auth changes
      if (resources.user) {
        await refreshOrgState(clerkInstance);
      }
    });

    return clerkInstance;
  } catch (error) {
    console.error('[Clerk] Failed to initialize, falling back to mock mode', error);
    // Fall back to mock mode if real initialization fails
    isMockMode = true;
    clerkInstance = createMockClerk();
    clerkState.set({
      isLoaded: true,
      isSignedIn: false,
      user: null
    });
    return clerkInstance;
  }
}

/**
 * Create a mock Clerk instance for testing
 */
function createMockClerk() {
  // Mock organization data for testing
  let mockOrganization: any = null;
  const mockOrganizations: any[] = [];

  return {
    user: null,
    session: null,
    organization: mockOrganization,
    mountSignIn: (element: HTMLElement) => {
      element.innerHTML = `
        <div class="cl-component" data-clerk-component="sign-in" data-testid="clerk-mock-signin">
          <div class="text-center p-8 border border-mono-200 rounded-lg bg-white">
            <div class="mb-4">
              <i class="fa-solid fa-vial text-4xl text-mono-400"></i>
            </div>
            <h2 class="text-xl font-semibold text-mono-900 mb-2">Mock Sign In</h2>
            <p class="text-mono-600">Clerk is running in mock mode for testing</p>
          </div>
        </div>
      `;
    },
    mountSignUp: (element: HTMLElement) => {
      element.innerHTML = `
        <div class="cl-component" data-clerk-component="sign-up" data-testid="clerk-mock-signup">
          <div class="text-center p-8 border border-mono-200 rounded-lg bg-white">
            <div class="mb-4">
              <i class="fa-solid fa-vial text-4xl text-mono-400"></i>
            </div>
            <h2 class="text-xl font-semibold text-mono-900 mb-2">Mock Sign Up</h2>
            <p class="text-mono-600">Clerk is running in mock mode for testing</p>
          </div>
        </div>
      `;
    },
    mountUserButton: (element: HTMLElement) => {
      element.innerHTML = `
        <div class="cl-component" data-clerk-component="user-button" data-testid="clerk-mock-user-button">
          <button type="button" class="w-8 h-8 rounded-full bg-mono-700 flex items-center justify-center">
            <i class="fa-solid fa-user text-white text-sm"></i>
          </button>
        </div>
      `;
    },
    unmountUserButton: (element: HTMLElement) => {
      element.innerHTML = '';
    },
    mountUserProfile: (element: HTMLElement) => {
      element.innerHTML = `
        <div class="cl-component" data-clerk-component="user-profile" data-testid="clerk-mock-user-profile">
          <div class="p-8 border border-mono-200 rounded-lg bg-white">
            <div class="flex items-center space-x-4 mb-6">
              <div class="w-16 h-16 rounded-full bg-mono-200 flex items-center justify-center">
                <i class="fa-solid fa-user text-2xl text-mono-500"></i>
              </div>
              <div>
                <h2 class="text-xl font-semibold text-mono-900">Mock User Profile</h2>
                <p class="text-mono-600">Clerk is running in mock mode for testing</p>
              </div>
            </div>
            <div class="space-y-4 text-mono-600">
              <p>Profile management features would appear here in production.</p>
            </div>
          </div>
        </div>
      `;
    },
    unmountUserProfile: (element: HTMLElement) => {
      element.innerHTML = '';
    },
    mountOrganizationProfile: (element: HTMLElement) => {
      element.innerHTML = `
        <div class="cl-component" data-clerk-component="organization-profile" data-testid="clerk-mock-organization-profile">
          <div class="p-8 border border-mono-200 rounded-lg bg-white">
            <div class="flex items-center space-x-4 mb-6">
              <div class="w-16 h-16 rounded-lg bg-mono-200 flex items-center justify-center">
                <i class="fa-solid fa-building text-2xl text-mono-500"></i>
              </div>
              <div>
                <h2 class="text-xl font-semibold text-mono-900">Mock Organization Profile</h2>
                <p class="text-mono-600">Clerk is running in mock mode for testing</p>
              </div>
            </div>
            <div class="space-y-4 text-mono-600">
              <p>Organization management features would appear here in production.</p>
            </div>
          </div>
        </div>
      `;
    },
    unmountOrganizationProfile: (element: HTMLElement) => {
      element.innerHTML = '';
    },
    mountCreateOrganization: (element: HTMLElement) => {
      element.innerHTML = `
        <div class="cl-component" data-clerk-component="create-organization" data-testid="clerk-mock-create-organization">
          <div class="p-8 border border-mono-200 rounded-lg bg-white">
            <div class="flex items-center space-x-4 mb-6">
              <div class="w-16 h-16 rounded-lg bg-mono-200 flex items-center justify-center">
                <i class="fa-solid fa-plus text-2xl text-mono-500"></i>
              </div>
              <div>
                <h2 class="text-xl font-semibold text-mono-900">Mock Create Organization</h2>
                <p class="text-mono-600">Clerk is running in mock mode for testing</p>
              </div>
            </div>
            <div class="space-y-4 text-mono-600">
              <p>Organization creation form would appear here in production.</p>
            </div>
          </div>
        </div>
      `;
    },
    unmountCreateOrganization: (element: HTMLElement) => {
      element.innerHTML = '';
    },
    addListener: () => {},
    signOut: async () => {
      clerkState.set({
        isLoaded: true,
        isSignedIn: false,
        user: null
      });
    },
    // Organization methods for mock mode
    setActive: async ({ organization }: { organization: string | null }) => {
      if (organization === null) {
        mockOrganization = null;
      } else {
        mockOrganization = mockOrganizations.find(o => o.id === organization) || null;
      }
    },
    createOrganization: async ({ name, slug }: { name: string; slug?: string }) => {
      const newOrg = {
        id: `org_mock_${Date.now()}`,
        name,
        slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
        imageUrl: undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      mockOrganizations.push(newOrg);
      return newOrg;
    }
  };
}

export function getClerk(): any {
  return clerkInstance;
}

export async function signOut() {
  if (clerkInstance) {
    await clerkInstance.signOut();
  }
}
