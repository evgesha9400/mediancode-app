<!--
  ClerkOrganizationProfile - Wrapper component for Clerk's OrganizationProfile

  Mounts the Clerk OrganizationProfile component which displays a full organization
  management interface for viewing members, settings, and invitations.

  @component
  @example
  <ClerkOrganizationProfile />
-->
<script module lang="ts">
  export interface ClerkOrganizationProfileProps {
    /**
     * Optional CSS class to apply to the container
     */
    class?: string;
  }
</script>

<script lang="ts">
  import { onDestroy } from 'svelte';
  import { getClerk, clerkAppearance, clerkState } from '$lib/clerk';
  import { dashboardCardGlass } from '$lib/ui/classes';

  interface Props extends ClerkOrganizationProfileProps {}

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
    if (typeof clerk.mountOrganizationProfile !== 'function') {
      console.warn('[ClerkOrganizationProfile] mountOrganizationProfile not available');
      isLoading = false;
      hasError = true;
      return;
    }

    try {
      clerk.mountOrganizationProfile(containerElement, {
        appearance: clerkAppearance,
      });
      isLoading = false;
      isMounted = true;
    } catch (error) {
      console.error('[ClerkOrganizationProfile] Failed to mount:', error);
      isLoading = false;
      hasError = true;
    }
  });

  onDestroy(() => {
    if (isMounted) {
      const clerk = getClerk();
      if (clerk && typeof clerk.unmountOrganizationProfile === 'function') {
        try {
          clerk.unmountOrganizationProfile(containerElement);
        } catch (error) {
          console.error('[ClerkOrganizationProfile] Failed to unmount:', error);
        }
      }
    }
  });
</script>

<div class="clerk-organization-profile {className}" data-testid="clerk-organization-profile">
  {#if isLoading}
    <div class="flex items-center justify-center p-8">
      <i class="fa-solid fa-spinner fa-spin text-2xl text-mono-400"></i>
    </div>
  {:else if hasError}
    <div class="p-6 {dashboardCardGlass} text-center">
      <i class="fa-solid fa-exclamation-circle text-2xl text-mono-400 mb-2"></i>
      <p class="text-mono-400">Unable to load organization profile</p>
    </div>
  {/if}
  <div bind:this={containerElement}></div>
</div>

<style>
  .clerk-organization-profile {
    width: 100%;
  }
</style>
