<script lang="ts">
  import type { ResponseShape } from '$lib/types';
  import { objectsStore, getObjectById } from '$lib/stores/objects';
  import { getFieldById } from '$lib/stores/fields';
  import { buildResponsePreviewFromObject } from '$lib/utils/examples';
  import ObjectSelectorDropdown from './ObjectSelectorDropdown.svelte';

  export interface ResponseBodyEditorProps {
    endpointNamespaceId: string;
    selectedObjectId?: string;
    useEnvelope: boolean;
    responseShape: ResponseShape;
    onSelectObject: (objectId: string | undefined) => void;
    onEnvelopeToggle: (enabled: boolean) => void;
    onSetResponseShape: (shape: ResponseShape) => void;
  }

  interface Props extends ResponseBodyEditorProps {}

  let {
    endpointNamespaceId,
    selectedObjectId,
    useEnvelope,
    responseShape,
    onSelectObject,
    onEnvelopeToggle,
    onSetResponseShape
  }: Props = $props();

  // Filter objects to only show those in the endpoint's namespace
  const namespacedObjects = $derived($objectsStore.filter(obj => obj.namespaceId === endpointNamespaceId));

  // Build preview JSON using shared utility
  // Note: Include $objectsStore in derived dependencies to ensure preview updates
  // when object definitions change in the registry
  const previewJson = $derived(
    buildResponsePreviewFromObject(
      responseShape,
      selectedObjectId,
      useEnvelope,
      $objectsStore
    )
  );

  // Get the selected object for display
  const selectedObject = $derived(
    selectedObjectId ? getObjectById(selectedObjectId) : undefined
  );
</script>

<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
  <!-- Left Column: Response Shape & Response Object -->
  <div class="space-y-4">
    <!-- Response Shape Selection -->
    <div>
      <div class="block text-sm text-mono-700 mb-2 font-medium">Response Shape</div>
      <div class="flex gap-1">
        <button
          type="button"
          onclick={() => onSetResponseShape('object')}
          class="flex-1 px-1.5 py-1 text-sm border rounded-md transition-colors {responseShape === 'object'
            ? 'bg-mono-900 text-white border-mono-900'
            : 'bg-white text-mono-700 border-mono-300 hover:border-mono-400'}"
        >
          <i class="fa-solid fa-box mr-1.5"></i>
          Object
        </button>
        <button
          type="button"
          onclick={() => onSetResponseShape('list')}
          class="flex-1 px-1.5 py-1 text-sm border rounded-md transition-colors {responseShape === 'list'
            ? 'bg-mono-900 text-white border-mono-900'
            : 'bg-white text-mono-700 border-mono-300 hover:border-mono-400'}"
        >
          <i class="fa-solid fa-list mr-1.5"></i>
          List of Objects
        </button>
      </div>
    </div>

    <!-- Object Selector (for both single object and list of objects) -->
    <div>
      <h3 class="text-sm text-mono-700 flex items-center font-medium mb-2">
        <i class="fa-solid fa-arrow-down mr-2"></i>
        {responseShape === 'object' ? 'Response Object' : 'List Item Object'}
      </h3>

      <div class="space-y-2">
        <!-- Object Selector Dropdown -->
        <ObjectSelectorDropdown
          availableObjects={namespacedObjects}
          selectedObjectId={selectedObjectId}
          onSelect={onSelectObject}
          placeholder="Select object for response..."
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
  </div>

  <!-- Right Column: Response Preview -->
  <div>
    <div class="flex items-center justify-between mb-2">
      <h3 class="text-sm text-mono-700 flex items-center font-medium">
        <i class="fa-solid fa-eye mr-2"></i>
        Response Preview (200)
      </h3>
      <div class="flex items-center gap-3">
        <label class="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={useEnvelope}
            onchange={(e) => onEnvelopeToggle(e.currentTarget.checked)}
            class="w-4 h-4 text-mono-900 border-mono-300 rounded focus:ring-2 focus:ring-mono-400"
          />
          <span class="text-xs text-mono-700">Use envelope</span>
        </label>
      </div>
    </div>
    <div class="p-3 bg-mono-900 rounded text-white text-sm overflow-x-auto">
      <pre>{previewJson}</pre>
    </div>
  </div>
</div>
