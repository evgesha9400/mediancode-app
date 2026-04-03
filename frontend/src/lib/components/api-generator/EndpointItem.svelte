<script module lang="ts">
  import type { ApiEndpoint } from '$lib/types';

  export interface EndpointItemProps {
    endpoint: ApiEndpoint;
    onClick: () => void;
  }
</script>

<script lang="ts">
  interface Props extends EndpointItemProps {}

  let { endpoint, onClick }: Props = $props();

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
          row: 'bg-blue-400/10',
          border: 'border-blue-400/30'
        };
      case 'POST':
        return {
          badge: 'bg-green-500 text-white',
          row: 'bg-green-400/10',
          border: 'border-green-400/30'
        };
      case 'PUT':
        return {
          badge: 'bg-amber-500 text-white',
          row: 'bg-amber-400/10',
          border: 'border-amber-400/30'
        };
      case 'PATCH':
        return {
          badge: 'bg-teal-500 text-white',
          row: 'bg-teal-400/10',
          border: 'border-teal-400/30'
        };
      case 'DELETE':
        return {
          badge: 'bg-red-500 text-white',
          row: 'bg-red-400/10',
          border: 'border-red-400/30'
        };
      default:
        return {
          badge: 'bg-mono-500 text-white',
          row: 'bg-mono-800',
          border: 'border-mono-700'
        };
    }
  }

  const colors = $derived(getMethodColors(endpoint.method));
</script>

<button
  type="button"
  onclick={onClick}
  class="w-full border {colors.border} rounded-xl {colors.row} flex items-center justify-between p-3 cursor-pointer hover:brightness-110 shadow-sm backdrop-blur-sm text-left transition-all"
>
  <div class="flex items-center space-x-4">
    <span class="w-[70px] text-center flex-shrink-0 px-2 py-1 text-xs font-inter font-bold rounded-lg {colors.badge} shadow-sm backdrop-blur-md">
      {endpoint.method}
    </span>
    <span class="text-sm font-medium text-mono-100">{endpoint.path}</span>
    {#if endpoint.description}
      <span class="text-xs text-mono-400">{endpoint.description}</span>
    {/if}
  </div>
  <i class="fa-solid fa-chevron-right text-mono-400"></i>
</button>
