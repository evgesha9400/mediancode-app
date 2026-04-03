<script lang="ts" module>
  // Empty props interface for consistency with component export pattern
  // This component receives no props but follows the standard Props export pattern
  export interface ToastContainerProps {}
</script>

<script lang="ts">
  import { toastsStore } from '$lib/stores/toasts';
  import Toast from './Toast.svelte';

  interface Props extends ToastContainerProps {}

  let toasts = $derived($toastsStore);
</script>

<div class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col space-y-2 pointer-events-none">
  {#each toasts as toast (toast.id)}
    <div class="pointer-events-auto">
      <Toast {toast} />
    </div>
  {/each}
</div>
