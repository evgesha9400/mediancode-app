<script lang="ts">
  import { page } from '$app/stores';
  import Sidebar from './Sidebar.svelte';

  interface Props {
    children: import('svelte').Snippet;
  }

  let { children }: Props = $props();

  let currentPath = $derived($page.url.pathname);
</script>

<div class="flex h-screen bg-mono-50">
  <Sidebar activeRoute={currentPath} />

  <div class="flex-1 flex flex-col overflow-hidden">
    {@render children()}
  </div>
</div>
