<script lang="ts">
  import { modelValidatorsStore, searchModelValidators } from '$lib/stores/modelValidators';
  import { activeNamespaceId } from '$lib/stores/namespaces';
  import { fieldsStore } from '$lib/stores/fields';
  import {
    PageHeader,
    SearchBar,
    FilterPanel,
    Table,
    SortableColumn,
    EmptyState,
    NamespaceSelector
  } from '$lib/components';
  import type { FilterConfig, ModelValidator } from '$lib/types';
  import { storeLoadingState, reloadStores, STORE_NAMES } from '$lib/stores/loader';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { createListViewState } from '$lib/stores/listViewState.svelte';

  // Filter state type
  type ModelValidatorFilterState = {
    selectedRequiredFields: string[];
    selectedModes: string[];
  };

  // Filter by active namespace
  let namespacedModelValidators = $derived(
    $modelValidatorsStore.filter(mv => mv.namespaceId === $activeNamespaceId)
  );

  // Build filter config (reactive to store changes)
  let filterConfig = $derived.by((): FilterConfig => {
    const fieldNames = [...new Set(
      $fieldsStore
        .filter(f => f.namespaceId === $activeNamespaceId)
        .map(f => f.name)
    )].sort();

    return [
      {
        type: 'checkbox-group',
        key: 'selectedRequiredFields',
        label: 'Required Fields',
        options: fieldNames.map(f => ({ label: f, value: f })),
        predicate: (item: ModelValidator, selected: string[]) =>
          item.requiredFields.some(rf => selected.includes(rf))
      },
      {
        type: 'checkbox-group',
        key: 'selectedModes',
        label: 'Mode',
        options: [
          { label: 'before', value: 'before' },
          { label: 'after', value: 'after' }
        ],
        predicate: (item: ModelValidator, selected: string[]) =>
          selected.includes(item.mode)
      }
    ];
  });

  // Create list view state (no drawer — row click navigates to edit page)
  const state = createListViewState<ModelValidator, ModelValidatorFilterState>({
    itemsStore: () => namespacedModelValidators,
    searchFn: searchModelValidators,
    filterSections: () => filterConfig,
    numericColumns: new Set(['usedInObjects']),
    urlScope: { page, goto },
    getItemId: (mv) => mv.id
  });

  let filteredModelValidators = $derived(state.results);
  let sorts = $derived(state.sorts);
  let activeFiltersCount = $derived(state.activeFiltersCount);

  let hasLoadError = $derived($storeLoadingState.storeErrors.includes(STORE_NAMES.MODEL_VALIDATORS));
</script>

<PageHeader title="Model Validators">
  {#snippet actions()}
    <NamespaceSelector />
    <button
      type="button"
      onclick={() => goto('/validators/model-validators/new')}
      class="px-4 py-2 bg-mono-900 text-white rounded-md flex items-center space-x-2 hover:bg-mono-800 cursor-pointer transition-colors"
    >
      <i class="fa-solid fa-plus"></i>
      <span>Add Model Validator</span>
    </button>
  {/snippet}
</PageHeader>

<SearchBar
  bind:searchQuery={state.query}
  placeholder="Search model validators..."
  resultsCount={filteredModelValidators.length}
  resultLabel="model validator"
  showFilter={true}
  active={state.filtersOpen || activeFiltersCount > 0}
  onFilterClick={state.toggleFilters}
>
  {#snippet filterPanel()}
    <FilterPanel
      visible={state.filtersOpen}
      config={filterConfig}
      bind:state={state.filters}
      onClose={() => state.filtersOpen = false}
      onClear={state.resetFilters}
    />
  {/snippet}
</SearchBar>

<Table isEmpty={filteredModelValidators.length === 0}>
  {#snippet header()}
    <tr>
      <SortableColumn
        column="name"
        label="Name"
        {sorts}
        onSort={state.handleSort}
      />
      <SortableColumn
        column="description"
        label="Description"
        {sorts}
        onSort={state.handleSort}
      />
      <th scope="col" class="px-6 py-3 text-left text-xs text-mono-500 tracking-wider font-medium">
        <div class="flex items-center space-x-1">
          <span>Required Fields</span>
        </div>
      </th>
      <SortableColumn
        column="mode"
        label="Mode"
        {sorts}
        onSort={state.handleSort}
      />
      <SortableColumn
        column="usedInObjects"
        label="Used In Objects"
        {sorts}
        onSort={state.handleSort}
      />
    </tr>
  {/snippet}

  {#snippet body()}
    {#each filteredModelValidators as mv}
      <tr
        onclick={() => goto(`/validators/model-validators/${mv.id}`)}
        class="cursor-pointer transition-colors hover:bg-mono-50"
      >
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="text-sm text-mono-900 font-medium">{mv.name}</div>
        </td>
        <td class="px-6 py-4 text-sm text-mono-500 max-w-xs truncate">
          {mv.description || '-'}
        </td>
        <td class="px-6 py-4">
          <div class="flex flex-wrap gap-1">
            {#each mv.requiredFields as field}
              <span class="px-2 py-0.5 text-xs rounded-full bg-mono-200 text-mono-700">{field}</span>
            {/each}
          </div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <span class="px-2 py-0.5 text-xs rounded-full {mv.mode === 'before' ? 'bg-mono-800 text-white' : 'bg-mono-200 text-mono-700'}">
            {mv.mode}
          </span>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="flex items-center space-x-2">
            <span class="px-2 py-1 text-xs rounded-full bg-mono-200 text-mono-700">
              {mv.usedInObjects}
            </span>
            <span class="text-sm text-mono-600">objects</span>
          </div>
        </td>
      </tr>
    {/each}
  {/snippet}

  {#snippet empty()}
    {#if hasLoadError}
      <EmptyState
        icon="fa-circle-exclamation"
        variant="error"
        title="Failed to load model validators"
        message="Something went wrong while fetching model validator data"
        actionLabel="Retry"
        onAction={reloadStores}
      />
    {:else}
      <EmptyState
        title="No model validators found"
        message="Try adjusting your search query"
      />
    {/if}
  {/snippet}
</Table>
