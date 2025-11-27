<script lang="ts">
  import type { ApiEndpoint, EndpointTag } from '$lib/types';

  export interface EndpointItemProps {
    endpoint: ApiEndpoint;
    tags: EndpointTag[];
    onClick: () => void;
  }

  interface Props extends EndpointItemProps {}

  let { endpoint, tags, onClick }: Props = $props();

  const tagName = $derived(tags.find(t => t.id === endpoint.tagId)?.name);

  function getMethodColorClass(method: string): string {
    return 'bg-mono-100 text-mono-800';
  }
</script>

<button
  type="button"
  onclick={onClick}
  class="w-full border border-mono-200 rounded-lg overflow-hidden bg-white flex items-center justify-between p-4 cursor-pointer hover:bg-mono-50 text-left transition-all"
>
  <div class="flex items-center space-x-3">
    <span class="px-2 py-1 text-xs rounded {getMethodColorClass(endpoint.method)}">
      {endpoint.method}
    </span>
    <span class="text-sm text-mono-900">{endpoint.path}</span>
    {#if endpoint.description}
      <span class="text-xs text-mono-500">{endpoint.description}</span>
    {/if}
  </div>
  <div class="flex items-center space-x-2">
    {#if tagName}
      <span class="px-2 py-1 text-xs rounded-full bg-mono-200 text-mono-700">
        {tagName}
      </span>
    {/if}
    <i class="fa-solid fa-chevron-right text-mono-400"></i>
  </div>
</button>
