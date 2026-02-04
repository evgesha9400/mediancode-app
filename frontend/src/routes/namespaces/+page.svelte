<script lang="ts">
  import {
    namespacesStore,
    createNamespace,
    updateNamespace,
    deleteNamespace,
    searchNamespaces,
    getNamespaceEntityDetails,
    GLOBAL_NAMESPACE_ID
  } from '$lib/stores/namespaces';
  import { showToast } from '$lib/stores/toasts';
  import {
    DashboardLayout,
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
  import type { FilterConfig, Namespace } from '$lib/types';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { createListViewState } from '$lib/stores/listViewState.svelte';

  // Extended namespace type with computed entity counts
  type NamespaceWithCounts = Namespace & {
    entityCount: number;
    fieldCount: number;
    validatorCount: number;
    objectCount: number;
    endpointCount: number;
  };

  // Filter state type
  type NamespaceFilterState = {
    onlyUserCreated: boolean;
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

  // Modal state for creating new namespace
  let showCreateModal = $state(false);
  let newNamespaceName = $state('');
  let newNamespaceDescription = $state('');
  let createErrors = $state<Record<string, string>>({});

  // Create list view state (owns all reactive state)
  const listState = createListViewState<Namespace, NamespaceFilterState>({
    itemsStore: () => $namespacesStore,
    searchFn: searchNamespaces,
    filterSections: namespaceFilterConfig,
    numericColumns: new Set(['entityCount']),
    urlScope: { page, goto },
    getItemId: (namespace) => namespace.id,
    deriveExtra: (namespace) => {
      const details = getNamespaceEntityDetails(namespace.id);
      return {
        entityCount: details.total,
        fieldCount: details.fields,
        validatorCount: details.validators,
        objectCount: details.objects,
        endpointCount: details.endpoints
      };
    },
    sortColumnMap: {},
    drawerConfig: {
      trackEdits: true,
      allowDelete: true,
      closeDelay: 300
    }
  });

  // Convenience aliases for template bindings
  let selectedNamespace = $derived(listState.selectedItem);
  let editedNamespace = $derived(listState.editedItem);
  let originalNamespace = $derived(listState.originalItem);
  let validationErrors = $derived(listState.validationErrors);
  let showDeleteConfirm = $derived(listState.showDeleteConfirm);
  let filteredNamespaces = $derived(listState.results as NamespaceWithCounts[]);
  let sorts = $derived(listState.sorts);
  let activeFiltersCount = $derived(listState.activeFiltersCount);
  let hasChanges = $derived(listState.hasChanges);

  function selectNamespace(namespace: Namespace) {
    listState.selectItem(namespace);
  }

  function closeDrawer() {
    listState.closeDrawer();
  }

  function isSelected(namespace: Namespace): boolean {
    return selectedNamespace?.id === namespace.id;
  }

  function validateForm(): boolean {
    const errors: Record<string, string> = {};
    let isValid = true;

    if (!editedNamespace) return false;

    if (!editedNamespace.name.trim()) {
      errors.name = 'Namespace name is required';
      isValid = false;
    }

    listState.validationErrors = errors;
    return isValid;
  }

  function handleSave() {
    if (!editedNamespace || !validateForm()) return;

    // Can't edit locked namespaces
    if (editedNamespace.locked) {
      showToast('Cannot edit locked namespaces', 'error', 3000);
      return;
    }

    const namespaceName = editedNamespace.name;
    updateNamespace(editedNamespace.id, editedNamespace);
    listState.selectedItem = editedNamespace;
    listState.originalItem = JSON.parse(JSON.stringify(editedNamespace));
    showToast(`Namespace "${namespaceName}" updated successfully`, 'success', 3000);
    closeDrawer();
  }

  function handleUndo() {
    if (originalNamespace) {
      listState.editedItem = JSON.parse(JSON.stringify(originalNamespace));
      listState.validationErrors = {};
    }
  }

  function handleDelete() {
    if (!editedNamespace) return;

    const namespaceName = editedNamespace.name;
    const result = deleteNamespace(editedNamespace.id);
    if (result.success) {
      closeDrawer();
      showToast(`Namespace "${namespaceName}" deleted successfully`, 'success', 3000);
    } else {
      showToast(result.error || 'Failed to delete namespace', 'error', 5000);
    }
  }

  function openCreateModal() {
    newNamespaceName = '';
    newNamespaceDescription = '';
    createErrors = {};
    showCreateModal = true;
  }

  function closeCreateModal() {
    showCreateModal = false;
  }

  function handleCreate() {
    createErrors = {};

    if (!newNamespaceName.trim()) {
      createErrors.name = 'Namespace name is required';
      return;
    }

    const newNamespace = createNamespace(newNamespaceName.trim(), newNamespaceDescription.trim());

    if (!newNamespace) {
      createErrors.name = 'A namespace with this name already exists';
      return;
    }

    showToast(`Namespace "${newNamespaceName}" created successfully`, 'success', 3000);
    closeCreateModal();
  }

  let isLocked = $derived(editedNamespace?.locked ?? false);
  let hasEntities = $derived(() => {
    if (!editedNamespace) return false;
    return getNamespaceEntityDetails(editedNamespace.id).total > 0;
  });
  let deleteTooltip = $derived(() => {
    if (!editedNamespace) return '';
    if (editedNamespace.locked) return 'Cannot delete locked namespaces';
    const details = getNamespaceEntityDetails(editedNamespace.id);
    if (details.total > 0) {
      return `Cannot delete: Contains ${details.total} entities`;
    }
    return '';
  });
</script>

<DashboardLayout>
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
    bind:searchQuery={listState.query}
    placeholder="Search namespaces..."
    resultsCount={filteredNamespaces.length}
    resultLabel="namespace"
    showFilter={true}
    active={listState.filtersOpen || activeFiltersCount > 0}
    onFilterClick={listState.toggleFilters}
  >
    {#snippet filterPanel()}
      <FilterPanel
        visible={listState.filtersOpen}
        config={namespaceFilterConfig}
        bind:state={listState.filters}
        onClose={() => listState.filtersOpen = false}
        onClear={listState.resetFilters}
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
          onSort={listState.handleSort}
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
          onSort={listState.handleSort}
        />
      </tr>
    {/snippet}

    {#snippet body()}
      {#each filteredNamespaces as namespace}
        <tr
          onclick={() => selectNamespace(namespace)}
          class="cursor-pointer transition-colors {isSelected(namespace) ? 'bg-mono-100' : 'hover:bg-mono-50'}"
        >
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="flex items-center space-x-2">
              <span class="text-sm text-mono-900 font-medium">{namespace.name}</span>
              {#if namespace.locked}
                <i class="fa-solid fa-lock text-mono-400 text-xs" title="Locked"></i>
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
      <EmptyState
        title="No namespaces found"
        message="Try adjusting your search query or create a new namespace"
      />
    {/snippet}
  </Table>
</DashboardLayout>

<Drawer open={listState.drawerOpen}>
  <DrawerHeader title={isLocked ? 'View Namespace' : 'Edit Namespace'} onClose={closeDrawer} />

  <DrawerContent>
    {#if editedNamespace}
      <div class="space-y-4">
        <!-- Namespace Name -->
        <div>
          <label for="namespace-name" class="block text-sm text-mono-700 mb-1 font-medium">
            Name {#if !isLocked}<span class="text-red-500">*</span>{/if}
          </label>
          <input
            id="namespace-name"
            type="text"
            bind:value={editedNamespace.name}
            disabled={isLocked}
            class="w-full px-3 py-2 border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent {validationErrors.name ? 'border-red-500' : ''} {isLocked ? 'bg-mono-100 cursor-not-allowed' : ''}"
          />
          {#if validationErrors.name}
            <p class="text-xs text-red-500 mt-1">{validationErrors.name}</p>
          {/if}
        </div>

        <!-- Description -->
        <div>
          <label for="namespace-description" class="block text-sm text-mono-700 mb-1 font-medium">Description</label>
          <textarea
            id="namespace-description"
            bind:value={editedNamespace.description}
            disabled={isLocked}
            rows="3"
            class="w-full px-3 py-2 border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent {isLocked ? 'bg-mono-100 cursor-not-allowed' : ''}"
          ></textarea>
        </div>

        <!-- Entity Counts -->
        <div>
          <h3 class="text-sm text-mono-700 mb-2 font-medium">Contents</h3>
          {#if editedNamespace}
            {@const details = getNamespaceEntityDetails(editedNamespace.id)}
            <div class="bg-mono-50 rounded-md p-3 space-y-2">
              <div class="flex justify-between text-sm">
                <span class="text-mono-600">Fields</span>
                <span class="text-mono-900 font-medium">{details.fields}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-mono-600">Validators</span>
                <span class="text-mono-900 font-medium">{details.validators}</span>
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
          {/if}
        </div>

        <!-- Status -->
        <div>
          <h3 class="text-sm text-mono-700 mb-2 font-medium">Status</h3>
          <div class="bg-mono-50 rounded-md p-3">
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
          </div>
        </div>
      </div>
    {/if}
  </DrawerContent>

  <DrawerFooter>
    {#if editedNamespace && !isLocked}
      <button
        type="button"
        onclick={handleSave}
        disabled={!hasChanges}
        class="w-full px-4 py-2 rounded-md transition-colors font-medium {hasChanges ? 'bg-mono-900 text-white hover:bg-mono-800 cursor-pointer' : 'bg-mono-300 text-mono-500 cursor-not-allowed'}"
      >
        Save Changes
      </button>
      <button
        type="button"
        onclick={handleUndo}
        disabled={!hasChanges}
        class="w-full px-4 py-2 border rounded-md transition-colors font-medium {hasChanges ? 'border-mono-300 text-mono-700 hover:bg-mono-50 cursor-pointer' : 'border-mono-200 text-mono-400 cursor-not-allowed bg-mono-50'}"
      >
        Undo
      </button>
      {#if !showDeleteConfirm}
        <Tooltip text={deleteTooltip()} position="top">
          <button
            type="button"
            onclick={() => listState.showDeleteConfirm = true}
            disabled={hasEntities()}
            class="w-full px-4 py-2 rounded-md flex items-center justify-center transition-colors font-medium {hasEntities() ? 'bg-mono-200 text-mono-400 cursor-not-allowed' : 'bg-mono-100 text-red-700 hover:bg-red-50 cursor-pointer'}"
          >
            <i class="fa-solid fa-xmark mr-2"></i>
            <span>Delete Namespace</span>
          </button>
        </Tooltip>
      {:else}
        <div class="bg-red-50 border border-red-200 rounded-md p-3">
          <p class="text-sm text-red-800 mb-2">Are you sure you want to delete this namespace?</p>
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
              onclick={() => listState.showDeleteConfirm = false}
              class="flex-1 px-3 py-1.5 border border-mono-300 text-mono-700 rounded-md hover:bg-mono-50 text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      {/if}
    {:else if editedNamespace && isLocked}
      <button
        type="button"
        onclick={closeDrawer}
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
      <div class="flex space-x-2 p-4 border-t border-mono-200">
        <button
          type="button"
          onclick={handleCreate}
          class="flex-1 px-4 py-2 bg-mono-900 text-white rounded-md hover:bg-mono-800 transition-colors font-medium"
        >
          Create
        </button>
        <button
          type="button"
          onclick={closeCreateModal}
          class="flex-1 px-4 py-2 border border-mono-300 text-mono-700 rounded-md hover:bg-mono-50 transition-colors font-medium"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
{/if}
