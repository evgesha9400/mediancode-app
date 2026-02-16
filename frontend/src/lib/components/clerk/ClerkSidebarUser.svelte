<!--
  ClerkSidebarUser - Custom user section for the sidebar with Clerk integration

  Displays user avatar and name in a custom layout, with Clerk's UserButton
  providing the dropdown functionality for profile, org switching, and sign out.

  @component
  @example
  <ClerkSidebarUser />
-->
<script module lang="ts">
  export interface ClerkSidebarUserProps {
    /**
     * Optional CSS class to apply to the container
     */
    class?: string;
  }
</script>

<script lang="ts">
  import { getClerk, clerkAppearance, clerkState } from '$lib/clerk';

  interface Props extends ClerkSidebarUserProps {}

  let { class: className = '' }: Props = $props();

  let buttonContainer: HTMLDivElement;
  let isMounted = $state(false);

  // Get user info from Clerk state
  let user = $derived($clerkState.user);
  let userName = $derived(user?.fullName || user?.firstName || 'User');
  let userEmail = $derived(user?.primaryEmailAddress?.emailAddress || '');
  let userImage = $derived(user?.imageUrl);

  // Appearance config for dark sidebar
  function getAppearance() {
    return {
      ...clerkAppearance,
      elements: {
        ...clerkAppearance.elements,
        // Hide the default trigger content, we'll show our own
        userButtonTrigger: 'p-0 focus:shadow-none',
        userButtonAvatarBox: 'w-10 h-10',
        userButtonPopoverCard: 'bg-white border border-mono-200 shadow-xl',
      }
    };
  }

  // Reactively mount when Clerk becomes available, with cleanup on unmount
  $effect(() => {
    const isLoaded = $clerkState.isLoaded;

    if (!isLoaded || !buttonContainer || isMounted) {
      return;
    }

    const clerk = getClerk();
    if (!clerk) {
      return;
    }

    if (typeof clerk.mountUserButton !== 'function') {
      console.warn('[ClerkSidebarUser] mountUserButton not available');
      return;
    }

    try {
      clerk.mountUserButton(buttonContainer, {
        showName: false,
        appearance: getAppearance(),
      });
      isMounted = true;
    } catch (error) {
      console.error('[ClerkSidebarUser] Failed to mount:', error);
    }

    return () => {
      if (isMounted) {
        const clerkInstance = getClerk();
        if (clerkInstance && typeof clerkInstance.unmountUserButton === 'function') {
          try {
            clerkInstance.unmountUserButton(buttonContainer);
          } catch (error) {
            console.error('[ClerkSidebarUser] Failed to unmount:', error);
          }
        }
      }
    };
  });
</script>

<div class="flex items-center gap-3 {className}" data-testid="clerk-sidebar-user">
  <!-- Clerk UserButton (avatar with dropdown) -->
  <div bind:this={buttonContainer} class="flex-shrink-0"></div>

  <!-- User info -->
  {#if $clerkState.isSignedIn && user}
    <div class="flex-1 min-w-0">
      <p class="text-sm font-medium text-white truncate">{userName}</p>
      {#if userEmail}
        <p class="text-xs text-mono-400 truncate">{userEmail}</p>
      {/if}
    </div>
  {:else if !$clerkState.isLoaded}
    <!-- Loading state -->
    <div class="flex-1 min-w-0">
      <div class="h-4 w-24 bg-mono-700 rounded animate-pulse"></div>
      <div class="h-3 w-32 bg-mono-700 rounded animate-pulse mt-1"></div>
    </div>
  {/if}
</div>
