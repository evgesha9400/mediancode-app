<script lang="ts">
  import type { Api } from '$lib/types';
  import {
    apisStore,
    endpointsStore,
    searchApis
  } from '$lib/stores/apis';
  import { deleteApiAction } from '$lib/domain/mutations';
  import { showToast } from '$lib/stores/toasts';
  import { activeNamespaceId, namespacesStore } from '$lib/stores/namespaces';
  import {
    PageHeader,
    SearchBar,
    Table,
    SortableColumn,
    EmptyState,
    Drawer,
    DrawerHeader,
    DrawerContent,
    DrawerFooter,
    Tooltip,
    NamespaceSelector
  } from '$lib/components';
  import { storeLoadingState, reloadStores } from '$lib/stores/loader';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { createListViewState } from '$lib/stores/listViewState.svelte';

  // Extended API type with computed properties for sorting
  type ApiWithCounts = Api & {
    endpointCount: number;
    namespaceName: string;
  };

  // Filter state type (no filters initially)
  type ApiFilterState = Record<string, never>;

  // Build filter config (empty initially)
  let apiFilterConfig = $derived([]);

  // Reactive store subscriptions for derived computations
  let allNamespaces = $derived($namespacesStore);
  let allEndpoints = $derived($endpointsStore);

  // Filter APIs by active namespace
  let namespacedApis = $derived($apisStore.filter(a => a.namespaceId === $activeNamespaceId));

  // Create list view state (owns all reactive state)
  const listState = createListViewState<Api, ApiFilterState>({
    itemsStore: () => namespacedApis,
    searchFn: searchApis,
    filterSections: () => apiFilterConfig,
    numericColumns: new Set(['endpointCount']),
    urlScope: { page, goto },
    getItemId: (api) => api.id,
    deriveExtra: (api) => ({
      endpointCount: allEndpoints.filter(e => e.apiId === api.id).length,
      namespaceName: allNamespaces.find(ns => ns.id === api.namespaceId)?.name ?? ''
    }),
    sortColumnMap: { 'endpoints': 'endpointCount', 'namespace': 'namespaceName' },
    drawerConfig: {
      trackEdits: false,
      allowDelete: true,
      closeDelay: 300
    }
  });

  // Convenience aliases for template bindings
  let selectedApi = $derived(listState.selectedItem);
  let showDeleteConfirm = $derived(listState.showDeleteConfirm);
  let filteredApis = $derived(listState.results as ApiWithCounts[]);
  let sorts = $derived(listState.sorts);

  let isDeleting = $state(false);
  let hasLoadError = $derived($storeLoadingState.storeErrors.includes('APIs'));

  function isSelected(api: Api): boolean {
    return selectedApi?.id === api.id;
  }

  function handleCreateApi() {
    goto('/apis/new');
  }

  function handleOpenApi(api: Api) {
    goto(`/apis/${api.id}`);
  }

  async function handleDelete() {
    if (!selectedApi || isDeleting) return;

    const apiTitle = selectedApi.title;
    isDeleting = true;

    const result = await deleteApiAction(selectedApi.id);

    if (result.success) {
      listState.closeDrawer();
      isDeleting = false;
      showToast(`API "${apiTitle}" deleted successfully`, 'success', 3000);
    } else {
      isDeleting = false;
      showToast(result.error || 'Failed to delete API', 'error', 5000);
    }
  }

  function formatDate(isoString: string): string {
    if (!isoString) return '-';
    return new Date(isoString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
</script>

<PageHeader title="APIs">
    {#snippet actions()}
      <NamespaceSelector />
      <button
        type="button"
        onclick={handleCreateApi}
        class="px-4 py-2 bg-mono-900 text-white rounded-md flex items-center space-x-2 hover:bg-mono-800 cursor-pointer transition-colors"
      >
        <i class="fa-solid fa-plus"></i>
        <span>New API</span>
      </button>
    {/snippet}
  </PageHeader>

  <SearchBar
    bind:searchQuery={listState.query}
    placeholder="Search APIs..."
    resultsCount={filteredApis.length}
    resultLabel="API"
    showFilter={false}
    active={false}
  />

  <Table isEmpty={filteredApis.length === 0}>
    {#snippet header()}
      <tr>
        <SortableColumn
          column="title"
          label="Name"
          {sorts}
          onSort={listState.handleSort}
        />
        <SortableColumn
          column="version"
          label="Version"
          {sorts}
          onSort={listState.handleSort}
        />
        <SortableColumn
          column="baseUrl"
          label="Base URL"
          {sorts}
          onSort={listState.handleSort}
        />
        <SortableColumn
          column="endpoints"
          label="Endpoints"
          {sorts}
          onSort={listState.handleSort}
        />
        <SortableColumn
          column="namespace"
          label="Namespace"
          {sorts}
          onSort={listState.handleSort}
        />
      </tr>
    {/snippet}

    {#snippet body()}
      {#each filteredApis as api}
        <tr
          onclick={() => handleOpenApi(api)}
          class="cursor-pointer transition-colors {isSelected(api) ? 'bg-mono-100' : 'hover:bg-mono-50'}"
        >
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="text-sm text-mono-900 font-medium">{api.title || 'Untitled API'}</div>
            {#if api.description}
              <div class="text-xs text-mono-500 truncate max-w-xs">{api.description}</div>
            {/if}
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <span class="px-2 py-1 text-xs rounded-full bg-mono-200 text-mono-700">
              {api.version}
            </span>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <code class="text-sm text-mono-600 font-mono">{api.baseUrl}</code>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="flex items-center space-x-2">
              <span class="px-2 py-1 text-xs rounded-full bg-mono-200 text-mono-700">
                {api.endpointCount}
              </span>
              <span class="text-sm text-mono-600">endpoints</span>
            </div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <span class="text-sm text-mono-600">{api.namespaceName}</span>
          </td>
        </tr>
      {/each}
    {/snippet}

    {#snippet empty()}
      {#if hasLoadError}
        <EmptyState
          icon="fa-circle-exclamation"
          variant="error"
          title="Failed to load APIs"
          message="Something went wrong while fetching API data"
          actionLabel="Retry"
          onAction={reloadStores}
        />
      {:else}
        <EmptyState
          title="No APIs found"
          message="Create your first API by clicking the 'New API' button above"
        />
      {/if}
    {/snippet}
  </Table>

<Drawer open={listState.drawerOpen}>
  <DrawerHeader title="API Details" onClose={listState.closeDrawer} />

  <DrawerContent>
    {#if selectedApi}
      <div class="space-y-6">
        <div>
          <h3 class="text-sm text-mono-500 mb-1 font-medium">API Name</h3>
          <p class="text-mono-900">{selectedApi.title || 'Untitled API'}</p>
        </div>

        <div>
          <h3 class="text-sm text-mono-500 mb-1 font-medium">Version</h3>
          <span class="px-2 py-1 text-xs rounded-full bg-mono-200 text-mono-700">
            {selectedApi.version}
          </span>
        </div>

        <div>
          <h3 class="text-sm text-mono-500 mb-1 font-medium">Base URL</h3>
          <code class="text-mono-900 font-mono">{selectedApi.baseUrl}</code>
        </div>

        {#if selectedApi.serverUrl}
          <div>
            <h3 class="text-sm text-mono-500 mb-1 font-medium">Server URL</h3>
            <code class="text-mono-900 font-mono">{selectedApi.serverUrl}</code>
          </div>
        {/if}

        <div>
          <h3 class="text-sm text-mono-500 mb-1 font-medium">Description</h3>
          <p class="text-mono-900">{selectedApi.description || '-'}</p>
        </div>

        <div>
          <h3 class="text-sm text-mono-500 mb-1 font-medium">Namespace</h3>
          <span class="text-mono-900">{allNamespaces.find(ns => ns.id === selectedApi.namespaceId)?.name ?? '-'}</span>
        </div>

        <div>
          <h3 class="text-sm text-mono-500 mb-1 font-medium">Endpoints</h3>
          <span class="px-2 py-1 text-xs rounded-full bg-mono-200 text-mono-700">
            {allEndpoints.filter(e => e.apiId === selectedApi.id).length}
          </span>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <h3 class="text-sm text-mono-500 mb-1 font-medium">Created</h3>
            <span class="text-mono-900">{formatDate(selectedApi.createdAt)}</span>
          </div>
          <div>
            <h3 class="text-sm text-mono-500 mb-1 font-medium">Last Updated</h3>
            <span class="text-mono-900">{formatDate(selectedApi.updatedAt)}</span>
          </div>
        </div>
      </div>
    {/if}
  </DrawerContent>

  <DrawerFooter>
    {#if selectedApi}
      {#if !showDeleteConfirm}
        <button
          type="button"
          onclick={() => handleOpenApi(selectedApi)}
          class="w-full px-4 py-2 bg-mono-900 text-white rounded-md hover:bg-mono-800 cursor-pointer transition-colors font-medium flex items-center justify-center space-x-2"
        >
          <i class="fa-solid fa-pen-to-square"></i>
          <span>Edit API</span>
        </button>
        <button
          type="button"
          onclick={() => listState.showDeleteConfirm = true}
          class="w-full px-4 py-2 bg-mono-100 text-red-700 rounded-md hover:bg-red-50 cursor-pointer transition-colors font-medium flex items-center justify-center space-x-2"
        >
          <i class="fa-solid fa-xmark"></i>
          <span>Delete</span>
        </button>
      {:else}
        <div class="bg-red-50 border border-red-200 rounded-md p-3">
          <p class="text-sm text-red-800 mb-2">Are you sure?</p>
          <div class="flex space-x-2">
            <button
              type="button"
              onclick={handleDelete}
              disabled={isDeleting}
              class="flex-1 px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {#if isDeleting}
                <i class="fa-solid fa-spinner fa-spin mr-1"></i>
                Deleting...
              {:else}
                Yes, Delete
              {/if}
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
    {/if}
  </DrawerFooter>
</Drawer>
