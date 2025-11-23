<script lang="ts">
  import { toastsStore } from '$lib/stores/toasts';
  import Toast from './Toast.svelte';

  let toasts = $derived($toastsStore);
</script>

<div class="fixed top-16 right-6 z-[100] flex flex-col space-y-2 pointer-events-none">
  {#each toasts as toast (toast.id)}
    <div class="pointer-events-auto">
      <Toast {toast} />
    </div>
  {/each}
</div>
