<script lang="ts">
  import { page } from '$app/state';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import ToastContainer from '$lib/components/toast/ToastContainer.svelte';

  let { children } = $props();

  let currentPath = $derived(page.url.pathname);
</script>

<div class="flex h-screen bg-mono-50">
  <Sidebar activeRoute={currentPath} />

  <div class="flex-1 flex flex-col overflow-hidden">
    {@render children()}
  </div>

  <ToastContainer />
</div>
