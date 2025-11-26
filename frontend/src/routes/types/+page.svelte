<script lang="ts">
  import { typesStore, searchTypes, type FieldType } from '$lib/stores/types';
  import {
    DashboardLayout,
    PageHeader,
    SearchBar,
    FilterPanel,
    Table,
    SortableColumn,
    EmptyState
  } from '$lib/components';
  import type { FilterConfig } from '$lib/types';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { createListViewState } from '$lib/stores/listViewState.svelte';

  // Filter state type
  type TypeFilterState = {
    selectedCategories: string[];
    selectedValidatorCategories: string[];
    onlyUsedInFields: boolean;
  };

  let filterConfig: FilterConfig = [
    {
      type: 'checkbox-group',
      key: 'selectedCategories',
      label: 'Category',
      options: [
        { label: 'Primitive', value: 'primitive' },
        { label: 'Abstract', value: 'abstract' }
      ],
      predicate: (item: FieldType, selected: string[]) => selected.includes(item.category)
    },
    {
      type: 'checkbox-group',
      key: 'selectedValidatorCategories',
      label: 'Validator Categories',
      options: [
        { label: 'String', value: 'string' },
        { label: 'Numeric', value: 'numeric' },
        { label: 'Collection', value: 'collection' }
      ],
      predicate: (item: FieldType, selected: string[]) =>
        item.validatorCategories.some(cat => selected.includes(cat))
    },
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
    itemsStore: () => $typesStore, // Use reactive store subscription
    searchFn: searchTypes,
    filterSections: filterConfig,
    numericColumns: new Set(['usedInFields']),
    urlScope: { page, goto },
    getItemId: (type) => type.name
  });

  // Convenience aliases for template bindings
  let filteredTypes = $derived(state.results);
  let sorts = $derived(state.sorts);
  let activeFiltersCount = $derived(state.activeFiltersCount);

  function getCategoryBadgeClass(category: 'primitive' | 'abstract'): string {
    return category === 'primitive'
      ? 'bg-mono-900 text-white'
      : 'bg-mono-200 text-mono-700';
  }
</script>

<DashboardLayout>
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
          label="Type Name"
          {sorts}
          onSort={state.handleSort}
        />
        <SortableColumn
          column="category"
          label="Category"
          {sorts}
          onSort={state.handleSort}
        />
        <SortableColumn
          column="pythonType"
          label="Type"
          {sorts}
          onSort={state.handleSort}
        />
        <th scope="col" class="px-6 py-3 text-left text-xs text-mono-500 tracking-wider font-medium">
          <div class="flex items-center space-x-1">
            <span>Description</span>
          </div>
        </th>
        <SortableColumn
          column="usedInFields"
          label="Used In Fields"
          {sorts}
          onSort={state.handleSort}
        />
      </tr>
    {/snippet}

    {#snippet body()}
      {#each filteredTypes as type}
        <tr class="hover:bg-mono-50 transition-colors">
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="text-sm text-mono-900 font-medium font-mono">{type.name}</div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <span class="px-2 py-1 text-xs rounded-full capitalize {getCategoryBadgeClass(type.category)}">
              {type.category}
            </span>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <code class="text-sm text-mono-700 bg-mono-50 px-2 py-1 rounded font-mono">
              {type.pythonType}
            </code>
          </td>
          <td class="px-6 py-4 text-sm text-mono-500">
            {type.description}
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="flex items-center space-x-2">
              <span class="px-2 py-1 text-xs rounded-full bg-mono-200 text-mono-700">
                {type.usedInFields}
              </span>
              <span class="text-sm text-mono-600">fields</span>
            </div>
          </td>
        </tr>
      {/each}
    {/snippet}

    {#snippet empty()}
      <EmptyState
        title="No types found"
        message="Try adjusting your search query"
      />
    {/snippet}
  </Table>
</DashboardLayout>
