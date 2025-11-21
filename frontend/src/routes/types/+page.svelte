<script lang="ts">
  import { typesStore, searchTypes, getTotalTypeCount, type FieldType } from '$lib/stores/types';
  import DashboardLayout from '$lib/components/DashboardLayout.svelte';
  import PageHeader from '$lib/components/layout/PageHeader.svelte';
  import SearchBar from '$lib/components/search/SearchBar.svelte';
  import Table from '$lib/components/table/Table.svelte';
  import SortableColumn from '$lib/components/table/SortableColumn.svelte';
  import EmptyState from '$lib/components/table/EmptyState.svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { parseMultiSortFromUrl, buildMultiSortUrl, handleSortClick, sortDataMultiColumn } from '$lib/utils/sorting';

  let searchQuery = '';

  // Sort state derived from URL parameters
  $: sorts = parseMultiSortFromUrl($page.url.searchParams);

  // Apply search and then sorting
  $: filteredTypes = (() => {
    const searched = searchTypes(searchQuery);
    const numericColumns = new Set(['usedInFields']);
    return sortDataMultiColumn(searched, sorts, numericColumns);
  })();

  $: totalCount = getTotalTypeCount();

  function handleSort(columnKey: string, shiftKey: boolean) {
    const newSorts = handleSortClick(columnKey, sorts, shiftKey);
    const urlParams = buildMultiSortUrl(newSorts);
    goto(`?${urlParams}`, { replaceState: false, keepFocus: true });
  }

  function getCategoryBadgeClass(category: 'primitive' | 'abstract'): string {
    return category === 'primitive'
      ? 'bg-mono-900 text-white'
      : 'bg-mono-200 text-mono-700';
  }
</script>

<DashboardLayout>
  <PageHeader title="Types" />

  <SearchBar
    bind:searchQuery
    placeholder="Search types..."
    resultsCount={filteredTypes.length}
    resultLabel="type"
    showFilter={true}
  />

  <Table isEmpty={filteredTypes.length === 0}>
    <svelte:fragment slot="header">
      <tr>
        <SortableColumn
          column="name"
          label="Type Name"
          {sorts}
          onSort={handleSort}
        />
        <SortableColumn
          column="category"
          label="Category"
          {sorts}
          onSort={handleSort}
        />
        <SortableColumn
          column="pythonType"
          label="Python Type"
          {sorts}
          onSort={handleSort}
        />
        <th scope="col" class="px-6 py-3 text-left text-xs text-mono-500 uppercase tracking-wider font-medium">
          <div class="flex items-center space-x-1">
            <span>Description</span>
          </div>
        </th>
        <SortableColumn
          column="usedInFields"
          label="Used In Fields"
          {sorts}
          onSort={handleSort}
        />
      </tr>
    </svelte:fragment>

    <svelte:fragment slot="body">
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
    </svelte:fragment>

    <svelte:fragment slot="empty">
      <EmptyState
        title="No types found"
        message="Try adjusting your search query"
      />
    </svelte:fragment>
  </Table>
</DashboardLayout>
