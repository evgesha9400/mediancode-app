<!--
  ConfirmDialog - Modal confirmation dialog component

  Displays a centered modal overlay for confirming destructive actions.
  Uses fixed positioning with backdrop overlay and supports custom messaging.

  @component
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { fade } from 'svelte/transition';

  export interface ConfirmDialogProps {
    /**
     * Whether the dialog is currently open/visible
     */
    open: boolean;

    /**
     * Dialog title
     */
    title: string;

    /**
     * Main message text
     */
    message: string;

    /**
     * Confirm button text
     * @default 'Confirm'
     */
    confirmText?: string;

    /**
     * Cancel button text
     * @default 'Cancel'
     */
    cancelText?: string;

    /**
     * Confirm button style variant
     * @default 'danger'
     */
    variant?: 'danger' | 'primary';

    /**
     * Callback when confirm is clicked
     */
    onConfirm: () => void;

    /**
     * Callback when cancel is clicked
     */
    onCancel: () => void;
  }

  interface Props extends ConfirmDialogProps {}

  let {
    open,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'danger',
    onConfirm,
    onCancel
  }: Props = $props();

  const buttonStyles = {
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    primary: 'bg-mono-900 hover:bg-mono-800 text-white'
  };

  const buttonStyle = buttonStyles[variant];
</script>

{#if open}
  <!-- Backdrop -->
  <div
    transition:fade={{ duration: 200 }}
    class="fixed inset-0 bg-mono-900/50 z-50 flex items-center justify-center p-4"
    onclick={onCancel}
    role="presentation"
  >
    <!-- Dialog -->
    <div
      class="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      tabindex="-1"
    >
      <!-- Header -->
      <div class="flex items-start justify-between mb-4">
        <div class="flex items-center space-x-3">
          <div class="flex-shrink-0">
            {#if variant === 'danger'}
              <div class="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <i class="fa-solid fa-exclamation-triangle text-red-600"></i>
              </div>
            {:else}
              <div class="w-10 h-10 rounded-full bg-mono-100 flex items-center justify-center">
                <i class="fa-solid fa-circle-info text-mono-600"></i>
              </div>
            {/if}
          </div>
          <h2 id="dialog-title" class="text-lg text-mono-900">
            {title}
          </h2>
        </div>
      </div>

      <!-- Message -->
      <div class="mb-6">
        <p class="text-sm text-mono-600">{message}</p>
      </div>

      <!-- Actions -->
      <div class="flex justify-end space-x-3">
        <button
          type="button"
          onclick={onCancel}
          class="px-4 py-2 border border-mono-300 text-mono-700 rounded-md hover:bg-mono-50 transition-colors"
        >
          {cancelText}
        </button>
        <button
          type="button"
          onclick={onConfirm}
          class="px-4 py-2 rounded-md transition-colors {buttonStyle}"
        >
          {confirmText}
        </button>
      </div>
    </div>
  </div>
{/if}
