<script module lang="ts">
  import type { QueryParam } from '$lib/types';
  import type { EndpointIssue, EndpointQueryControls, EndpointTargetFieldMember } from '$lib/domain/endpointQuerySemantics';
  import type { ValidationError } from '$lib/domain/paramInference';

  export interface QueryParametersEditorProps {
    queryParams: QueryParam[];
    targetFields: EndpointTargetFieldMember[];
    controls: EndpointQueryControls;
    pagination: boolean;
    validationErrors: ValidationError[];
    blockIssues?: EndpointIssue[];
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
    controls,
    pagination,
    validationErrors,
    blockIssues = [],
    onAddFromField,
    onUpdate,
    onRemove,
    onTogglePagination
  }: Props = $props();

  const queryParamsEditable = $derived(controls.queryParameters.mode === 'editable');
  const queryParamsHidden = $derived(controls.queryParameters.mode === 'hidden');
  const queryParamsBlocked = $derived(controls.queryParameters.mode === 'blocked');
  const paginationEditable = $derived(controls.pagination.mode === 'editable');

  // Filter validation errors for query params
  const queryErrors = $derived(validationErrors.filter(e =>
    e.location?.kind === 'queryParam' || e.rule === 4
  ));

  // General query errors not tied to a specific param (e.g. rule 4)
  const generalQueryErrors = $derived(queryErrors.filter(e => e.location?.kind !== 'queryParam' && !e.param));

  const queryBlockIssues = $derived(blockIssues.filter(issue =>
    (issue.location.kind === 'queryParam' && !issue.validationError) ||
    issue.location.kind === 'pagination' ||
    issue.code === 'delete_query_params'
  ));

  const generalQueryMessages = $derived([
    ...generalQueryErrors.map(error => error.message),
    ...queryBlockIssues.map(issue => issue.message),
    ...(queryParamsBlocked && queryBlockIssues.length === 0 && generalQueryErrors.length === 0
      ? ['Resolve endpoint query availability before editing query parameters']
      : [])
  ]);

  // Get errors for a specific query param by name
  function errorsForParam(index: number, paramName: string): typeof queryErrors {
    return queryErrors.filter(e =>
      e.location?.kind === 'queryParam'
        ? e.location.index === index
        : e.param === paramName
    );
  }

  // Whether we have any rows to show (query params or pagination)
  const hasRows = $derived(!queryParamsHidden && (queryParams.length > 0 || pagination));

  const linkedFieldMemberIds = $derived(queryParams.map(qp => qp.fieldMemberId).filter(Boolean));

  const targetFieldOptions = $derived.by((): FieldSelectorOption[] =>
    targetFields.map(field => ({
      id: field.id,
      name: field.name,
      type: field.type
    }))
  );
</script>

{#if !queryParamsHidden || generalQueryMessages.length > 0}
  <div>
    <div class="flex items-center justify-between mb-2">
      <h3 class="text-sm text-fg-secondary flex items-center font-medium">
        <i class="fa-solid fa-filter mr-2"></i>
        Query Parameters
      </h3>
      {#if paginationEditable}
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
      {/if}
    </div>

    {#if hasRows}
      <div class="px-3 py-2 {surfaceInsideFrostedPanel} mb-2">
        <!-- Column headers -->
        <div class="flex items-center gap-2 py-1 border-b border-edge text-[10px] text-fg-dimmed uppercase tracking-wider">
          <div class="w-1/5 shrink-0">Name</div>
          <div class="w-1/5 shrink-0">Operator</div>
          <div class="w-20 shrink-0">Req</div>
          <div class="flex-1">Field</div>
        </div>

        <!-- Regular query param rows -->
        {#each queryParams as param, i (i)}
          <QueryParamRow
            {param}
            {targetFields}
            validationErrors={errorsForParam(i, param.name)}
            onUpdate={(updates) => onUpdate(i, updates)}
            onRemove={() => onRemove(i)}
          />
        {/each}

        <!-- Pagination rows at the bottom (locked pair) -->
        {#if pagination}
          <div class={queryParamPaginationDivider}>
            <div class="flex items-center gap-2 py-1.5">
              <div class="w-1/5 shrink-0">
                <div class="{queryParamReadonlyCell} font-mono">
                  limit
                </div>
              </div>
              <div class="w-1/5 shrink-0">
                <div class={queryParamReadonlyCell}>
                  ge/le
                </div>
              </div>
              <div class="w-20 shrink-0">
                <div class={queryParamReadonlyCell}>-</div>
              </div>
              <div class="flex-1 min-w-0">
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
              <div class="w-1/5 shrink-0">
                <div class="{queryParamReadonlyCell} font-mono">
                  offset
                </div>
              </div>
              <div class="w-1/5 shrink-0">
                <div class={queryParamReadonlyCell}>
                  ge
                </div>
              </div>
              <div class="w-20 shrink-0">
                <div class={queryParamReadonlyCell}>-</div>
              </div>
              <div class="flex-1 min-w-0">
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
    {#if queryParamsEditable && targetFieldOptions.length > 0}
      <FieldSelectorDropdown
        availableFields={targetFieldOptions}
        selectedFieldIds={linkedFieldMemberIds}
        onSelect={onAddFromField}
        placeholder="Add query parameter from Field Member..."
      />
    {:else if queryParamsEditable && queryParams.length === 0 && !pagination}
      <div class="px-3 py-2 {surfaceInsideFrostedPanel}">
        <p class="text-xs text-fg-muted">No query parameters. Select an object to add Field Member filters.</p>
      </div>
    {/if}

    <!-- General query validation/blocking messages (not tied to a specific param) -->
    {#if generalQueryMessages.length > 0}
      <div class="mt-1 space-y-0.5">
        {#each generalQueryMessages as message}
          <p class="text-xs text-red-400 flex items-center gap-1">
            <i class="fa-solid fa-triangle-exclamation"></i>
            {message}
          </p>
        {/each}
      </div>
    {/if}
  </div>
{/if}
