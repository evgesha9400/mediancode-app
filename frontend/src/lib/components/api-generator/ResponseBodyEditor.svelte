<script lang="ts">
  import type { ResponseShape, ResponseItemShape } from '$lib/types';
  import { fieldsStore, getFieldById } from '$lib/stores/fields';
  import { buildResponsePreview } from '$lib/utils/examples';
  import FieldSelectorDropdown from './FieldSelectorDropdown.svelte';
  import ParameterEditor from './ParameterEditor.svelte';

  export interface ResponseBodyEditorProps {
    selectedFieldIds: string[];
    useEnvelope: boolean;
    responseShape: ResponseShape;
    responseItemShape: ResponseItemShape;
    responsePrimitiveFieldId?: string;
    onAddField: (fieldId: string) => void;
    onRemoveField: (fieldId: string) => void;
    onEnvelopeToggle: (enabled: boolean) => void;
    onSetResponseShape: (shape: ResponseShape) => void;
    onSetResponseItemShape: (itemShape: ResponseItemShape) => void;
    onSetResponsePrimitiveField: (fieldId: string | undefined) => void;
  }

  interface Props extends ResponseBodyEditorProps {}

  let {
    selectedFieldIds,
    useEnvelope,
    responseShape,
    responseItemShape,
    responsePrimitiveFieldId,
    onAddField,
    onRemoveField,
    onEnvelopeToggle,
    onSetResponseShape,
    onSetResponseItemShape,
    onSetResponsePrimitiveField
  }: Props = $props();

  // Build preview JSON using shared utility
  // Note: Include $fieldsStore in derived dependencies to ensure preview updates
  // when field definitions (name, type, etc.) change in the registry
  const previewJson = $derived(
    buildResponsePreview(
      responseShape,
      selectedFieldIds,
      responsePrimitiveFieldId,
      responseItemShape,
      useEnvelope,
      $fieldsStore
    )
  );

  // Determine if we should show the object field selector
  const showObjectFieldSelector = $derived(
    responseShape === 'object' || (responseShape === 'list' && responseItemShape === 'object')
  );

  // Determine if we should show the primitive field selector
  const showPrimitiveFieldSelector = $derived(
    responseShape === 'primitive' || (responseShape === 'list' && responseItemShape === 'primitive')
  );

  // Handle primitive field selection from dropdown
  function handlePrimitiveFieldSelect(fieldId: string): void {
    // Toggle selection (single select behavior)
    if (responsePrimitiveFieldId === fieldId) {
      onSetResponsePrimitiveField(undefined);
    } else {
      onSetResponsePrimitiveField(fieldId);
    }
  }
</script>

<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
  <!-- Left Column: Response Shape & Response Fields -->
  <div class="space-y-4">
    <!-- Response Shape Selection -->
    <div>
      <label class="block text-sm text-mono-700 mb-2 font-medium">Response Shape</label>
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
          onclick={() => onSetResponseShape('primitive')}
          class="flex-1 px-1.5 py-1 text-sm border rounded-md transition-colors {responseShape === 'primitive'
            ? 'bg-mono-900 text-white border-mono-900'
            : 'bg-white text-mono-700 border-mono-300 hover:border-mono-400'}"
        >
          <i class="fa-solid fa-cube mr-1.5"></i>
          Field
        </button>
        <button
          type="button"
          onclick={() => onSetResponseShape('list')}
          class="flex-1 px-1.5 py-1 text-sm border rounded-md transition-colors {responseShape === 'list'
            ? 'bg-mono-900 text-white border-mono-900'
            : 'bg-white text-mono-700 border-mono-300 hover:border-mono-400'}"
        >
          <i class="fa-solid fa-list mr-1.5"></i>
          List
        </button>
      </div>
    </div>

    <!-- List Item Shape Selection (only visible when list is selected) -->
    {#if responseShape === 'list'}
      <div>
        <label class="block text-sm text-mono-700 mb-2 font-medium">List Item Type</label>
        <div class="flex gap-1">
          <button
            type="button"
            onclick={() => onSetResponseItemShape('object')}
            class="flex-1 px-1.5 py-1 text-sm border rounded-md transition-colors {responseItemShape === 'object'
              ? 'bg-mono-900 text-white border-mono-900'
              : 'bg-white text-mono-700 border-mono-300 hover:border-mono-400'}"
          >
            <i class="fa-solid fa-box mr-1.5"></i>
            Objects
          </button>
          <button
            type="button"
            onclick={() => onSetResponseItemShape('primitive')}
            class="flex-1 px-1.5 py-1 text-sm border rounded-md transition-colors {responseItemShape === 'primitive'
              ? 'bg-mono-900 text-white border-mono-900'
              : 'bg-white text-mono-700 border-mono-300 hover:border-mono-400'}"
          >
            <i class="fa-solid fa-cube mr-1.5"></i>
            Fields
          </button>
        </div>
      </div>
    {/if}

    <!-- Object Field Selector (for object shape or list of objects) -->
    {#if showObjectFieldSelector}
      <div>
        <h3 class="text-sm text-mono-700 flex items-center font-medium mb-2">
          <i class="fa-solid fa-arrow-down mr-2"></i>
          {responseShape === 'object' ? 'Response Fields' : 'List Item Fields'}
        </h3>

        <div class="space-y-2">
          <!-- Field Selector Dropdown -->
          <FieldSelectorDropdown
            availableFields={$fieldsStore}
            selectedFieldIds={selectedFieldIds}
            onSelect={onAddField}
            placeholder="Add field to response..."
          />

          <!-- Selected Fields (Read-only ParameterEditor) -->
          {#if selectedFieldIds.length === 0}
            <div class="p-3 bg-mono-50 rounded border border-mono-200">
              <p class="text-xs text-mono-500">No fields selected</p>
            </div>
          {:else}
            <div class="p-2 bg-mono-50 rounded border border-mono-200 space-y-0 divide-y divide-mono-200">
              {#each selectedFieldIds as fieldId (fieldId)}
                {@const field = getFieldById(fieldId)}
                {#if field}
                  <ParameterEditor
                    parameter={{
                      id: field.id,
                      name: field.name,
                      type: field.type,
                      description: field.description || '',
                      required: true
                    }}
                    readOnly={true}
                    onDelete={() => onRemoveField(fieldId)}
                    showRequired={false}
                    compact={true}
                  />
                {:else}
                  <!-- Missing field fallback - field was deleted from registry -->
                  <div class="flex items-center gap-2 py-1.5">
                    <i class="fa-solid fa-triangle-exclamation text-red-500 text-sm"></i>
                    <span class="flex-1 text-sm text-red-700">
                      Field not found <span class="font-mono text-xs text-red-500">({fieldId})</span>
                    </span>
                    <button
                      type="button"
                      onclick={() => onRemoveField(fieldId)}
                      class="p-1 text-red-700 hover:text-red-600 hover:bg-red-100 rounded transition-colors"
                      title="Remove missing field reference"
                    >
                      <i class="fa-solid fa-xmark"></i>
                    </button>
                  </div>
                {/if}
              {/each}
            </div>
          {/if}
        </div>
      </div>
    {/if}

    <!-- Primitive Field Selector (for primitive shape or list of primitives) -->
    {#if showPrimitiveFieldSelector}
      <div>
        <h3 class="text-sm text-mono-700 flex items-center font-medium mb-2">
          <i class="fa-solid fa-cube mr-2"></i>
          {responseShape === 'primitive' ? 'Primitive Type' : 'List Item Type'}
        </h3>

        <div class="space-y-2">
          <!-- Single-select Field Dropdown -->
          <FieldSelectorDropdown
            availableFields={$fieldsStore}
            selectedFieldIds={responsePrimitiveFieldId ? [responsePrimitiveFieldId] : []}
            onSelect={handlePrimitiveFieldSelect}
            placeholder="Select primitive type..."
          />

          <!-- Selected Primitive Field (Read-only) -->
          {#if responsePrimitiveFieldId}
            {@const field = getFieldById(responsePrimitiveFieldId)}
            {#if field}
              <div class="p-2 bg-mono-50 rounded border border-mono-200">
                <ParameterEditor
                  parameter={{
                    id: field.id,
                    name: field.name,
                    type: field.type,
                    description: field.description || '',
                    required: true
                  }}
                  readOnly={true}
                  onDelete={() => onSetResponsePrimitiveField(undefined)}
                  showRequired={false}
                  compact={true}
                />
              </div>
            {:else}
              <!-- Missing field fallback -->
              <div class="p-2 bg-red-50 border border-red-200 rounded-md">
                <div class="flex items-center gap-2">
                  <i class="fa-solid fa-triangle-exclamation text-red-500 text-sm"></i>
                  <span class="flex-1 text-sm text-red-700">
                    Field not found <span class="font-mono text-xs text-red-500">({responsePrimitiveFieldId})</span>
                  </span>
                  <button
                    type="button"
                    onclick={() => onSetResponsePrimitiveField(undefined)}
                    class="p-1 text-red-700 hover:text-red-600 hover:bg-red-100 rounded transition-colors"
                    title="Remove missing field reference"
                  >
                    <i class="fa-solid fa-xmark"></i>
                  </button>
                </div>
              </div>
            {/if}
          {:else}
            <div class="p-3 bg-mono-50 rounded border border-mono-200">
              <p class="text-xs text-mono-500">No primitive type selected</p>
            </div>
          {/if}
        </div>
      </div>
    {/if}
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
