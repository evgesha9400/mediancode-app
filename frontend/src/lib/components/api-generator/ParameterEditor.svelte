<script module lang="ts">
  import type { Field } from '$lib/types';
  import type { TargetField, ValidationError } from '$lib/domain/paramInference';

  export interface ParameterEditorProps {
    paramName: string;
    fieldName: string;
    /** When the API omits ``fieldName``, the linked field can still be resolved from this id. */
    fieldId?: string;
    targetFields: TargetField[];
    objectFields: Field[];
    validationErrors?: ValidationError[];
    onFieldSelect: (fieldName: string, fieldId: string) => void;
  }
</script>

<script lang="ts">
  import {
    apiGeneratorHintCell,
    listMetaBadge,
    objectSelectorDisplayRow,
    themeAccentBadge,
    themeAccentText
  } from '$lib/ui/classes';
  import FieldSelectorDropdown from './FieldSelectorDropdown.svelte';

  interface Props extends ParameterEditorProps {}

  let {
    paramName,
    fieldName,
    fieldId = '',
    targetFields,
    objectFields,
    validationErrors = [],
    onFieldSelect
  }: Props = $props();

  /** Display name: explicit link, or resolve from ``fieldId`` when the server omitted ``field``. */
  const effectiveFieldName = $derived.by(() => {
    const trimmed = fieldName?.trim() ?? '';
    if (trimmed) return trimmed;
    if (fieldId) {
      const byId = objectFields.find(f => f.id === fieldId);
      if (byId) return byId.name;
    }
    return '';
  });

  // Find the currently selected field
  const selectedField = $derived(targetFields.find(f => f.name === effectiveFieldName));

  // Derived type (read-only display)
  const derivedType = $derived(selectedField?.type ?? '');

  // Linked when the param maps to a field: on the target object, or by id when there is no body object
  const isLinked = $derived(
    !!effectiveFieldName &&
      (!!selectedField ||
        (!!fieldId &&
          (objectFields.length === 0 || objectFields.some(f => f.id === fieldId))))
  );

  // All field IDs except the currently linked one (for the dropdown's exclusion list)
  // We don't exclude any since path params should be able to pick any field
  const selectedFieldIds = $derived.by((): string[] => []);

  // Errors specific to this parameter
  const paramErrors = $derived(validationErrors.filter(e => e.param === paramName));

  // Handle field selection from dropdown: map fieldId to fieldName
  function handleFieldSelect(selectedId: string): void {
    const field = objectFields.find(f => f.id === selectedId);
    if (field) {
      onFieldSelect(field.name, field.id);
    }
  }

  // Unlink the current field
  function handleUnlink(): void {
    onFieldSelect('', '');
  }
</script>

<div class="border-b border-mono-700 last:border-b-0">
  <div class="flex items-center gap-2 py-1.5">
    <!-- Param name (read-only, extracted from path) -->
    <div class="w-32 shrink-0">
      <div class="w-full px-3 text-sm font-mono border border-mono-700/80 rounded-xl bg-mono-800 text-mono-300 flex items-center h-[34px]">
        {paramName}
      </div>
    </div>

    {#if isLinked}
      <!-- Linked state: field name + type chip inline (matches object field display) -->
      <div class="flex-1 min-w-0">
        <div class={objectSelectorDisplayRow}>
          <div class="flex items-center gap-1.5">
            <i class={`fa-solid fa-link text-[10px] ${themeAccentText}`}></i>
            <span class="font-mono text-sm">{effectiveFieldName}</span>
            {#if derivedType}
              <span class={`${listMetaBadge} px-1.5 text-[11px]`}>{derivedType}</span>
            {/if}
            {#if selectedField?.isPk}
              <span class={`text-[10px] px-1.5 rounded-lg uppercase font-bold ${themeAccentBadge}`}>PK</span>
            {/if}
          </div>
          <button
            type="button"
            onclick={handleUnlink}
            class="text-red-400 hover:text-red-300 transition-colors text-sm"
            title="Unlink field"
          >
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      </div>
    {:else}
      <!-- Unlinked state: show field selector dropdown -->
      <div class="flex-1 min-w-0">
        {#if objectFields.length > 0}
          <FieldSelectorDropdown
            availableFields={objectFields}
            selectedFieldIds={selectedFieldIds}
            onSelect={handleFieldSelect}
            placeholder="Link to field..."
          />
        {:else}
          <div class={apiGeneratorHintCell}>
            Select an object to link fields
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Inline validation errors for this parameter -->
  {#if paramErrors.length > 0}
    {#each paramErrors as error}
      <p class="text-xs text-red-400 flex items-center gap-1 pb-1.5 pl-1">
        <i class="fa-solid fa-triangle-exclamation"></i>
        {error.message}
      </p>
    {/each}
  {/if}
</div>
