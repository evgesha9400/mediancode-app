<script module lang="ts">
  export interface RequestBodyEditorProps {
    endpointNamespaceId: string;
    selectedObjectId?: string;
    onSelectObject: (objectId: string | undefined) => void;
    onCreateNewObject?: () => void;
  }
</script>

<script lang="ts">
  import { objectsStore, getObjectById } from '$lib/stores/objects';
  import { getFieldById } from '$lib/stores/fields';
  import { buildRequestPreviewFromObject } from '$lib/utils/examples';
  import ObjectSelectorDropdown from './ObjectSelectorDropdown.svelte';

  interface Props extends RequestBodyEditorProps {}

  let { endpointNamespaceId, selectedObjectId, onSelectObject, onCreateNewObject }: Props = $props();

  // Filter objects to only show those in the endpoint's namespace
  const namespacedObjects = $derived($objectsStore.filter(obj => obj.namespaceId === endpointNamespaceId));

  // Build preview JSON from selected object using shared utility
  // Note: Include $objectsStore in derived dependencies to ensure preview updates
  // when object definitions change in the registry
  const previewJson = $derived(buildRequestPreviewFromObject(selectedObjectId, $objectsStore));

  // Get the selected object for display
  const selectedObject = $derived(
    selectedObjectId ? getObjectById(selectedObjectId) : undefined
  );
</script>

<div class="request-body-grid">
  <!-- Left Column: Request Body Object Selection -->
  <div>
    <h3 class="text-sm text-mono-300 flex items-center font-medium mb-2">
      <i class="fa-solid fa-arrow-up mr-2"></i>
      Request Body
    </h3>

    <div class="space-y-2">
      <!-- Object Selector Dropdown -->
      <ObjectSelectorDropdown
        availableObjects={namespacedObjects}
        selectedObjectId={selectedObjectId}
        onSelect={onSelectObject}
        onCreateNew={onCreateNewObject}
        placeholder="Select object for request body..."
      />

      <!-- Selected Object Details -->
      {#if selectedObject}
        <div class="p-3 bg-mono-800 rounded border border-mono-700">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center space-x-2">
              <i class="fa-solid fa-cube text-mono-400 text-sm"></i>
              <span class="font-mono text-sm text-mono-300">{selectedObject.name}</span>
            </div>
            <span class="text-xs text-mono-400">{selectedObject.fields.length} fields</span>
          </div>

          {#if selectedObject.description}
            <p class="text-xs text-mono-400 mb-2">{selectedObject.description}</p>
          {/if}

          <!-- Field List -->
          <div class="space-y-1 mt-2">
            <p class="text-xs text-mono-400 font-medium">Fields:</p>
            {#each selectedObject.fields as fieldRef (fieldRef.fieldId)}
              {@const field = getFieldById(fieldRef.fieldId)}
              {#if field}
                <div class="flex items-center justify-between text-xs">
                  <span class="font-mono text-mono-300">{field.name}</span>
                  <span class="text-mono-400 bg-mono-800 px-1.5 py-0.5 rounded">{field.type}</span>
                </div>
              {:else}
                <div class="flex items-center gap-2 text-xs text-red-400">
                  <i class="fa-solid fa-triangle-exclamation"></i>
                  <span>Field not found ({fieldRef.fieldId})</span>
                </div>
              {/if}
            {/each}
          </div>
        </div>
      {:else}
        <div class="p-3 bg-mono-800 rounded border border-mono-700">
          <p class="text-xs text-mono-400">No object selected</p>
        </div>
      {/if}
    </div>
  </div>

  <!-- Right Column: Request Preview -->
  <div>
    <h3 class="text-sm text-mono-300 flex items-center font-medium mb-2">
      <i class="fa-solid fa-eye mr-2"></i>
      Request Preview
    </h3>
    <div class="p-3 bg-mono-950 rounded border border-mono-700 text-white text-sm overflow-x-auto">
      <pre>{previewJson}</pre>
    </div>
  </div>
</div>

<style>
  .request-body-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  @container (min-width: 700px) {
    .request-body-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style>
