<script lang="ts">
  import { objectsStore, getObjectById } from '$lib/stores/objects';
  import { getFieldById } from '$lib/stores/fields';
  import { buildRequestPreviewFromObject } from '$lib/utils/examples';
  import ObjectSelectorDropdown from './ObjectSelectorDropdown.svelte';

  export interface RequestBodyEditorProps {
    selectedObjectId?: string;
    onSelectObject: (objectId: string | undefined) => void;
  }

  interface Props extends RequestBodyEditorProps {}

  let { selectedObjectId, onSelectObject }: Props = $props();

  // Build preview JSON from selected object using shared utility
  // Note: Include $objectsStore in derived dependencies to ensure preview updates
  // when object definitions change in the registry
  const previewJson = $derived(buildRequestPreviewFromObject(selectedObjectId, $objectsStore));

  // Get the selected object for display
  const selectedObject = $derived(
    selectedObjectId ? getObjectById(selectedObjectId) : undefined
  );
</script>

<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
  <!-- Left Column: Request Body Object Selection -->
  <div>
    <h3 class="text-sm text-mono-700 flex items-center font-medium mb-2">
      <i class="fa-solid fa-arrow-up mr-2"></i>
      Request Body
    </h3>

    <div class="space-y-2">
      <!-- Object Selector Dropdown -->
      <ObjectSelectorDropdown
        availableObjects={$objectsStore}
        selectedObjectId={selectedObjectId}
        onSelect={onSelectObject}
        placeholder="Select object for request body..."
      />

      <!-- Selected Object Details -->
      {#if selectedObject}
        <div class="p-3 bg-mono-50 rounded border border-mono-200">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center space-x-2">
              <i class="fa-solid fa-box text-mono-500 text-sm"></i>
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
                  <span class="font-mono text-mono-700">{field.name}</span>
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
          <p class="text-xs text-mono-500">No object selected</p>
        </div>
      {/if}
    </div>
  </div>

  <!-- Right Column: Request Preview -->
  <div>
    <h3 class="text-sm text-mono-700 flex items-center font-medium mb-2">
      <i class="fa-solid fa-eye mr-2"></i>
      Request Preview
    </h3>
    <div class="p-3 bg-mono-900 rounded text-white text-sm overflow-x-auto">
      <pre>{previewJson}</pre>
    </div>
  </div>
</div>
