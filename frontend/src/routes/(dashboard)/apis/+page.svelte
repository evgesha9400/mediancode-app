<script lang="ts">
  import type { Api } from '$lib/types';
  import {
    apisStore,
    endpointsStore,
    searchApis
  } from '$lib/stores/apis';
  import { activeNamespaceId, namespacesStore } from '$lib/stores/namespaces';
  import {
    MainColumnFrame,
    PageHeader,
    SearchBar,
    Table,
    SortableColumn,
    DrawerStack,
    CrudDrawerFooter,
    TableEmptyState,
    FormField,
    FormLabel,
    Pill,
    NamespaceSelector,
    TableListNameCell,
    TableListTextCell,
    TableListMetricCell
  } from '$lib/components';
  import { STORE_NAMES } from '$lib/stores/loader';
  import { dashboardTextPrimary, tableListCell, tableListRowHover, tableListRowInteractive } from '$lib/ui/classes';
  import { getTableRowId, TABLE_COL_ATTR } from '$lib/utils/testIds';
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

<MainColumnFrame bodyClass="">
  {#snippet header()}
    <PageHeader title="APIs">
      {#snippet actions()}
        <NamespaceSelector />
        <button
          type="button"
          onclick={workflow.openCreate}
          class="px-4 py-2 bg-green-400 text-mono-950 font-inter font-semibold rounded-xl text-sm tracking-wide shadow-sm flex items-center space-x-2 hover:bg-green-300 cursor-pointer transition-colors"
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
  {/snippet}

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
          data-testid={getTableRowId(api.id)}
          onclick={() => handleOpenApi(api)}
          class="{tableListRowInteractive} {tableListRowHover}"
        >
          <TableListNameCell col="title" captionText={api.description ?? undefined}>
            {#snippet children()}
              {api.title || 'Untitled API'}
            {/snippet}
          </TableListNameCell>
          <td class="{tableListCell} whitespace-nowrap" {...{ [TABLE_COL_ATTR]: 'version' }}>
            <Pill>{api.version}</Pill>
          </td>
          <td class="{tableListCell} whitespace-nowrap" {...{ [TABLE_COL_ATTR]: 'baseUrl' }}>
            <code class="font-mono">{api.baseUrl}</code>
          </td>
          <TableListMetricCell col="endpoints" label="endpoints">
            {#snippet pill()}
              <Pill>{api.endpointCount}</Pill>
            {/snippet}
          </TableListMetricCell>
          <TableListTextCell col="namespace" nowrap>
            {#snippet children()}
              {api.namespaceName}
            {/snippet}
          </TableListTextCell>
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
</MainColumnFrame>

{#snippet createApiContent(_: { close: () => void })}
  {#if workflow.editedItem}
    <div class="space-y-4">
      <FormField
        id="api-title"
        label="API Title"
        bind:value={workflow.editedItem.title}
        placeholder="My API"
        required
        error={workflow.visibleErrors.title}
      />

      <FormField
        id="api-version"
        label="Version"
        bind:value={workflow.editedItem.version}
        placeholder="1.0.0"
      />

      <div>
        <FormLabel label="Description" forId="api-description" />
        <textarea
          id="api-description"
          bind:value={workflow.editedItem.description}
          rows="3"
          placeholder="Describe what this API does..."
          class="w-full px-3 py-1.5 text-sm border border-mono-700/80 bg-mono-900/80 {dashboardTextPrimary} focus:ring-2 focus:ring-green-400/50 outline-none focus:outline-none transition-colors rounded-xl"
        ></textarea>
      </div>

      <FormField
        id="api-server-url"
        label="Server URL"
        bind:value={workflow.editedItem.serverUrl}
        placeholder="https://api.example.com"
      />

      <FormField
        id="api-base-url"
        label="Base URL"
        bind:value={workflow.editedItem.baseUrl}
        placeholder="/api/v1"
      />
    </div>
  {/if}
{/snippet}

{#snippet createApiFooter(_: { close: () => void })}
  <CrudDrawerFooter
    mode="creating"
    isSaving={workflow.isSaving}
    isFormValid={workflow.isFormValid}
    hasChanges={false}
    canDelete={false}
    onCreate={workflow.handleCreate}
  />
{/snippet}

<DrawerStack
  panels={workflow.mode === 'creating'
    ? [{
        id: 'create-api',
        title: 'Create API',
        headerNamespace: activeNamespaceName,
        width: 520,
        minWidth: 380,
        content: createApiContent,
        footer: createApiFooter
      }]
    : []}
  onPopPanel={workflow.closeDrawer}
/>
