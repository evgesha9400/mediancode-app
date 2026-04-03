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
  import {
    accentIconTile,
    accentIconTileError,
    cardGlassBorderDefault,
    cardGlassBorderError,
    cardGlassSurface,
  } from '$lib/ui/classes';
  import { getStatCardTestId } from '$lib/utils/testIds';

  interface Props extends StatCardProps {}

  let { title, value, icon, trend, error = false, onRetry }: Props = $props();
</script>

<div
  class="{cardGlassSurface} {error ? cardGlassBorderError : cardGlassBorderDefault} p-6 h-full"
  data-testid={getStatCardTestId(title)}
>
  <div class="flex items-center justify-between gap-3 mb-4">
    <div class="w-12 h-12 {error ? accentIconTileError : accentIconTile}">
      {#if error}
        <i class="fa-solid fa-circle-exclamation text-xl"></i>
      {:else}
        <i class="fa-solid {icon} text-xl"></i>
      {/if}
    </div>
    {#if trend && !error}
      <span class="text-xs text-mono-400 font-inter font-medium">{trend}</span>
    {/if}
  </div>
  <div class="h-8 flex items-end mb-1" data-testid="stat-value">
    {#if error}
      <span class="text-sm text-red-400 font-medium font-inter">Error</span>
      {#if onRetry}
        <span class="text-mono-600 mx-1.5">·</span>
        <button
          onclick={onRetry}
          class="text-sm text-red-400 hover:text-red-300 transition-colors underline font-inter"
        >
          Retry
        </button>
      {/if}
    {:else}
      <span class="text-3xl text-mono-100 font-inter font-bold tracking-tight">{value}</span>
    {/if}
  </div>
  <div class="text-sm text-mono-400 font-inter font-medium">{title}</div>
</div>
