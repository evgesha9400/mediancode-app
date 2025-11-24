<script lang="ts">
  import { validatorsStore, deleteValidator, searchValidators, type Validator } from '$lib/stores/validators';
  import { showToast } from '$lib/stores/toasts';
  import { buildDeletionTooltip } from '$lib/utils/references';
  import DashboardLayout from '$lib/components/DashboardLayout.svelte';
  import PageHeader from '$lib/components/layout/PageHeader.svelte';
  import SearchBar from '$lib/components/search/SearchBar.svelte';
  import Table from '$lib/components/table/Table.svelte';
  import SortableColumn from '$lib/components/table/SortableColumn.svelte';
  import EmptyState from '$lib/components/table/EmptyState.svelte';
  import Drawer from '$lib/components/drawer/Drawer.svelte';
  import DrawerHeader from '$lib/components/drawer/DrawerHeader.svelte';
  import DrawerContent from '$lib/components/drawer/DrawerContent.svelte';
  import DrawerFooter from '$lib/components/drawer/DrawerFooter.svelte';
  import Tooltip from '$lib/components/tooltip/Tooltip.svelte';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import FilterPanel from '$lib/components/search/FilterPanel.svelte';
  import type { FilterConfig } from '$lib/types';
  import { parseMultiSortFromUrl, buildMultiSortUrl, handleSortClick, sortDataMultiColumn } from '$lib/utils/sorting';

  let searchQuery = $state('');
  let selectedValidator = $state<Validator | null>(null);
  let drawerOpen = $state(false);
  let filtersOpen = $state(false);
  let showDeleteConfirm = $state(false);
  let filters = $state({
    selectedCategories: [] as string[],
    selectedTypes: [] as string[],
    onlyUsedInFields: false
  });

  let uniqueCategories = $derived(Array.from(new Set($validatorsStore.map(v => v.category))).sort());

  let filterConfig = $derived([
    {
      type: 'checkbox-group',
      key: 'selectedTypes',
      label: 'Type',
      options: [
        { label: 'Inline', value: 'inline' },
        { label: 'Custom', value: 'custom' }
      ]
    },
    {
      type: 'checkbox-group',
      key: 'selectedCategories',
      label: 'Category',
      options: uniqueCategories.map(c => ({ label: c.charAt(0).toUpperCase() + c.slice(1), value: c }))
    },
    {
      type: 'toggle',
      key: 'onlyUsedInFields',
      label: 'Usage',
      toggleLabel: 'Used in fields only'
    }
  ] as FilterConfig);

  // Sort state derived from URL parameters
  let sorts = $derived(parseMultiSortFromUrl(new URLSearchParams(page.url.search)));

  // Apply filtering and sorting
  let filteredValidators = $derived.by(() => {
    // Use centralized search helper with reactive store data
    let result = searchValidators($validatorsStore, searchQuery);

    // Apply advanced filters
    if (filters.selectedCategories.length > 0) {
      result = result.filter(v => filters.selectedCategories.includes(v.category));
    }

    if (filters.selectedTypes.length > 0) {
      result = result.filter(v => filters.selectedTypes.includes(v.type));
    }

    if (filters.onlyUsedInFields) {
      result = result.filter(v => v.usedInFields > 0);
    }

    // Determine numeric columns for proper sorting
    const numericColumns = new Set(['usedInFields']);
    return sortDataMultiColumn(result, sorts, numericColumns);
  });

  function selectValidator(validator: Validator) {
    selectedValidator = validator;
    drawerOpen = true;
  }

  function closeDrawer() {
    drawerOpen = false;
    setTimeout(() => {
      selectedValidator = null;
      showDeleteConfirm = false;
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

  function toggleFilters() {
    filtersOpen = !filtersOpen;
  }

  let activeFiltersCount = $derived((filters.selectedCategories.length > 0 ? 1 : 0) +
                          (filters.selectedTypes.length > 0 ? 1 : 0) +
                          (filters.onlyUsedInFields ? 1 : 0));

  function handleDelete() {
    if (!selectedValidator) return;

    const validatorName = selectedValidator.name;
    const result = deleteValidator(selectedValidator.name);
    if (result.success) {
      closeDrawer();
      showToast(`Validator "${validatorName}" deleted successfully`, 'success', 3000);
    } else {
      // Surface error to user via toast notification
      showToast(result.error || 'Failed to delete validator', 'error', 5000);
    }
  }

  function navigateToField(fieldId: string) {
    goto(`/field-registry?highlight=${fieldId}`);
  }

  let isCustomValidator = $derived(selectedValidator?.type === 'custom');
  let hasReferences = $derived(selectedValidator ? selectedValidator.fieldsUsingValidator.length > 0 : false);
  let deleteTooltip = $derived(selectedValidator && hasReferences
    ? buildDeletionTooltip('validator', 'field', selectedValidator!.fieldsUsingValidator)
    : '');
</script>

<DashboardLayout>
  <PageHeader title="Validators Library">
    {#snippet actions()}
      <button
        type="button"
        disabled
        class="px-4 py-2 bg-mono-400 text-white rounded-md flex items-center space-x-2 cursor-not-allowed opacity-60"
      >
        <i class="fa-solid fa-plus"></i>
        <span>Add Validator</span>
      </button>
    {/snippet}
  </PageHeader>

  <SearchBar
    bind:searchQuery
    placeholder="Search validators..."
    resultsCount={filteredValidators.length}
    resultLabel="validator"
    showFilter={true}
    active={filtersOpen || activeFiltersCount > 0}
    onFilterClick={toggleFilters}
  >
    {#snippet filterPanel()}
      <FilterPanel
        visible={filtersOpen}
        config={filterConfig}
        bind:state={filters}
        onClose={() => filtersOpen = false}
        onClear={() => filtersOpen = false}
      />
    {/snippet}
  </SearchBar>

  <Table isEmpty={filteredValidators.length === 0}>
    {#snippet header()}
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
    {/snippet}

    {#snippet body()}
      {#each filteredValidators as validator}
        <tr
          onclick={() => selectValidator(validator)}
          class="cursor-pointer transition-colors {isSelected(validator) ? 'bg-mono-100' : 'hover:bg-mono-50'}"
        >
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="text-sm text-mono-900 font-medium">{validator.name}</div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <span class="px-2 py-1 text-xs rounded-full {validator.type === 'inline' ? 'bg-mono-200 text-mono-700' : 'bg-mono-700 text-white'} capitalize">
              {validator.type}
            </span>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <span class="px-2 py-1 text-xs rounded-full bg-mono-900 text-white capitalize">
              {validator.category}
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
    {/snippet}

    {#snippet empty()}
      <EmptyState
        title="No validators found"
        message="Try adjusting your search query"
      />
    {/snippet}
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
          <span class="px-2 py-1 text-xs rounded-full {selectedValidator.type === 'inline' ? 'bg-mono-200 text-mono-700' : 'bg-mono-700 text-white'} capitalize">
            {selectedValidator.type}
          </span>
        </div>

        <div>
          <h3 class="text-sm text-mono-500 mb-1 font-medium">Category</h3>
          <span class="px-2 py-1 text-xs rounded-full bg-mono-900 text-white capitalize">
            {selectedValidator.category}
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

  {#if selectedValidator && isCustomValidator}
    <DrawerFooter>
      {#if !showDeleteConfirm}
        <Tooltip text={deleteTooltip} position="top">
          <button
            type="button"
            onclick={() => showDeleteConfirm = true}
            disabled={hasReferences}
            class="w-full px-4 py-2 rounded-md flex items-center justify-center transition-colors font-medium {hasReferences ? 'bg-mono-200 text-mono-400 cursor-not-allowed' : 'bg-mono-100 text-mono-600 hover:bg-mono-200 cursor-pointer'}"
          >
            <i class="fa-solid fa-trash mr-2"></i>
            <span>Delete Validator</span>
          </button>
        </Tooltip>
      {:else}
        <div class="bg-red-50 border border-red-200 rounded-md p-3">
          <p class="text-sm text-red-800 mb-2">Are you sure you want to delete this custom validator?</p>
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
              onclick={() => showDeleteConfirm = false}
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
