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
  <div class="flex items-start gap-2 py-1.5">
    <!-- Name input -->
    <div class="w-28 shrink-0">
      <input
        type="text"
        value={param.name}
        oninput={handleNameInput}
        placeholder="param_name"
        class="w-full px-3 py-1.5 text-sm font-mono border border-mono-600 bg-mono-900 text-mono-100 focus:ring-2 focus:ring-green-400 focus:border-transparent"
      />
    </div>

    <!-- Field dropdown -->
    <div class="flex-1 min-w-0">
      <select
        value={param.field}
        onchange={(e) => {
          const newField = (e.target as HTMLSelectElement).value;
          onUpdate({ field: newField });
          // Reset operator if incompatible with new field type
          const newFieldDef = targetFields.find(f => f.name === newField);
          if (newFieldDef) {
            const compat = getCompatibleOperators(newFieldDef.type);
            if (!compat.includes(param.operator)) {
              onUpdate({ field: newField, operator: compat[0] ?? 'eq' });
            }
          }
        }}
        class="w-full px-3 py-1.5 text-sm border border-mono-600 bg-mono-900 text-mono-100 focus:ring-2 focus:ring-green-400 focus:border-transparent"
      >
        <option value="">Select field...</option>
        {#each targetFields as f (f.name)}
          <option value={f.name}>{f.name} ({f.type})</option>
        {/each}
      </select>
    </div>

    <!-- Operator dropdown -->
    <div class="w-20 shrink-0">
      <select
        value={param.operator}
        onchange={(e) => onUpdate({ operator: (e.target as HTMLSelectElement).value as FilterOperator })}
        class="w-full px-3 py-1.5 text-sm border border-mono-600 bg-mono-900 text-mono-100 focus:ring-2 focus:ring-green-400 focus:border-transparent"
      >
        {#each availableOperators as op (op)}
          <option value={op}>{op}</option>
        {/each}
      </select>
    </div>

    <!-- Derived type (read-only) -->
    {#if derivedType}
      <div class="w-20 shrink-0 flex items-center">
        <span class="text-xs text-mono-400 bg-mono-800 px-1.5 py-0.5 rounded truncate" title={derivedType}>
          {derivedType}
        </span>
      </div>
    {/if}

    <!-- Remove button -->
    <button
      type="button"
      onclick={onRemove}
      class="shrink-0 text-mono-400 hover:text-red-400 transition-colors p-1"
      title="Remove parameter"
    >
      <i class="fa-solid fa-xmark text-xs"></i>
    </button>
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
