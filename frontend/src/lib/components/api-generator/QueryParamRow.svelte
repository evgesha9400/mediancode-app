<script module lang="ts">
  import type { QueryParam, FilterOperator } from '$lib/types';
  import type { TargetField, ValidationError } from '$lib/domain/paramInference';

  export interface QueryParamRowProps {
    param: QueryParam;
    targetFields: TargetField[];
    validationErrors?: ValidationError[];
    onUpdate: (updates: Partial<QueryParam>) => void;
    onRemove: () => void;
    onSuggest?: (suggestion: { field: string; operator: FilterOperator }) => void;
  }
</script>

<script lang="ts">
  import { getCompatibleOperators, suggestFieldAndOperator } from '$lib/domain/paramInference';
  import { FILTER_OPERATORS } from '$lib/types';
  import { GlassSelectDropdown } from '$lib/components/form';
  import { apiGeneratorRowInputMono, listMetaBadge, objectSelectorDisplayRow } from '$lib/ui/classes';

  interface Props extends QueryParamRowProps {}

  let { param, targetFields, validationErrors = [], onUpdate, onRemove, onSuggest }: Props = $props();

  // Available operators filtered by the selected field's type
  const selectedField = $derived(targetFields.find(f => f.name === param.field));
  const availableOperators = $derived(
    selectedField ? getCompatibleOperators(selectedField.type) : FILTER_OPERATORS
  );

  // Derived type display (read-only)
  const derivedType = $derived.by(() => {
    if (!selectedField) return '';
    if (param.operator === 'in') return `list[${selectedField.type}]`;
    return selectedField.type;
  });

  // Auto-suggest when name changes
  let lastSuggestedName = $state('');

  function handleNameInput(e: Event): void {
    const name = (e.target as HTMLInputElement).value;
    onUpdate({ name });

    // Only suggest once per unique name
    if (name && name !== lastSuggestedName) {
      const fieldNames = targetFields.map(f => f.name);
      const suggestion = suggestFieldAndOperator(name, fieldNames);
      if (suggestion) {
        lastSuggestedName = name;
        onSuggest?.(suggestion);
      }
    }
  }
</script>

<div class="border-b border-mono-700 last:border-b-0">
  <div class="flex items-center gap-2 py-1.5">
    <!-- Name input -->
    <div class="w-1/4 shrink-0">
      <input
        type="text"
        value={param.name}
        oninput={handleNameInput}
        placeholder="param_name"
        class={apiGeneratorRowInputMono}
      />
    </div>

    <!-- Operator dropdown -->
    <div class="w-1/4 shrink-0">
      <GlassSelectDropdown
        value={param.operator}
        options={availableOperators.map((op) => ({ value: op, label: op }))}
        ariaLabel="Filter operator"
        mono
        onSelect={(v) => onUpdate({ operator: v as FilterOperator })}
      />
    </div>

    <!-- Field display with type chip and delete inside (matches path param pattern) -->
    <div class="w-1/2 min-w-0">
      <div class={objectSelectorDisplayRow}>
        <div class="flex items-center gap-1.5">
          {#if param.field}
            <span class="font-mono text-sm">{param.field}</span>
            {#if derivedType}
              <span class={listMetaBadge}>{derivedType}</span>
            {/if}
          {:else}
            <span class="text-sm text-mono-400">Select field...</span>
          {/if}
        </div>
        <button
          type="button"
          onclick={onRemove}
          class="text-red-400 hover:text-red-300 transition-colors text-sm"
          title="Remove parameter"
        >
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    </div>
  </div>

  <!-- Inline validation errors for this parameter -->
  {#if validationErrors.length > 0}
    {#each validationErrors as error}
      <p class="text-xs text-red-400 flex items-center gap-1 pb-1.5 pl-1">
        <i class="fa-solid fa-triangle-exclamation"></i>
        {error.message}
      </p>
    {/each}
  {/if}
</div>
