<script module lang="ts">
  import type { TargetField, ValidationError } from '$lib/domain/paramInference';

  export interface ParameterEditorProps {
    paramName: string;
    fieldMemberId: string;
    targetFields: TargetField[];
    validationErrors?: ValidationError[];
    onFieldSelect: (fieldMemberId: string) => void;
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
  import FieldSelectorDropdown, { type FieldSelectorOption } from './FieldSelectorDropdown.svelte';

  interface Props extends ParameterEditorProps {}

  let {
    paramName,
    fieldMemberId,
    targetFields,
    validationErrors = [],
    onFieldSelect
  }: Props = $props();

  // Find the currently selected field
  const selectedField = $derived(targetFields.find(f => f.fieldMemberId === fieldMemberId));

  // Derived type (read-only display)
  const derivedType = $derived(selectedField?.type ?? '');

  const isLinked = $derived(!!selectedField);

  const targetFieldOptions = $derived.by((): FieldSelectorOption[] =>
    targetFields.map(field => ({
      id: field.fieldMemberId,
      name: field.name,
      type: field.type
    }))
  );

  // Errors specific to this parameter
  const paramErrors = $derived(validationErrors.filter(e => e.param === paramName));

  function handleFieldSelect(selectedId: string): void {
    onFieldSelect(selectedId);
  }

  // Unlink the current field
  function handleUnlink(): void {
    onFieldSelect('');
  }
</script>

<div class="border-b border-edge last:border-b-0">
  <div class="flex items-center gap-2 py-1.5">
    <!-- Param name (read-only, extracted from path) -->
    <div class="w-32 shrink-0">
      <div class="w-full px-3 text-sm font-mono border border-edge/80 rounded-xl bg-surface-raised text-fg-secondary flex items-center h-[34px]">
        {paramName}
      </div>
    </div>

    {#if isLinked}
      <!-- Linked state: field name + type chip inline (matches object field display) -->
      <div class="flex-1 min-w-0">
        <div class={objectSelectorDisplayRow}>
          <div class="flex items-center gap-1.5">
            <i class={`fa-solid fa-link text-[10px] ${themeAccentText}`}></i>
            <span class="font-mono text-sm">{selectedField?.name}</span>
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
        {#if targetFieldOptions.length > 0}
          <FieldSelectorDropdown
            availableFields={targetFieldOptions}
            selectedFieldIds={[]}
            onSelect={handleFieldSelect}
            placeholder="Link to Field Member..."
          />
        {:else}
          <div class={apiGeneratorHintCell}>
            Select an object to link Field Members
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
