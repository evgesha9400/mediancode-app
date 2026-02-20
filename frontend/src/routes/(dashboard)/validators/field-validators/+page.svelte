<script lang="ts">
  import { fieldValidatorsStore, searchFieldValidators } from '$lib/stores/fieldValidators';
  import { activeNamespaceId } from '$lib/stores/namespaces';
  import { typesStore } from '$lib/stores/types';
  import {
    PageHeader,
    SearchBar,
    FilterPanel,
    Table,
    SortableColumn,
    EmptyState,
    NamespaceSelector
  } from '$lib/components';
  import type { FilterConfig, FieldValidator } from '$lib/types';
  import { storeLoadingState, reloadStores } from '$lib/stores/loader';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { createListViewState } from '$lib/stores/listViewState.svelte';

  // Filter state type
  type FieldValidatorFilterState = {
    selectedCompatibleTypes: string[];
    selectedModes: string[];
  };

  // Filter by active namespace
  let namespacedFieldValidators = $derived(
    $fieldValidatorsStore.filter(fv => fv.namespaceId === $activeNamespaceId)
  );

  // Build filter config (reactive to store changes)
  let filterConfig = $derived.by((): FilterConfig => {
    const rootTypes = $typesStore
      .filter(t => t.parentTypeId === null && t.name !== 'numeric')
      .map(t => t.name);
    const typeOptions = [...rootTypes, 'Any'].sort();

    return [
      {
        type: 'checkbox-group',
        key: 'selectedCompatibleTypes',
        label: 'Compatible Types',
        options: typeOptions.map(t => ({ label: t, value: t })),
        predicate: (item: FieldValidator, selected: string[]) =>
          item.compatibleTypes.some(ct => selected.includes(ct))
      },
      {
        type: 'checkbox-group',
        key: 'selectedModes',
        label: 'Mode',
        options: [
          { label: 'before', value: 'before' },
          { label: 'after', value: 'after' }
        ],
        predicate: (item: FieldValidator, selected: string[]) =>
          selected.includes(item.mode)
      }
    ];
  });

  // Create list view state (no drawer — row click navigates to edit page)
  const state = createListViewState<FieldValidator, FieldValidatorFilterState>({
    itemsStore: () => namespacedFieldValidators,
    searchFn: searchFieldValidators,
    filterSections: () => filterConfig,
    numericColumns: new Set(['usedInFields']),
    urlScope: { page, goto },
    getItemId: (fv) => fv.id
  });

  let filteredFieldValidators = $derived(state.results);
  let sorts = $derived(state.sorts);
  let activeFiltersCount = $derived(state.activeFiltersCount);

  let hasLoadError = $derived($storeLoadingState.storeErrors.includes('Field Validators'));
</script>

<PageHeader title="Field Validators">
  {#snippet actions()}
    <NamespaceSelector />
    <button
      type="button"
      onclick={() => goto('/validators/field-validators/new')}
      class="px-4 py-2 bg-mono-900 text-white rounded-md flex items-center space-x-2 hover:bg-mono-800 cursor-pointer transition-colors"
    >
      <i class="fa-solid fa-plus"></i>
      <span>Add Field Validator</span>
    </button>
  {/snippet}
</PageHeader>

<SearchBar
  bind:searchQuery={state.query}
  placeholder="Search field validators..."
  resultsCount={filteredFieldValidators.length}
  resultLabel="field validator"
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

<Table isEmpty={filteredFieldValidators.length === 0}>
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
          <span>Compatible Types</span>
        </div>
      </th>
      <SortableColumn
        column="mode"
        label="Mode"
        {sorts}
        onSort={state.handleSort}
      />
      <SortableColumn
        column="usedInFields"
        label="Used In Fields"
        {sorts}
        onSort={state.handleSort}
      />
    </tr>
  {/snippet}

  {#snippet body()}
    {#each filteredFieldValidators as fv}
      <tr
        onclick={() => goto(`/validators/field-validators/${fv.id}`)}
        class="cursor-pointer transition-colors hover:bg-mono-50"
      >
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="text-sm text-mono-900 font-medium">{fv.name}</div>
        </td>
        <td class="px-6 py-4 text-sm text-mono-500 max-w-xs truncate">
          {fv.description || '-'}
        </td>
        <td class="px-6 py-4">
          <div class="flex flex-wrap gap-1">
            {#each fv.compatibleTypes as type}
              <span class="px-2 py-0.5 text-xs rounded-full bg-mono-200 text-mono-700">{type}</span>
            {/each}
          </div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <span class="px-2 py-0.5 text-xs rounded-full {fv.mode === 'before' ? 'bg-mono-800 text-white' : 'bg-mono-200 text-mono-700'}">
            {fv.mode}
          </span>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="flex items-center space-x-2">
            <span class="px-2 py-1 text-xs rounded-full bg-mono-200 text-mono-700">
              {fv.usedInFields}
            </span>
            <span class="text-sm text-mono-600">fields</span>
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
        title="Failed to load field validators"
        message="Something went wrong while fetching field validator data"
        actionLabel="Retry"
        onAction={reloadStores}
      />
    {:else}
      <EmptyState
        title="No field validators found"
        message="Try adjusting your search query"
      />
    {/if}
  {/snippet}
</Table>
