<!--
  ClerkUserButton - Wrapper component for Clerk's UserButton

  Mounts the Clerk UserButton component which displays a user avatar with a dropdown
  menu for profile access, organization switching, and sign out.

  @component
  @example
  <ClerkUserButton />
  <ClerkUserButton showName={true} />
-->
<script module lang="ts">
  export interface ClerkUserButtonProps {
    /**
     * Whether to show the user's name next to the avatar
     */
    showName?: boolean;

    /**
     * Visual variant for different background contexts
     * - 'light': For light backgrounds (default)
     * - 'dark': For dark backgrounds like sidebar
     */
    variant?: 'light' | 'dark';

    /**
     * Optional CSS class to apply to the container
     */
    class?: string;
  }
</script>

<script lang="ts">
  import { onDestroy } from 'svelte';
  import { getClerk, clerkAppearance, clerkState } from '$lib/clerk';

  interface Props extends ClerkUserButtonProps {}

  let {
    showName = false,
    variant = 'light',
    class: className = ''
  }: Props = $props();

  let containerElement: HTMLDivElement;
  let isMounted = $state(false);

  // Build appearance config based on variant
  function getAppearance() {
    if (variant === 'dark') {
      return {
        ...clerkAppearance,
        elements: {
          ...clerkAppearance.elements,
          userButtonAvatarBox: 'border-mono-600',
          userButtonTrigger: 'focus:shadow-none',
          userButtonPopoverCard: 'bg-white border border-mono-200 shadow-xl',
        }
      };
    }
    return clerkAppearance;
  }

  // Reactively mount when Clerk becomes available
  $effect(() => {
    // Subscribe to clerkState to trigger when Clerk loads
    const isLoaded = $clerkState.isLoaded;

    if (!isLoaded || !containerElement || isMounted) {
      return;
    }

    const clerk = getClerk();
    if (!clerk) {
      return;
    }

    // Check if mount method exists
    if (typeof clerk.mountUserButton !== 'function') {
      console.warn('[ClerkUserButton] mountUserButton not available');
      return;
    }

    try {
      clerk.mountUserButton(containerElement, {
        showName,
        appearance: getAppearance(),
      });
      isMounted = true;
    } catch (error) {
      console.error('[ClerkUserButton] Failed to mount:', error);
    }
  });

  onDestroy(() => {
    if (isMounted) {
      const clerk = getClerk();
      if (clerk && typeof clerk.unmountUserButton === 'function') {
        try {
          clerk.unmountUserButton(containerElement);
        } catch (error) {
          console.error('[ClerkUserButton] Failed to unmount:', error);
        }
      }
    }
  });
</script>

<div
  bind:this={containerElement}
  class="clerk-user-button {className}"
  data-testid="clerk-user-button"
></div>

<style>
  .clerk-user-button {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    width: fit-content;
  }
</style>
