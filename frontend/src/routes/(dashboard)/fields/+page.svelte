<script lang="ts">
  import { fieldsStore, searchFields, type Field, type FieldConstraintValue } from '$lib/stores/fields';
  import { fieldConstraintsStore } from '$lib/stores/fieldConstraints';
  import { typesStore, getTypeIdByName } from '$lib/stores/types';
  import { activeNamespaceId, namespacesStore } from '$lib/stores/namespaces';
  import { createFieldsModel } from '$lib/stores/fieldsModel.svelte';
  import {
    MainColumnFrame,
    PageHeader,
    SearchBar,
    FilterPanel,
    Table,
    SortableColumn,
    Pill,
    TableEmptyState,
    DrawerStack,
    CrudDrawerFooter,
    NamespaceSelector,
    FieldFormContent
  } from '$lib/components';
  import type { FilterConfig } from '$lib/types';
  import { fieldValidatorTemplatesStore } from '$lib/stores/fieldValidatorTemplates';
  import { STORE_NAMES } from '$lib/stores/loader';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';

  // Extended field type with computed properties for sorting
  type FieldWithApiCount = Field & { usedInApisCount: number; namespaceName: string };

  // Reactive store subscriptions for derived computations
  let allNamespaces = $derived($namespacesStore);
  let selectableTypes = $derived($typesStore);

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
  let fieldValidatorTemplates = $derived($fieldValidatorTemplatesStore);

  // Entity-specific UI helper for table rendering
  function formatFieldConstraintPill(constraintValue: FieldConstraintValue): string {
    if (constraintValue.value !== null) {
      return `${constraintValue.name}: ${constraintValue.value}`;
    }
    return constraintValue.name;
  }
</script>

<MainColumnFrame bodyClass="">
  {#snippet header()}
    <PageHeader title="Fields">
      {#snippet actions()}
        <NamespaceSelector />
        <button
          type="button"
          onclick={workflow.openCreate}
          class="px-4 py-2 bg-green-400 text-mono-950 font-inter font-semibold rounded-xl text-sm tracking-wide shadow-sm flex items-center space-x-2 hover:bg-green-300 cursor-pointer transition-colors"
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
  {/snippet}

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
        <SortableColumn
          column="constraints"
          label="Field Constraints"
          {sorts}
          onSort={workflow.handleSort}
        />
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
          class="cursor-pointer transition-colors {workflow.isSelected(field) ? 'bg-mono-800' : 'hover:bg-mono-950'}"
        >
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="text-sm text-mono-100 font-medium">{field.name}</div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <Pill>{field.container ? `${field.container}[${field.type}]` : field.type}</Pill>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <span class="text-sm text-mono-400">{field.namespaceName}</span>
          </td>
          <td class="px-6 py-4 text-sm text-mono-400">
            {#if field.constraints.length > 0}
              <div class="flex flex-wrap gap-1">
                {#each field.constraints as constraintValue}
                  <Pill>{formatFieldConstraintPill(constraintValue)}</Pill>
                {/each}
              </div>
            {:else}
              <span>-</span>
            {/if}
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-mono-400">
            {field.defaultValue !== undefined && field.defaultValue !== '' ? field.defaultValue : '-'}
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="flex items-center space-x-2">
              <Pill>{field.usedInApis.length}</Pill>
              <span class="text-sm text-mono-400">APIs</span>
            </div>
          </td>
        </tr>
      {/each}
    {/snippet}

    {#snippet empty()}
      <TableEmptyState entityName="fields" storeKey={STORE_NAMES.FIELDS} />
    {/snippet}
  </Table>
</MainColumnFrame>

{#snippet fieldFormContentSnippet(_: { close: () => void })}
  {#if workflow.editedItem}
    <FieldFormContent
      bind:editedItem={workflow.editedItem}
      mode={workflow.mode === 'creating' ? 'creating' : 'editing'}
      namespaceName={allNamespaces.find(ns => ns.id === workflow.editedItem?.namespaceId)?.name ?? ''}
      {selectableTypes}
      fieldConstraintDefinitions={fieldConstraints}
      {fieldValidatorTemplates}
      visibleErrors={workflow.visibleErrors}
    />
  {/if}
{/snippet}

{#snippet fieldFormFooter({ close }: { close: () => void })}
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
        id: 'field',
        title: workflow.mode === 'creating' ? 'Create Field' : 'Edit Field',
        width: 720,
        minWidth: 500,
        content: fieldFormContentSnippet,
        footer: fieldFormFooter
      }]
    : []}
  onPopPanel={workflow.closeDrawer}
/>
