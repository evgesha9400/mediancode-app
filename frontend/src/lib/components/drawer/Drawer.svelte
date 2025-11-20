<script lang="ts">
  import { slide } from 'svelte/transition';

  export let open: boolean;
  export let width: string = 'w-96';
</script>

{#if open}
  <div
    transition:slide={{ duration: 300, axis: 'x' }}
    class="fixed right-0 top-0 h-screen {width} bg-white border-l border-mono-200 flex flex-col overflow-hidden z-50"
  >
    <slot />
  </div>
{/if}
