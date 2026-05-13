<script module lang="ts">
  export interface ApiReadinessCardProps {
    apiId: string;
    title: string;
    version: string;
    endpointCount: number;
    readyEndpointCount: number;
    status: 'ready' | 'needs-endpoints' | 'incomplete';
    onGenerate: () => void;
  }
</script>

<script lang="ts">
  import { goto } from '$app/navigation';
  import {
    apiReadinessStatusReadyClasses,
    btnGenerateSm,
    cardGlassBorderDefault,
    cardGlassSurface,
    tableListEntityTitleButton,
  } from '$lib/ui/classes';

  interface Props extends ApiReadinessCardProps {}

  let { apiId, title, version, endpointCount, readyEndpointCount, status, onGenerate }: Props = $props();

  const statusConfig = {
    'ready': { label: 'Ready to generate', color: apiReadinessStatusReadyClasses },
    'needs-endpoints': { label: 'Needs endpoints', color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
    'incomplete': { label: 'Incomplete', color: 'text-fg-muted bg-surface-raised/50 border-edge/50' },
  };

  let config = $derived(statusConfig[status]);
</script>

<div class="{cardGlassSurface} {cardGlassBorderDefault} p-5" data-testid="api-readiness-card-{apiId}">
  <div class="flex items-start justify-between mb-4">
    <div class="min-w-0">
      <button
        onclick={() => goto(`/apis/${apiId}`)}
        class={tableListEntityTitleButton}
      >
        {title}
      </button>
      <span class="text-xs font-mono text-fg-muted">v{version}</span>
    </div>
    <span class="text-[11px] px-2.5 py-1 rounded-full border shrink-0 ml-2 font-inter font-medium tracking-wide {config.color}">
      {config.label}
    </span>
  </div>

  <div class="flex items-center justify-between">
    <span class="text-sm font-inter text-fg-muted">
      {endpointCount} endpoint{endpointCount !== 1 ? 's' : ''}
      {#if endpointCount > 0}
        <span class="text-fg-faint mx-1">&middot;</span>
        {readyEndpointCount} configured
      {/if}
    </span>

    {#if status === 'ready'}
      <button
        onclick={onGenerate}
        class={btnGenerateSm}
        data-testid="api-generate-btn-{apiId}"
      >
        <i class="fa-solid fa-code text-[11px]"></i>
        <span>Generate</span>
      </button>
    {:else}
      <button
        onclick={() => goto(`/apis/${apiId}`)}
        class="text-xs px-4 py-1.5 rounded-lg border border-edge-strong/80 text-fg-secondary font-inter font-medium hover:bg-surface-overlay transition-colors cursor-pointer"
      >
        Configure
      </button>
    {/if}
  </div>
</div>
