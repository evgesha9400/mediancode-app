import { writable, type Writable } from 'svelte/store';

export interface ClerkState {
  isLoaded: boolean;
  isSignedIn: boolean;
  user: any | null;
}

export const clerkState: Writable<ClerkState> = writable({
  isLoaded: false,
  isSignedIn: false,
  user: null
});

let clerkInstance: any = null;
let isMockMode = false;

/**
 * Check if we should use mock mode for testing
 * Mock mode is enabled when VITE_CLERK_MOCK_MODE is set to 'true'
 */
function shouldUseMockMode(): boolean {
  if (typeof window === 'undefined') return false;
  return (window as any).__CLERK_MOCK_MODE__ === true ||
         import.meta.env.VITE_CLERK_MOCK_MODE === 'true';
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

    // Listen for auth changes
    clerkInstance.addListener((resources: any) => {
      clerkState.set({
        isLoaded: true,
        isSignedIn: !!resources.user,
        user: resources.user
      });
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
  return {
    user: null,
    session: null,
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
    addListener: () => {},
    signOut: async () => {
      clerkState.set({
        isLoaded: true,
        isSignedIn: false,
        user: null
      });
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
