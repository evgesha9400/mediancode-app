<script module lang="ts">
  import type { QueryParam, FilterOperator, ResponseShape } from '$lib/types';
  import type { Field } from '$lib/types';
  import type { TargetField, ValidationError } from '$lib/domain/paramInference';

  export interface QueryParametersEditorProps {
    queryParams: QueryParam[];
    targetFields: TargetField[];
    objectFields: Field[];
    responseShape: ResponseShape;
    pagination: boolean;
    validationErrors: ValidationError[];
    onAddFromField: (fieldName: string) => void;
    onUpdate: (index: number, updates: Partial<QueryParam>) => void;
    onRemove: (index: number) => void;
    onTogglePagination: () => void;
  }
</script>

<script lang="ts">
  import QueryParamRow from './QueryParamRow.svelte';
  import FieldSelectorDropdown from './FieldSelectorDropdown.svelte';

  interface Props extends QueryParametersEditorProps {}

  let {
    queryParams,
    targetFields,
    objectFields,
    responseShape,
    pagination,
    validationErrors,
    onAddFromField,
    onUpdate,
    onRemove,
    onTogglePagination
  }: Props = $props();

  const isDetail = $derived(responseShape === 'object');

  // Filter validation errors for query params (rules 4, 6)
  const queryErrors = $derived(validationErrors.filter(e => e.rule === 4 || e.rule === 6));

  // Whether we have any rows to show (query params or pagination)
  const hasRows = $derived(queryParams.length > 0 || pagination);

  // Field IDs already linked to a query param (to exclude from dropdown)
  const linkedFieldIds = $derived.by(() => {
    const linkedNames = new Set(queryParams.map(qp => qp.field).filter(Boolean));
    return objectFields
      .filter(f => linkedNames.has(f.name))
      .map(f => f.id);
  });

  // Handle field selection from the dropdown: map fieldId to fieldName
  function handleFieldSelect(fieldId: string): void {
    const field = objectFields.find(f => f.id === fieldId);
    if (field) {
      onAddFromField(field.name);
    }
  }
</script>

{#if !isDetail}
  <div>
    <div class="flex items-center justify-between mb-2">
      <h3 class="text-sm text-mono-300 flex items-center font-medium">
        <i class="fa-solid fa-filter mr-2"></i>
        Query Parameters
      </h3>
      <div class="flex items-center gap-2">
        {#if !pagination}
          <button
            type="button"
            onclick={onTogglePagination}
            class="text-xs text-mono-400 hover:text-mono-100 transition-colors flex items-center space-x-1"
            title="Add limit/offset pagination parameters"
          >
            <i class="fa-solid fa-arrows-up-down text-xs"></i>
            <span>Add Pagination</span>
          </button>
        {/if}
      </div>
    </div>

    {#if hasRows}
      <div class="px-3 py-1 bg-mono-950 rounded border border-mono-700 mb-2">
        <!-- Column headers -->
        <div class="flex items-center gap-2 py-1 border-b border-mono-700 text-[10px] text-mono-500 uppercase tracking-wider">
          <div class="w-28 shrink-0">Name</div>
          <div class="flex-1">Field</div>
          <div class="w-20 shrink-0">Operator</div>
          <div class="w-20 shrink-0">Type</div>
          <div class="w-6 shrink-0"></div>
        </div>

        <!-- Pagination rows (locked pair, displayed like regular rows but greyed out) -->
        {#if pagination}
          <div class="border-b border-mono-700 last:border-b-0 bg-mono-900/50">
            <!-- limit row -->
            <div class="flex items-start gap-2 py-1.5">
              <div class="w-28 shrink-0">
                <div class="w-full px-2 py-1 text-xs font-mono border border-mono-700 bg-mono-800 text-mono-400 cursor-not-allowed">
                  limit
                </div>
              </div>
              <div class="flex-1 min-w-0">
                <div class="w-full px-2 py-1 text-xs border border-mono-700 bg-mono-800 text-mono-400 cursor-not-allowed">
                  <i class="fa-solid fa-lock text-[10px] mr-1"></i>
                  built-in
                </div>
              </div>
              <div class="w-20 shrink-0">
                <div class="w-full px-2 py-1 text-xs border border-mono-700 bg-mono-800 text-mono-400 cursor-not-allowed">
                  ge/le
                </div>
              </div>
              <div class="w-20 shrink-0 flex items-center">
                <span class="text-xs text-mono-400 bg-mono-800 px-1.5 py-1 rounded truncate">int</span>
              </div>
              <!-- Spacer for alignment (remove button on offset row) -->
              <div class="w-6 shrink-0"></div>
            </div>
            <!-- offset row -->
            <div class="flex items-start gap-2 py-1.5">
              <div class="w-28 shrink-0">
                <div class="w-full px-2 py-1 text-xs font-mono border border-mono-700 bg-mono-800 text-mono-400 cursor-not-allowed">
                  offset
                </div>
              </div>
              <div class="flex-1 min-w-0">
                <div class="w-full px-2 py-1 text-xs border border-mono-700 bg-mono-800 text-mono-400 cursor-not-allowed">
                  <i class="fa-solid fa-lock text-[10px] mr-1"></i>
                  built-in
                </div>
              </div>
              <div class="w-20 shrink-0">
                <div class="w-full px-2 py-1 text-xs border border-mono-700 bg-mono-800 text-mono-400 cursor-not-allowed">
                  ge
                </div>
              </div>
              <div class="w-20 shrink-0 flex items-center">
                <span class="text-xs text-mono-400 bg-mono-800 px-1.5 py-1 rounded truncate">int</span>
              </div>
              <!-- Remove pagination (removes both limit and offset) -->
              <button
                type="button"
                onclick={onTogglePagination}
                class="shrink-0 text-mono-400 hover:text-red-400 transition-colors p-1"
                title="Remove pagination (limit & offset)"
              >
                <i class="fa-solid fa-xmark text-xs"></i>
              </button>
            </div>
          </div>
        {/if}

        <!-- Regular query param rows -->
        {#each queryParams as param, i (i)}
          <QueryParamRow
            {param}
            {targetFields}
            onUpdate={(updates) => onUpdate(i, updates)}
            onRemove={() => onRemove(i)}
            onSuggest={(suggestion) => onUpdate(i, { field: suggestion.field, operator: suggestion.operator })}
          />
        {/each}
      </div>
    {/if}

    <!-- Field selector dropdown to add query params -->
    {#if objectFields.length > 0}
      <FieldSelectorDropdown
        availableFields={objectFields}
        selectedFieldIds={linkedFieldIds}
        onSelect={handleFieldSelect}
        placeholder="Add query parameter from field..."
      />
    {:else if queryParams.length === 0 && !pagination}
      <div class="px-3 py-2 bg-mono-950 rounded border border-mono-700">
        <p class="text-xs text-mono-400">No query parameters. Select an object to add field-based filters.</p>
      </div>
    {/if}

    <!-- Validation errors -->
    {#if queryErrors.length > 0}
      <div class="mt-2 space-y-1">
        {#each queryErrors as error}
          <p class="text-xs text-red-400 flex items-center gap-1">
            <i class="fa-solid fa-triangle-exclamation"></i>
            {error.message}
          </p>
        {/each}
      </div>
    {/if}
  </div>
{/if}
