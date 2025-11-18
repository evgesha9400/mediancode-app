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

export async function initializeClerk(publishableKey: string): Promise<any> {
  if (clerkInstance) {
    return clerkInstance;
  }

  // Dynamic import - only runs in browser
  const { Clerk } = await import('@clerk/clerk-js');

  clerkInstance = new Clerk(publishableKey);
  await clerkInstance.load({
    signInUrl: '/signin',
    signUpUrl: '/signup',
    afterSignInUrl: '/dashboard',
    afterSignUpUrl: '/dashboard'
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
}

export function getClerk(): any {
  return clerkInstance;
}

export async function signOut() {
  if (clerkInstance) {
    await clerkInstance.signOut();
  }
}
