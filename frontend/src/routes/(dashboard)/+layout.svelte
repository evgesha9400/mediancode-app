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
      loadStoresFromApi().catch(err => {
        console.error('[Dashboard] Failed to load data from API:', err);
      });
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
    {:else if $storeLoadingState.error}
      <div class="flex-1 flex items-center justify-center">
        <div class="text-center max-w-md px-4">
          <div class="text-red-500 mb-4">
            <i class="fa-solid fa-circle-exclamation text-4xl"></i>
          </div>
          <h2 class="text-xl font-semibold text-mono-900 mb-2">Failed to load data</h2>
          <p class="text-mono-600 mb-4">{$storeLoadingState.error}</p>
          <button
            class="px-4 py-2 bg-mono-900 text-white rounded-lg hover:bg-mono-800 transition-colors"
            onclick={() => loadStoresFromApi()}
          >
            Try Again
          </button>
        </div>
      </div>
    {:else}
      {@render children()}
    {/if}
  </div>

  <ToastContainer />
</div>
