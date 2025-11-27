<script lang="ts">
  import type { EndpointParameter } from '$lib/types';

  export interface ParameterRowProps {
    parameter: EndpointParameter;
  }

  interface Props extends ParameterRowProps {}

  let { parameter }: Props = $props();
</script>

<div class="flex items-center space-x-2 p-2 bg-mono-50 rounded border border-mono-200">
  <span class="text-xs text-mono-600 w-24">{parameter.name}</span>
  <span class="px-2 py-0.5 text-xs rounded-full bg-mono-200 text-mono-700">
    {parameter.type}
  </span>
  <span class="text-xs text-mono-500 flex-1">{parameter.description}</span>
  <span class="px-2 py-0.5 text-xs rounded-full bg-mono-{parameter.required ? '100' : '200'} text-mono-700">
    {parameter.required ? 'Required' : 'Optional'}
  </span>
</div>
