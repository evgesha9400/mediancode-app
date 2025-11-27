<script lang="ts">
  import type { ApiEndpoint, EndpointTag } from '$lib/types';

  export interface EndpointItemProps {
    endpoint: ApiEndpoint;
    tags: EndpointTag[];
    editing: boolean;
    onClick: () => void;
    onDuplicate: () => void;
    onDelete: () => void;
  }

  interface Props extends EndpointItemProps {}

  let { endpoint, tags, editing, onClick, onDuplicate, onDelete }: Props = $props();

  const tagName = $derived(tags.find(t => t.id === endpoint.tagId)?.name);

  function getMethodColorClass(method: string): string {
    return 'bg-mono-100 text-mono-800';
  }
</script>

<div class="border border-mono-{editing ? '400' : '200'} rounded-lg overflow-hidden {editing ? 'bg-mono-50 shadow-sm' : 'bg-white'}">
  <!-- Endpoint Card (Clickable) -->
  <button
    type="button"
    onclick={onClick}
    class="w-full flex items-center justify-between p-4 cursor-pointer hover:bg-mono-50 text-left transition-all"
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
      {#if editing}
        <span class="px-2 py-1 text-xs rounded-full bg-mono-900 text-white">
          Editing
        </span>
      {/if}
      {#if tagName}
        <span class="px-2 py-1 text-xs rounded-full bg-mono-200 text-mono-700">
          {tagName}
        </span>
      {/if}
      <i class="fa-solid fa-chevron-right text-mono-400"></i>
    </div>
  </button>

  <!-- Quick Actions (visible when not editing) -->
  {#if !editing}
    <div class="border-t border-mono-200 px-4 py-2 bg-mono-50 flex justify-end space-x-2">
      <button
        onclick={(e) => {
          e.stopPropagation();
          onDuplicate();
        }}
        class="px-2 py-1 text-xs text-mono-600 hover:text-mono-800 flex items-center space-x-1"
        title="Duplicate endpoint"
      >
        <i class="fa-solid fa-copy"></i>
        <span>Duplicate</span>
      </button>
      <button
        onclick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        class="px-2 py-1 text-xs text-mono-600 hover:text-mono-800 flex items-center space-x-1"
        title="Delete endpoint"
      >
        <i class="fa-solid fa-trash"></i>
        <span>Delete</span>
      </button>
    </div>
  {/if}
</div>
