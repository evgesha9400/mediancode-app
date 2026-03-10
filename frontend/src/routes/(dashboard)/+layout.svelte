<script lang="ts">
  import { page } from '$app/state';
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import ToastContainer from '$lib/components/toast/ToastContainer.svelte';
  import { clerkState } from '$lib/clerk';
  import { loadStoresFromApi, storeLoadingState } from '$lib/stores/loader';
  import { sidebarState } from '$lib/stores/sidebar.svelte';

  let { children } = $props();

  let currentPath = $derived(page.url.pathname);

  // Redirect unauthenticated users to sign-in with return URL
  $effect(() => {
    if (browser && $clerkState.isLoaded && !$clerkState.isSignedIn) {
      const redirectTarget = encodeURIComponent(page.url.pathname + page.url.search);
      goto(`/signin?redirect=${redirectTarget}`);
    }
  });

  // Load store data from API when user is authenticated
  $effect(() => {
    if (browser && $clerkState.isLoaded && $clerkState.isSignedIn) {
      loadStoresFromApi();
    }
  });

  // Monitor viewport width for sidebar collapse
  $effect(() => {
    return sidebarState.initViewportMonitoring();
  });
</script>

{#if !$clerkState.isLoaded || !$clerkState.isSignedIn}
  <div class="flex h-screen items-center justify-center bg-mono-950">
    <div class="text-center">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400 mx-auto"></div>
      <p class="mt-4 text-mono-400">Loading...</p>
    </div>
  </div>
{:else}
  <div class="flex h-screen bg-mono-950">
    <Sidebar activeRoute={currentPath} />

    <div class="flex-1 flex flex-col overflow-hidden">
      {#if $storeLoadingState.isLoading}
        <div class="flex-1 flex items-center justify-center">
          <div class="text-center">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400 mx-auto"></div>
            <p class="mt-4 text-mono-400">Loading data...</p>
          </div>
        </div>
      {:else}
        {@render children()}
      {/if}
    </div>

    <ToastContainer />
  </div>
{/if}
