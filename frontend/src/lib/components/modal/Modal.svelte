<script lang="ts">
  import {
    modalDialogBackdropClass,
    modalPanelGlassSurface,
    modalPanelTransparentInner,
  } from '$lib/ui/classes';

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
    class="{modalDialogBackdropClass} bg-transparent p-0 m-0 fixed inset-0 flex items-center justify-center w-full h-full"
  >
    <div class="{modalPanelGlassSurface} relative rounded-3xl {maxWidth} w-full mx-4">
      <div class={modalPanelTransparentInner}>
        {@render children()}
      </div>
    </div>
  </dialog>
{/if}
