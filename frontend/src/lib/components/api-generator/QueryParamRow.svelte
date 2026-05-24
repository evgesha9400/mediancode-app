<script module lang="ts">
  import type { QueryParam, FilterOperator } from '$lib/types';
  import type { TargetField, ValidationError } from '$lib/domain/paramInference';

  export interface QueryParamRowProps {
    param: QueryParam;
    targetFields: TargetField[];
    validationErrors?: ValidationError[];
    onUpdate: (updates: Partial<QueryParam>) => void;
    onRemove: () => void;
    onSuggest?: (suggestion: { fieldMemberId: string; operator: FilterOperator }) => void;
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
  const selectedField = $derived(targetFields.find(f => f.fieldMemberId === param.fieldMemberId));
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
      const suggestion = suggestFieldAndOperator(name, targetFields);
      if (suggestion) {
        lastSuggestedName = name;
        onSuggest?.(suggestion);
      }
    }
  }
</script>

<div class="border-b border-edge last:border-b-0">
  <div class="flex items-center gap-2 py-1.5">
    <!-- Name input -->
    <div class="w-1/5 shrink-0">
      <input
        type="text"
        value={param.name}
        oninput={handleNameInput}
        placeholder="param_name"
        class={apiGeneratorRowInputMono}
      />
    </div>

    <!-- Operator dropdown -->
    <div class="w-1/5 shrink-0">
      <GlassSelectDropdown
        value={param.operator}
        options={availableOperators.map((op) => ({ value: op, label: op }))}
        ariaLabel="Filter operator"
        mono
        onSelect={(v) => onUpdate({ operator: v as FilterOperator })}
      />
    </div>

    <!-- Required toggle -->
    <div class="w-20 shrink-0">
      <button
        type="button"
        aria-pressed={param.required}
        aria-label={param.required ? 'Required query parameter' : 'Optional query parameter'}
        title={param.required ? 'Make optional' : 'Make required'}
        onclick={() => onUpdate({ required: !param.required })}
        class="h-[34px] w-full rounded-xl border text-xs transition-colors {param.required
          ? 'border-amber-400/60 bg-amber-500/10 text-amber-300'
          : 'border-edge/80 bg-surface-raised text-fg-muted hover:text-fg-secondary'}"
      >
        <i class="fa-solid {param.required ? 'fa-lock' : 'fa-lock-open'}" aria-hidden="true"></i>
      </button>
    </div>

    <!-- Field display with type chip and delete inside (matches path param pattern) -->
    <div class="flex-1 min-w-0">
      <div class={objectSelectorDisplayRow}>
        <div class="flex items-center gap-1.5">
          {#if selectedField}
            <span class="font-mono text-sm">{selectedField.name}</span>
            {#if derivedType}
              <span class={listMetaBadge}>{derivedType}</span>
            {/if}
          {:else}
            <span class="text-sm text-fg-muted">Select field...</span>
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
