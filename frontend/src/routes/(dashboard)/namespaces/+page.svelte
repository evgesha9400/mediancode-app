<script lang="ts">
  import {
    namespacesStore,
    searchNamespaces,
    getNamespaceEntityDetails
  } from '$lib/stores/namespaces';
  import { createNamespaceAction } from '$lib/domain/mutations';
  import { showToast } from '$lib/stores/toasts';
  import { createNamespacesModel } from '$lib/stores/namespacesModel.svelte';
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
    CrudDrawerFooter
  } from '$lib/components';
  import type { FilterConfig, Namespace } from '$lib/types';
  import { storeLoadingState, reloadStores, STORE_NAMES } from '$lib/stores/loader';
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
      predicate: (item: Namespace) => !item.locked
    }
  ];

  // Per-entity CRUD model (replaces listViewState + crudWorkflow + entityContract)
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

  // Modal state for creating new namespace (NOT handled by workflow)
  let showCreateModal = $state(false);
  let newNamespaceName = $state('');
  let newNamespaceDescription = $state('');
  let createErrors = $state<Record<string, string>>({});
  let isCreating = $state(false);

  function openCreateModal() {
    newNamespaceName = '';
    newNamespaceDescription = '';
    createErrors = {};
    showCreateModal = true;
  }

  function closeCreateModal() {
    showCreateModal = false;
  }

  async function handleCreate() {
    createErrors = {};

    if (!newNamespaceName.trim()) {
      createErrors.name = 'Namespace name is required';
      return;
    }

    if (isCreating) return;
    isCreating = true;

    const result = await createNamespaceAction({
      name: newNamespaceName.trim(),
      description: newNamespaceDescription.trim() || undefined
    });

    isCreating = false;

    if (!result.success) {
      if (result.error?.includes('already exists')) {
        createErrors.name = 'A namespace with this name already exists';
      } else {
        showToast(result.error || 'Failed to create namespace', 'error', 5000);
      }
      return;
    }

    showToast(`Namespace "${result.data!.name}" created successfully`, 'success', 3000);
    closeCreateModal();
  }

  let hasLoadError = $derived($storeLoadingState.storeErrors.includes(STORE_NAMES.NAMESPACES));
  let isLocked = $derived(workflow.editedItem?.locked ?? false);
</script>

<PageHeader title="Namespaces">
    {#snippet actions()}
      <button
        type="button"
        onclick={openCreateModal}
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
        <th scope="col" class="px-6 py-3 text-left text-xs text-mono-500 tracking-wider font-medium">
          Description
        </th>
        <th scope="col" class="px-6 py-3 text-left text-xs text-mono-500 tracking-wider font-medium">
          Status
        </th>
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
              {:else if namespace.locked}
                <i class="fa-solid fa-lock text-mono-400 text-xs" title="Locked"></i>
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
            {#if namespace.locked}
              <span class="px-2 py-1 text-xs rounded-full bg-mono-200 text-mono-600">
                Locked
              </span>
            {:else}
              <span class="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">
                Editable
              </span>
            {/if}
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="flex items-center space-x-2">
              <span class="px-2 py-1 text-xs rounded-full bg-mono-200 text-mono-700">
                {namespace.entityCount}
              </span>
              <span class="text-sm text-mono-600">total</span>
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
          title="Failed to load namespaces"
          message="Something went wrong while fetching namespace data"
          actionLabel="Retry"
          onAction={reloadStores}
        />
      {:else}
        <EmptyState
          title="No namespaces found"
          message="Try adjusting your search query or create a new namespace"
        />
      {/if}
    {/snippet}
  </Table>

<Drawer open={workflow.drawerOpen}>
  <DrawerHeader title={isLocked ? 'View Namespace' : 'Edit Namespace'} onClose={workflow.closeDrawer} />

  <DrawerContent>
    {#if workflow.editedItem}
      <div class="space-y-4">
        <!-- Namespace Name -->
        <div>
          <label for="namespace-name" class="block text-sm text-mono-700 mb-1 font-medium">
            Name {#if !isLocked}<span class="text-red-500">*</span>{/if}
          </label>
          <input
            id="namespace-name"
            type="text"
            bind:value={workflow.editedItem.name}
            disabled={isLocked}
            class="w-full px-3 py-2 border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent {workflow.visibleErrors.name ? 'border-red-500' : ''} {isLocked ? 'bg-mono-100 cursor-not-allowed' : ''}"
          />
          {#if workflow.visibleErrors.name}
            <p class="text-xs text-red-500 mt-1">{workflow.visibleErrors.name}</p>
          {/if}
        </div>

        <!-- Description -->
        <div>
          <label for="namespace-description" class="block text-sm text-mono-700 mb-1 font-medium">Description</label>
          <textarea
            id="namespace-description"
            bind:value={workflow.editedItem.description}
            disabled={isLocked}
            rows="3"
            class="w-full px-3 py-2 border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent {isLocked ? 'bg-mono-100 cursor-not-allowed' : ''}"
          ></textarea>
        </div>

        <!-- Entity Counts -->
        {#if workflow.editedItem}
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

        <!-- Status -->
        <div>
          <h3 class="text-sm text-mono-700 mb-2 font-medium">Status</h3>
          <div class="bg-mono-50 rounded-md p-3 space-y-2">
            {#if isLocked}
              <div class="flex items-center space-x-2 text-mono-600">
                <i class="fa-solid fa-lock"></i>
                <span class="text-sm">This namespace is locked and cannot be edited or deleted.</span>
              </div>
            {:else}
              <div class="flex items-center space-x-2 text-green-600">
                <i class="fa-solid fa-unlock"></i>
                <span class="text-sm">This namespace can be edited and deleted.</span>
              </div>
            {/if}
            {#if workflow.editedItem.isDefault}
              <div class="flex items-center space-x-2 text-mono-700">
                <i class="fa-solid fa-star"></i>
                <span class="text-sm">This is your default namespace.</span>
              </div>
            {/if}
          </div>
        </div>
      </div>
    {/if}
  </DrawerContent>

  <DrawerFooter>
    {#if workflow.editedItem && !isLocked}
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
    {:else if workflow.editedItem && isLocked}
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

<!-- Create Namespace Modal -->
{#if showCreateModal}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
      <div class="flex items-center justify-between p-4 border-b border-mono-200">
        <h2 class="text-lg font-semibold text-mono-900">Create Namespace</h2>
        <button
          type="button"
          onclick={closeCreateModal}
          class="text-mono-400 hover:text-mono-600 transition-colors"
          title="Close modal"
        >
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <div class="p-4 space-y-4">
        <div>
          <label for="new-namespace-name" class="block text-sm text-mono-700 mb-1 font-medium">
            Name <span class="text-red-500">*</span>
          </label>
          <input
            id="new-namespace-name"
            type="text"
            bind:value={newNamespaceName}
            class="w-full px-3 py-2 border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent {createErrors.name ? 'border-red-500' : ''}"
            placeholder="my-namespace"
          />
          {#if createErrors.name}
            <p class="text-xs text-red-500 mt-1">{createErrors.name}</p>
          {/if}
        </div>
        <div>
          <label for="new-namespace-description" class="block text-sm text-mono-700 mb-1 font-medium">
            Description
          </label>
          <textarea
            id="new-namespace-description"
            bind:value={newNamespaceDescription}
            rows="3"
            class="w-full px-3 py-2 border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent"
            placeholder="Optional description..."
          ></textarea>
        </div>
      </div>
      <div class="p-4 border-t border-mono-200">
        <button
          type="button"
          onclick={handleCreate}
          disabled={isCreating}
          class="w-full px-4 py-2 bg-mono-900 text-white rounded-md hover:bg-mono-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {#if isCreating}
            <i class="fa-solid fa-spinner fa-spin mr-2"></i>
            Creating...
          {:else}
            Create
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}
