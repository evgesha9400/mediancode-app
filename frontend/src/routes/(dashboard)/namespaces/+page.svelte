<script lang="ts">
  import {
    namespacesStore,
    searchNamespaces,
    getNamespaceEntityDetails
  } from '$lib/stores/namespaces';
  import { createNamespacesModel } from '$lib/stores/namespacesModel.svelte';
  import {
    PageHeader,
    SearchBar,
    FilterPanel,
    Table,
    SortableColumn,
    Drawer,
    DrawerHeader,
    DrawerContent,
    DrawerFooter,
    CrudDrawerFooter,
    Pill,
    FormField,
    FormLabel,
    TableEmptyState
  } from '$lib/components';
  import { SYSTEM_NAMESPACE_ID } from '$lib/utils/namespace';
  import type { FilterConfig, Namespace } from '$lib/types';
  import { STORE_NAMES } from '$lib/stores/loader';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';

  // Extended namespace type with computed entity counts
  type NamespaceWithCounts = Namespace & {
    entityCount: number;
    fieldCount: number;
    fieldConstraintCount: number;
    objectCount: number;
    endpointCount: number;
  };

  // Build filter config
  let namespaceFilterConfig: FilterConfig = [
    {
      type: 'toggle',
      key: 'onlyUserCreated',
      label: 'Show',
      toggleLabel: 'User-created only',
      predicate: (item: Namespace) => item.id !== SYSTEM_NAMESPACE_ID
    }
  ];

  // Per-entity CRUD model
  const workflow = createNamespacesModel({
    itemsStore: () => $namespacesStore,
    searchFn: searchNamespaces,
    filterSections: namespaceFilterConfig,
    urlScope: { page, goto },
    getNamespaceEntityDetails
  });

  // Truly derived values (read-only computations)
  let filteredNamespaces = $derived(workflow.results as NamespaceWithCounts[]);
  let sorts = $derived(workflow.sorts);
  let activeFiltersCount = $derived(workflow.activeFiltersCount);

  let isReadOnly = $derived(workflow.editedItem?.id === SYSTEM_NAMESPACE_ID);
  let isCreating = $derived(workflow.mode === 'creating');
</script>

<PageHeader title="Namespaces">
    {#snippet actions()}
      <button
        type="button"
        onclick={workflow.openCreate}
        class="px-4 py-2 bg-mono-900 text-white rounded-md flex items-center space-x-2 hover:bg-mono-800 cursor-pointer transition-colors"
      >
        <i class="fa-solid fa-plus"></i>
        <span>Add Namespace</span>
      </button>
    {/snippet}
  </PageHeader>

  <SearchBar
    bind:searchQuery={workflow.query}
    placeholder="Search namespaces..."
    resultsCount={filteredNamespaces.length}
    resultLabel="namespace"
    showFilter={true}
    active={workflow.filtersOpen || activeFiltersCount > 0}
    onFilterClick={workflow.toggleFilters}
  >
    {#snippet filterPanel()}
      <FilterPanel
        visible={workflow.filtersOpen}
        config={namespaceFilterConfig}
        bind:state={workflow.filters}
        onClose={() => workflow.filtersOpen = false}
        onClear={workflow.resetFilters}
      />
    {/snippet}
  </SearchBar>

  <Table isEmpty={filteredNamespaces.length === 0}>
    {#snippet header()}
      <tr>
        <SortableColumn
          column="name"
          label="Name"
          {sorts}
          onSort={workflow.handleSort}
        />
        <SortableColumn
          column="description"
          label="Description"
          {sorts}
          onSort={workflow.handleSort}
        />
        <SortableColumn
          column="entityCount"
          label="Entities"
          {sorts}
          onSort={workflow.handleSort}
        />
      </tr>
    {/snippet}

    {#snippet body()}
      {#each filteredNamespaces as namespace}
        <tr
          onclick={() => workflow.selectItem(namespace)}
          class="cursor-pointer transition-colors {workflow.isSelected(namespace) ? 'bg-mono-100' : 'hover:bg-mono-50'}"
        >
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="flex items-center space-x-2">
              <span class="text-sm text-mono-900 font-medium">{namespace.name}</span>
              {#if namespace.name?.toLowerCase() === 'global'}
                <i class="fa-solid fa-earth-americas text-mono-400 text-xs" title="Global"></i>
              {/if}
              {#if namespace.isDefault}
                <span class="px-1.5 py-0.5 text-xs rounded bg-mono-900 text-white">Default</span>
              {/if}
            </div>
          </td>
          <td class="px-6 py-4 text-sm text-mono-500">
            {namespace.description || '-'}
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="flex items-center space-x-2">
              <Pill>{namespace.entityCount}</Pill>
              <span class="text-sm text-mono-600">total</span>
            </div>
          </td>
        </tr>
      {/each}
    {/snippet}

    {#snippet empty()}
      <TableEmptyState
        entityName="namespaces"
        storeKey={STORE_NAMES.NAMESPACES}
        noResultsMessage="Try adjusting your search query or create a new namespace"
      />
    {/snippet}
  </Table>

<Drawer open={workflow.drawerOpen}>
  <DrawerHeader
    title={isCreating ? 'Create Namespace' : isReadOnly ? 'Namespace Details' : 'Edit Namespace'}
    onClose={workflow.closeDrawer}
  />

  <DrawerContent>
    {#if workflow.editedItem}
      <div class="space-y-4">
        {#if isReadOnly}
          <div class="flex items-center space-x-2 px-3 py-2 bg-mono-50 border border-mono-200 rounded-md">
            <i class="fa-solid fa-lock text-mono-400 text-sm"></i>
            <span class="text-sm text-mono-600">System namespace — read-only</span>
          </div>
        {/if}

        <!-- Namespace Name -->
        <FormField
          id="namespace-name"
          label="Name"
          bind:value={workflow.editedItem.name}
          disabled={isReadOnly}
          required={!isReadOnly}
          placeholder={isCreating ? 'my-namespace' : ''}
          error={workflow.visibleErrors.name}
        />

        <!-- Description -->
        <div>
          <FormLabel label="Description" forId="namespace-description" />
          <textarea
            id="namespace-description"
            bind:value={workflow.editedItem.description}
            disabled={isReadOnly}
            rows="3"
            placeholder={isCreating ? 'Optional description...' : ''}
            class="w-full px-3 py-2 border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent {isReadOnly ? 'bg-mono-100 cursor-not-allowed' : ''}"
          ></textarea>
        </div>

        <!-- Entity Counts (only when editing) -->
        {#if !isCreating}
          {@const details = getNamespaceEntityDetails(workflow.editedItem.id)}
          <div>
            <h3 class="text-sm text-mono-700 mb-2 font-medium">Contents</h3>
            <div class="bg-mono-50 rounded-md p-3 space-y-2">
              <div class="flex justify-between text-sm">
                <span class="text-mono-600">Fields</span>
                <span class="text-mono-900 font-medium">{details.fields}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-mono-600">Field Constraints</span>
                <span class="text-mono-900 font-medium">{details.fieldConstraints}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-mono-600">Objects</span>
                <span class="text-mono-900 font-medium">{details.objects}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-mono-600">Endpoints</span>
                <span class="text-mono-900 font-medium">{details.endpoints}</span>
              </div>
              <div class="flex justify-between text-sm border-t border-mono-200 pt-2 mt-2">
                <span class="text-mono-700 font-medium">Total</span>
                <span class="text-mono-900 font-bold">{details.total}</span>
              </div>
            </div>
          </div>

        {/if}
      </div>
    {/if}
  </DrawerContent>

  <DrawerFooter>
    {#if isCreating}
      <CrudDrawerFooter
        mode="creating"
        isSaving={workflow.isSaving}
        isFormValid={workflow.isFormValid}
        hasChanges={false}
        canDelete={false}
        onCreate={workflow.handleCreate}
      />
    {:else if workflow.editedItem && !isReadOnly}
      <CrudDrawerFooter
        mode="editing"
        isSaving={workflow.isSaving}
        hasChanges={workflow.hasChanges}
        canDelete={workflow.canDelete}
        deleteTooltip={workflow.deleteTooltip}
        showDeleteConfirm={workflow.showDeleteConfirm}
        isDeleting={workflow.isDeleting}
        onSave={workflow.handleSave}
        onUndo={workflow.handleUndo}
        onDeleteRequest={() => workflow.showDeleteConfirm = true}
        onDeleteConfirm={workflow.handleDelete}
        onDeleteCancel={() => workflow.showDeleteConfirm = false}
      />
    {:else if workflow.editedItem && isReadOnly}
      <button
        type="button"
        onclick={workflow.closeDrawer}
        class="w-full px-4 py-2 border border-mono-300 text-mono-700 rounded-md hover:bg-mono-50 transition-colors font-medium"
      >
        Close
      </button>
    {/if}
  </DrawerFooter>
</Drawer>
