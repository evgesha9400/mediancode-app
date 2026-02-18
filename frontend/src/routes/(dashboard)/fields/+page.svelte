<script lang="ts">
  import { fieldsStore, searchFields, type Field, type FieldConstraintValue } from '$lib/stores/fields';
  import { fieldConstraintsStore } from '$lib/stores/fieldConstraints';
  import { typesStore, getTypeIdByName } from '$lib/stores/types';
  import { activeNamespaceId, namespacesStore } from '$lib/stores/namespaces';
  import { createFieldsModel } from '$lib/stores/fieldsModel.svelte';
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
    CrudDrawerFooter,
    NamespaceSelector,
    FieldConstraintEditor,
    TypeSelectorDropdown
  } from '$lib/components';
  import type { FilterConfig } from '$lib/types';
  import { storeLoadingState, reloadStores } from '$lib/stores/loader';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';

  // Extended field type with computed properties for sorting
  type FieldWithApiCount = Field & { usedInApisCount: number; namespaceName: string };

  // Reactive store subscriptions for derived computations
  let allNamespaces = $derived($namespacesStore);
  let selectableTypes = $derived($typesStore.filter(t => !['numeric'].includes(t.name)));

  // Build filter config from selectable types (reactive to store changes)
  let fieldFilterConfig = $derived.by((): FilterConfig => {
    return [
      {
        type: 'checkbox-group',
        key: 'selectedTypes',
        label: 'Field Type',
        options: selectableTypes.map(type => ({ label: type.name, value: type.name })),
        predicate: (item: Field, selected: string[]) => selected.includes(item.type)
      },
      {
        type: 'toggle',
        key: 'onlyUsedInApis',
        label: 'Usage',
        toggleLabel: 'Used in APIs only',
        predicate: (item: Field) => item.usedInApis.length > 0
      },
      {
        type: 'toggle',
        key: 'onlyHasConstraints',
        label: 'Validation',
        toggleLabel: 'Has constraints only',
        predicate: (item: Field) => item.constraints.length > 0
      }
    ];
  });

  // Filter fields by active namespace
  let namespacedFields = $derived($fieldsStore.filter(f => f.namespaceId === $activeNamespaceId));

  // Per-entity CRUD model (replaces listViewState + crudWorkflow + entityContract)
  const workflow = createFieldsModel({
    itemsStore: () => namespacedFields,
    searchFn: searchFields,
    filterSections: () => fieldFilterConfig,
    urlScope: { page, goto },
    getActiveNamespaceId: () => $activeNamespaceId,
    getDefaultType: () => selectableTypes[0]?.name ?? 'str',
    getTypeIdByName,
    getNamespaceName: (nsId) => allNamespaces.find(ns => ns.id === nsId)?.name ?? ''
  });

  // Truly derived values (read-only computations)
  let filteredFields = $derived(workflow.results as FieldWithApiCount[]);
  let sorts = $derived(workflow.sorts);
  let activeFiltersCount = $derived(workflow.activeFiltersCount);

  let fieldConstraints = $derived($fieldConstraintsStore);
  // Filter field constraints by field's type compatibility (reactive)
  let availableFieldConstraints = $derived(
    workflow.editedItem
      ? fieldConstraints.filter(fc => fc.compatibleTypes.includes(workflow.editedItem!.type))
      : []
  );

  // Derive selected field constraint names for the FieldConstraintSelectorDropdown
  let selectedFieldConstraintNames = $derived(workflow.editedItem?.constraints.map(v => v.name) ?? []);

  // Entity-specific UI helpers
  function handleTypeChange(newType: string) {
    if (!workflow.editedItem || workflow.editedItem.type === newType) return;
    workflow.editedItem = {
      ...workflow.editedItem,
      type: newType,
      constraints: [],
      defaultValue: ''
    };
  }

  function addFieldConstraint(constraintName: string) {
    if (!workflow.editedItem) return;

    const constraint = fieldConstraints.find(fc => fc.name === constraintName);
    if (!constraint) return;

    workflow.editedItem = {
      ...workflow.editedItem,
      constraints: [...workflow.editedItem.constraints, { name: constraintName, constraintId: constraint.id, value: null }]
    };
  }

  function removeFieldConstraint(index: number) {
    if (!workflow.editedItem) return;
    workflow.editedItem = {
      ...workflow.editedItem,
      constraints: workflow.editedItem.constraints.filter((_, i) => i !== index)
    };
  }

  function updateConstraintParam(index: number, rawValue: string, parameterType: string) {
    if (!workflow.editedItem) return;

    const updatedConstraints = workflow.editedItem.constraints.map((c, i) => {
      if (i !== index) return c;
      return {
        ...c,
        value: rawValue === '' ? null : rawValue
      };
    });

    workflow.editedItem = { ...workflow.editedItem, constraints: updatedConstraints };
  }

  function formatFieldConstraintPill(constraintValue: FieldConstraintValue): string {
    if (constraintValue.value !== null) {
      return `${constraintValue.name}: ${constraintValue.value}`;
    }
    return constraintValue.name;
  }

  let hasLoadError = $derived($storeLoadingState.storeErrors.includes('Fields'));
</script>

<PageHeader title="Fields">
    {#snippet actions()}
      <NamespaceSelector />
      <button
        type="button"
        onclick={workflow.openCreate}
        class="px-4 py-2 bg-mono-900 text-white rounded-md flex items-center space-x-2 hover:bg-mono-800 cursor-pointer transition-colors"
      >
        <i class="fa-solid fa-plus"></i>
        <span>Add Field</span>
      </button>
    {/snippet}
  </PageHeader>

  <SearchBar
    bind:searchQuery={workflow.query}
    placeholder="Search fields..."
    resultsCount={filteredFields.length}
    resultLabel="field"
    showFilter={true}
    active={workflow.filtersOpen || activeFiltersCount > 0}
    onFilterClick={workflow.toggleFilters}
  >
    {#snippet filterPanel()}
      <FilterPanel
        visible={workflow.filtersOpen}
        config={fieldFilterConfig}
        bind:state={workflow.filters}
        onClose={() => workflow.filtersOpen = false}
        onClear={workflow.resetFilters}
      />
    {/snippet}
  </SearchBar>

  <Table isEmpty={filteredFields.length === 0}>
    {#snippet header()}
      <tr>
        <SortableColumn
          column="name"
          label="Field Name"
          {sorts}
          onSort={workflow.handleSort}
        />
        <SortableColumn
          column="type"
          label="Type"
          {sorts}
          onSort={workflow.handleSort}
        />
        <SortableColumn
          column="namespace"
          label="Namespace"
          {sorts}
          onSort={workflow.handleSort}
        />
        <th scope="col" class="px-6 py-3 text-left text-xs text-mono-500 tracking-wider font-medium">
          <div class="flex items-center space-x-1">
            <span>Field Constraints</span>
          </div>
        </th>
        <SortableColumn
          column="defaultValue"
          label="Default Value"
          {sorts}
          onSort={workflow.handleSort}
        />
        <SortableColumn
          column="usedInApis"
          label="Used In APIs"
          {sorts}
          onSort={workflow.handleSort}
        />
      </tr>
    {/snippet}

    {#snippet body()}
      {#each filteredFields as field}
        <tr
          onclick={() => workflow.selectItem(field)}
          class="cursor-pointer transition-colors {workflow.isSelected(field) ? 'bg-mono-100' : 'hover:bg-mono-50'}"
        >
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="text-sm text-mono-900 font-medium">{field.name}</div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <span class="px-2 py-1 text-xs rounded-full bg-mono-900 text-white">
              {field.type}
            </span>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <span class="text-sm text-mono-600">{field.namespaceName}</span>
          </td>
          <td class="px-6 py-4 text-sm text-mono-500">
            {#if field.constraints.length > 0}
              <div class="flex flex-wrap gap-1">
                {#each field.constraints as constraintValue}
                  <span class="px-2 py-0.5 text-xs rounded-full bg-mono-100">
                    {formatFieldConstraintPill(constraintValue)}
                  </span>
                {/each}
              </div>
            {:else}
              <span>-</span>
            {/if}
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-mono-500">
            {field.defaultValue || '-'}
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="flex items-center space-x-2">
              <span class="px-2 py-1 text-xs rounded-full bg-mono-200 text-mono-700">
                {field.usedInApis.length}
              </span>
              <span class="text-sm text-mono-600">APIs</span>
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
          title="Failed to load fields"
          message="Something went wrong while fetching field data"
          actionLabel="Retry"
          onAction={reloadStores}
        />
      {:else}
        <EmptyState
          title="No fields found"
          message="Try adjusting your search query"
        />
      {/if}
    {/snippet}
  </Table>

<Drawer open={workflow.drawerOpen} maxWidth={520}>
  <DrawerHeader title={workflow.mode === 'creating' ? 'Create Field' : 'Edit Field'} onClose={workflow.closeDrawer} />

  <DrawerContent>
    {#if workflow.editedItem}
      <div class="space-y-4">
        <!-- Namespace (Read-only) -->
        <div>
          <label for="fields-namespace" class="block text-sm text-mono-700 mb-1 font-medium">
            Namespace
          </label>
          <input
            id="fields-namespace"
            type="text"
            value={allNamespaces.find(ns => ns.id === workflow.editedItem?.namespaceId)?.name ?? ''}
            disabled
            class="w-full px-3 py-2 border border-mono-300 rounded-md bg-mono-50 text-mono-500 cursor-not-allowed"
          />
          <p class="text-xs text-mono-500 mt-1">Namespace cannot be changed after creation</p>
        </div>

        <!-- Field Name -->
        <div>
          <label for="fields-name" class="block text-sm text-mono-700 mb-1 font-medium">
            Field Name <span class="text-red-500">*</span>
          </label>
          <input
            id="fields-name"
            type="text"
            bind:value={workflow.editedItem.name}
            class="w-full px-3 py-2 border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent {workflow.visibleErrors.name ? 'border-red-500' : ''}"
          />
          {#if workflow.visibleErrors.name}
            <p class="text-xs text-red-500 mt-1">{workflow.visibleErrors.name}</p>
          {/if}
        </div>

        <!-- Type -->
        <div>
          <label for="fields-type" class="block text-sm text-mono-700 mb-1 font-medium">
            Type <span class="text-red-500">*</span>
          </label>
          <TypeSelectorDropdown
            id="fields-type"
            availableTypes={selectableTypes}
            selectedTypeName={workflow.editedItem.type}
            onSelect={handleTypeChange}
            placeholder="Search types..."
            error={!!workflow.visibleErrors.type}
          />
          {#if workflow.visibleErrors.type}
            <p class="text-xs text-red-500 mt-1">{workflow.visibleErrors.type}</p>
          {/if}
        </div>

        <!-- Description -->
        <div>
          <label for="fields-description" class="block text-sm text-mono-700 mb-1 font-medium">Description</label>
          <textarea
            id="fields-description"
            bind:value={workflow.editedItem.description}
            rows="3"
            class="w-full px-3 py-2 border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent"
          ></textarea>
        </div>

        <!-- Default Value -->
        <div>
          <label for="fields-default-value" class="block text-sm text-mono-700 mb-1 font-medium">Default Value</label>
          <input
            id="fields-default-value"
            type="text"
            bind:value={workflow.editedItem.defaultValue}
            placeholder="None"
            class="w-full px-3 py-2 border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent"
          />
        </div>

        <!-- Constraints -->
        <FieldConstraintEditor
          constraints={workflow.editedItem.constraints}
          availableConstraints={availableFieldConstraints}
          allConstraintMeta={fieldConstraints}
          selectedNames={selectedFieldConstraintNames}
          onAdd={addFieldConstraint}
          onRemove={removeFieldConstraint}
          onParamChange={updateConstraintParam}
          error={workflow.visibleErrors.constraints}
        />

        <!-- Used In APIs -->
        <div>
          <h3 class="text-sm text-mono-700 mb-2 font-medium">Used In APIs ({workflow.editedItem.usedInApis.length})</h3>
          <div class="space-y-2">
            {#each workflow.editedItem.usedInApis as api}
              <div class="flex items-center justify-between p-3 bg-mono-50 rounded-md">
                <div class="flex items-center space-x-2">
                  <i class="fa-solid fa-code text-mono-400"></i>
                  <span class="text-sm text-mono-900">{api}</span>
                </div>
              </div>
            {/each}
            {#if workflow.editedItem.usedInApis.length === 0}
              <p class="text-sm text-mono-500 italic">Not used in any APIs</p>
            {/if}
          </div>
        </div>
      </div>
    {/if}
  </DrawerContent>

  <DrawerFooter>
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
      />
    {/if}
  </DrawerFooter>
</Drawer>
