<script module lang="ts">
  import type { FieldConstraintValue } from '$lib/stores/fields';
  import type { FieldConstraint } from '$lib/stores/fieldConstraints';

  export interface FieldConstraintEditorProps {
    /** Currently attached constraints on the field */
    constraints: FieldConstraintValue[];
    /** Constraints available for the field's type (filtered by type compatibility) */
    availableConstraints: FieldConstraint[];
    /** All constraint metadata (for resolving name→meta lookups) */
    allConstraintMeta: FieldConstraint[];
    /** Names of already-selected constraints (for dropdown exclusion) */
    selectedNames: string[];
    /** Called when a constraint is added */
    onAdd: (name: string) => void;
    /** Called when a constraint is removed by index */
    onRemove: (index: number) => void;
    /** Called when a constraint parameter value changes */
    onParamChange: (index: number, rawValue: string, parameterTypes: string[]) => void;
    /** Validation error message to display */
    error?: string;
  }
</script>

<script lang="ts">
  import { FieldConstraintSelectorDropdown } from '$lib/components/api-generator';
  import { inputGlassDense, surfaceInsideFrostedPanel } from '$lib/ui/classes';

  interface Props extends FieldConstraintEditorProps {}

  let {
    constraints,
    availableConstraints,
    allConstraintMeta,
    selectedNames,
    onAdd,
    onRemove,
    onParamChange,
    error
  }: Props = $props();
</script>

<div>
  <h3 class="text-sm text-mono-300 mb-2 font-medium">Field Constraints ({constraints.length})</h3>

  <div class="space-y-2">
    <FieldConstraintSelectorDropdown
      availableFieldConstraints={availableConstraints}
      selectedFieldConstraintNames={selectedNames}
      onSelect={onAdd}
      placeholder="Add field constraint..."
    />

    {#if constraints.length === 0}
      <div class="p-3 {surfaceInsideFrostedPanel}">
        <p class="text-xs text-mono-400">No field constraints selected</p>
      </div>
    {:else}
      <div class="p-2 {surfaceInsideFrostedPanel} space-y-2">
        {#each constraints as constraintValue, index}
          {@const constraintMeta = allConstraintMeta.find(v => v.name === constraintValue.name)}
          {#if constraintMeta}
            <div class="flex items-center space-x-2 p-3 {surfaceInsideFrostedPanel}">
              <div class="flex items-center space-x-2 shrink-0">
                <span class="font-mono text-sm text-mono-300">{constraintMeta.name}</span>
                <span class="text-xs text-mono-400 bg-mono-800 px-2 py-0.5 rounded-lg">{constraintMeta.parameterTypes.join(', ')}</span>
              </div>

              <input
                type={constraintMeta.parameterTypes.includes('str') ? 'text' : 'number'}
                step={constraintMeta.parameterTypes.includes('float') ? 'any' : '1'}
                value={constraintValue.value ?? ''}
                oninput={(e) => onParamChange(index, e.currentTarget.value, constraintMeta.parameterTypes)}
                placeholder={constraintMeta.parameterTypes.includes('str') ? 'e.g. ^[a-z]+$' : 'Value'}
                class={inputGlassDense}
              />

              <button
                type="button"
                onclick={() => onRemove(index)}
                class="text-red-400 hover:text-red-300 transition-colors shrink-0"
                title="Remove field constraint"
                aria-label="Remove field constraint"
              >
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
          {:else}
            <div class="flex items-center gap-2 py-1.5">
              <i class="fa-solid fa-triangle-exclamation text-red-400 text-sm"></i>
              <span class="flex-1 text-sm text-red-400">
                Field constraint not found <span class="font-mono text-xs text-red-400">({constraintValue.name})</span>
              </span>
              <button
                type="button"
                onclick={() => onRemove(index)}
                class="p-1 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded transition-colors"
                title="Remove missing field constraint reference"
                aria-label="Remove field constraint"
              >
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
          {/if}
        {/each}
      </div>
    {/if}
    {#if error}
      <p class="text-xs text-red-500 mt-1">{error}</p>
    {/if}
  </div>
</div>
