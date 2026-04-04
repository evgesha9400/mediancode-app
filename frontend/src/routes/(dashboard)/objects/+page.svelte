<script lang="ts">
  import { objectsStore, searchObjects, type ObjectDefinition } from '$lib/stores/objects';
  import { fieldsStore } from '$lib/stores/fields';
  import { activeNamespaceId, namespacesStore } from '$lib/stores/namespaces';
  import { createObjectsModel } from '$lib/stores/objectsModel.svelte';
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
  import type { Field } from '$lib/types';
  import { modelValidatorTemplatesStore } from '$lib/stores/modelValidatorTemplates';
  import { typesStore, getTypeIdByName } from '$lib/stores/types';
  import { fieldConstraintsStore } from '$lib/stores/fieldConstraints';
  import { fieldValidatorTemplatesStore } from '$lib/stores/fieldValidatorTemplates';
  import { createFieldApi } from '$lib/api/fields';
  import { mapApiError } from '$lib/domain/errorMap';
  import { showToast } from '$lib/stores/toasts';
  import { STORE_NAMES } from '$lib/stores/loader';
  import { tableListRowHover, tableListRowInteractive, tableListRowSelected } from '$lib/ui/classes';
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

  // Per-entity CRUD model (replaces listViewState + crudWorkflow + entityContract)
  const workflow = createObjectsModel({
    itemsStore: () => namespacedObjects,
    searchFn: searchObjects,
    filterSections: () => objectFilterConfig,
    urlScope: { page, goto },
    getActiveNamespaceId: () => $activeNamespaceId
  });

  // Truly derived values (read-only computations)
  let filteredObjects = $derived(workflow.results as ObjectWithCounts[]);
  let sorts = $derived(workflow.sorts);

  let fields = $derived($fieldsStore);
  let modelValidatorTemplates = $derived($modelValidatorTemplatesStore);

  // Filter fields to only show those in the object's namespace
  let namespacedFields = $derived(workflow.editedItem ? fields.filter(f => f.namespaceId === workflow.editedItem!.namespaceId) : []);

  // Namespace name for field form
  let objectNamespaceName = $derived(
    allNamespaces.find(ns => ns.id === workflow.editedItem?.namespaceId)?.name ?? 'No namespace selected'
  );

  // ============================================================================
  // Inline Field Creation Overlay
  // ============================================================================

  let fieldCreateOpen = $state(false);
  let editedNewField = $state<Field | null>(null);
  let fieldFormTouched = $state(false);
  let fieldSaving = $state(false);

  let fieldFormErrors = $derived.by(() => {
    if (!editedNewField) return {};
    const errors: Record<string, string> = {};
    if (!editedNewField.name.trim()) errors.name = 'Field name is required';
    if (!editedNewField.type) errors.type = 'Type is required';
    return errors;
  });
  let fieldFormValid = $derived(editedNewField !== null && Object.keys(fieldFormErrors).length === 0);
  let fieldVisibleErrors = $derived(fieldFormTouched ? fieldFormErrors : {});

  function openFieldCreate() {
    editedNewField = {
      id: '',
      namespaceId: workflow.editedItem?.namespaceId ?? $activeNamespaceId,
      name: '',
      type: $typesStore.length > 0 ? $typesStore[0].name : 'str',
      container: null,
      constraints: [],
      validators: [],
      usedInApis: [],
      description: '',
      defaultValue: ''
    };
    fieldFormTouched = false;
    fieldCreateOpen = true;
  }

  function closeFieldCreate() {
    fieldCreateOpen = false;
    editedNewField = null;
  }

  async function handleCreateField() {
    fieldFormTouched = true;
    if (!fieldFormValid || !editedNewField) return;

    const typeId = getTypeIdByName(editedNewField.type);
    if (!typeId) {
      showToast(`Unknown type "${editedNewField.type}"`, 'error');
      return;
    }

    fieldSaving = true;
    try {
      const field = await createFieldApi({
        namespaceId: editedNewField.namespaceId,
        name: editedNewField.name,
        typeId,
        container: editedNewField.container,
        description: editedNewField.description,
        defaultValue: editedNewField.defaultValue,
        constraints: editedNewField.constraints.map(c => ({ constraintId: c.constraintId, value: c.value })),
        validators: editedNewField.validators.length > 0
          ? editedNewField.validators.map(v => ({ templateId: v.templateId, parameters: v.parameters ?? undefined }))
          : undefined
      });

      fieldsStore.update(fields => [...fields, field]);

      // Auto-add the new field to the object being edited/created
      if (workflow.editedItem) {
        workflow.editedItem = {
          ...workflow.editedItem,
          members: [...workflow.editedItem.members, { memberType: 'scalar' as const, name: field.name, fieldId: field.id, role: 'writable' as const, isNullable: false }]
        };
      }

      showToast(`Field "${editedNewField.name}" created`, 'success');
      closeFieldCreate();
    } catch (err) {
      showToast(mapApiError(err, 'create field'), 'error');
    } finally {
      fieldSaving = false;
    }
  }
</script>

<MainColumnFrame bodyClass="">
  {#snippet header()}
    <PageHeader title="Objects">
      {#snippet actions()}
        <NamespaceSelector />
        <button
          type="button"
          onclick={workflow.openCreate}
          class="px-4 py-2 bg-green-400 text-mono-950 font-inter font-semibold rounded-xl text-sm tracking-wide shadow-sm flex items-center space-x-2 hover:bg-green-300 cursor-pointer transition-colors"
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
      onCreateNewField={openFieldCreate}
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
  {#if editedNewField}
    <FieldFormContent
      bind:editedItem={editedNewField}
      mode="creating"
      selectableTypes={$typesStore}
      fieldConstraintDefinitions={$fieldConstraintsStore}
      fieldValidatorTemplates={$fieldValidatorTemplatesStore}
      visibleErrors={fieldVisibleErrors}
    />
  {/if}
{/snippet}

{#snippet fieldFormFooter({ close }: { close: () => void })}
  <CrudDrawerFooter
    mode="creating"
    isSaving={fieldSaving}
    isFormValid={fieldFormValid}
    onCreate={handleCreateField}
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
        ...(fieldCreateOpen
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
  onPopPanel={fieldCreateOpen ? closeFieldCreate : workflow.closeDrawer}
/>
