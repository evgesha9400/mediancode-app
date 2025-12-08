<script lang="ts">
  import { objectsStore, getObjectById } from '$lib/stores/objects';
  import { getFieldById } from '$lib/stores/fields';
  import ObjectSelectorDropdown from './ObjectSelectorDropdown.svelte';

  export interface QueryParametersEditorProps {
    endpointNamespaceId: string;
    selectedObjectId?: string;
    onSelectObject: (objectId: string | undefined) => void;
  }

  interface Props extends QueryParametersEditorProps {}

  let { endpointNamespaceId, selectedObjectId, onSelectObject }: Props = $props();

  // Filter objects to only show those in the endpoint's namespace
  const namespacedObjects = $derived($objectsStore.filter(obj => obj.namespaceId === endpointNamespaceId));

  // Get the selected object for display
  const selectedObject = $derived(
    selectedObjectId ? getObjectById(selectedObjectId) : undefined
  );
</script>

<div>
  <div class="flex items-center justify-between mb-2">
    <h3 class="text-sm text-mono-700 flex items-center font-medium">
      <i class="fa-solid fa-filter mr-2"></i>
      Query Parameters
    </h3>
  </div>

  <div class="space-y-2">
    <!-- Object Selector Dropdown -->
    <ObjectSelectorDropdown
      availableObjects={namespacedObjects}
      selectedObjectId={selectedObjectId}
      onSelect={onSelectObject}
      placeholder="Select object for query parameters..."
    />

    <!-- Selected Object Details -->
    {#if selectedObject}
      <div class="p-3 bg-mono-50 rounded border border-mono-200">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center space-x-2">
            <i class="fa-solid fa-cube text-mono-500 text-sm"></i>
            <span class="font-mono text-sm text-mono-700">{selectedObject.name}</span>
          </div>
          <span class="text-xs text-mono-500">{selectedObject.fields.length} fields</span>
        </div>

        {#if selectedObject.description}
          <p class="text-xs text-mono-500 mb-2">{selectedObject.description}</p>
        {/if}

        <!-- Field List -->
        <div class="space-y-1 mt-2">
          <p class="text-xs text-mono-600 font-medium">Fields:</p>
          {#each selectedObject.fields as fieldRef (fieldRef.fieldId)}
            {@const field = getFieldById(fieldRef.fieldId)}
            {#if field}
              <div class="flex items-center justify-between text-xs">
                <div class="flex items-center space-x-2">
                  <span class="font-mono text-mono-700">{field.name}</span>
                  {#if fieldRef.required}
                    <span class="text-xs text-mono-500 bg-mono-200 px-1.5 py-0.5 rounded">required</span>
                  {:else}
                    <span class="text-xs text-mono-400">optional</span>
                  {/if}
                </div>
                <span class="text-mono-500 bg-mono-100 px-1.5 py-0.5 rounded">{field.type}</span>
              </div>
            {:else}
              <div class="flex items-center gap-2 text-xs text-red-600">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <span>Field not found ({fieldRef.fieldId})</span>
              </div>
            {/if}
          {/each}
        </div>
      </div>
    {:else}
      <div class="p-3 bg-mono-50 rounded border border-mono-200">
        <p class="text-xs text-mono-500">No object selected. Query parameters are optional.</p>
      </div>
    {/if}
  </div>
</div>
