<script module lang="ts">
  import type { ResponseShape } from '$lib/types';

  export interface ObjectEditorProps {
    endpointNamespaceId: string;
    selectedObjectId?: string;
    responseShape: ResponseShape;
    onSelectObject: (objectId: string | undefined) => void;
    onSetResponseShape: (shape: ResponseShape) => void;
    onCreateNewObject?: () => void;
  }
</script>

<script lang="ts">
  import { objectsStore, getObjectById } from '$lib/stores/objects';
  import { getFieldById } from '$lib/stores/fields';
  import { buildRequestPreviewFromObject, buildResponsePreviewFromObject } from '$lib/utils/examples';
  import ObjectSelectorDropdown from './ObjectSelectorDropdown.svelte';

  const SHAPE_OPTIONS: { value: ResponseShape; label: string; icon: string }[] = [
    { value: 'object', label: 'Object', icon: 'fa-solid fa-box' },
    { value: 'list', label: 'List of Objects', icon: 'fa-solid fa-list' }
  ];

  interface Props extends ObjectEditorProps {}

  let {
    endpointNamespaceId,
    selectedObjectId,
    responseShape,
    onSelectObject,
    onSetResponseShape,
    onCreateNewObject
  }: Props = $props();

  // Filter objects to only show those in the endpoint's namespace
  const namespacedObjects = $derived($objectsStore.filter(obj => obj.namespaceId === endpointNamespaceId));

  // Build preview JSON using shared utilities (appears flag filters fields automatically)
  // Response preview always shows without envelope wrapping (envelope is always enabled on the endpoint)
  const requestPreviewJson = $derived(buildRequestPreviewFromObject(selectedObjectId, $objectsStore));
  const responsePreviewJson = $derived(
    buildResponsePreviewFromObject(responseShape, selectedObjectId, false, $objectsStore)
  );

  // Get the selected object for display
  const selectedObject = $derived(
    selectedObjectId ? getObjectById(selectedObjectId) : undefined
  );
</script>

<!-- Object Selector -->
<div class="space-y-4">
  <div>
    <h3 class="text-sm text-mono-300 flex items-center font-medium mb-2">
      <i class="fa-solid fa-cube mr-2"></i>
      Object
    </h3>

    <div class="space-y-2">
      <ObjectSelectorDropdown
        availableObjects={namespacedObjects}
        selectedObjectId={selectedObjectId}
        onSelect={onSelectObject}
        onCreateNew={onCreateNewObject}
        placeholder="Select object for endpoint..."
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
                  <div class="flex items-center space-x-2">
                    {#if fieldRef.appears !== 'both'}
                      <span class="text-mono-500 text-[10px] uppercase">{fieldRef.appears}</span>
                    {/if}
                    <span class="text-mono-400 bg-mono-800 px-1.5 py-0.5 rounded">{field.type}</span>
                  </div>
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

  <!-- Request & Response Previews -->
  <div class="object-editor-grid">
    <!-- Request column -->
    <div class="space-y-2">
      <h3 class="text-sm text-mono-300 flex items-center font-medium">
        <i class="fa-solid fa-arrow-up mr-2"></i>
        Request
      </h3>
      <div class="request-spacer"></div>
      <div class="p-3 bg-mono-950 rounded border border-mono-700 text-white text-sm overflow-x-auto">
        <pre>{requestPreviewJson}</pre>
      </div>
    </div>

    <!-- Response column -->
    <div class="space-y-2">
      <h3 class="text-sm text-mono-300 flex items-center font-medium">
        <i class="fa-solid fa-arrow-down mr-2"></i>
        Response
      </h3>
      <div class="flex gap-1">
        {#each SHAPE_OPTIONS as option}
          <button
            type="button"
            onclick={() => onSetResponseShape(option.value)}
            class="flex-1 px-1.5 py-1 text-sm border transition-colors {responseShape === option.value
              ? 'bg-green-400 text-mono-950 border-green-400 font-bold'
              : 'bg-mono-900 text-mono-300 border-mono-600 hover:border-mono-400'}"
          >
            <i class="{option.icon} mr-1.5"></i>
            {option.label}
          </button>
        {/each}
      </div>
      <div class="p-3 bg-mono-950 rounded border border-mono-700 text-white text-sm overflow-x-auto">
        <pre>{responsePreviewJson}</pre>
      </div>
    </div>
  </div>
</div>

<style>
  .object-editor-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  .request-spacer {
    display: none;
  }
  @container (min-width: 700px) {
    .object-editor-grid {
      grid-template-columns: repeat(2, 1fr);
    }
    .request-spacer {
      display: block;
      height: 30px;
    }
  }
</style>
