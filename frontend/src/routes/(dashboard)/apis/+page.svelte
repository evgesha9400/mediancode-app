<script lang="ts">
  import type { Api } from '$lib/types';
  import {
    apisStore,
    endpointsStore,
    searchApis,
    activeNamespaceId,
    namespacesStore
  } from '$lib/stores/stores';
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
  import {
    dashboardPageHeaderPrimaryButton,
    tableListCell,
    tableListRowHover,
    tableListRowInteractive,
    textareaObjectForm
  } from '$lib/ui/classes';
  import { getTableRowId, TABLE_COL_ATTR } from '$lib/utils/testIds';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { createCrudModel } from '$lib/stores/crudModel.svelte';
  import { createApisContract } from '$lib/stores/apisConfig.svelte';

  // Extended API type with computed properties for sorting
  type ApiWithCounts = Api & {
    endpointCount: number;
  };

  // Reactive store subscriptions for derived computations
  let allNamespaces = $derived($namespacesStore);
  let allEndpoints = $derived($endpointsStore);

  // Filter APIs by active namespace
  let namespacedApis = $derived($apisStore.filter(a => a.namespaceId === $activeNamespaceId));

  // Create entity model (owns all reactive state + CRUD)
  const contract = createApisContract({
    getActiveNamespaceId: () => $activeNamespaceId,
    getEndpointCount: (apiId) => allEndpoints.filter(e => e.apiId === apiId).length,
    afterCreate: (api) => goto(`/apis/${api.id}`)
  });
  const workflow = createCrudModel(contract, {
    itemsStore: () => namespacedApis,
    searchFn: searchApis,
    filterSections: () => [],
    urlScope: { page, goto }
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
          class={dashboardPageHeaderPrimaryButton}
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
          column="description"
          label="Description"
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
      </tr>
    {/snippet}

    {#snippet body()}
      {#each filteredApis as api}
        <tr
          data-testid={getTableRowId(api.id)}
          onclick={() => handleOpenApi(api)}
          class="{tableListRowInteractive} {tableListRowHover}"
        >
          <TableListNameCell col="title">
            {#snippet children()}
              {api.title || 'Untitled API'}
            {/snippet}
          </TableListNameCell>
          <TableListTextCell col="description" class="max-w-xs truncate">
            {#snippet children()}
              {api.description?.trim() ? api.description : '-'}
            {/snippet}
          </TableListTextCell>
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
          class={textareaObjectForm}
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
