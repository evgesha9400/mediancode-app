<script lang="ts">
  import { constraintsStore, deleteConstraint, searchConstraints, type Constraint } from '$lib/stores/constraints';
  import { showToast } from '$lib/stores/toasts';
  import { buildDeletionTooltip } from '$lib/utils/references';
  import {
    PageHeader,
    SearchBar,
    FilterPanel,
    Table,
    SortableColumn,
    EmptyState,
    Drawer,
    DrawerHeader,
    DrawerContent,
    DrawerFooter,
    Tooltip
  } from '$lib/components';
  import type { FilterConfig } from '$lib/types';
  import { storeLoadingState, reloadStores } from '$lib/stores/loader';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { createListViewState } from '$lib/stores/listViewState.svelte';

  // Filter state type
  type ConstraintFilterState = {
    selectedCompatibleTypes: string[];
    onlyUsedInFields: boolean;
  };

  // Build filter config from constraints (reactive to store changes)
  let filterConfig = $derived.by((): FilterConfig => {
    const constraints = $constraintsStore;
    const uniqueTypes = Array.from(
      new Set(constraints.flatMap(c => c.compatibleTypes))
    ).sort();

    return [
      {
        type: 'checkbox-group',
        key: 'selectedCompatibleTypes',
        label: 'Applies To',
        options: uniqueTypes.map(t => ({ label: t, value: t })),
        predicate: (item: Constraint, selected: string[]) =>
          item.compatibleTypes.some(ct => selected.includes(ct))
      },
      {
        type: 'toggle',
        key: 'onlyUsedInFields',
        label: 'Usage',
        toggleLabel: 'Used in fields only',
        predicate: (item: Constraint) => item.usedInFields > 0
      }
    ];
  });

  // Create list view state (owns all reactive state)
  // Constraints are global reference data -- no namespace filtering
  const state = createListViewState<Constraint, ConstraintFilterState>({
    itemsStore: () => $constraintsStore,
    searchFn: searchConstraints,
    filterSections: () => filterConfig,
    numericColumns: new Set(['usedInFields']),
    urlScope: { page, goto },
    getItemId: (constraint) => constraint.name,
    drawerConfig: {
      trackEdits: false,
      allowDelete: true,
      closeDelay: 300
    }
  });

  // Convenience aliases for template bindings
  let selectedConstraint = $derived(state.selectedItem);
  let showDeleteConfirm = $derived(state.showDeleteConfirm);
  let filteredConstraints = $derived(state.results);
  let sorts = $derived(state.sorts);
  let activeFiltersCount = $derived(state.activeFiltersCount);

  function isSelected(constraint: Constraint): boolean {
    return selectedConstraint?.name === constraint.name;
  }

  function handleDelete() {
    if (!selectedConstraint) return;

    const constraintName = selectedConstraint.name;
    const result = deleteConstraint(selectedConstraint.name);
    if (result.success) {
      state.closeDrawer();
      showToast(`Constraint "${constraintName}" deleted successfully`, 'success', 3000);
    } else {
      showToast(result.error || 'Failed to delete constraint', 'error', 5000);
    }
  }

  function navigateToField(fieldId: string) {
    goto(`/field-registry?highlight=${fieldId}`);
  }

  let hasReferences = $derived(selectedConstraint ? selectedConstraint.fieldsUsingConstraint.length > 0 : false);
  let deleteTooltip = $derived(selectedConstraint && hasReferences
    ? buildDeletionTooltip('constraint', 'field', selectedConstraint!.fieldsUsingConstraint)
    : '');
  let hasLoadError = $derived($storeLoadingState.storeErrors.includes('Constraints'));
</script>

<PageHeader title="Constraints" />

<SearchBar
  bind:searchQuery={state.query}
  placeholder="Search constraints..."
  resultsCount={filteredConstraints.length}
  resultLabel="constraint"
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

<Table isEmpty={filteredConstraints.length === 0}>
  {#snippet header()}
    <tr>
      <SortableColumn
        column="name"
        label="Name"
        {sorts}
        onSort={state.handleSort}
      />
      <th scope="col" class="px-6 py-3 text-left text-xs text-mono-500 tracking-wider font-medium">
        <div class="flex items-center space-x-1">
          <span>Description</span>
        </div>
      </th>
      <SortableColumn
        column="parameterType"
        label="Parameter Type"
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
    {#each filteredConstraints as constraint}
      <tr
        onclick={() => state.selectItem(constraint)}
        class="cursor-pointer transition-colors {isSelected(constraint) ? 'bg-mono-100' : 'hover:bg-mono-50'}"
      >
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="text-sm text-mono-900 font-medium">{constraint.name}</div>
        </td>
        <td class="px-6 py-4 text-sm text-mono-500 max-w-xs truncate">
          {constraint.description.split('.')[0]}.
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <code class="px-2 py-1 text-xs rounded bg-mono-100 text-mono-800 font-mono">
            {constraint.parameterType}
          </code>
        </td>
        <td class="px-6 py-4">
          <div class="flex flex-wrap gap-1">
            {#each constraint.compatibleTypes as ctype}
              <span class="px-2 py-0.5 text-xs rounded-full bg-mono-200 text-mono-700">
                {ctype}
              </span>
            {/each}
          </div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm">
          {#if constraint.docsUrl}
            <a
              href={constraint.docsUrl}
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
              {constraint.usedInFields}
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
        title="Failed to load constraints"
        message="Something went wrong while fetching constraint data"
        actionLabel="Retry"
        onAction={reloadStores}
      />
    {:else}
      <EmptyState
        title="No constraints found"
        message="Try adjusting your search query"
      />
    {/if}
  {/snippet}
</Table>

<Drawer open={state.drawerOpen}>
  <DrawerHeader title="Constraint Details" onClose={state.closeDrawer} />

  <DrawerContent>
    {#if selectedConstraint}
      <div class="space-y-6">
        <div>
          <h3 class="text-sm text-mono-500 mb-1 font-medium">Name</h3>
          <p class="text-mono-900">{selectedConstraint.name}</p>
        </div>

        <div>
          <h3 class="text-sm text-mono-500 mb-1 font-medium">Description</h3>
          <p class="text-mono-900">{selectedConstraint.description}</p>
        </div>

        <div>
          <h3 class="text-sm text-mono-500 mb-1 font-medium">Parameter Type</h3>
          <code class="px-2 py-1 text-xs rounded bg-mono-100 text-mono-800 font-mono">
            {selectedConstraint.parameterType}
          </code>
        </div>

        <div>
          <h3 class="text-sm text-mono-500 mb-1 font-medium">Compatible Types</h3>
          <div class="flex flex-wrap gap-1.5 mt-1">
            {#each selectedConstraint.compatibleTypes as ctype}
              <span class="px-2 py-1 text-xs rounded-full bg-mono-200 text-mono-700">
                {ctype}
              </span>
            {/each}
          </div>
        </div>

        {#if selectedConstraint.docsUrl}
          <div>
            <h3 class="text-sm text-mono-500 mb-1 font-medium">Documentation</h3>
            <a
              href={selectedConstraint.docsUrl}
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
            Used In Fields ({selectedConstraint.usedInFields})
          </h3>
          {#if selectedConstraint.fieldsUsingConstraint.length > 0}
            <div class="space-y-2">
              {#each selectedConstraint.fieldsUsingConstraint as field}
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

  {#if selectedConstraint}
    <DrawerFooter>
      {#if !showDeleteConfirm}
        <Tooltip text={deleteTooltip} position="top">
          <button
            type="button"
            onclick={() => state.showDeleteConfirm = true}
            disabled={hasReferences}
            class="w-full px-4 py-2 rounded-md flex items-center justify-center transition-colors font-medium {hasReferences ? 'bg-mono-200 text-mono-400 cursor-not-allowed' : 'bg-mono-100 text-red-700 hover:bg-red-50 cursor-pointer'}"
          >
            <i class="fa-solid fa-xmark mr-2"></i>
            <span>Delete Constraint</span>
          </button>
        </Tooltip>
      {:else}
        <div class="bg-red-50 border border-red-200 rounded-md p-3">
          <p class="text-sm text-red-800 mb-2">Are you sure you want to delete this constraint?</p>
          <div class="flex space-x-2">
            <button
              type="button"
              onclick={handleDelete}
              class="flex-1 px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium"
            >
              Yes, Delete
            </button>
            <button
              type="button"
              onclick={() => state.showDeleteConfirm = false}
              class="flex-1 px-3 py-1.5 border border-mono-300 text-mono-700 rounded-md hover:bg-mono-50 text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      {/if}
    </DrawerFooter>
  {/if}
</Drawer>
