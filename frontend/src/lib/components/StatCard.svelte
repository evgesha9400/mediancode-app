<script module lang="ts">
  export interface StatCardProps {
    title: string;
    value: string | number;
    icon: string;
    trend?: string;
    error?: boolean;
    onRetry?: () => void;
  }
</script>

<script lang="ts">
  import { getStatCardTestId } from '$lib/utils/testIds';

  interface Props extends StatCardProps {}

  let { title, value, icon, trend, error = false, onRetry }: Props = $props();
</script>

<div class="bg-white rounded-lg border {error ? 'border-red-200' : 'border-mono-200'} p-6 h-full" data-testid={getStatCardTestId(title)}>
  <div class="flex items-center justify-between mb-4">
    <div class="w-12 h-12 {error ? 'bg-red-50' : 'bg-mono-100'} rounded-lg flex items-center justify-center">
      {#if error}
        <i class="fa-solid fa-circle-exclamation text-red-400 text-xl"></i>
      {:else}
        <i class="fa-solid {icon} text-mono-700 text-xl"></i>
      {/if}
    </div>
    {#if trend && !error}
      <span class="text-xs text-mono-500">{trend}</span>
    {/if}
  </div>
  <div class="h-8 flex items-end mb-1" data-testid="stat-value">
    {#if error}
      <span class="text-sm text-red-600 font-medium">Error</span>
      {#if onRetry}
        <span class="text-mono-300 mx-1.5">·</span>
        <button
          onclick={onRetry}
          class="text-sm text-red-600 hover:text-red-800 transition-colors underline"
        >
          Retry
        </button>
      {/if}
    {:else}
      <span class="text-2xl text-mono-900 font-semibold">{value}</span>
    {/if}
  </div>
  <div class="text-sm text-mono-500">{title}</div>
</div>
