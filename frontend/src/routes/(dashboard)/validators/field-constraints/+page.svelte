<script lang="ts">
  import { fieldConstraintsStore, searchFieldConstraints, type FieldConstraint } from '$lib/stores/fieldConstraints';
  import { fieldsStore } from '$lib/stores/fields';
  import { isSystemEntity } from '$lib/utils/namespace';
  import {
    PageHeader,
    SearchBar,
    FilterPanel,
    Table,
    SortableColumn,
    EmptyState,
    Drawer,
    DrawerHeader,
    DrawerContent
  } from '$lib/components';
  import type { FilterConfig } from '$lib/types';
  import { storeLoadingState, reloadStores, STORE_NAMES } from '$lib/stores/loader';
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
        label: 'Applies To',
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

  function navigateToField(fieldId: string) {
    goto(`/fields?highlight=${fieldId}`);
  }

  // Compute field references reactively from fieldsStore
  let fieldsUsingSelected = $derived(
    selectedFieldConstraint
      ? $fieldsStore.filter(f => f.constraints.some(c => c.constraintId === selectedFieldConstraint!.id))
          .map(f => ({ name: f.name, fieldId: f.id }))
      : []
  );

  let isSystemItem = $derived(selectedFieldConstraint ? isSystemEntity(selectedFieldConstraint) : false);
  let hasLoadError = $derived($storeLoadingState.storeErrors.includes(STORE_NAMES.FIELD_CONSTRAINTS));
</script>

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
        column="parameterTypes"
        label="Parameter Types"
        {sorts}
        onSort={state.handleSort}
      />
      <th scope="col" class="px-6 py-3 text-left text-xs text-mono-500 tracking-wider font-medium">
        <div class="flex items-center space-x-1">
          <span>Applies To</span>
        </div>
      </th>
      <th scope="col" class="px-6 py-3 text-left text-xs text-mono-500 tracking-wider font-medium">
        <div class="flex items-center space-x-1">
          <span>Description</span>
        </div>
      </th>
      <th scope="col" class="px-6 py-3 text-left text-xs text-mono-500 tracking-wider font-medium">
        <div class="flex items-center space-x-1">
          <span>Docs</span>
        </div>
      </th>
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
        onclick={() => state.selectItem(fc)}
        class="cursor-pointer transition-colors {isSelected(fc) ? 'bg-mono-100' : 'hover:bg-mono-50'}"
      >
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="flex items-center">
            <span class="w-5 flex-shrink-0 flex items-center justify-center">
              {#if isSystemEntity(fc)}
                <i class="fa-solid fa-lock text-mono-400 text-xs leading-none" title="System — read-only"></i>
              {/if}
            </span>
            <span class="text-sm text-mono-900 font-medium">{fc.name}</span>
          </div>
        </td>
        <td class="px-6 py-4">
          <div class="flex flex-wrap gap-1">
            {#each fc.parameterTypes as ptype}
              <span class="px-2 py-0.5 text-xs rounded-full bg-mono-200 text-mono-700">
                {ptype}
              </span>
            {/each}
          </div>
        </td>
        <td class="px-6 py-4">
          <div class="flex flex-wrap gap-1">
            {#each fc.compatibleTypes as ctype}
              <span class="px-2 py-0.5 text-xs rounded-full bg-mono-200 text-mono-700">
                {ctype}
              </span>
            {/each}
          </div>
        </td>
        <td class="px-6 py-4 text-sm text-mono-500 max-w-xs truncate">
          {fc.description.split('.')[0]}.
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm">
          {#if fc.docsUrl}
            <a
              href={fc.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              onclick={(e) => e.stopPropagation()}
              class="text-mono-600 hover:text-mono-900 transition-colors"
              title="View documentation"
            >
              <i class="fa-solid fa-arrow-up-right-from-square"></i>
            </a>
          {:else}
            <span class="text-mono-300">-</span>
          {/if}
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="flex items-center space-x-2">
            <span class="px-2 py-1 text-xs rounded-full bg-mono-200 text-mono-700">
              {fc.usedInFields}
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
        title="Failed to load field constraints"
        message="Something went wrong while fetching field constraint data"
        actionLabel="Retry"
        onAction={reloadStores}
      />
    {:else}
      <EmptyState
        title="No field constraints found"
        message="Try adjusting your search query"
      />
    {/if}
  {/snippet}
</Table>

<Drawer open={state.drawerOpen}>
  <DrawerHeader title="Field Constraint Details" onClose={state.closeDrawer} />

  <DrawerContent>
    {#if selectedFieldConstraint}
      <div class="space-y-6">
        {#if isSystemItem}
          <div class="flex items-center space-x-2 px-3 py-2 bg-mono-50 border border-mono-200 rounded-md">
            <i class="fa-solid fa-lock text-mono-400 text-sm"></i>
            <span class="text-sm text-mono-600">System field constraint — read-only</span>
          </div>
        {/if}

        <div>
          <h3 class="text-sm text-mono-500 mb-1 font-medium">Name</h3>
          <p class="text-mono-900">{selectedFieldConstraint.name}</p>
        </div>

        <div>
          <h3 class="text-sm text-mono-500 mb-1 font-medium">Description</h3>
          <p class="text-mono-900">{selectedFieldConstraint.description}</p>
        </div>

        <div>
          <h3 class="text-sm text-mono-500 mb-1 font-medium">Parameter Types</h3>
          <div class="flex flex-wrap gap-1.5 mt-1">
            {#each selectedFieldConstraint.parameterTypes as ptype}
              <span class="px-2 py-1 text-xs rounded-full bg-mono-200 text-mono-700">
                {ptype}
              </span>
            {/each}
          </div>
        </div>

        <div>
          <h3 class="text-sm text-mono-500 mb-1 font-medium">Compatible Types</h3>
          <div class="flex flex-wrap gap-1.5 mt-1">
            {#each selectedFieldConstraint.compatibleTypes as ctype}
              <span class="px-2 py-1 text-xs rounded-full bg-mono-200 text-mono-700">
                {ctype}
              </span>
            {/each}
          </div>
        </div>

        {#if selectedFieldConstraint.docsUrl}
          <div>
            <h3 class="text-sm text-mono-500 mb-1 font-medium">Documentation</h3>
            <a
              href={selectedFieldConstraint.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              class="text-sm text-mono-900 underline hover:text-mono-600 transition-colors"
            >
              View Docs <i class="fa-solid fa-arrow-up-right-from-square text-xs"></i>
            </a>
          </div>
        {/if}

        <div>
          <h3 class="text-sm text-mono-500 mb-2 font-medium">
            Used In Fields ({fieldsUsingSelected.length})
          </h3>
          {#if fieldsUsingSelected.length > 0}
            <div class="space-y-2">
              {#each fieldsUsingSelected as field}
                <button
                  type="button"
                  onclick={() => navigateToField(field.fieldId)}
                  class="w-full flex items-center justify-between p-3 bg-mono-50 rounded-md hover:bg-mono-100 cursor-pointer transition-colors group"
                >
                  <div class="flex items-center space-x-2">
                    <i class="fa-solid fa-table-list text-mono-400 group-hover:text-mono-600 transition-colors"></i>
                    <span class="text-sm text-mono-900 group-hover:text-mono-700 transition-colors">{field.name}</span>
                  </div>
                  <div class="flex items-center space-x-2">
                    <span class="text-xs text-mono-500 bg-mono-200 px-2 py-1 rounded">
                      ID: {field.fieldId}
                    </span>
                    <i class="fa-solid fa-arrow-right text-mono-400 group-hover:text-mono-600 transition-colors text-xs"></i>
                  </div>
                </button>
              {/each}
            </div>
          {:else}
            <p class="text-sm text-mono-500 italic">Not used in any fields yet</p>
          {/if}
        </div>
      </div>
    {/if}
  </DrawerContent>
</Drawer>
