<script lang="ts">
  import { fieldsStore, getFieldById } from '$lib/stores/fields';
  import { buildRequestPreview } from '$lib/utils/examples';
  import FieldSelectorDropdown from './FieldSelectorDropdown.svelte';
  import ParameterEditor from './ParameterEditor.svelte';

  export interface RequestBodyEditorProps {
    selectedFieldIds: string[];
    onAddField: (fieldId: string) => void;
    onRemoveField: (fieldId: string) => void;
  }

  interface Props extends RequestBodyEditorProps {}

  let { selectedFieldIds, onAddField, onRemoveField }: Props = $props();

  // Build preview JSON from selected fields using shared utility
  const previewJson = $derived(buildRequestPreview(selectedFieldIds));
</script>

<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
  <!-- Left Column: Request Body Fields -->
  <div>
    <h3 class="text-sm text-mono-700 flex items-center font-medium mb-2">
      <i class="fa-solid fa-arrow-up mr-2"></i>
      Request Body
    </h3>

    <div class="space-y-2">
      <!-- Field Selector Dropdown -->
      <FieldSelectorDropdown
        availableFields={$fieldsStore}
        selectedFieldIds={selectedFieldIds}
        onSelect={onAddField}
        placeholder="Add field to request body..."
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
                  class="p-1 text-red-600 hover:text-red-800 hover:bg-red-100 rounded transition-colors"
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
