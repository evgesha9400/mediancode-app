<script module lang="ts">
  import type { QueryParam, ResponseShape } from '$lib/types';
  import type { TargetField, ValidationError } from '$lib/domain/paramInference';

  export interface QueryParametersEditorProps {
    queryParams: QueryParam[];
    targetFields: TargetField[];
    responseShape: ResponseShape;
    pagination: boolean;
    validationErrors: ValidationError[];
    onAddFromField: (fieldMemberId: string) => void;
    onUpdate: (index: number, updates: Partial<QueryParam>) => void;
    onRemove: (index: number) => void;
    onTogglePagination: () => void;
  }
</script>

<script lang="ts">
  import QueryParamRow from './QueryParamRow.svelte';
  import FieldSelectorDropdown, { type FieldSelectorOption } from './FieldSelectorDropdown.svelte';
  import {
    listMetaBadge,
    queryParamBuiltinBadge,
    queryParamPaginationDivider,
    queryParamPaginationToggleBase,
    queryParamPaginationToggleOff,
    queryParamPaginationToggleOn,
    queryParamReadonlyCell,
    surfaceInsideFrostedPanel,
  } from '$lib/ui/classes';

  interface Props extends QueryParametersEditorProps {}

  let {
    queryParams,
    targetFields,
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

  // General query errors not tied to a specific param (e.g. rule 4)
  const generalQueryErrors = $derived(queryErrors.filter(e => !e.param));

  // Get errors for a specific query param by name
  function errorsForParam(paramName: string): typeof queryErrors {
    return queryErrors.filter(e => e.param === paramName);
  }

  // Whether we have any rows to show (query params or pagination)
  const hasRows = $derived(queryParams.length > 0 || pagination);

  const linkedFieldMemberIds = $derived(queryParams.map(qp => qp.fieldMemberId).filter(Boolean));

  const targetFieldOptions = $derived.by((): FieldSelectorOption[] =>
    targetFields.map(field => ({
      id: field.fieldMemberId,
      name: field.name,
      type: field.type
    }))
  );
</script>

{#if !isDetail}
  <div>
    <div class="flex items-center justify-between mb-2">
      <h3 class="text-sm text-fg-secondary flex items-center font-medium">
        <i class="fa-solid fa-filter mr-2"></i>
        Query Parameters
      </h3>
      <div class="flex items-center gap-2">
        <button
          type="button"
          onclick={onTogglePagination}
          class="{queryParamPaginationToggleBase} {pagination ? queryParamPaginationToggleOn : queryParamPaginationToggleOff}"
          title={pagination ? 'Remove limit/offset pagination parameters' : 'Add limit/offset pagination parameters'}
        >
          <i class="fa-solid {pagination ? 'fa-minus' : 'fa-plus'} text-[10px]"></i>
          <span>{pagination ? 'Remove Pagination' : 'Add Pagination'}</span>
        </button>
      </div>
    </div>

    {#if hasRows}
      <div class="px-3 py-2 {surfaceInsideFrostedPanel} mb-2">
        <!-- Column headers -->
        <div class="flex items-center gap-2 py-1 border-b border-edge text-[10px] text-fg-dimmed uppercase tracking-wider">
          <div class="w-1/4 shrink-0">Name</div>
          <div class="w-1/4 shrink-0">Operator</div>
          <div class="w-1/2">Field</div>
        </div>

        <!-- Regular query param rows -->
        {#each queryParams as param, i (i)}
          <QueryParamRow
            {param}
            {targetFields}
            validationErrors={errorsForParam(param.name)}
            onUpdate={(updates) => onUpdate(i, updates)}
            onRemove={() => onRemove(i)}
            onSuggest={(suggestion) => onUpdate(i, { fieldMemberId: suggestion.fieldMemberId, operator: suggestion.operator })}
          />
        {/each}

        <!-- Pagination rows at the bottom (locked pair) -->
        {#if pagination}
          <div class={queryParamPaginationDivider}>
            <div class="flex items-center gap-2 py-1.5">
              <div class="w-1/4 shrink-0">
                <div class="{queryParamReadonlyCell} font-mono">
                  limit
                </div>
              </div>
              <div class="w-1/4 shrink-0">
                <div class={queryParamReadonlyCell}>
                  ge/le
                </div>
              </div>
              <div class="w-1/2 min-w-0">
                <div class={queryParamReadonlyCell}>
                  <div class="flex items-center gap-1.5 min-w-0">
                    <span class="font-mono text-sm truncate">limit</span>
                    <span class={listMetaBadge}>int</span>
                    <span class={queryParamBuiltinBadge}>built-in</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="flex items-center gap-2 py-1.5">
              <div class="w-1/4 shrink-0">
                <div class="{queryParamReadonlyCell} font-mono">
                  offset
                </div>
              </div>
              <div class="w-1/4 shrink-0">
                <div class={queryParamReadonlyCell}>
                  ge
                </div>
              </div>
              <div class="w-1/2 min-w-0">
                <div class={queryParamReadonlyCell}>
                  <div class="flex items-center gap-1.5 min-w-0">
                    <span class="font-mono text-sm truncate">offset</span>
                    <span class={listMetaBadge}>int</span>
                    <span class={queryParamBuiltinBadge}>built-in</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        {/if}
      </div>
    {/if}

    <!-- Field selector dropdown to add query params -->
    {#if targetFieldOptions.length > 0}
      <FieldSelectorDropdown
        availableFields={targetFieldOptions}
        selectedFieldIds={linkedFieldMemberIds}
        onSelect={onAddFromField}
        placeholder="Add query parameter from Field Member..."
      />
    {:else if queryParams.length === 0 && !pagination}
      <div class="px-3 py-2 {surfaceInsideFrostedPanel}">
        <p class="text-xs text-fg-muted">No query parameters. Select an object to add Field Member filters.</p>
      </div>
    {/if}

    <!-- General query validation errors (not tied to a specific param) -->
    {#if generalQueryErrors.length > 0}
      <div class="mt-1 space-y-0.5">
        {#each generalQueryErrors as error}
          <p class="text-xs text-red-400 flex items-center gap-1">
            <i class="fa-solid fa-triangle-exclamation"></i>
            {error.message}
          </p>
        {/each}
      </div>
    {/if}
  </div>
{/if}
