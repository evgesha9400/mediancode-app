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

  interface Props extends ApiReadinessCardProps {}

  let { apiId, title, version, endpointCount, readyEndpointCount, status, onGenerate }: Props = $props();

  const statusConfig = {
    'ready': { label: 'Ready to generate', color: 'text-green-700 bg-green-50 border-green-200' },
    'needs-endpoints': { label: 'Needs endpoints', color: 'text-amber-700 bg-amber-50 border-amber-200' },
    'incomplete': { label: 'Incomplete', color: 'text-mono-600 bg-mono-50 border-mono-200' },
  };

  let config = $derived(statusConfig[status]);
</script>

<div class="bg-white rounded-lg border border-mono-200 p-4" data-testid="api-readiness-card-{apiId}">
  <div class="flex items-start justify-between mb-3">
    <div class="min-w-0">
      <button
        onclick={() => goto(`/apis/${apiId}`)}
        class="text-sm font-medium text-mono-900 hover:underline cursor-pointer truncate block"
      >
        {title}
      </button>
      <span class="text-xs text-mono-400">v{version}</span>
    </div>
    <span class="text-xs px-2 py-0.5 rounded-full border shrink-0 ml-2 {config.color}">
      {config.label}
    </span>
  </div>

  <div class="flex items-center justify-between">
    <span class="text-xs text-mono-500">
      {endpointCount} endpoint{endpointCount !== 1 ? 's' : ''}
      {#if endpointCount > 0}
        <span class="text-mono-300 mx-1">&middot;</span>
        {readyEndpointCount} configured
      {/if}
    </span>

    {#if status === 'ready'}
      <button
        onclick={onGenerate}
        class="text-xs px-3 py-1 bg-mono-900 text-white rounded-md font-medium hover:bg-mono-800 transition-colors cursor-pointer flex items-center space-x-1"
        data-testid="api-generate-btn-{apiId}"
      >
        <i class="fa-solid fa-code text-[10px]"></i>
        <span>Generate</span>
      </button>
    {:else}
      <button
        onclick={() => goto(`/apis/${apiId}`)}
        class="text-xs px-3 py-1 border border-mono-200 text-mono-600 rounded-md font-medium hover:bg-mono-50 transition-colors cursor-pointer"
      >
        Configure
      </button>
    {/if}
  </div>
</div>
