<script lang="ts">
  import {
    namespacesStore,
    searchNamespaces,
    getNamespaceEntityDetails
  } from '$lib/stores/namespaces';
  import { createNamespaceAction, updateNamespaceAction, deleteNamespaceAction } from '$lib/stores/actions';
  import { showToast } from '$lib/stores/toasts';
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
  import { storeLoadingState, reloadStores } from '$lib/stores/loader';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { createListViewState } from '$lib/stores/listViewState.svelte';

  // Extended namespace type with computed entity counts
  type NamespaceWithCounts = Namespace & {
    entityCount: number;
    fieldCount: number;
    fieldConstraintCount: number;
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
  let isSaving = $state(false);
  let isDeleting = $state(false);
  let formTouched = $state(false);
  let serverErrors = $state<Record<string, string>>({});

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
        fieldConstraintCount: details.fieldConstraints,
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

  // Truly derived values (read-only computations)
  let filteredNamespaces = $derived(listState.results as NamespaceWithCounts[]);
  let sorts = $derived(listState.sorts);
  let activeFiltersCount = $derived(listState.activeFiltersCount);
  let hasChanges = $derived(listState.hasChanges);

  // Reactive validation for edit drawer
  let formErrors = $derived.by(() => {
    if (!listState.editedItem) return {};
    const errors: Record<string, string> = {};
    if (!listState.editedItem.name.trim()) errors.name = 'Namespace name is required';
    return errors;
  });

  let isFormValid = $derived(listState.editedItem !== null && Object.keys(formErrors).length === 0);
  let visibleErrors = $derived({ ...(formTouched ? formErrors : {}), ...serverErrors });

  function selectNamespace(namespace: Namespace) {
    listState.selectItem(namespace);
  }

  function closeDrawer() {
    listState.closeDrawer();
    formTouched = false;
    serverErrors = {};
  }

  function isSelected(namespace: Namespace): boolean {
    return listState.selectedItem?.id === namespace.id;
  }

  async function handleSave() {
    if (!listState.editedItem || isSaving) return;

    // Can't edit locked namespaces
    if (listState.editedItem.locked) {
      showToast('Cannot edit locked namespaces', 'error', 3000);
      return;
    }

    formTouched = true;
    if (!isFormValid) return;

    const namespaceName = listState.editedItem.name;
    isSaving = true;

    const result = await updateNamespaceAction(listState.editedItem.id, {
      name: listState.editedItem.name,
      description: listState.editedItem.description
    });

    if (!result.success) {
      isSaving = false;
      if (result.error?.includes('already exists')) {
        serverErrors = { name: result.error };
      } else {
        showToast(result.error || 'Failed to update namespace', 'error', 5000);
      }
      return;
    }

    listState.selectedItem = result.data!;
    listState.originalItem = JSON.parse(JSON.stringify(result.data!));
    showToast(`Namespace "${namespaceName}" updated successfully`, 'success', 3000);
    closeDrawer();
    isSaving = false;
  }

  function handleUndo() {
    if (listState.originalItem) {
      listState.editedItem = JSON.parse(JSON.stringify(listState.originalItem));
      formTouched = false;
      serverErrors = {};
    }
  }

  async function handleDelete() {
    if (!listState.editedItem || isDeleting) return;

    const namespaceName = listState.editedItem.name;
    isDeleting = true;

    const result = await deleteNamespaceAction(listState.editedItem.id);

    if (result.success) {
      closeDrawer();
      isDeleting = false;
      showToast(`Namespace "${namespaceName}" deleted successfully`, 'success', 3000);
    } else {
      isDeleting = false;
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

  async function handleCreate() {
    createErrors = {};

    if (!newNamespaceName.trim()) {
      createErrors.name = 'Namespace name is required';
      return;
    }

    if (isSaving) return;
    isSaving = true;

    const result = await createNamespaceAction({
      name: newNamespaceName.trim(),
      description: newNamespaceDescription.trim() || undefined
    });

    isSaving = false;

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

  let hasLoadError = $derived($storeLoadingState.storeErrors.includes('Namespaces'));
  let isLocked = $derived(listState.editedItem?.locked ?? false);
  let hasEntities = $derived.by(() => {
    if (!listState.editedItem) return false;
    return getNamespaceEntityDetails(listState.editedItem.id).total > 0;
  });
  let deleteTooltip = $derived.by(() => {
    if (!listState.editedItem) return '';
    if (listState.editedItem.locked) return 'Cannot delete locked namespaces';
    const details = getNamespaceEntityDetails(listState.editedItem.id);
    if (details.total > 0) {
      return `Cannot delete: Contains ${details.total} entities`;
    }
    return '';
  });
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

<Drawer open={listState.drawerOpen}>
  <DrawerHeader title={isLocked ? 'View Namespace' : 'Edit Namespace'} onClose={closeDrawer} />

  <DrawerContent>
    {#if listState.editedItem}
      <div class="space-y-4">
        <!-- Namespace Name -->
        <div>
          <label for="namespace-name" class="block text-sm text-mono-700 mb-1 font-medium">
            Name {#if !isLocked}<span class="text-red-500">*</span>{/if}
          </label>
          <input
            id="namespace-name"
            type="text"
            bind:value={listState.editedItem.name}
            disabled={isLocked}
            class="w-full px-3 py-2 border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent {visibleErrors.name ? 'border-red-500' : ''} {isLocked ? 'bg-mono-100 cursor-not-allowed' : ''}"
          />
          {#if visibleErrors.name}
            <p class="text-xs text-red-500 mt-1">{visibleErrors.name}</p>
          {/if}
        </div>

        <!-- Description -->
        <div>
          <label for="namespace-description" class="block text-sm text-mono-700 mb-1 font-medium">Description</label>
          <textarea
            id="namespace-description"
            bind:value={listState.editedItem.description}
            disabled={isLocked}
            rows="3"
            class="w-full px-3 py-2 border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent {isLocked ? 'bg-mono-100 cursor-not-allowed' : ''}"
          ></textarea>
        </div>

        <!-- Entity Counts -->
        {#if listState.editedItem}
          {@const details = getNamespaceEntityDetails(listState.editedItem.id)}
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
            {#if listState.editedItem.isDefault}
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
    {#if listState.editedItem && !isLocked}
      <CrudDrawerFooter
        mode="editing"
        entityName="Namespace"
        {isSaving}
        {hasChanges}
        canDelete={!hasEntities}
        {deleteTooltip}
        showDeleteConfirm={listState.showDeleteConfirm}
        {isDeleting}
        onSave={handleSave}
        onUndo={handleUndo}
        onCancel={closeDrawer}
        onDeleteRequest={() => listState.showDeleteConfirm = true}
        onDeleteConfirm={handleDelete}
        onDeleteCancel={() => listState.showDeleteConfirm = false}
      />
    {:else if listState.editedItem && isLocked}
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
          disabled={isSaving}
          class="flex-1 px-4 py-2 bg-mono-900 text-white rounded-md hover:bg-mono-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {#if isSaving}
            <i class="fa-solid fa-spinner fa-spin mr-2"></i>
            Creating...
          {:else}
            Create
          {/if}
        </button>
        <button
          type="button"
          onclick={closeCreateModal}
          disabled={isSaving}
          class="flex-1 px-4 py-2 border border-mono-300 text-mono-700 rounded-md hover:bg-mono-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
{/if}
