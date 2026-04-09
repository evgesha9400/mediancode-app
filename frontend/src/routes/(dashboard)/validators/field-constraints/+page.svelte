<script lang="ts">
  import { fieldConstraintsStore, searchFieldConstraints, type FieldConstraint } from '$lib/stores/fieldConstraints';
  import { isSystemEntity } from '$lib/utils/namespace';
  import {
    MainColumnFrame,
    PageHeader,
    SearchBar,
    FilterPanel,
    Table,
    SortableColumn,
    Pill,
    DetailField,
    TableEmptyState,
    DrawerStack,
    TableListNameCell,
    TableListTextCell,
    TableListMetricCell
  } from '$lib/components';
  import type { FilterConfig } from '$lib/types';
  import {
    dashboardControlTextMutedHoverPrimary,
    tableListBodyLink,
    tableListCell,
    tableListRowHover,
    tableListRowInteractive,
    tableListRowSelected
  } from '$lib/ui/classes';
  import { getTableRowId, TABLE_COL_ATTR } from '$lib/utils/testIds';
  import { STORE_NAMES } from '$lib/stores/loader';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { createListViewState } from '$lib/stores/listViewState.svelte';

  // Filter state type
  type FieldConstraintFilterState = {
    selectedCompatibleTypes: string[];
    onlyUsedInFields: boolean;
  };

  // Build filter config from field constraints (reactive to store changes)
  let filterConfig = $derived.by((): FilterConfig => {
    const fieldConstraints = $fieldConstraintsStore;
    const uniqueTypes = Array.from(
      new Set(fieldConstraints.flatMap(c => c.compatibleTypes))
    ).sort();

    return [
      {
        type: 'checkbox-group',
        key: 'selectedCompatibleTypes',
        label: 'Applied To',
        options: uniqueTypes.map(t => ({ label: t, value: t })),
        predicate: (item: FieldConstraint, selected: string[]) =>
          item.compatibleTypes.some(ct => selected.includes(ct))
      },
      {
        type: 'toggle',
        key: 'onlyUsedInFields',
        label: 'Usage',
        toggleLabel: 'Used in fields only',
        predicate: (item: FieldConstraint) => item.usedInFields > 0
      }
    ];
  });

  // Create list view state (owns all reactive state)
  // Field constraints are global reference data -- no namespace filtering
  const state = createListViewState<FieldConstraint, FieldConstraintFilterState>({
    itemsStore: () => $fieldConstraintsStore,
    searchFn: searchFieldConstraints,
    filterSections: () => filterConfig,
    numericColumns: new Set(['usedInFields']),
    urlScope: { page, goto },
    getItemId: (fc) => fc.name,
    drawerConfig: {
      trackEdits: false,
      allowDelete: false,
      closeDelay: 300
    }
  });

  // Convenience aliases for template bindings
  let selectedFieldConstraint = $derived(state.selectedItem);
  let filteredFieldConstraints = $derived(state.results);
  let sorts = $derived(state.sorts);
  let activeFiltersCount = $derived(state.activeFiltersCount);

  function isSelected(fc: FieldConstraint): boolean {
    return selectedFieldConstraint?.name === fc.name;
  }

  let isSystemItem = $derived(selectedFieldConstraint ? isSystemEntity(selectedFieldConstraint) : false);
</script>

<MainColumnFrame bodyClass="">
  {#snippet header()}
    <PageHeader title="Field Constraints" />

    <SearchBar
      bind:searchQuery={state.query}
      placeholder="Search field constraints..."
      resultsCount={filteredFieldConstraints.length}
      resultLabel="field constraint"
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

  <Table isEmpty={filteredFieldConstraints.length === 0}>
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
        column="compatibleTypes"
        label="Applied To"
        {sorts}
        onSort={state.handleSort}
      />
      <SortableColumn
        column="docsUrl"
        label="Docs"
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
    {#each filteredFieldConstraints as fc}
      <tr
        data-testid={getTableRowId(fc.id)}
        onclick={() => state.selectItem(fc)}
        class="{tableListRowInteractive} {isSelected(fc) ? tableListRowSelected : tableListRowHover}"
      >
        <TableListNameCell col="name">
          {#snippet children()}
            {fc.name}
          {/snippet}
        </TableListNameCell>
        <TableListTextCell col="description" class="max-w-xs truncate">
          {#snippet children()}
            {fc.description.split('.')[0]}.
          {/snippet}
        </TableListTextCell>
        <td class="{tableListCell}" {...{ [TABLE_COL_ATTR]: 'compatibleTypes' }}>
          <div class="flex flex-wrap gap-1">
            {#each fc.compatibleTypes as ctype}
              <Pill>{ctype}</Pill>
            {/each}
          </div>
        </td>
        <td class="{tableListCell} whitespace-nowrap text-sm" {...{ [TABLE_COL_ATTR]: 'docsUrl' }}>
          {#if fc.docsUrl}
            <a
              href={fc.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              onclick={(e) => e.stopPropagation()}
              class="{dashboardControlTextMutedHoverPrimary}"
              title="View documentation"
            >
              <i class="fa-solid fa-arrow-up-right-from-square"></i>
            </a>
          {:else}
            <span class="text-mono-600">-</span>
          {/if}
        </td>
        <TableListMetricCell col="usedInFields" label="fields">
          {#snippet pill()}
            <Pill>{fc.usedInFields}</Pill>
          {/snippet}
        </TableListMetricCell>
      </tr>
    {/each}
  {/snippet}

  {#snippet empty()}
    <TableEmptyState entityName="field constraints" storeKey={STORE_NAMES.FIELD_CONSTRAINTS} />
  {/snippet}
  </Table>
</MainColumnFrame>

{#snippet constraintDetailContent(_: { close: () => void })}
  {#if selectedFieldConstraint}
    <div class="space-y-6">
      <DetailField label="Name" value={selectedFieldConstraint.name} />
      <DetailField label="Description" value={selectedFieldConstraint.description} />

      <DetailField label="Applied To">
        <div class="flex flex-wrap gap-1.5 mt-1">
          {#each selectedFieldConstraint.compatibleTypes as ctype}
            <Pill>{ctype}</Pill>
          {/each}
        </div>
      </DetailField>

      {#if selectedFieldConstraint.docsUrl}
        <DetailField label="Documentation">
          <a
            href={selectedFieldConstraint.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            class={tableListBodyLink}
          >
            View Docs <i class="fa-solid fa-arrow-up-right-from-square text-xs"></i>
          </a>
        </DetailField>
      {/if}

    </div>
  {/if}
{/snippet}

<DrawerStack
  panels={state.drawerOpen
    ? [{
        id: 'field-constraint',
        title: 'Field Constraint Details',
        headerSystem: isSystemItem,
        width: 520,
        minWidth: 320,
        content: constraintDetailContent
      }]
    : []}
  onPopPanel={state.closeDrawer}
/>
