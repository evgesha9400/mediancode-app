<script module lang="ts">
  import type { Toast } from '$lib/types';

  export interface ToastProps {
    toast: Toast;
  }
</script>

<script lang="ts">
  import { dismissToast } from '$lib/stores/toasts';
  import { onMount } from 'svelte';

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
      bgColor: 'bg-green-400/10',
      borderColor: 'border-green-400/30',
      textColor: 'text-green-400',
      iconColor: 'text-green-400'
    },
    error: {
      icon: 'fa-solid fa-exclamation-circle',
      bgColor: 'bg-red-400/10',
      borderColor: 'border-red-400/30',
      textColor: 'text-red-400',
      iconColor: 'text-red-400'
    },
    warning: {
      icon: 'fa-solid fa-exclamation-triangle',
      bgColor: 'bg-amber-400/10',
      borderColor: 'border-amber-400/30',
      textColor: 'text-amber-400',
      iconColor: 'text-amber-400'
    },
    info: {
      icon: 'fa-solid fa-info-circle',
      bgColor: 'bg-blue-400/10',
      borderColor: 'border-blue-400/30',
      textColor: 'text-blue-400',
      iconColor: 'text-blue-400'
    }
  };

  const style = $derived(toastStyles[toast.type]);
</script>

<div
  class="
    {style.bgColor}
    {style.borderColor}
    border rounded-xl shadow-lg p-4
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
