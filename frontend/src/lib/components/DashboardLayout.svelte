<script lang="ts">
  import type { Snippet } from 'svelte';
  import { page } from '$app/state';
  import Sidebar from './Sidebar.svelte';
  import ToastContainer from './toast/ToastContainer.svelte';

  export interface DashboardLayoutProps {
    children: Snippet;
  }

  interface Props extends DashboardLayoutProps {}

  let { children }: Props = $props();

  let currentPath = $derived(page.url.pathname);
</script>

<div class="flex h-screen bg-mono-50">
  <Sidebar activeRoute={currentPath} />

  <div class="flex-1 flex flex-col overflow-hidden">
    {@render children()}
  </div>

  <ToastContainer />
</div>
