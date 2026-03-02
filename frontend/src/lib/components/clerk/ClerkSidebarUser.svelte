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
     * Whether the sidebar is in collapsed (icon-only) mode
     */
    collapsed?: boolean;

    /**
     * Optional CSS class to apply to the container
     */
    class?: string;
  }
</script>

<script lang="ts">
  import { onDestroy } from 'svelte';
  import { getClerk, clerkAppearance, clerkState } from '$lib/clerk';
  import { Tooltip } from '$lib/components/tooltip';

  interface Props extends ClerkSidebarUserProps {}

  let { collapsed = false, class: className = '' }: Props = $props();

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

  // Reactively mount when Clerk becomes available
  // Note: Cleanup is handled by onDestroy, NOT the $effect cleanup function.
  // Using $effect cleanup would unmount the button whenever clerkState updates
  // (e.g., from Clerk's addListener firing), since the effect re-runs on any
  // store change, and the isMounted guard prevents re-mounting.
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
  });

  onDestroy(() => {
    if (isMounted) {
      const clerk = getClerk();
      if (clerk && typeof clerk.unmountUserButton === 'function') {
        try {
          clerk.unmountUserButton(buttonContainer);
        } catch (error) {
          console.error('[ClerkSidebarUser] Failed to unmount:', error);
        }
      }
    }
  });
</script>

<div class="flex items-center gap-3 {className}" data-testid="clerk-sidebar-user">
  <!-- Clerk UserButton (avatar with dropdown) -->
  <Tooltip text={userName} position="right" disabled={!collapsed}>
    <div
      bind:this={buttonContainer}
      class="flex-shrink-0 rounded-md transition-colors {collapsed ? 'hover:bg-mono-800 p-1' : ''}"
    ></div>
  </Tooltip>

  <!-- User info (hidden when collapsed) -->
  {#if !collapsed}
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
  {/if}
</div>
