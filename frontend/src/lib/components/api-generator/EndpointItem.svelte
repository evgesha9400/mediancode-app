<script lang="ts">
  import type { ApiEndpoint, EndpointTag } from '$lib/types';
  import ParameterRow from './ParameterRow.svelte';
  import ResponsePreview from './ResponsePreview.svelte';

  export interface EndpointItemProps {
    endpoint: ApiEndpoint;
    tags: EndpointTag[];
    onToggle: () => void;
    onUpdate: (updates: Partial<ApiEndpoint>) => void;
    onDelete: () => void;
    onDuplicate: () => void;
  }

  interface Props extends EndpointItemProps {}

  let { endpoint, tags, onToggle, onUpdate, onDelete, onDuplicate }: Props = $props();

  const tagName = $derived(tags.find(t => t.id === endpoint.tagId)?.name);
  const expanded = $derived(endpoint.expanded || false);

  function getMethodColorClass(method: string): string {
    switch (method) {
      case 'GET': return 'bg-mono-100 text-mono-800';
      case 'POST': return 'bg-mono-100 text-mono-800';
      case 'PUT': return 'bg-mono-100 text-mono-800';
      case 'PATCH': return 'bg-mono-100 text-mono-800';
      case 'DELETE': return 'bg-mono-100 text-mono-800';
      default: return 'bg-mono-100 text-mono-800';
    }
  }
</script>

<div class="border border-mono-{expanded ? '300' : '200'} rounded-lg overflow-hidden">
  <!-- Collapsed View -->
  <button
    type="button"
    class="w-full flex items-center justify-between p-4 bg-{expanded ? 'white' : 'mono-50'} cursor-pointer hover:bg-{expanded ? 'mono-50' : 'mono-100'} text-left"
    onclick={onToggle}
    aria-expanded={expanded}
  >
    <div class="flex items-center space-x-3">
      <span class="px-2 py-1 text-xs rounded {getMethodColorClass(endpoint.method)}">
        {endpoint.method}
      </span>
      <span class="text-sm text-mono-900">{endpoint.path}</span>
      <span class="text-xs text-mono-500">{endpoint.description}</span>
    </div>
    <div class="flex items-center space-x-2">
      {#if tagName}
        <span class="px-2 py-1 text-xs rounded-full bg-mono-200 text-mono-700">
          {tagName}
        </span>
      {/if}
      <span class="text-mono-500 hover:text-mono-700" aria-hidden="true">
        <i class="fa-solid fa-chevron-{expanded ? 'up' : 'down'}"></i>
      </span>
    </div>
  </button>

  <!-- Expanded View -->
  {#if expanded}
    <div class="border-t border-mono-200 p-4 bg-white space-y-4">
      <!-- Tag Assignment -->
      <div>
        <h3 class="text-sm text-mono-700 mb-2 flex items-center">
          <i class="fa-solid fa-tag mr-2"></i>
          Tag
        </h3>
        <select
          value={endpoint.tagId || ''}
          onchange={(e) => onUpdate({ tagId: e.currentTarget.value || undefined })}
          class="w-full max-w-xs px-3 py-1.5 border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent text-sm"
        >
          <option value="">None</option>
          {#each tags as tag (tag.id)}
            <option value={tag.id}>{tag.name}</option>
          {/each}
        </select>
      </div>

      <!-- Path Parameters -->
      <div>
        <h3 class="text-sm text-mono-700 mb-2 flex items-center">
          <i class="fa-solid fa-link mr-2"></i>
          Path Parameters
        </h3>
        {#if endpoint.pathParams.length === 0}
          <div class="p-3 bg-mono-50 rounded border border-mono-200">
            <p class="text-xs text-mono-500">No path parameters</p>
          </div>
        {:else}
          <div class="space-y-2">
            {#each endpoint.pathParams as param (param.id)}
              <ParameterRow parameter={param} />
            {/each}
          </div>
        {/if}
      </div>

      <!-- Query Parameters -->
      <div>
        <h3 class="text-sm text-mono-700 mb-2 flex items-center">
          <i class="fa-solid fa-filter mr-2"></i>
          Query Parameters
        </h3>
        {#if endpoint.queryParams.length === 0}
          <div class="p-3 bg-mono-50 rounded border border-mono-200">
            <p class="text-xs text-mono-500">No query parameters</p>
          </div>
        {:else}
          <div class="space-y-2">
            {#each endpoint.queryParams as param (param.id)}
              <ParameterRow parameter={param} />
            {/each}
          </div>
        {/if}
      </div>

      <!-- Request Body -->
      <div>
        <h3 class="text-sm text-mono-700 mb-2 flex items-center">
          <i class="fa-solid fa-arrow-up mr-2"></i>
          Request Body
        </h3>
        <div class="p-3 bg-mono-50 rounded border border-mono-200">
          {#if endpoint.requestBody}
            <pre class="text-xs text-mono-700">{endpoint.requestBody}</pre>
          {:else}
            <p class="text-xs text-mono-500">No request body required</p>
          {/if}
        </div>
      </div>

      <!-- Response Preview -->
      <ResponsePreview responseBody={endpoint.responseBody} />

      <!-- Response Envelope -->
      <div>
        <h3 class="text-sm text-mono-700 mb-2 flex items-center">
          <i class="fa-solid fa-envelope mr-2"></i>
          Response Envelope
        </h3>
        <div class="flex items-center space-x-2">
          <input
            id="envelope-toggle-{endpoint.id}"
            type="checkbox"
            checked={endpoint.useEnvelope}
            onchange={(e) => onUpdate({ useEnvelope: e.currentTarget.checked })}
            class="h-4 w-4 text-mono-900 border-mono-300 rounded"
          />
          <label for="envelope-toggle-{endpoint.id}" class="text-sm text-mono-700">
            Wrap response in standard envelope
          </label>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex space-x-2 pt-2">
        <button
          onclick={onToggle}
          class="px-4 py-2 bg-mono-900 text-white rounded-md hover:bg-mono-800 flex items-center space-x-2"
        >
          <i class="fa-solid fa-save"></i>
          <span>Save Endpoint</span>
        </button>
        <button
          onclick={onDuplicate}
          class="px-4 py-2 bg-mono-100 text-mono-700 rounded-md hover:bg-mono-200 flex items-center space-x-2"
        >
          <i class="fa-solid fa-copy"></i>
          <span>Duplicate</span>
        </button>
        <button
          onclick={onDelete}
          class="px-4 py-2 bg-mono-100 text-mono-600 rounded-md hover:bg-mono-200 flex items-center space-x-2"
        >
          <i class="fa-solid fa-trash"></i>
          <span>Delete</span>
        </button>
      </div>
    </div>
  {/if}
</div>
