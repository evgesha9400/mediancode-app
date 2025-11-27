<script lang="ts">
  import type { ApiEndpoint, EndpointTag } from '$lib/types';
  import CollapsibleCard from './CollapsibleCard.svelte';
  import EndpointItem from './EndpointItem.svelte';

  export interface EndpointsCardProps {
    endpoints: ApiEndpoint[];
    tags: EndpointTag[];
    onAdd: () => void;
    onClick: (endpointId: string) => void;
  }

  interface Props extends EndpointsCardProps {}

  let { endpoints, tags, onAdd, onClick }: Props = $props();
</script>

<CollapsibleCard title="API Endpoints" icon="fa-route">
  {#snippet actions()}
    <button
      onclick={onAdd}
      class="px-3 py-1.5 bg-mono-900 text-white text-sm rounded-md flex items-center space-x-2 hover:bg-mono-800"
    >
      <i class="fa-solid fa-plus"></i>
      <span>New Endpoint</span>
    </button>
  {/snippet}

  {#if endpoints.length === 0}
    <div class="text-center py-6 text-mono-500">
      <i class="fa-solid fa-route text-2xl mb-2 text-mono-300"></i>
      <p class="text-sm">No endpoints yet. Create your first API endpoint.</p>
    </div>
  {:else}
    <div class="space-y-2">
      {#each endpoints as endpoint (endpoint.id)}
        <EndpointItem
          {endpoint}
          {tags}
          onClick={() => onClick(endpoint.id)}
        />
      {/each}
    </div>
  {/if}
</CollapsibleCard>
