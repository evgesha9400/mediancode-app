<script lang="ts">
  import { objectsStore, searchObjects, type ObjectDefinition } from '$lib/stores/objects';
  import { fieldsStore, getFieldById } from '$lib/stores/fields';
  import { activeNamespaceId, namespacesStore } from '$lib/stores/namespaces';
  import { createObjectsModel } from '$lib/stores/objectsModel.svelte';
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
  import { storeLoadingState, reloadStores, STORE_NAMES } from '$lib/stores/loader';
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

  // Filter fields to only show those in the object's namespace
  let namespacedFields = $derived(workflow.editedItem ? fields.filter(f => f.namespaceId === workflow.editedItem!.namespaceId) : []);

  // Derive selected field IDs for the FieldSelectorDropdown
  let selectedFieldIds = $derived(workflow.editedItem?.fields.map(f => f.fieldId) ?? []);

  // Entity-specific UI helpers (not abstractable into workflow)
  function addField(fieldId: string) {
    if (!workflow.editedItem) return;

    workflow.editedItem = {
      ...workflow.editedItem,
      fields: [...workflow.editedItem.fields, { fieldId, required: false }]
    };
  }

  function removeField(fieldId: string) {
    if (!workflow.editedItem) return;
    workflow.editedItem = {
      ...workflow.editedItem,
      fields: workflow.editedItem.fields.filter(f => f.fieldId !== fieldId)
    };
  }

  function toggleFieldRequired(fieldId: string) {
    if (!workflow.editedItem) return;
    const newFields = workflow.editedItem.fields.map(f =>
      f.fieldId === fieldId ? { ...f, required: !f.required } : f
    );
    workflow.editedItem = {
      ...workflow.editedItem,
      fields: newFields
    };
  }

  let hasLoadError = $derived($storeLoadingState.storeErrors.includes(STORE_NAMES.OBJECTS));
</script>

<PageHeader title="Objects">
    {#snippet actions()}
      <NamespaceSelector />
      <button
        type="button"
        onclick={workflow.openCreate}
        class="px-4 py-2 bg-mono-900 text-white rounded-md flex items-center space-x-2 hover:bg-mono-800 cursor-pointer transition-colors"
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
          onclick={() => workflow.selectItem(object)}
          class="cursor-pointer transition-colors {workflow.isSelected(object) ? 'bg-mono-100' : 'hover:bg-mono-50'}"
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

<Drawer open={workflow.drawerOpen} maxWidth={720}>
  <DrawerHeader title={workflow.mode === 'creating' ? 'Create Object' : 'Edit Object'} onClose={workflow.closeDrawer} />

  <DrawerContent>
    {#if workflow.editedItem}
      <div class="space-y-4">
        <!-- Namespace (Read-only - uses active namespace from selector) -->
        <div>
          <label for="object-namespace" class="block text-sm text-mono-700 mb-1 font-medium">
            Namespace
          </label>
          <input
            id="object-namespace"
            type="text"
            value={allNamespaces.find(ns => ns.id === workflow.editedItem?.namespaceId)?.name ?? 'No namespace selected'}
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
            bind:value={workflow.editedItem.name}
            class="w-full px-3 py-2 border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent {workflow.visibleErrors.name ? 'border-red-500' : ''}"
          />
          {#if workflow.visibleErrors.name}
            <p class="text-xs text-red-500 mt-1">{workflow.visibleErrors.name}</p>
          {/if}
        </div>

        <!-- Description -->
        <div>
          <label for="object-description" class="block text-sm text-mono-700 mb-1 font-medium">Description</label>
          <textarea
            id="object-description"
            bind:value={workflow.editedItem.description}
            rows="3"
            class="w-full px-3 py-2 border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent"
          ></textarea>
        </div>

        <!-- Fields -->
        <div>
          <h3 class="text-sm text-mono-700 mb-2 font-medium">Fields ({workflow.editedItem.fields.length})</h3>

          <div class="space-y-2">
            <!-- Field Selector Dropdown -->
            <FieldSelectorDropdown
              availableFields={namespacedFields}
              selectedFieldIds={selectedFieldIds}
              onSelect={addField}
              placeholder="Add field to object..."
            />

            <!-- Selected Fields -->
            {#if workflow.editedItem.fields.length === 0}
              <div class="p-3 bg-mono-50 rounded border border-mono-200">
                <p class="text-xs text-mono-500">No fields selected</p>
              </div>
            {:else}
              <div class="p-2 bg-mono-50 rounded border border-mono-200 space-y-2">
                {#each workflow.editedItem.fields as fieldRef}
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
