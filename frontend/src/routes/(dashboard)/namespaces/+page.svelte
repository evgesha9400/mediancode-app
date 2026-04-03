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
    TableEmptyState
  } from '$lib/components';
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
  let hasDefaultChanged = $derived(
    isReadOnly &&
    workflow.editedItem != null &&
    workflow.originalItem != null &&
    workflow.editedItem.isDefault !== workflow.originalItem.isDefault
  );
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
          onclick={() => workflow.selectItem(namespace)}
          class="cursor-pointer transition-colors {workflow.isSelected(namespace) ? 'bg-mono-800' : 'hover:bg-mono-950'}"
        >
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="flex items-center space-x-2">
              <span class="text-sm text-mono-100 font-medium">{namespace.name}</span>
              {#if namespace.name?.toLowerCase() === 'global'}
                <i class="fa-solid fa-earth-americas text-mono-400 text-xs" title="Global"></i>
              {/if}
              {#if namespace.isDefault}
                <Pill>Default</Pill>
              {/if}
            </div>
          </td>
          <td class="px-6 py-4 text-sm text-mono-400">
            {namespace.description || '-'}
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="flex items-center space-x-2">
              <Pill>{namespace.entityCount}</Pill>
              <span class="text-sm text-mono-400">total</span>
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
</MainColumnFrame>

{#snippet namespaceFormContent(_: { close: () => void })}
  {#if workflow.editedItem}
    <div class="space-y-4">
      {#if isReadOnly}
        <div class="flex items-center space-x-2 px-3 py-2 bg-mono-900/50 backdrop-blur-sm border border-mono-700/80 rounded-xl mb-6">
          <i class="fa-solid fa-lock text-mono-400 text-sm"></i>
          <span class="text-sm text-mono-400">System namespace — read-only</span>
        </div>
      {/if}

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
          class="w-full px-3 py-1.5 text-sm border border-mono-700/80 bg-mono-900/50 backdrop-blur-sm/50 focus:ring-2 focus:ring-green-400/50 outline-none focus:outline-none transition-all rounded-xl {isReadOnly ? 'bg-mono-800 cursor-not-allowed' : ''}"
        ></textarea>
      </div>

      {#if isCreating}
        <div>
          <h3 class="text-sm text-mono-300 mb-2 font-medium">Default Namespace</h3>
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
          <h3 class="text-sm text-mono-300 mb-2 font-medium">Contents</h3>
          <div class="bg-mono-950 p-3 space-y-2">
            <div class="flex justify-between text-sm">
              <span class="text-mono-400">Fields</span>
              <span class="text-mono-100 font-medium">{details.fields}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-mono-400">Field Constraints</span>
              <span class="text-mono-100 font-medium">{details.fieldConstraints}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-mono-400">Objects</span>
              <span class="text-mono-100 font-medium">{details.objects}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-mono-400">Endpoints</span>
              <span class="text-mono-100 font-medium">{details.endpoints}</span>
            </div>
            <div class="flex justify-between text-sm border-t border-mono-700 pt-2 mt-2">
              <span class="text-mono-300 font-medium">Total</span>
              <span class="text-mono-100 font-bold">{details.total}</span>
            </div>
          </div>
        </div>

        <div>
          <h3 class="text-sm text-mono-300 mb-2 font-medium">Default Namespace</h3>
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
  {#if isCreating}
    <CrudDrawerFooter
      mode="creating"
      isSaving={workflow.isSaving}
      isFormValid={workflow.isFormValid}
      hasChanges={false}
      canDelete={false}
      onCreate={workflow.handleCreate}
      onCancel={close}
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
    {#if hasDefaultChanged}
      <button
        type="button"
        onclick={workflow.handleSave}
        disabled={workflow.isSaving}
        class="w-full px-4 py-2 rounded-xl text-sm font-inter tracking-wide transition-colors font-medium {workflow.isSaving ? 'bg-mono-800 text-mono-500 cursor-not-allowed' : 'bg-green-400 border border-transparent text-mono-950 font-semibold hover:bg-green-300 shadow-sm cursor-pointer'}"
      >
        {#if workflow.isSaving}
          Saving...
        {:else}
          Save
        {/if}
      </button>
    {/if}
    <button
      type="button"
      onclick={workflow.closeDrawer}
      class="w-full px-4 py-2 rounded-xl border border-mono-600 text-mono-300 text-sm font-inter tracking-wide hover:bg-mono-800 transition-colors font-medium"
    >
      Close
    </button>
  {/if}
{/snippet}

<DrawerStack
  panels={workflow.drawerOpen
    ? [{
        id: 'namespace',
        title: isCreating ? 'Create Namespace' : isReadOnly ? 'Namespace Details' : 'Edit Namespace',
        width: 520,
        minWidth: 320,
        content: namespaceFormContent,
        footer: namespaceFormFooter
      }]
    : []}
  onPopPanel={workflow.closeDrawer}
/>
