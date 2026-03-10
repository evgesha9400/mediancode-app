<!--
  ClerkCreateOrganization - Wrapper component for Clerk's CreateOrganization

  Mounts the Clerk CreateOrganization component which displays a form for
  creating new organizations.

  @component
  @example
  <ClerkCreateOrganization />
-->
<script module lang="ts">
  export interface ClerkCreateOrganizationProps {
    /**
     * Optional CSS class to apply to the container
     */
    class?: string;
  }
</script>

<script lang="ts">
  import { onDestroy } from 'svelte';
  import { getClerk, clerkAppearance, clerkState } from '$lib/clerk';

  interface Props extends ClerkCreateOrganizationProps {}

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
    if (typeof clerk.mountCreateOrganization !== 'function') {
      console.warn('[ClerkCreateOrganization] mountCreateOrganization not available');
      isLoading = false;
      hasError = true;
      return;
    }

    try {
      clerk.mountCreateOrganization(containerElement, {
        appearance: clerkAppearance,
      });
      isLoading = false;
      isMounted = true;
    } catch (error) {
      console.error('[ClerkCreateOrganization] Failed to mount:', error);
      isLoading = false;
      hasError = true;
    }
  });

  onDestroy(() => {
    if (isMounted) {
      const clerk = getClerk();
      if (clerk && typeof clerk.unmountCreateOrganization === 'function') {
        try {
          clerk.unmountCreateOrganization(containerElement);
        } catch (error) {
          console.error('[ClerkCreateOrganization] Failed to unmount:', error);
        }
      }
    }
  });
</script>

<div class="clerk-create-organization {className}" data-testid="clerk-create-organization">
  {#if isLoading}
    <div class="flex items-center justify-center p-8">
      <i class="fa-solid fa-spinner fa-spin text-2xl text-mono-400"></i>
    </div>
  {:else if hasError}
    <div class="p-6 bg-mono-950 border-2 border-mono-700 text-center">
      <i class="fa-solid fa-exclamation-circle text-2xl text-mono-400 mb-2"></i>
      <p class="text-mono-400">Unable to load organization creation form</p>
    </div>
  {/if}
  <div bind:this={containerElement}></div>
</div>

<style>
  .clerk-create-organization {
    width: 100%;
  }
</style>
