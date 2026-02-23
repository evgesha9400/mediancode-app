<script lang="ts">
  import type { Api } from '$lib/types';
  import {
    apisStore,
    endpointsStore,
    searchApis
  } from '$lib/stores/apis';
  import { activeNamespaceId, namespacesStore } from '$lib/stores/namespaces';
  import {
    PageHeader,
    SearchBar,
    Table,
    SortableColumn,
    Drawer,
    DrawerHeader,
    DrawerContent,
    DrawerFooter,
    CrudDrawerFooter,
    TableEmptyState,
    FormField,
    NamespaceSelector
  } from '$lib/components';
  import { STORE_NAMES } from '$lib/stores/loader';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { createApiModel } from '$lib/stores/apiModel.svelte';

  // Extended API type with computed properties for sorting
  type ApiWithCounts = Api & {
    endpointCount: number;
    namespaceName: string;
  };

  // Reactive store subscriptions for derived computations
  let allNamespaces = $derived($namespacesStore);
  let allEndpoints = $derived($endpointsStore);

  // Filter APIs by active namespace
  let namespacedApis = $derived($apisStore.filter(a => a.namespaceId === $activeNamespaceId));

  // Create entity model (owns all reactive state + CRUD)
  const workflow = createApiModel({
    itemsStore: () => namespacedApis,
    searchFn: searchApis,
    filterSections: () => [],
    urlScope: { page, goto },
    getActiveNamespaceId: () => $activeNamespaceId,
    getNamespaceName: (nsId) => allNamespaces.find(ns => ns.id === nsId)?.name ?? '',
    getEndpointCount: (apiId) => allEndpoints.filter(e => e.apiId === apiId).length
  });

  let filteredApis = $derived(workflow.results as ApiWithCounts[]);
  let sorts = $derived(workflow.sorts);

  function handleOpenApi(api: Api) {
    goto(`/apis/${api.id}`);
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
        onclick={workflow.openCreate}
        class="px-4 py-2 bg-mono-900 text-white rounded-md flex items-center space-x-2 hover:bg-mono-800 cursor-pointer transition-colors"
      >
        <i class="fa-solid fa-plus"></i>
        <span>New API</span>
      </button>
    {/snippet}
  </PageHeader>

  <SearchBar
    bind:searchQuery={workflow.query}
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
          onSort={workflow.handleSort}
        />
        <SortableColumn
          column="version"
          label="Version"
          {sorts}
          onSort={workflow.handleSort}
        />
        <SortableColumn
          column="baseUrl"
          label="Base URL"
          {sorts}
          onSort={workflow.handleSort}
        />
        <SortableColumn
          column="endpoints"
          label="Endpoints"
          {sorts}
          onSort={workflow.handleSort}
        />
        <SortableColumn
          column="namespace"
          label="Namespace"
          {sorts}
          onSort={workflow.handleSort}
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
      <TableEmptyState
        entityName="APIs"
        storeKey={STORE_NAMES.APIS}
        noResultsMessage="Create your first API by clicking the 'New API' button above"
      />
    {/snippet}
  </Table>

<!-- Create API Drawer -->
<Drawer open={workflow.mode === 'creating'} maxWidth={520}>
  <DrawerHeader title="Create API" onClose={workflow.closeDrawer} />

  <DrawerContent>
    {#if workflow.editedItem}
    <div class="space-y-4">
      <FormField
        label="API Title"
        bind:value={workflow.editedItem.title}
        placeholder="My API"
        required
        error={workflow.visibleErrors.title}
      />

      <FormField
        label="Version"
        bind:value={workflow.editedItem.version}
        placeholder="1.0.0"
      />

      <!-- Description (textarea - FormField doesn't support textarea, keep inline) -->
      <div>
        <label for="api-description" class="block text-sm text-mono-700 mb-1 font-medium">
          Description
        </label>
        <textarea
          id="api-description"
          bind:value={workflow.editedItem.description}
          rows="3"
          placeholder="Describe what this API does..."
          class="w-full px-3 py-2 border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent"
        ></textarea>
      </div>

      <FormField
        label="Server URL"
        bind:value={workflow.editedItem.serverUrl}
        placeholder="https://api.example.com"
      />

      <FormField
        label="Base URL"
        bind:value={workflow.editedItem.baseUrl}
        placeholder="/api/v1"
      />

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
    {/if}
  </DrawerContent>

  <DrawerFooter>
    <CrudDrawerFooter
      mode="creating"
      isSaving={workflow.isSaving}
      isFormValid={workflow.isFormValid}
      hasChanges={false}
      canDelete={false}
      onCreate={workflow.handleCreate}
    />
  </DrawerFooter>
</Drawer>
