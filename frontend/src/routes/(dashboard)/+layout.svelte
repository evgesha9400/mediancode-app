<script lang="ts">
  import { page } from '$app/state';
  import { browser } from '$app/environment';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import ToastContainer from '$lib/components/toast/ToastContainer.svelte';
  import { clerkState } from '$lib/clerk';
  import { loadStoresFromApi, storeLoadingState } from '$lib/stores/loader';

  let { children } = $props();

  let currentPath = $derived(page.url.pathname);

  // Load store data from API when user is authenticated
  $effect(() => {
    if (browser && $clerkState.isLoaded && $clerkState.isSignedIn) {
      loadStoresFromApi();
    }
  });
</script>

<div class="flex h-screen bg-mono-50">
  <Sidebar activeRoute={currentPath} />

  <div class="flex-1 flex flex-col overflow-hidden">
    {#if $storeLoadingState.isLoading}
      <div class="flex-1 flex items-center justify-center">
        <div class="text-center">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-mono-900 mx-auto"></div>
          <p class="mt-4 text-mono-600">Loading data...</p>
        </div>
      </div>
    {:else}
      {@render children()}
    {/if}
  </div>

  <ToastContainer />
</div>
