<script lang="ts">
  import { objectsStore, searchObjects, type ObjectDefinition } from '$lib/stores/objects';
  import { fieldsStore } from '$lib/stores/fields';
  import { activeNamespaceId, namespacesStore } from '$lib/stores/namespaces';
  import { createObjectsModel } from '$lib/stores/objectsModel.svelte';
  import {
    PageHeader,
    SearchBar,
    Table,
    SortableColumn,
    Pill,
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
  import { page } from '$app/state';
  import { goto } from '$app/navigation';

  // Extended object type with computed properties for sorting
  type ObjectWithCounts = ObjectDefinition & {
    fieldCount: number;
    usedInApisCount: number;
    namespaceName: string;
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
    getActiveNamespaceId: () => $activeNamespaceId,
    getNamespaceName: (nsId) => allNamespaces.find(ns => ns.id === nsId)?.name ?? ''
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
          fields: [...workflow.editedItem.fields, { fieldId: field.id, role: 'writable' as const, nullable: false }]
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

<PageHeader title="Objects">
    {#snippet actions()}
      <NamespaceSelector />
      <button
        type="button"
        onclick={workflow.openCreate}
        class="px-4 py-2 bg-green-400 text-mono-950 font-bold tracking-wide flex items-center space-x-2 hover:bg-green-300 cursor-pointer transition-colors"
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
          column="namespace"
          label="Namespace"
          {sorts}
          onSort={workflow.handleSort}
        />
        <SortableColumn
          column="fields"
          label="Fields"
          {sorts}
          onSort={workflow.handleSort}
        />
        <SortableColumn
          column="usedInApis"
          label="Used In APIs"
          {sorts}
          onSort={workflow.handleSort}
        />
        <SortableColumn
          column="description"
          label="Description"
          {sorts}
          onSort={workflow.handleSort}
        />
      </tr>
    {/snippet}

    {#snippet body()}
      {#each filteredObjects as object}
        <tr
          onclick={() => workflow.selectItem(object)}
          class="cursor-pointer transition-colors {workflow.isSelected(object) ? 'bg-mono-800' : 'hover:bg-mono-950'}"
        >
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="text-sm text-mono-100 font-medium">{object.name}</div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <span class="text-sm text-mono-400">{object.namespaceName}</span>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="flex items-center space-x-2">
              <Pill>{object.fields.length}</Pill>
              <span class="text-sm text-mono-400">fields</span>
            </div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="flex items-center space-x-2">
              <Pill>{object.usedInApis.length}</Pill>
              <span class="text-sm text-mono-400">APIs</span>
            </div>
          </td>
          <td class="px-6 py-4 text-sm text-mono-400">
            {object.description || '-'}
          </td>
        </tr>
      {/each}
    {/snippet}

    {#snippet empty()}
      <TableEmptyState entityName="objects" storeKey={STORE_NAMES.OBJECTS} />
    {/snippet}
  </Table>

{#snippet objectFormContent(_: { close: () => void })}
  {#if workflow.editedItem}
    <ObjectFormContent
      bind:editedItem={workflow.editedItem}
      mode={workflow.mode === 'creating' ? 'creating' : 'editing'}
      namespaceName={objectNamespaceName}
      availableFields={namespacedFields}
      {modelValidatorTemplates}
      visibleErrors={workflow.visibleErrors}
      onCreateNewField={openFieldCreate}
    />
  {/if}
{/snippet}

{#snippet objectFormFooter(_: { close: () => void })}
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
{/snippet}

{#snippet fieldFormContent(_: { close: () => void })}
  {#if editedNewField}
    <FieldFormContent
      bind:editedItem={editedNewField}
      mode="creating"
      namespaceName={objectNamespaceName}
      selectableTypes={$typesStore}
      fieldConstraintDefinitions={$fieldConstraintsStore}
      fieldValidatorTemplates={$fieldValidatorTemplatesStore}
      visibleErrors={fieldVisibleErrors}
    />
  {/if}
{/snippet}

{#snippet fieldFormFooter(_: { close: () => void })}
  <div class="flex space-x-2">
    <button
      type="button"
      onclick={handleCreateField}
      disabled={fieldSaving}
      class="flex-1 px-4 py-2 transition-colors font-medium flex items-center justify-center space-x-2 {!fieldSaving ? 'bg-green-400 text-mono-950 hover:bg-green-300 font-bold tracking-wide cursor-pointer' : 'bg-mono-700 text-mono-500 cursor-not-allowed'}"
    >
      {#if fieldSaving}
        <i class="fa-solid fa-spinner fa-spin"></i>
        <span>Creating...</span>
      {:else}
        <span>Create Field</span>
      {/if}
    </button>
    <button
      type="button"
      onclick={closeFieldCreate}
      disabled={fieldSaving}
      class="flex-1 px-4 py-2 border border-mono-600 text-mono-300 hover:bg-mono-950 cursor-pointer transition-colors font-medium"
    >
      Cancel
    </button>
  </div>
{/snippet}

<DrawerStack
  panels={workflow.drawerOpen
    ? [
        {
          id: 'object',
          title: workflow.mode === 'creating' ? 'Create Object' : 'Edit Object',
          width: 720,
          minWidth: 500,
          content: objectFormContent,
          footer: objectFormFooter
        },
        ...(fieldCreateOpen
          ? [{
              id: 'field',
              title: 'Create Field',
              width: 720,
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
