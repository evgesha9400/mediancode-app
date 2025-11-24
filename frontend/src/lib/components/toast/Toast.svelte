<script lang="ts">
  import { dismissToast } from '$lib/stores/toasts';
  import type { Toast } from '$lib/types';
  import { onMount } from 'svelte';

  export interface ToastProps {
    toast: Toast;
  }

  interface Props extends ToastProps {}

  let { toast }: Props = $props();

  let visible = $state(false);

  // Slide in animation on mount
  onMount(() => {
    setTimeout(() => {
      visible = true;
    }, 10);
  });

  function handleDismiss() {
    visible = false;
    // Wait for animation to complete before removing from store
    setTimeout(() => {
      dismissToast(toast.id);
    }, 300);
  }

  // Get icon and colors based on toast type
  const toastStyles = {
    success: {
      icon: 'fa-solid fa-check-circle',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-800',
      iconColor: 'text-green-600'
    },
    error: {
      icon: 'fa-solid fa-exclamation-circle',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      textColor: 'text-red-800',
      iconColor: 'text-red-600'
    },
    warning: {
      icon: 'fa-solid fa-exclamation-triangle',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      textColor: 'text-amber-800',
      iconColor: 'text-amber-600'
    },
    info: {
      icon: 'fa-solid fa-info-circle',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-800',
      iconColor: 'text-blue-600'
    }
  };

  const style = toastStyles[toast.type];
</script>

<div
  class="
    {style.bgColor}
    {style.borderColor}
    border rounded-md shadow-lg p-4
    flex items-center space-x-3
    min-w-[300px] max-w-md
    transition-all duration-300 ease-in-out
    {visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
  "
  role="alert"
>
  <i class="{style.icon} {style.iconColor}"></i>
  <span class="text-sm {style.textColor} flex-1">{toast.message}</span>
  <button
    type="button"
    onclick={handleDismiss}
    class="{style.textColor} hover:opacity-70 transition-opacity"
    aria-label="Dismiss notification"
  >
    <i class="fa-solid fa-times"></i>
  </button>
</div>
