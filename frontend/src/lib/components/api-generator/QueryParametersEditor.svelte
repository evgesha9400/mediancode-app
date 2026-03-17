<script module lang="ts">
  import type { QueryParam, FilterOperator, ResponseShape } from '$lib/types';
  import type { TargetField, ValidationError } from '$lib/domain/paramInference';

  export interface QueryParametersEditorProps {
    queryParams: QueryParam[];
    targetFields: TargetField[];
    responseShape: ResponseShape;
    pagination: boolean;
    validationErrors: ValidationError[];
    onAdd: () => void;
    onUpdate: (index: number, updates: Partial<QueryParam>) => void;
    onRemove: (index: number) => void;
    onTogglePagination: () => void;
  }
</script>

<script lang="ts">
  import QueryParamRow from './QueryParamRow.svelte';

  interface Props extends QueryParametersEditorProps {}

  let {
    queryParams,
    targetFields,
    responseShape,
    pagination,
    validationErrors,
    onAdd,
    onUpdate,
    onRemove,
    onTogglePagination
  }: Props = $props();

  const isDetail = $derived(responseShape === 'object');

  // Filter validation errors for query params (rules 4, 6)
  const queryErrors = $derived(validationErrors.filter(e => e.rule === 4 || e.rule === 6));
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
        <button
          type="button"
          onclick={onAdd}
          class="text-xs text-mono-400 hover:text-mono-100 transition-colors flex items-center space-x-1"
        >
          <i class="fa-solid fa-plus text-xs"></i>
          <span>Add</span>
        </button>
      </div>
    </div>

    {#if pagination}
      <!-- Pagination display (read-only) -->
      <div class="px-3 py-2 bg-mono-950 rounded border border-mono-700 mb-2">
        <div class="flex items-center justify-between mb-1.5">
          <span class="text-[10px] text-mono-500 uppercase tracking-wider">Pagination</span>
          <button
            type="button"
            onclick={onTogglePagination}
            class="text-xs text-mono-400 hover:text-red-400 transition-colors flex items-center space-x-1"
            title="Remove pagination"
          >
            <i class="fa-solid fa-xmark text-xs"></i>
            <span>Remove</span>
          </button>
        </div>
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-1.5">
            <span class="text-xs font-mono text-mono-100">limit</span>
            <span class="text-xs text-mono-400 bg-mono-800 px-1.5 py-0.5 rounded">int</span>
            <span class="text-[10px] text-mono-500">ge=1, le=100</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="text-xs font-mono text-mono-100">offset</span>
            <span class="text-xs text-mono-400 bg-mono-800 px-1.5 py-0.5 rounded">int</span>
            <span class="text-[10px] text-mono-500">ge=0</span>
          </div>
        </div>
      </div>
    {/if}

    {#if queryParams.length === 0 && !pagination}
      <div class="px-3 py-2 bg-mono-950 rounded border border-mono-700">
        <p class="text-xs text-mono-400">No query parameters. Click "Add" to define filters for this list endpoint.</p>
      </div>
    {:else if queryParams.length > 0}
      <div class="px-3 py-1 bg-mono-950 rounded border border-mono-700">
        <!-- Column headers -->
        <div class="flex items-center gap-2 py-1 border-b border-mono-700 text-[10px] text-mono-500 uppercase tracking-wider">
          <div class="w-28 shrink-0">Name</div>
          <div class="flex-1">Field</div>
          <div class="w-20 shrink-0">Operator</div>
          <div class="w-20 shrink-0">Type</div>
          <div class="w-6 shrink-0"></div>
        </div>
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
