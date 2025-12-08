<script lang="ts">
  import type { ApiEndpoint, EndpointTag } from '$lib/types';
  import { getNamespaceById } from '$lib/stores/namespaces';

  export interface EndpointItemProps {
    endpoint: ApiEndpoint;
    tags: EndpointTag[];
    onClick: () => void;
  }

  interface Props extends EndpointItemProps {}

  let { endpoint, tags, onClick }: Props = $props();

  const tagName = $derived(tags.find(t => t.id === endpoint.tagId)?.name);
  const namespaceName = $derived(getNamespaceById(endpoint.namespaceId)?.name ?? '');

  // Swagger/OpenAPI color scheme for HTTP methods
  type MethodColors = {
    badge: string;
    row: string;
    border: string;
  };

  function getMethodColors(method: string): MethodColors {
    switch (method) {
      case 'GET':
        return {
          badge: 'bg-blue-500 text-white',
          row: 'bg-blue-50',
          border: 'border-blue-200'
        };
      case 'POST':
        return {
          badge: 'bg-green-500 text-white',
          row: 'bg-green-50',
          border: 'border-green-200'
        };
      case 'PUT':
        return {
          badge: 'bg-amber-500 text-white',
          row: 'bg-amber-50',
          border: 'border-amber-200'
        };
      case 'PATCH':
        return {
          badge: 'bg-teal-500 text-white',
          row: 'bg-teal-50',
          border: 'border-teal-200'
        };
      case 'DELETE':
        return {
          badge: 'bg-red-500 text-white',
          row: 'bg-red-50',
          border: 'border-red-200'
        };
      default:
        return {
          badge: 'bg-mono-500 text-white',
          row: 'bg-mono-50',
          border: 'border-mono-200'
        };
    }
  }

  const colors = $derived(getMethodColors(endpoint.method));
</script>

<button
  type="button"
  onclick={onClick}
  class="w-full border {colors.border} rounded-lg overflow-hidden {colors.row} flex items-center justify-between p-2 cursor-pointer hover:brightness-95 text-left transition-all"
>
  <div class="flex items-center space-x-3">
    <span class="px-2 py-1 text-xs font-medium rounded {colors.badge}">
      {endpoint.method}
    </span>
    <span class="text-sm font-medium text-mono-900">{endpoint.path}</span>
    {#if endpoint.description}
      <span class="text-xs text-mono-500">{endpoint.description}</span>
    {/if}
  </div>
  <div class="flex items-center space-x-2">
    {#if namespaceName}
      <span class="px-2 py-1 text-xs rounded-full bg-white/60 text-mono-500 border border-mono-200">
        {namespaceName}
      </span>
    {/if}
    {#if tagName}
      <span class="px-2 py-1 text-xs rounded-full bg-white/60 text-mono-700">
        {tagName}
      </span>
    {/if}
    <i class="fa-solid fa-chevron-right text-mono-400"></i>
  </div>
</button>
