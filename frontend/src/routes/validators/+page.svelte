<script lang="ts">
  import { validatorsStore, searchValidators, getTotalValidatorCount, type Validator } from '$lib/stores/validators';
  import DashboardLayout from '$lib/components/DashboardLayout.svelte';
  import PageHeader from '$lib/components/layout/PageHeader.svelte';
  import SearchBar from '$lib/components/search/SearchBar.svelte';
  import Table from '$lib/components/table/Table.svelte';
  import SortableColumn from '$lib/components/table/SortableColumn.svelte';
  import EmptyState from '$lib/components/table/EmptyState.svelte';
  import Drawer from '$lib/components/drawer/Drawer.svelte';
  import DrawerHeader from '$lib/components/drawer/DrawerHeader.svelte';
  import DrawerContent from '$lib/components/drawer/DrawerContent.svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { parseMultiSortFromUrl, buildMultiSortUrl, handleSortClick, sortDataMultiColumn, type MultiSortState } from '$lib/utils/sorting';

  let searchQuery = '';
  let selectedValidator: Validator | null = null;
  let drawerOpen = false;

  // Sort state derived from URL parameters
  $: sorts = parseMultiSortFromUrl($page.url.searchParams);

  // Apply search and then sorting
  $: filteredValidators = (() => {
    const searched = searchValidators(searchQuery);
    const numericColumns = new Set(['usedInFields']);
    return sortDataMultiColumn(searched, sorts, numericColumns);
  })();

  $: totalCount = getTotalValidatorCount();

  function selectValidator(validator: Validator) {
    selectedValidator = validator;
    drawerOpen = true;
  }

  function closeDrawer() {
    drawerOpen = false;
    setTimeout(() => {
      selectedValidator = null;
    }, 300);
  }

  function isSelected(validator: Validator): boolean {
    return selectedValidator?.name === validator.name;
  }

  function handleSort(columnKey: string, shiftKey: boolean) {
    const newSorts = handleSortClick(columnKey, sorts, shiftKey);
    const urlParams = buildMultiSortUrl(newSorts);
    goto(`?${urlParams}`, { replaceState: false, keepFocus: true });
  }
</script>

<DashboardLayout>
  <PageHeader title="Validators Library">
    <svelte:fragment slot="actions">
      <button
        type="button"
        disabled
        class="px-4 py-2 bg-mono-400 text-white rounded-md flex items-center space-x-2 cursor-not-allowed opacity-60"
      >
        <i class="fa-solid fa-plus"></i>
        <span>Add Validator</span>
      </button>
    </svelte:fragment>
  </PageHeader>

  <SearchBar
    bind:searchQuery
    placeholder="Search validators..."
    resultsCount={filteredValidators.length}
    resultLabel="validator"
    showFilter={false}
  />

  <Table isEmpty={filteredValidators.length === 0}>
    <svelte:fragment slot="header">
      <tr>
        <SortableColumn
          column="name"
          label="Validator Name"
          {sorts}
          onSort={handleSort}
        />
        <SortableColumn
          column="type"
          label="Type"
          {sorts}
          onSort={handleSort}
        />
        <SortableColumn
          column="category"
          label="Category"
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
      {#each filteredValidators as validator}
        <tr
          on:click={() => selectValidator(validator)}
          class="cursor-pointer transition-colors {isSelected(validator) ? 'bg-mono-100' : 'hover:bg-mono-50'}"
        >
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="text-sm text-mono-900 font-medium">{validator.name}</div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <span class="px-2 py-1 text-xs rounded-full bg-mono-900 text-white capitalize">
              {validator.category}
            </span>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <span class="px-2 py-1 text-xs rounded-full {validator.type === 'inline' ? 'bg-mono-200 text-mono-700' : 'bg-mono-700 text-white'} capitalize">
              {validator.type}
            </span>
          </td>
          <td class="px-6 py-4 text-sm text-mono-500">
            {validator.description.split('.')[0]}.
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="flex items-center space-x-2">
              <span class="px-2 py-1 text-xs rounded-full bg-mono-200 text-mono-700">
                {validator.usedInFields}
              </span>
              <span class="text-sm text-mono-600">fields</span>
            </div>
          </td>
        </tr>
      {/each}
    </svelte:fragment>

    <svelte:fragment slot="empty">
      <EmptyState
        title="No validators found"
        message="Try adjusting your search query"
      />
    </svelte:fragment>
  </Table>
</DashboardLayout>

<Drawer open={drawerOpen}>
  <DrawerHeader title="Validator Details" onClose={closeDrawer} />

  <DrawerContent>
    {#if selectedValidator}
      <div class="space-y-6">
        <div>
          <h3 class="text-sm text-mono-500 mb-1 font-medium">Validator Name</h3>
          <p class="text-mono-900">{selectedValidator.name}</p>
        </div>

        <div>
          <h3 class="text-sm text-mono-500 mb-1 font-medium">Type</h3>
          <span class="px-2 py-1 text-xs rounded-full bg-mono-900 text-white capitalize">
            {selectedValidator.category}
          </span>
        </div>

        <div>
          <h3 class="text-sm text-mono-500 mb-1 font-medium">Category</h3>
          <span class="px-2 py-1 text-xs rounded-full {selectedValidator.type === 'inline' ? 'bg-mono-200 text-mono-700' : 'bg-mono-700 text-white'} capitalize">
            {selectedValidator.type}
          </span>
        </div>

        <div>
          <h3 class="text-sm text-mono-500 mb-1 font-medium">Description</h3>
          <p class="text-mono-900">{selectedValidator.description}</p>
        </div>

        <div>
          <h3 class="text-sm text-mono-500 mb-1 font-medium">Parameter Type</h3>
          <p class="text-mono-900">{selectedValidator.parameterType}</p>
        </div>

        <div>
          <h3 class="text-sm text-mono-500 mb-1 font-medium">Example Usage</h3>
          <div class="bg-mono-50 border border-mono-200 rounded-md p-3">
            <code class="text-sm text-mono-800 whitespace-pre-wrap font-mono">
              {selectedValidator.exampleUsage}
            </code>
          </div>
        </div>

        <div>
          <h3 class="text-sm text-mono-500 mb-1 font-medium">Pydantic Documentation</h3>
          <a
            href={selectedValidator.pydanticDocsUrl}
            target="_blank"
            rel="noopener noreferrer"
            class="text-sm text-mono-900 underline hover:text-mono-600 transition-colors"
          >
            View in Pydantic Docs <i class="fa-solid fa-arrow-up-right-from-square text-xs"></i>
          </a>
        </div>

        <div>
          <h3 class="text-sm text-mono-500 mb-2 font-medium">
            Used In Fields ({selectedValidator.usedInFields})
          </h3>
          {#if selectedValidator.fieldsUsingValidator.length > 0}
            <div class="space-y-2">
              {#each selectedValidator.fieldsUsingValidator as field}
                <div class="flex items-center justify-between p-3 bg-mono-50 rounded-md hover:bg-mono-100 cursor-pointer transition-colors">
                  <div class="flex items-center space-x-2">
                    <i class="fa-solid fa-table-list text-mono-400"></i>
                    <span class="text-sm text-mono-900">{field.name}</span>
                  </div>
                  <span class="text-xs text-mono-500 bg-mono-200 px-2 py-1 rounded">
                    ID: {field.fieldId}
                  </span>
                </div>
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
