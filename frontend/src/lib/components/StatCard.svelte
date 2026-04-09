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
  class="{cardGlassSurface} {error ? cardGlassBorderError : cardGlassBorderDefault} p-4 h-full min-w-0"
  data-testid={getStatCardTestId(title)}
>
  <!-- Icon + two-line text: value (and optional trend) on row 1, full title on row 2 — avoids narrow-cell truncation. -->
  <div class="flex gap-3 items-start min-w-0">
    <div class="w-10 h-10 shrink-0 {error ? accentIconTileError : accentIconTile}">
      {#if error}
        <i class="fa-solid fa-circle-exclamation text-lg"></i>
      {:else}
        <i class="fa-solid {icon} text-lg"></i>
      {/if}
    </div>
    <div class="min-w-0 flex-1 flex flex-col gap-0.5">
      <div class="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">
        {#if error}
          <div class="flex items-center flex-wrap gap-x-1.5" data-testid="stat-value">
            <span class="text-sm text-red-400 font-medium font-inter">Error</span>
            {#if onRetry}
              <span class="text-fg-faint">·</span>
              <button
                onclick={onRetry}
                class="text-sm text-red-400 hover:text-red-300 transition-colors underline font-inter"
              >
                Retry
              </button>
            {/if}
          </div>
        {:else}
          <span
            class="text-2xl text-fg font-inter font-bold tracking-tight tabular-nums leading-none"
            data-testid="stat-value">{value}</span>
        {/if}
        {#if trend && !error}
          <span class="text-xs text-fg-muted font-inter font-medium leading-snug">{trend}</span>
        {/if}
      </div>
      <span class="text-sm text-fg-muted font-inter font-medium leading-snug break-normal">{title}</span>
    </div>
  </div>
</div>
