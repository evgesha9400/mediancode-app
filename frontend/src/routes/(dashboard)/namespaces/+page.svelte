<script lang="ts">
  import {
    namespacesStore,
    searchNamespaces,
    getNamespaceEntityDetails
  } from '$lib/stores/namespaces';
  import { createNamespacesModel } from '$lib/stores/namespacesModel.svelte';
  import {
    MainColumnFrame,
    PageHeader,
    SearchBar,
    FilterPanel,
    Table,
    SortableColumn,
    DrawerStack,
    CrudDrawerFooter,
    Pill,
    FormField,
    FormLabel,
    TableListNameCell,
    TableListTextCell,
    TableListMetricCell,
    TableEmptyState
  } from '$lib/components';
  import type { FilterConfig, Namespace } from '$lib/types';
  import {
    surfaceInsideFrostedPanel,
    tableListBodyPrimary,
    tableListPanelSectionTitle,
    tableListPanelStatLabel,
    tableListPanelStatTotal,
    tableListRowHover,
    tableListRowInteractive,
    tableListRowSelected,
    textareaInsideFrostedPanel
  } from '$lib/ui/classes';
  import { getTableRowId } from '$lib/utils/testIds';
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
      predicate: (item: Namespace) => !item.locked
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

  let isReadOnly = $derived(workflow.editedItem?.locked === true);
  let isCreating = $derived(workflow.mode === 'creating');
</script>

<MainColumnFrame bodyClass="">
  {#snippet header()}
    <PageHeader title="Namespaces">
      {#snippet actions()}
        <button
          type="button"
          onclick={workflow.openCreate}
          class="px-4 py-2 bg-green-400 text-mono-950 font-inter font-semibold rounded-xl text-sm tracking-wide shadow-sm flex items-center space-x-2 hover:bg-green-300 cursor-pointer transition-colors"
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
  {/snippet}

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
          data-testid={getTableRowId(namespace.id)}
          onclick={() => workflow.selectItem(namespace)}
          class="{tableListRowInteractive} {workflow.isSelected(namespace)
            ? tableListRowSelected
            : tableListRowHover}"
        >
          <TableListNameCell col="name">
            {#snippet children()}
              <div class="flex items-center space-x-2">
                <span>{namespace.name}</span>
                {#if namespace.name?.toLowerCase() === 'global'}
                  <i class="fa-solid fa-earth-americas text-mono-400 text-xs" title="Global"></i>
                {/if}
                {#if namespace.isDefault}
                  <Pill>Default</Pill>
                {/if}
              </div>
            {/snippet}
          </TableListNameCell>
          <TableListTextCell col="description">
            {#snippet children()}
              {namespace.description || '-'}
            {/snippet}
          </TableListTextCell>
          <TableListMetricCell col="entityCount" label="total">
            {#snippet pill()}
              <Pill>{namespace.entityCount}</Pill>
            {/snippet}
          </TableListMetricCell>
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
</MainColumnFrame>

{#snippet namespaceFormContent(_: { close: () => void })}
  {#if workflow.editedItem}
    <div class="space-y-4">
      <FormField
        id="namespace-name"
        label="Name"
        bind:value={workflow.editedItem.name}
        disabled={isReadOnly}
        required={!isReadOnly}
        placeholder={isCreating ? 'my-namespace' : ''}
        error={workflow.visibleErrors.name}
      />

      <div>
        <FormLabel label="Description" forId="namespace-description" />
        <textarea
          id="namespace-description"
          bind:value={workflow.editedItem.description}
          disabled={isReadOnly}
          rows="3"
          placeholder={isCreating ? 'Optional description...' : ''}
          class="{isReadOnly
            ? 'w-full px-3 py-1.5 text-sm border border-mono-700/80 rounded-xl bg-mono-800 text-mono-400 cursor-not-allowed outline-none'
            : textareaInsideFrostedPanel}"
        ></textarea>
      </div>

      {#if isCreating}
        <div>
          <h3 class={tableListPanelSectionTitle}>Default Namespace</h3>
          <label class="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              bind:checked={workflow.editedItem.isDefault}
              class="w-4 h-4 rounded border-mono-600 text-mono-100 focus:ring-green-400"
            />
            <span class="text-sm text-mono-400">Set as default namespace</span>
          </label>
          <p class="text-xs text-mono-400 mt-1">The default namespace is auto-selected when the app loads.</p>
        </div>
      {/if}

      {#if !isCreating}
        {@const details = getNamespaceEntityDetails(workflow.editedItem.id)}
        <div>
          <h3 class={tableListPanelSectionTitle}>Contents</h3>
          <div class="space-y-2">
            <div class="flex justify-between text-sm">
              <span class="text-mono-400">Fields</span>
              <span class={tableListBodyPrimary}>{details.fields}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-mono-400">Field Constraints</span>
              <span class={tableListBodyPrimary}>{details.fieldConstraints}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-mono-400">Objects</span>
              <span class={tableListBodyPrimary}>{details.objects}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-mono-400">Endpoints</span>
              <span class={tableListBodyPrimary}>{details.endpoints}</span>
            </div>
            <div class="flex justify-between text-sm border-t border-mono-700 pt-2 mt-2">
              <span class={tableListPanelStatLabel}>Total</span>
              <span class={tableListPanelStatTotal}>{details.total}</span>
            </div>
          </div>
        </div>

        <div>
          <h3 class={tableListPanelSectionTitle}>Default Namespace</h3>
          <label class="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              bind:checked={workflow.editedItem.isDefault}
              disabled={workflow.editedItem.isDefault}
              class="w-4 h-4 rounded border-mono-600 text-mono-100 focus:ring-green-400 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <span class="text-sm text-mono-400">
              {#if workflow.editedItem.isDefault}
                This is your default namespace
              {:else}
                Set as default namespace
              {/if}
            </span>
          </label>
          <p class="text-xs text-mono-400 mt-1">The default namespace is auto-selected when the app loads.</p>
        </div>
      {/if}
    </div>
  {/if}
{/snippet}

{#snippet namespaceFormFooter({ close }: { close: () => void })}
  {#if workflow.editedItem}
    <CrudDrawerFooter
      mode={workflow.mode === 'creating' ? 'creating' : 'editing'}
      isSaving={workflow.isSaving}
      isFormValid={workflow.isFormValid}
      hasChanges={workflow.hasChanges}
      canDelete={workflow.canDelete}
      deleteTooltip={workflow.deleteTooltip}
      showDeleteConfirm={workflow.showDeleteConfirm}
      isDeleting={workflow.isDeleting}
      onCreate={workflow.handleCreate}
      onSave={workflow.handleSave}
      onUndo={workflow.handleUndo}
      onDeleteRequest={() => workflow.showDeleteConfirm = true}
      onDeleteConfirm={workflow.handleDelete}
      onDeleteCancel={() => workflow.showDeleteConfirm = false}
      onCancel={close}
    />
  {/if}
{/snippet}

<DrawerStack
  panels={workflow.drawerOpen
    ? [{
        id: 'namespace',
        title: isCreating ? 'Create Namespace' : isReadOnly ? 'Namespace Details' : 'Edit Namespace',
        headerSystem: isReadOnly,
        width: 520,
        minWidth: 320,
        content: namespaceFormContent,
        footer: namespaceFormFooter
      }]
    : []}
  onPopPanel={workflow.closeDrawer}
/>
