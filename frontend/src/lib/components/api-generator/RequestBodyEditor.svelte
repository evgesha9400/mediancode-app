<script lang="ts">
  import { fieldsStore, getFieldById } from '$lib/stores/fields';
  import FieldSelectorDropdown from './FieldSelectorDropdown.svelte';
  import ParameterEditor from './ParameterEditor.svelte';

  export interface RequestBodyEditorProps {
    selectedFieldIds: string[];
    onAddField: (fieldId: string) => void;
    onRemoveField: (fieldId: string) => void;
  }

  interface Props extends RequestBodyEditorProps {}

  let { selectedFieldIds, onAddField, onRemoveField }: Props = $props();

  // Helper function to get example value for a field type
  function getExampleValueForType(type: string): any {
    const normalizedType = type.toLowerCase();

    if (normalizedType === 'str' || normalizedType === 'string') return 'string';
    if (normalizedType === 'int' || normalizedType === 'integer') return 0;
    if (normalizedType === 'float' || normalizedType === 'number') return 0.0;
    if (normalizedType === 'bool' || normalizedType === 'boolean') return true;
    if (normalizedType === 'uuid') return '00000000-0000-0000-0000-000000000000';
    if (normalizedType === 'datetime') return '2024-01-01T00:00:00Z';
    if (normalizedType === 'date') return '2024-01-01';
    if (normalizedType === 'time') return '00:00:00';

    return null;
  }

  // Build preview JSON from selected fields
  const previewJson = $derived.by(() => {
    if (selectedFieldIds.length === 0) {
      return '{}';
    }

    let bodyContent: any = {};
    selectedFieldIds.forEach(fieldId => {
      const field = getFieldById(fieldId);
      if (field) {
        bodyContent[field.name] = getExampleValueForType(field.type);
      }
    });

    return JSON.stringify(bodyContent, null, 2);
  });
</script>

<div class="space-y-4">
  <!-- Editor Section -->
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
            />
          {:else}
            <!-- Missing field fallback - field was deleted from registry -->
            <div class="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-md">
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
      {/if}
    </div>
  </div>

  <!-- Preview Section -->
  <div>
    <h3 class="text-sm text-mono-700 flex items-center font-medium mb-2">
      <i class="fa-solid fa-eye mr-2"></i>
      Request Preview
    </h3>
    <div class="p-3 bg-mono-900 rounded text-white text-xs overflow-x-auto">
      <pre>{previewJson}</pre>
    </div>
  </div>
</div>
