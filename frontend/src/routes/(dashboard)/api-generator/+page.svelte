<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  // Redirect to the new APIs page
  onMount(() => {
    goto('/apis', { replaceState: true });
  });
</script>

<div class="flex-1 flex items-center justify-center">
  <p class="text-mono-500">Redirecting to APIs...</p>
</div>
