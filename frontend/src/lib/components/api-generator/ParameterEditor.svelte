<script module lang="ts">
  import type { Field } from '$lib/types';
  import type { TargetField } from '$lib/domain/paramInference';

  export interface ParameterEditorProps {
    paramName: string;
    fieldName: string;
    targetFields: TargetField[];
    objectFields: Field[];
    onFieldSelect: (fieldName: string) => void;
  }
</script>

<script lang="ts">
  import FieldSelectorDropdown from './FieldSelectorDropdown.svelte';

  interface Props extends ParameterEditorProps {}

  let { paramName, fieldName, targetFields, objectFields, onFieldSelect }: Props = $props();

  // Find the currently selected field
  const selectedField = $derived(targetFields.find(f => f.name === fieldName));

  // Derived type (read-only display)
  const derivedType = $derived(selectedField?.type ?? '');

  // Whether a field is linked
  const isLinked = $derived(!!fieldName && !!selectedField);

  // All field IDs except the currently linked one (for the dropdown's exclusion list)
  // We don't exclude any since path params should be able to pick any field
  const selectedFieldIds = $derived.by((): string[] => []);

  // Handle field selection from dropdown: map fieldId to fieldName
  function handleFieldSelect(fieldId: string): void {
    const field = objectFields.find(f => f.id === fieldId);
    if (field) {
      onFieldSelect(field.name);
    }
  }

  // Unlink the current field
  function handleUnlink(): void {
    onFieldSelect('');
  }
</script>

<div class="flex items-center space-x-2 py-1.5">
  <!-- Param name (read-only, extracted from path) -->
  <div class="w-32 px-2 py-1 text-xs bg-mono-800 border border-mono-700 text-mono-300 font-mono shrink-0">
    {paramName}
  </div>

  {#if isLinked}
    <!-- Linked state: show field name, type, and change/unlink button -->
    <div class="flex-1 flex items-center gap-2">
      <div class="flex items-center gap-1.5 px-2 py-1 bg-mono-900 border border-mono-600 rounded text-xs">
        <i class="fa-solid fa-link text-green-400 text-[10px]"></i>
        <span class="font-mono text-mono-100">{fieldName}</span>
        {#if selectedField?.isPk}
          <span class="text-[10px] text-green-400 uppercase font-bold">PK</span>
        {/if}
      </div>
      {#if derivedType}
        <span class="text-xs text-mono-400 bg-mono-800 px-1.5 py-0.5 rounded">{derivedType}</span>
      {/if}
      <button
        type="button"
        onclick={handleUnlink}
        class="text-mono-400 hover:text-red-400 transition-colors p-0.5"
        title="Unlink field"
      >
        <i class="fa-solid fa-xmark text-xs"></i>
      </button>
    </div>
  {:else}
    <!-- Unlinked state: show field selector dropdown -->
    <div class="flex-1">
      {#if objectFields.length > 0}
        <FieldSelectorDropdown
          availableFields={objectFields}
          selectedFieldIds={selectedFieldIds}
          onSelect={handleFieldSelect}
          placeholder="Link to field..."
        />
      {:else}
        <div class="px-2 py-1 text-xs text-mono-400 bg-mono-900 border border-mono-600 rounded">
          Select an object to link fields
        </div>
      {/if}
    </div>
  {/if}
</div>
