<!--
  ClerkUserProfile - Wrapper component for Clerk's UserProfile

  Mounts the Clerk UserProfile component which displays a full user profile
  management interface for viewing and editing user information.

  @component
  @example
  <ClerkUserProfile />
-->
<script module lang="ts">
  export interface ClerkUserProfileProps {
    /**
     * Optional CSS class to apply to the container
     */
    class?: string;
  }
</script>

<script lang="ts">
  import { onDestroy } from 'svelte';
  import { getClerk, clerkAppearance, clerkState } from '$lib/clerk';

  interface Props extends ClerkUserProfileProps {}

  let { class: className = '' }: Props = $props();

  let containerElement: HTMLDivElement;
  let isLoading = $state(true);
  let hasError = $state(false);
  let isMounted = $state(false);

  // Reactively mount when Clerk becomes available
  $effect(() => {
    const clerkLoaded = $clerkState.isLoaded;

    if (!clerkLoaded || !containerElement || isMounted) {
      return;
    }

    const clerk = getClerk();
    if (!clerk) {
      isLoading = false;
      hasError = true;
      return;
    }

    // Check if mount method exists
    if (typeof clerk.mountUserProfile !== 'function') {
      console.warn('[ClerkUserProfile] mountUserProfile not available');
      isLoading = false;
      hasError = true;
      return;
    }

    try {
      clerk.mountUserProfile(containerElement, {
        appearance: clerkAppearance,
      });
      isLoading = false;
      isMounted = true;
    } catch (error) {
      console.error('[ClerkUserProfile] Failed to mount:', error);
      isLoading = false;
      hasError = true;
    }
  });

  onDestroy(() => {
    if (isMounted) {
      const clerk = getClerk();
      if (clerk && typeof clerk.unmountUserProfile === 'function') {
        try {
          clerk.unmountUserProfile(containerElement);
        } catch (error) {
          console.error('[ClerkUserProfile] Failed to unmount:', error);
        }
      }
    }
  });
</script>

<div class="clerk-user-profile {className}" data-testid="clerk-user-profile">
  {#if isLoading}
    <div class="flex items-center justify-center p-8">
      <i class="fa-solid fa-spinner fa-spin text-2xl text-mono-400"></i>
    </div>
  {:else if hasError}
    <div class="p-6 bg-mono-950/40 border border-mono-800/80 rounded-2xl text-center shadow-sm">
      <i class="fa-solid fa-exclamation-circle text-2xl text-mono-400 mb-2"></i>
      <p class="text-mono-400">Unable to load user profile</p>
    </div>
  {/if}
  <div bind:this={containerElement}></div>
</div>

<style>
  .clerk-user-profile {
    width: 100%;
  }
</style>
