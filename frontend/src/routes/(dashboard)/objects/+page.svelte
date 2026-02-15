<script lang="ts">
  import { objectsStore, searchObjects, type ObjectDefinition } from '$lib/stores/objects';
  import { createObjectAction, updateObjectAction, deleteObjectAction } from '$lib/stores/actions';
  import { fieldsStore, getFieldById } from '$lib/stores/fields';
  import { showToast } from '$lib/stores/toasts';
  import { activeNamespaceId, getNamespaceById } from '$lib/stores/namespaces';
  import { buildDeletionTooltip } from '$lib/utils/references';
  import {
    PageHeader,
    SearchBar,
    Table,
    SortableColumn,
    EmptyState,
    Drawer,
    DrawerHeader,
    DrawerContent,
    DrawerFooter,
    CrudDrawerFooter,
    FieldSelectorDropdown,
    NamespaceSelector
  } from '$lib/components';
  import { storeLoadingState, reloadStores } from '$lib/stores/loader';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { createListViewState } from '$lib/stores/listViewState.svelte';

  // Extended object type with computed properties for sorting
  type ObjectWithCounts = ObjectDefinition & {
    fieldCount: number;
    usedInApisCount: number;
    namespaceName: string;
  };

  // Filter state type (no filters initially)
  type ObjectFilterState = Record<string, never>;

  // Build filter config (empty initially)
  let objectFilterConfig = $derived([]);

  // Form tracking
  let isSaving = $state(false);
  let isDeleting = $state(false);

  // Filter objects by active namespace
  let namespacedObjects = $derived($objectsStore.filter(o => o.namespaceId === $activeNamespaceId));

  // Create list view state (owns all reactive state)
  const listState = createListViewState<ObjectDefinition, ObjectFilterState>({
    itemsStore: () => namespacedObjects,
    searchFn: searchObjects,
    filterSections: () => objectFilterConfig,
    numericColumns: new Set(['fieldCount', 'usedInApisCount']),
    urlScope: { page, goto },
    highlightParamKey: 'highlight',
    getItemId: (obj) => obj.id,
    deriveExtra: (obj) => ({
      fieldCount: obj.fields.length,
      usedInApisCount: obj.usedInApis.length,
      namespaceName: getNamespaceById(obj.namespaceId)?.name ?? ''
    }),
    sortColumnMap: { 'fields': 'fieldCount', 'usedInApis': 'usedInApisCount', 'namespace': 'namespaceName' },
    drawerConfig: {
      trackEdits: true,
      allowDelete: true,
      closeDelay: 300
    }
  });

  // Convenience aliases for template bindings
  let selectedObject = $derived(listState.selectedItem);
  let editedObject = $derived(listState.editedItem);
  let originalObject = $derived(listState.originalItem);
  let validationErrors = $derived(listState.validationErrors);
  let showDeleteConfirm = $derived(listState.showDeleteConfirm);
  let filteredObjects = $derived(listState.results as ObjectWithCounts[]);
  let sorts = $derived(listState.sorts);
  let activeFiltersCount = $derived(listState.activeFiltersCount);
  let hasChanges = $derived(listState.hasChanges);

  let fields = $derived($fieldsStore);

  // Filter fields to only show those in the object's namespace
  let namespacedFields = $derived(editedObject ? fields.filter(f => f.namespaceId === editedObject.namespaceId) : []);

  // Derive selected field IDs for the FieldSelectorDropdown
  let selectedFieldIds = $derived(editedObject?.fields.map(f => f.fieldId) ?? []);

  function selectObject(obj: ObjectDefinition) {
    listState.selectItem(obj);
  }

  function closeDrawer() {
    listState.closeDrawer();
  }

  function createObjectDraft(): ObjectDefinition {
    return {
      id: '',
      namespaceId: $activeNamespaceId,
      name: '',
      description: '',
      fields: [],
      usedInApis: []
    };
  }

  function openCreateDrawer() {
    listState.openCreate(createObjectDraft());
  }

  function isSelected(obj: ObjectDefinition): boolean {
    return selectedObject?.id === obj.id;
  }

  function validateForm(): boolean {
    const errors: Record<string, string> = {};
    let isValid = true;

    if (!editedObject) return false;

    if (!editedObject.name.trim()) {
      errors.name = 'Object name is required';
      isValid = false;
    }

    listState.validationErrors = errors;
    return isValid;
  }

  async function handleSave() {
    if (!editedObject || !validateForm() || isSaving) return;

    const objectName = editedObject.name;
    isSaving = true;

    // Strip derived properties before saving
    const { fieldCount, usedInApisCount, namespaceName, ...cleanObject } = editedObject as ObjectWithCounts;

    const result = await updateObjectAction(cleanObject.id, {
      name: cleanObject.name,
      description: cleanObject.description,
      fields: cleanObject.fields
    });

    if (!result.success) {
      isSaving = false;
      if (result.error?.includes('already exists')) {
        listState.validationErrors = { name: result.error };
      } else {
        showToast(result.error || 'Failed to update object', 'error', 5000);
      }
      return;
    }

    listState.selectedItem = result.data!;
    listState.originalItem = JSON.parse(JSON.stringify(result.data!));
    showToast(`Object "${objectName}" updated successfully`, 'success', 3000);
    closeDrawer();
    isSaving = false;
  }

  async function handleCreate() {
    if (!editedObject || !validateForm() || isSaving) return;

    isSaving = true;

    const result = await createObjectAction({
      namespaceId: editedObject.namespaceId,
      name: editedObject.name,
      description: editedObject.description,
      fields: editedObject.fields
    });

    if (!result.success) {
      isSaving = false;
      if (result.error?.includes('already exists')) {
        listState.validationErrors = { name: result.error };
      } else {
        showToast(result.error || 'Failed to create object', 'error', 5000);
      }
      return;
    }

    showToast(`Object "${result.data!.name}" created successfully`, 'success', 3000);
    closeDrawer();
    isSaving = false;
  }

  function handleUndo() {
    if (originalObject) {
      listState.editedItem = JSON.parse(JSON.stringify(originalObject));
      listState.validationErrors = {};
    }
  }

  async function handleDelete() {
    if (!editedObject || isDeleting) return;

    const objectName = editedObject.name;
    isDeleting = true;

    const result = await deleteObjectAction(editedObject.id);

    if (result.success) {
      closeDrawer();
      isDeleting = false;
      showToast(`Object "${objectName}" deleted successfully`, 'success', 3000);
    } else {
      isDeleting = false;
      showToast(result.error || 'Failed to delete object', 'error', 5000);
    }
  }

  function addField(fieldId: string) {
    if (!editedObject) return;

    listState.editedItem = {
      ...editedObject,
      fields: [...editedObject.fields, { fieldId, required: false }]
    };
  }

  function removeField(fieldId: string) {
    if (!editedObject) return;
    listState.editedItem = {
      ...editedObject,
      fields: editedObject.fields.filter(f => f.fieldId !== fieldId)
    };
  }

  function toggleFieldRequired(fieldId: string) {
    if (!editedObject) return;
    const newFields = editedObject.fields.map(f =>
      f.fieldId === fieldId ? { ...f, required: !f.required } : f
    );
    listState.editedItem = {
      ...editedObject,
      fields: newFields
    };
  }

  let hasReferences = $derived(editedObject ? editedObject.usedInApis.length > 0 : false);
  let deleteTooltip = $derived(editedObject && hasReferences
    ? buildDeletionTooltip('object', 'API', editedObject!.usedInApis.map(api => ({ name: api })))
    : '');
  let hasLoadError = $derived($storeLoadingState.storeErrors.includes('Objects'));
</script>

<PageHeader title="Objects">
    {#snippet actions()}
      <NamespaceSelector />
      <button
        type="button"
        onclick={openCreateDrawer}
        class="px-4 py-2 bg-mono-900 text-white rounded-md flex items-center space-x-2 hover:bg-mono-800 cursor-pointer transition-colors"
      >
        <i class="fa-solid fa-plus"></i>
        <span>Create Object</span>
      </button>
    {/snippet}
  </PageHeader>

  <SearchBar
    bind:searchQuery={listState.query}
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
          onSort={listState.handleSort}
        />
        <SortableColumn
          column="namespace"
          label="Namespace"
          {sorts}
          onSort={listState.handleSort}
        />
        <SortableColumn
          column="fields"
          label="Fields"
          {sorts}
          onSort={listState.handleSort}
        />
        <SortableColumn
          column="usedInApis"
          label="Used In APIs"
          {sorts}
          onSort={listState.handleSort}
        />
        <th scope="col" class="px-6 py-3 text-left text-xs text-mono-500 tracking-wider font-medium">
          <div class="flex items-center space-x-1">
            <span>Description</span>
          </div>
        </th>
      </tr>
    {/snippet}

    {#snippet body()}
      {#each filteredObjects as object}
        <tr
          onclick={() => selectObject(object)}
          class="cursor-pointer transition-colors {isSelected(object) ? 'bg-mono-100' : 'hover:bg-mono-50'}"
        >
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="text-sm text-mono-900 font-medium">{object.name}</div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <span class="text-sm text-mono-600">{object.namespaceName}</span>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="flex items-center space-x-2">
              <span class="px-2 py-1 text-xs rounded-full bg-mono-200 text-mono-700">
                {object.fields.length}
              </span>
              <span class="text-sm text-mono-600">fields</span>
            </div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="flex items-center space-x-2">
              <span class="px-2 py-1 text-xs rounded-full bg-mono-200 text-mono-700">
                {object.usedInApis.length}
              </span>
              <span class="text-sm text-mono-600">APIs</span>
            </div>
          </td>
          <td class="px-6 py-4 text-sm text-mono-500">
            {object.description || '-'}
          </td>
        </tr>
      {/each}
    {/snippet}

    {#snippet empty()}
      {#if hasLoadError}
        <EmptyState
          icon="fa-circle-exclamation"
          variant="error"
          title="Failed to load objects"
          message="Something went wrong while fetching object data"
          actionLabel="Retry"
          onAction={reloadStores}
        />
      {:else}
        <EmptyState
          title="No objects found"
          message="Try adjusting your search query"
        />
      {/if}
    {/snippet}
  </Table>

<Drawer open={listState.drawerOpen} maxWidth={720}>
  <DrawerHeader title={listState.mode === 'creating' ? 'Create Object' : 'Edit Object'} onClose={closeDrawer} />

  <DrawerContent>
    {#if editedObject}
      <div class="space-y-4">
        <!-- Namespace (Read-only - uses active namespace from selector) -->
        <div>
          <label for="object-namespace" class="block text-sm text-mono-700 mb-1 font-medium">
            Namespace
          </label>
          <input
            id="object-namespace"
            type="text"
            value={getNamespaceById(editedObject.namespaceId)?.name ?? 'No namespace selected'}
            disabled
            class="w-full px-3 py-2 border border-mono-200 rounded-lg bg-mono-100 text-mono-500 cursor-not-allowed"
          />
          <p class="mt-1 text-xs text-mono-500">
            Namespace is determined by the selector above
          </p>
        </div>

        <!-- Object Name -->
        <div>
          <label for="object-name" class="block text-sm text-mono-700 mb-1 font-medium">
            Object Name <span class="text-red-500">*</span>
          </label>
          <input
            id="object-name"
            type="text"
            bind:value={editedObject.name}
            class="w-full px-3 py-2 border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent {validationErrors.name ? 'border-red-500' : ''}"
          />
          {#if validationErrors.name}
            <p class="text-xs text-red-500 mt-1">{validationErrors.name}</p>
          {/if}
        </div>

        <!-- Description -->
        <div>
          <label for="object-description" class="block text-sm text-mono-700 mb-1 font-medium">Description</label>
          <textarea
            id="object-description"
            bind:value={editedObject.description}
            rows="3"
            class="w-full px-3 py-2 border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent"
          ></textarea>
        </div>

        <!-- Fields -->
        <div>
          <h3 class="text-sm text-mono-700 mb-2 font-medium">Fields ({editedObject.fields.length})</h3>

          <div class="space-y-2">
            <!-- Field Selector Dropdown -->
            <FieldSelectorDropdown
              availableFields={namespacedFields}
              selectedFieldIds={selectedFieldIds}
              onSelect={addField}
              placeholder="Add field to object..."
            />

            <!-- Selected Fields -->
            {#if editedObject.fields.length === 0}
              <div class="p-3 bg-mono-50 rounded border border-mono-200">
                <p class="text-xs text-mono-500">No fields selected</p>
              </div>
            {:else}
              <div class="p-2 bg-mono-50 rounded border border-mono-200 space-y-2">
                {#each editedObject.fields as fieldRef}
                  {@const field = getFieldById(fieldRef.fieldId)}
                  {#if field}
                    <div class="flex items-center space-x-2 p-2 bg-white rounded border border-mono-200">
                      <!-- Field Name and Type -->
                      <div class="flex items-center space-x-2">
                        <span class="font-mono text-sm text-mono-700">{field.name}</span>
                        <span class="text-xs text-mono-500 bg-mono-100 px-2 py-0.5 rounded">{field.type}</span>
                      </div>

                      <!-- Description (if available) -->
                      {#if field.description}
                        <div class="flex-1 text-xs text-mono-500">
                          {field.description}
                        </div>
                      {:else}
                        <div class="flex-1"></div>
                      {/if}

                      <!-- Required Checkbox -->
                      <label class="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={fieldRef.required}
                          onchange={() => toggleFieldRequired(fieldRef.fieldId)}
                          class="h-4 w-4 border-mono-300 rounded text-mono-900 focus:ring-2 focus:ring-mono-400"
                        />
                        <span class="text-sm text-mono-600 whitespace-nowrap">Required</span>
                      </label>

                      <!-- Delete Button (aligned to the right) -->
                      <button
                        type="button"
                        onclick={() => removeField(fieldRef.fieldId)}
                        class="text-red-700 hover:text-red-600 transition-colors"
                        title="Remove field"
                      >
                        <i class="fa-solid fa-xmark"></i>
                      </button>
                    </div>
                  {:else}
                    <!-- Missing field fallback - field was deleted from registry -->
                    <div class="flex items-center gap-2 py-1.5">
                      <i class="fa-solid fa-triangle-exclamation text-red-500 text-sm"></i>
                      <span class="flex-1 text-sm text-red-700">
                        Field not found <span class="font-mono text-xs text-red-500">({fieldRef.fieldId})</span>
                      </span>
                      <button
                        type="button"
                        onclick={() => removeField(fieldRef.fieldId)}
                        class="p-1 text-red-700 hover:text-red-600 hover:bg-red-100 rounded transition-colors"
                        title="Remove missing field reference"
                      >
                        <i class="fa-solid fa-xmark"></i>
                      </button>
                    </div>
                  {/if}
                {/each}
              </div>
            {/if}
          </div>
        </div>

        <!-- Used In APIs -->
        <div>
          <h3 class="text-sm text-mono-700 mb-2 font-medium">Used In APIs ({editedObject.usedInApis.length})</h3>
          <div class="space-y-2">
            {#each editedObject.usedInApis as api}
              <div class="flex items-center justify-between p-3 bg-mono-50 rounded-md">
                <div class="flex items-center space-x-2">
                  <i class="fa-solid fa-code text-mono-400"></i>
                  <span class="text-sm text-mono-900">{api}</span>
                </div>
              </div>
            {/each}
            {#if editedObject.usedInApis.length === 0}
              <p class="text-sm text-mono-500 italic">Not used in any APIs</p>
            {/if}
          </div>
        </div>
      </div>
    {/if}
  </DrawerContent>

  <DrawerFooter>
    {#if editedObject}
      <CrudDrawerFooter
        mode={listState.mode === 'creating' ? 'creating' : 'editing'}
        entityName="Object"
        {isSaving}
        isFormValid={editedObject.name.trim() !== '' && !!editedObject.namespaceId}
        {hasChanges}
        canDelete={!hasReferences}
        {deleteTooltip}
        showDeleteConfirm={listState.showDeleteConfirm}
        {isDeleting}
        onCreate={handleCreate}
        onSave={handleSave}
        onUndo={handleUndo}
        onCancel={closeDrawer}
        onDeleteRequest={() => listState.showDeleteConfirm = true}
        onDeleteConfirm={handleDelete}
        onDeleteCancel={() => listState.showDeleteConfirm = false}
      />
    {/if}
  </DrawerFooter>
</Drawer>
