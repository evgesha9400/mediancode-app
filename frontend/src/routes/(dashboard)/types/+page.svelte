<script lang="ts">
  import { typesStore, searchTypes, type FieldType } from '$lib/stores/types';
  import { isSystemEntity } from '$lib/utils/namespace';
  import {
    PageHeader,
    SearchBar,
    FilterPanel,
    Table,
    SortableColumn,
    DrawerStack,
    DetailField,
    Pill,
    TableEmptyState
  } from '$lib/components';
  import type { FilterConfig } from '$lib/types';
  import { STORE_NAMES } from '$lib/stores/loader';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { createListViewState } from '$lib/stores/listViewState.svelte';

  // Filter state type
  type TypeFilterState = {
    onlyUsedInFields: boolean;
  };

  let filterConfig: FilterConfig = [
    {
      type: 'toggle',
      key: 'onlyUsedInFields',
      label: 'Usage',
      toggleLabel: 'Used in fields only',
      predicate: (item: FieldType) => item.usedInFields > 0
    }
  ];

  // Create list view state (owns all reactive state)
  const state = createListViewState<FieldType, TypeFilterState>({
    itemsStore: () => $typesStore,
    searchFn: searchTypes,
    filterSections: filterConfig,
    numericColumns: new Set(['usedInFields']),
    urlScope: { page, goto },
    getItemId: (type) => type.name,
    drawerConfig: {
      trackEdits: false,
      allowDelete: false,
      closeDelay: 300
    }
  });

  // Convenience aliases for template bindings
  let filteredTypes = $derived(state.results);
  let sorts = $derived(state.sorts);
  let activeFiltersCount = $derived(state.activeFiltersCount);
</script>

<PageHeader title="Types" />

  <SearchBar
    bind:searchQuery={state.query}
    placeholder="Search types..."
    resultsCount={filteredTypes.length}
    resultLabel="type"
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

  <Table isEmpty={filteredTypes.length === 0}>
    {#snippet header()}
      <tr>
        <SortableColumn
          column="name"
          label="Name"
          {sorts}
          onSort={state.handleSort}
        />
        <SortableColumn
          column="pythonType"
          label="Python Type"
          {sorts}
          onSort={state.handleSort}
        />
        <SortableColumn
          column="description"
          label="Description"
          {sorts}
          onSort={state.handleSort}
        />
        <SortableColumn
          column="usedInFields"
          label="Used in Fields"
          {sorts}
          onSort={state.handleSort}
        />
      </tr>
    {/snippet}

    {#snippet body()}
      {#each filteredTypes as type}
        <tr
          onclick={() => state.selectItem(type)}
          class="cursor-pointer transition-colors {state.selectedItem?.name === type.name ? 'bg-mono-100' : 'hover:bg-mono-50'}"
        >
          <td class="px-6 py-4 whitespace-nowrap text-sm text-mono-900 font-medium">
            {type.name}
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <Pill>{type.pythonType}</Pill>
          </td>
          <td class="px-6 py-4 text-sm text-mono-500">
            {type.description}
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="flex items-center space-x-2">
              <Pill>{type.usedInFields}</Pill>
              <span class="text-sm text-mono-600">fields</span>
            </div>
          </td>
        </tr>
      {/each}
    {/snippet}

    {#snippet empty()}
      <TableEmptyState entityName="types" storeKey={STORE_NAMES.TYPES} />
    {/snippet}
  </Table>

{#snippet typeDetailContent(_: { close: () => void })}
  {#if state.selectedItem}
    <div class="space-y-6">
      {#if isSystemEntity(state.selectedItem)}
        <div class="flex items-center space-x-2 px-3 py-2 bg-mono-50 border border-mono-200 rounded-md">
          <i class="fa-solid fa-lock text-mono-400 text-sm"></i>
          <span class="text-sm text-mono-600">System type — read-only</span>
        </div>
      {/if}
      <DetailField label="Name" value={state.selectedItem.name} />
      <DetailField label="Python Type" value={state.selectedItem.pythonType} />
      <DetailField label="Description" value={state.selectedItem.description} />
      <DetailField label="Used in Fields">
        <Pill>{state.selectedItem.usedInFields}</Pill>
        <span class="text-sm text-mono-600 ml-2">fields</span>
      </DetailField>
    </div>
  {/if}
{/snippet}

<DrawerStack
  panels={state.drawerOpen
    ? [{ id: 'type', title: 'Type Details', width: 520, minWidth: 320, content: typeDetailContent }]
    : []}
  onPopPanel={state.closeDrawer}
/>
