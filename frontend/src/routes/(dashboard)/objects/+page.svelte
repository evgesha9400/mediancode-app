<script lang="ts">
  import {
    objectsStore,
    searchObjects,
    searchFields,
    fieldsStore,
    activeNamespaceId,
    namespacesStore
  } from '$lib/stores/stores';
  import type { ObjectDefinition } from '$lib/types';
  import { createCrudModel } from '$lib/stores/crudModel.svelte';
  import { createObjectsContract, newTempMemberId } from '$lib/stores/objectsConfig.svelte';
  import { createFieldsContract } from '$lib/stores/fieldsConfig.svelte';
  import {
    MainColumnFrame,
    PageHeader,
    SearchBar,
    Table,
    SortableColumn,
    Pill,
    TableListNameCell,
    TableListTextCell,
    TableListMetricCell,
    TableEmptyState,
    DrawerStack,
    CrudDrawerFooter,
    NamespaceSelector,
    ObjectFormContent
  } from '$lib/components';
  import { FieldFormContent } from '$lib/components/form';
  import {
    modelValidatorTemplatesStore,
    typesStore,
    getTypeIdByName,
    fieldConstraintsStore,
    fieldValidatorTemplatesStore
  } from '$lib/stores/stores';
  import { STORE_NAMES } from '$lib/stores/loader';
  import {
    dashboardPageHeaderPrimaryButton,
    tableListRowHover,
    tableListRowInteractive,
    tableListRowSelected
  } from '$lib/ui/classes';
  import { getTableRowId } from '$lib/utils/testIds';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';

  // Extended object type with computed properties for sorting
  type ObjectWithCounts = ObjectDefinition & {
    memberCount: number;
    usedInApisCount: number;
  };

  // Build filter config (empty initially)
  let objectFilterConfig = $derived([]);

  // Reactive store subscription for derived computations
  let allNamespaces = $derived($namespacesStore);

  // Filter objects by active namespace
  let namespacedObjects = $derived($objectsStore.filter(o => o.namespaceId === $activeNamespaceId));

  // Per-entity CRUD model
  const contract = createObjectsContract({ getActiveNamespaceId: () => $activeNamespaceId });
  const workflow = createCrudModel(contract, {
    itemsStore: () => namespacedObjects,
    searchFn: searchObjects,
    filterSections: () => objectFilterConfig,
    urlScope: { page, goto }
  });

  // Truly derived values (read-only computations)
  let filteredObjects = $derived(workflow.results as ObjectWithCounts[]);
  let sorts = $derived(workflow.sorts);

  let fields = $derived($fieldsStore);
  let selectableTypes = $derived($typesStore);
  let fieldConstraints = $derived($fieldConstraintsStore);
  let fieldValidatorTemplates = $derived($fieldValidatorTemplatesStore);
  let modelValidatorTemplates = $derived($modelValidatorTemplatesStore);

  // Filter fields to only show those in the object's namespace
  let namespacedFields = $derived(workflow.editedItem ? fields.filter(f => f.namespaceId === workflow.editedItem!.namespaceId) : []);

  // Namespace name for field form
  let objectNamespaceName = $derived(
    allNamespaces.find(ns => ns.id === workflow.editedItem?.namespaceId)?.name ?? 'No namespace selected'
  );

  const fieldContract = createFieldsContract({
    getActiveNamespaceId: () => workflow.editedItem?.namespaceId ?? $activeNamespaceId,
    getDefaultType: () => selectableTypes[0]?.name ?? 'str',
    getTypeIdByName,
    afterCreate: (field) => {
      if (!workflow.editedItem) return;
      workflow.editedItem = {
        ...workflow.editedItem,
        members: [
          ...workflow.editedItem.members,
          {
            memberType: 'scalar',
            id: newTempMemberId(),
            name: field.name,
            fieldId: field.id,
            role: 'writable',
            isNullable: false
          }
        ]
      };
    }
  });
  const fieldWorkflow = createCrudModel(fieldContract, {
    itemsStore: () => namespacedFields,
    searchFn: searchFields,
    filterSections: () => [],
    urlScope: { page, goto }
  });
</script>

<MainColumnFrame bodyClass="">
  {#snippet header()}
    <PageHeader title="Objects">
      {#snippet actions()}
        <NamespaceSelector />
        <button
          type="button"
          onclick={workflow.openCreate}
          class={dashboardPageHeaderPrimaryButton}
        >
          <i class="fa-solid fa-plus"></i>
          <span>Create Object</span>
        </button>
      {/snippet}
    </PageHeader>

    <SearchBar
      bind:searchQuery={workflow.query}
      placeholder="Search objects..."
      resultsCount={filteredObjects.length}
      resultLabel="object"
      showFilter={false}
      active={false}
    />
  {/snippet}

  <Table isEmpty={filteredObjects.length === 0}>
    {#snippet header()}
      <tr>
        <SortableColumn
          column="name"
          label="Object Name"
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
          column="members"
          label="Members"
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
      {#each filteredObjects as object}
        <tr
          data-testid={getTableRowId(object.id)}
          onclick={() => workflow.selectItem(object)}
          class="{tableListRowInteractive} {workflow.isSelected(object)
            ? tableListRowSelected
            : tableListRowHover}"
        >
          <TableListNameCell col="name">
            {#snippet children()}
              {object.name}
            {/snippet}
          </TableListNameCell>
          <TableListTextCell col="description">
            {#snippet children()}
              {object.description || '-'}
            {/snippet}
          </TableListTextCell>
          <TableListMetricCell col="members" label="members">
            {#snippet pill()}
              <Pill>{object.members.length}</Pill>
            {/snippet}
          </TableListMetricCell>
          <TableListMetricCell col="usedInApis" label="APIs">
            {#snippet pill()}
              <Pill>{object.usedInApis.length}</Pill>
            {/snippet}
          </TableListMetricCell>
        </tr>
      {/each}
    {/snippet}

    {#snippet empty()}
      <TableEmptyState entityName="objects" storeKey={STORE_NAMES.OBJECTS} />
    {/snippet}
  </Table>
</MainColumnFrame>

{#snippet objectFormContent(_: { close: () => void })}
  {#if workflow.editedItem}
    <ObjectFormContent
      bind:editedItem={workflow.editedItem}
      mode={workflow.mode === 'creating' ? 'creating' : 'editing'}
      availableFields={namespacedFields}
      {modelValidatorTemplates}
      visibleErrors={workflow.visibleErrors}
      onCreateNewField={fieldWorkflow.openCreate}
    />
  {/if}
{/snippet}

{#snippet objectFormFooter({ close }: { close: () => void })}
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

{#snippet fieldFormContent(_: { close: () => void })}
  {#if fieldWorkflow.editedItem}
    <FieldFormContent
      bind:editedItem={fieldWorkflow.editedItem}
      mode="creating"
      {selectableTypes}
      fieldConstraintDefinitions={fieldConstraints}
      {fieldValidatorTemplates}
      visibleErrors={fieldWorkflow.visibleErrors}
    />
  {/if}
{/snippet}

{#snippet fieldFormFooter({ close }: { close: () => void })}
  <CrudDrawerFooter
    mode="creating"
    isSaving={fieldWorkflow.isSaving}
    isFormValid={fieldWorkflow.isFormValid}
    onCreate={fieldWorkflow.handleCreate}
    onCancel={close}
  />
{/snippet}

<DrawerStack
  panels={workflow.drawerOpen
    ? [
        {
          id: 'object',
          title: workflow.mode === 'creating' ? 'Create Object' : 'Edit Object',
          headerNamespace: objectNamespaceName,
          width: 800,
          minWidth: 500,
          content: objectFormContent,
          footer: objectFormFooter
        },
        ...(fieldWorkflow.drawerOpen
          ? [{
              id: 'field',
              title: 'Create Field',
              headerNamespace: objectNamespaceName,
              width: 800,
              minWidth: 500,
              content: fieldFormContent,
              footer: fieldFormFooter
            }]
          : [])
      ]
    : []
  }
  onPopPanel={fieldWorkflow.drawerOpen ? fieldWorkflow.closeDrawer : workflow.closeDrawer}
/>
