<script lang="ts">
  import { typesStore, searchTypes, type FieldType } from '$lib/stores/types';
  import { isSystemEntity } from '$lib/utils/namespace';
  import {
    MainColumnFrame,
    PageHeader,
    SearchBar,
    FilterPanel,
    Table,
    SortableColumn,
    DrawerStack,
    DetailField,
    Pill,
    TableListNameCell,
    TableListTextCell,
    TableListMetricCell,
    TableEmptyState
  } from '$lib/components';
  import type { FilterConfig } from '$lib/types';
  import { tableListCell, tableListRowHover, tableListRowInteractive, tableListRowSelected } from '$lib/ui/classes';
  import { getTableRowId, TABLE_COL_ATTR } from '$lib/utils/testIds';
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
  let typeDrawerHeaderSystem = $derived(
    state.selectedItem ? isSystemEntity(state.selectedItem) : false
  );
</script>

<MainColumnFrame bodyClass="">
  {#snippet header()}
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
  {/snippet}

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
          column="description"
          label="Description"
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
          data-testid={getTableRowId(type.name)}
          onclick={() => state.selectItem(type)}
          class="{tableListRowInteractive} {state.selectedItem?.name === type.name
            ? tableListRowSelected
            : tableListRowHover}"
        >
          <TableListNameCell col="name">
            {#snippet children()}
              {type.name}
            {/snippet}
          </TableListNameCell>
          <TableListTextCell col="description">
            {#snippet children()}
              {type.description}
            {/snippet}
          </TableListTextCell>
          <td class="{tableListCell} whitespace-nowrap" {...{ [TABLE_COL_ATTR]: 'pythonType' }}>
            <Pill>{type.pythonType}</Pill>
          </td>
          <TableListMetricCell col="usedInFields" label="fields">
            {#snippet pill()}
              <Pill>{type.usedInFields}</Pill>
            {/snippet}
          </TableListMetricCell>
        </tr>
      {/each}
    {/snippet}

    {#snippet empty()}
      <TableEmptyState entityName="types" storeKey={STORE_NAMES.TYPES} />
    {/snippet}
  </Table>
</MainColumnFrame>

{#snippet typeDetailContent(_: { close: () => void })}
  {#if state.selectedItem}
    <div class="space-y-6">
      <DetailField label="Name" value={state.selectedItem.name} />
      <DetailField label="Description" value={state.selectedItem.description} />
      <DetailField label="Python Type" value={state.selectedItem.pythonType} />
    </div>
  {/if}
{/snippet}

<DrawerStack
  panels={state.drawerOpen
    ? [{
        id: 'type',
        title: 'Type Details',
        headerSystem: typeDrawerHeaderSystem,
        width: 520,
        minWidth: 320,
        content: typeDetailContent
      }]
    : []}
  onPopPanel={state.closeDrawer}
/>
