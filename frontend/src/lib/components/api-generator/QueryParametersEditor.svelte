<script module lang="ts">
  import type { QueryParam, FilterOperator, ResponseShape } from '$lib/types';
  import type { TargetField, ValidationError } from '$lib/domain/paramInference';

  export interface QueryParametersEditorProps {
    queryParams: QueryParam[];
    targetFields: TargetField[];
    responseShape: ResponseShape;
    validationErrors: ValidationError[];
    onAdd: () => void;
    onUpdate: (index: number, updates: Partial<QueryParam>) => void;
    onRemove: (index: number) => void;
  }
</script>

<script lang="ts">
  import QueryParamRow from './QueryParamRow.svelte';

  interface Props extends QueryParametersEditorProps {}

  let {
    queryParams,
    targetFields,
    responseShape,
    validationErrors,
    onAdd,
    onUpdate,
    onRemove
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
      <button
        type="button"
        onclick={onAdd}
        class="text-xs text-mono-400 hover:text-mono-100 transition-colors flex items-center space-x-1"
      >
        <i class="fa-solid fa-plus text-xs"></i>
        <span>Add</span>
      </button>
    </div>

    {#if queryParams.length === 0}
      <div class="px-3 py-2 bg-mono-950 rounded border border-mono-700">
        <p class="text-xs text-mono-400">No query parameters. Click "Add" to define filters for this list endpoint.</p>
      </div>
    {:else}
      <div class="px-3 py-1 bg-mono-950 rounded border border-mono-700">
        <!-- Column headers -->
        <div class="flex items-center gap-2 py-1 border-b border-mono-700 text-[10px] text-mono-500 uppercase tracking-wider">
          <div class="w-28 shrink-0">Name</div>
          <div class="flex-1">Field</div>
          <div class="w-20 shrink-0">Operator</div>
          <div class="w-20 shrink-0">Type</div>
          <div class="w-12 shrink-0">Pag</div>
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
