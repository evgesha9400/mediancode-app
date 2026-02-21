<script lang="ts">
  import type { Api } from '$lib/types';
  import {
    apisStore,
    endpointsStore,
    searchApis
  } from '$lib/stores/apis';
  import { createApiAction } from '$lib/domain/mutations';
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
    CrudDrawerFooter,
    NamespaceSelector
  } from '$lib/components';
  import { storeLoadingState, reloadStores, STORE_NAMES } from '$lib/stores/loader';
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
      allowDelete: false
    }
  });

  let filteredApis = $derived(listState.results as ApiWithCounts[]);
  let sorts = $derived(listState.sorts);

  let hasLoadError = $derived($storeLoadingState.storeErrors.includes(STORE_NAMES.APIS));

  function handleOpenApi(api: Api) {
    goto(`/apis/${api.id}`);
  }

  // ============================================================================
  // Create Drawer State
  // ============================================================================

  let createDrawerOpen = $state(false);
  let isSaving = $state(false);
  let formTouched = $state(false);

  let formData = $state({
    title: '',
    version: '1.0.0',
    description: '',
    serverUrl: '',
    baseUrl: '/api/v1'
  });

  let formErrors = $derived.by(() => {
    const errors: Record<string, string> = {};
    if (!formData.title.trim()) errors.title = 'API title is required';
    return errors;
  });

  let isFormValid = $derived(Object.keys(formErrors).length === 0);
  let visibleErrors = $derived(formTouched ? formErrors : {});

  function openCreateDrawer() {
    formData = {
      title: '',
      version: '1.0.0',
      description: '',
      serverUrl: '',
      baseUrl: '/api/v1'
    };
    formTouched = false;
    createDrawerOpen = true;
  }

  function closeCreateDrawer() {
    createDrawerOpen = false;
    formTouched = false;
  }

  async function handleCreate() {
    formTouched = true;
    if (!isFormValid) return;

    isSaving = true;
    try {
      const result = await createApiAction({
        namespaceId: $activeNamespaceId,
        title: formData.title,
        version: formData.version,
        description: formData.description,
        serverUrl: formData.serverUrl,
        baseUrl: formData.baseUrl
      });

      if (!result.success) {
        showToast(result.error ?? 'Failed to create API', 'error');
        return;
      }

      showToast('API created successfully', 'success');
      closeCreateDrawer();
      goto(`/apis/${result.data!.id}`);
    } finally {
      isSaving = false;
    }
  }

  // Namespace name for the create drawer
  let activeNamespaceName = $derived(
    allNamespaces.find(ns => ns.id === $activeNamespaceId)?.name ?? 'Default'
  );
</script>

<PageHeader title="APIs">
    {#snippet actions()}
      <NamespaceSelector />
      <button
        type="button"
        onclick={openCreateDrawer}
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
          class="cursor-pointer transition-colors hover:bg-mono-50"
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

<!-- Create API Drawer -->
<Drawer open={createDrawerOpen} maxWidth={520}>
  <DrawerHeader title="Create API" onClose={closeCreateDrawer} />

  <DrawerContent>
    <div class="space-y-4">
      <!-- API Title -->
      <div>
        <label for="api-title" class="block text-sm text-mono-700 mb-1 font-medium">
          API Title <span class="text-red-500">*</span>
        </label>
        <input
          id="api-title"
          type="text"
          bind:value={formData.title}
          placeholder="My API"
          class="w-full px-3 py-2 border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent {visibleErrors.title ? 'border-red-500' : ''}"
        />
        {#if visibleErrors.title}
          <p class="text-xs text-red-500 mt-1">{visibleErrors.title}</p>
        {/if}
      </div>

      <!-- Version -->
      <div>
        <label for="api-version" class="block text-sm text-mono-700 mb-1 font-medium">
          Version
        </label>
        <input
          id="api-version"
          type="text"
          bind:value={formData.version}
          placeholder="1.0.0"
          class="w-full px-3 py-2 border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent"
        />
      </div>

      <!-- Description -->
      <div>
        <label for="api-description" class="block text-sm text-mono-700 mb-1 font-medium">
          Description
        </label>
        <textarea
          id="api-description"
          bind:value={formData.description}
          rows="3"
          placeholder="Describe what this API does..."
          class="w-full px-3 py-2 border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent"
        ></textarea>
      </div>

      <!-- Server URL -->
      <div>
        <label for="api-server-url" class="block text-sm text-mono-700 mb-1 font-medium">
          Server URL
        </label>
        <input
          id="api-server-url"
          type="text"
          bind:value={formData.serverUrl}
          placeholder="https://api.example.com"
          class="w-full px-3 py-2 border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent"
        />
      </div>

      <!-- Base URL -->
      <div>
        <label for="api-base-url" class="block text-sm text-mono-700 mb-1 font-medium">
          Base URL
        </label>
        <input
          id="api-base-url"
          type="text"
          bind:value={formData.baseUrl}
          placeholder="/api/v1"
          class="w-full px-3 py-2 border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent"
        />
      </div>

      <!-- Namespace (read-only) -->
      <div>
        <label for="api-namespace" class="block text-sm text-mono-700 mb-1 font-medium">
          Namespace
        </label>
        <input
          id="api-namespace"
          type="text"
          value={activeNamespaceName}
          disabled
          class="w-full px-3 py-2 border border-mono-300 rounded-md bg-mono-50 text-mono-500 cursor-not-allowed"
        />
        <p class="text-xs text-mono-500 mt-1">Uses the currently active namespace</p>
      </div>
    </div>
  </DrawerContent>

  <DrawerFooter>
    <CrudDrawerFooter
      mode="creating"
      {isSaving}
      {isFormValid}
      hasChanges={false}
      canDelete={false}
      onCreate={handleCreate}
    />
  </DrawerFooter>
</Drawer>
