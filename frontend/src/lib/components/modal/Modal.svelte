<script lang="ts">
  import { onMount } from 'svelte';

  export interface ModalProps {
    open: boolean;
    onClose?: () => void;
    preventCloseOnOverlay?: boolean;
    maxWidth?: string;
  }

  let {
    open,
    onClose,
    preventCloseOnOverlay = false,
    maxWidth = 'max-w-md',
    children
  }: ModalProps & { children: import('svelte').Snippet } = $props();

  let dialogEl: HTMLDialogElement | undefined = $state();

  $effect(() => {
    if (!dialogEl) return;
    if (open && !dialogEl.open) {
      dialogEl.showModal();
    } else if (!open && dialogEl.open) {
      dialogEl.close();
    }
  });

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      if (!preventCloseOnOverlay) {
        onClose?.();
      }
    }
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === dialogEl && !preventCloseOnOverlay) {
      onClose?.();
    }
  }
</script>

{#if open}
  <dialog
    bind:this={dialogEl}
    onkeydown={handleKeydown}
    onclick={handleBackdropClick}
    class="backdrop:bg-black/50 bg-transparent p-0 m-0 fixed inset-0 flex items-center justify-center w-full h-full"
  >
    <div class="bg-white rounded-lg shadow-xl {maxWidth} w-full mx-4">
      {@render children()}
    </div>
  </dialog>
{/if}
