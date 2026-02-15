<script lang="ts">
  import { fieldsStore, searchFields, type Field, type FieldConstraintValue } from '$lib/stores/fields';
  import { createFieldAction, updateFieldAction, deleteFieldAction } from '$lib/stores/actions';
  import { fieldConstraintsStore, getFieldConstraintsByFieldType, type FieldConstraint } from '$lib/stores/fieldConstraints';
  import { getSelectableTypes, getTypeIdByName } from '$lib/stores/types';
  import { showToast } from '$lib/stores/toasts';
  import { activeNamespaceId, namespacesStore, getNamespaceById } from '$lib/stores/namespaces';
  import { buildDeletionTooltip } from '$lib/utils/references';
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
    Tooltip,
    NamespaceSelector,
    FieldConstraintSelectorDropdown,
    TypeSelectorDropdown
  } from '$lib/components';
  import type { FilterConfig } from '$lib/types';
  import { storeLoadingState, reloadStores } from '$lib/stores/loader';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { createListViewState } from '$lib/stores/listViewState.svelte';

  // Extended field type with computed properties for sorting
  type FieldWithApiCount = Field & { usedInApisCount: number; namespaceName: string };

  // Filter state type
  type FieldFilterState = {
    selectedTypes: string[];
    onlyUsedInApis: boolean;
    onlyHasConstraints: boolean;
  };

  // Form tracking
  let previousFieldType = $state<string | null>(null);
  let isCreating = $state(false);
  let isSaving = $state(false);
  let isDeleting = $state(false);

  let selectableTypes = $derived(getSelectableTypes());

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

  // Create list view state (owns all reactive state)
  const listState = createListViewState<Field, FieldFilterState>({
    itemsStore: () => namespacedFields,
    searchFn: searchFields,
    filterSections: () => fieldFilterConfig,
    numericColumns: new Set(['usedInApisCount']),
    urlScope: { page, goto },
    highlightParamKey: 'highlight',
    getItemId: (field) => field.id,
    deriveExtra: (field) => ({
      usedInApisCount: field.usedInApis.length,
      namespaceName: getNamespaceById(field.namespaceId)?.name ?? ''
    }),
    sortColumnMap: { 'usedInApis': 'usedInApisCount', 'namespace': 'namespaceName' },
    drawerConfig: {
      trackEdits: true,
      allowDelete: true,
      closeDelay: 300
    }
  });

  // Convenience aliases for template bindings
  let selectedField = $derived(listState.selectedItem);
  let editedField = $derived(listState.editedItem);
  let originalField = $derived(listState.originalItem);
  let validationErrors = $derived(listState.validationErrors);
  let showDeleteConfirm = $derived(listState.showDeleteConfirm);
  let filteredFields = $derived(listState.results as FieldWithApiCount[]);
  let sorts = $derived(listState.sorts);
  let activeFiltersCount = $derived(listState.activeFiltersCount);
  let hasChanges = $derived(listState.hasChanges);

  let fieldConstraints = $derived($fieldConstraintsStore);
  // Filter field constraints by field's type compatibility
  let availableFieldConstraints = $derived(
    editedField
      ? getFieldConstraintsByFieldType(editedField.type)
      : []
  );

  // Derive selected field constraint names for the FieldConstraintSelectorDropdown
  let selectedFieldConstraintNames = $derived(editedField?.constraints.map(v => v.name) ?? []);

  function handleTypeChange(newType: string) {
    if (!editedField) return;

    // If type actually changed, reset constraints and default value
    if (previousFieldType !== null && previousFieldType !== newType) {
      listState.editedItem = {
        ...editedField,
        constraints: [],
        defaultValue: ''
      };
    }

    previousFieldType = newType;
  }

  function selectField(field: Field) {
    listState.selectItem(field);
    previousFieldType = field.type;
  }

  function closeDrawer() {
    listState.closeDrawer();
    previousFieldType = null;
    isCreating = false;
  }

  function createFieldDraft(): Field {
    const firstType = selectableTypes[0]?.name ?? 'str';
    return {
      id: '',
      namespaceId: $activeNamespaceId,
      name: '',
      type: firstType,
      constraints: [],
      usedInApis: [],
      description: '',
      defaultValue: ''
    };
  }

  function openCreateDrawer() {
    isCreating = true;
    listState.editedItem = createFieldDraft();
    listState.selectedItem = null;
    listState.originalItem = null;
    listState.validationErrors = {};
    listState.drawerOpen = true;
    previousFieldType = selectableTypes[0]?.name ?? 'str';
  }

  function isSelected(field: Field): boolean {
    return selectedField?.id === field.id;
  }

  function validateForm(): boolean {
    const errors: Record<string, string> = {};
    let isValid = true;

    if (!editedField) return false;

    if (!editedField.name.trim()) {
      errors.name = 'Field name is required';
      isValid = false;
    }

    if (!editedField.type) {
      errors.type = 'Type is required';
      isValid = false;
    }

    listState.validationErrors = errors;
    return isValid;
  }

  async function handleSave() {
    if (!editedField || !validateForm() || isSaving) return;

    const fieldName = editedField.name;
    isSaving = true;

    const typeId = getTypeIdByName(editedField.type);
    if (!typeId) {
      showToast(`Unknown type "${editedField.type}"`, 'error', 5000);
      isSaving = false;
      return;
    }

    const result = await updateFieldAction(editedField.id, {
      name: editedField.name,
      typeId,
      description: editedField.description,
      defaultValue: editedField.defaultValue,
      constraints: editedField.constraints
    });

    if (!result.success) {
      isSaving = false;
      if (result.error?.includes('already exists')) {
        listState.validationErrors = { name: result.error };
      } else {
        showToast(result.error || 'Failed to update field', 'error', 5000);
      }
      return;
    }

    listState.selectedItem = result.data!;
    listState.originalItem = JSON.parse(JSON.stringify(result.data!));
    showToast(`Field "${fieldName}" updated successfully`, 'success', 3000);
    closeDrawer();
    isSaving = false;
  }

  async function handleCreate() {
    if (!editedField || !validateForm() || isSaving) return;

    isSaving = true;

    const typeId = getTypeIdByName(editedField.type);
    if (!typeId) {
      showToast(`Unknown type "${editedField.type}"`, 'error', 5000);
      isSaving = false;
      return;
    }

    const result = await createFieldAction({
      namespaceId: editedField.namespaceId,
      name: editedField.name,
      typeId,
      description: editedField.description,
      defaultValue: editedField.defaultValue,
      constraints: editedField.constraints
    });

    if (!result.success) {
      isSaving = false;
      if (result.error?.includes('already exists')) {
        listState.validationErrors = { name: result.error };
      } else {
        showToast(result.error || 'Failed to create field', 'error', 5000);
      }
      return;
    }

    showToast(`Field "${result.data!.name}" created successfully`, 'success', 3000);

    // Close drawer after successful creation (matches object builder behavior)
    isCreating = false;
    closeDrawer();
    isSaving = false;
  }

  function handleUndo() {
    if (originalField) {
      listState.editedItem = JSON.parse(JSON.stringify(originalField));
      previousFieldType = originalField.type;
      listState.validationErrors = {};
    }
  }

  async function handleDelete() {
    if (!editedField || isDeleting) return;

    const fieldName = editedField.name;
    isDeleting = true;

    const result = await deleteFieldAction(editedField.id);

    if (result.success) {
      closeDrawer();
      isDeleting = false;
      showToast(`Field "${fieldName}" deleted successfully`, 'success', 3000);
    } else {
      isDeleting = false;
      showToast(result.error || 'Failed to delete field', 'error', 5000);
    }
  }

  function addFieldConstraint(constraintName: string) {
    if (!editedField) return;

    const constraint = fieldConstraints.find(fc => fc.name === constraintName);
    if (!constraint) return;

    listState.editedItem = {
      ...editedField,
      constraints: [...editedField.constraints, { name: constraintName, constraintId: constraint.id, params: {} }]
    };
  }

  function removeFieldConstraint(index: number) {
    if (!editedField) return;
    listState.editedItem = {
      ...editedField,
      constraints: editedField.constraints.filter((_, i) => i !== index)
    };
  }

  function formatFieldConstraintPill(constraintValue: FieldConstraintValue): string {
    if (!constraintValue.params || Object.keys(constraintValue.params).length === 0) {
      return constraintValue.name;
    }
    const value = constraintValue.params.value;
    if (value !== undefined) {
      return `${constraintValue.name}: ${value}`;
    }
    return constraintValue.name;
  }

  let hasReferences = $derived(editedField ? editedField.usedInApis.length > 0 : false);
  let deleteTooltip = $derived(editedField && hasReferences
    ? buildDeletionTooltip('field', 'API', editedField!.usedInApis.map(api => ({ name: api })))
    : '');
  let hasLoadError = $derived($storeLoadingState.storeErrors.includes('Fields'));
</script>

<PageHeader title="Fields">
    {#snippet actions()}
      <NamespaceSelector />
      <button
        type="button"
        onclick={openCreateDrawer}
        class="px-4 py-2 bg-mono-900 text-white rounded-md flex items-center space-x-2 hover:bg-mono-800 cursor-pointer transition-colors"
      >
        <i class="fa-solid fa-plus"></i>
        <span>Add Field</span>
      </button>
    {/snippet}
  </PageHeader>

  <SearchBar
    bind:searchQuery={listState.query}
    placeholder="Search fields..."
    resultsCount={filteredFields.length}
    resultLabel="field"
    showFilter={true}
    active={listState.filtersOpen || activeFiltersCount > 0}
    onFilterClick={listState.toggleFilters}
  >
    {#snippet filterPanel()}
      <FilterPanel
        visible={listState.filtersOpen}
        config={fieldFilterConfig}
        bind:state={listState.filters}
        onClose={() => listState.filtersOpen = false}
        onClear={listState.resetFilters}
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
          onSort={listState.handleSort}
        />
        <SortableColumn
          column="type"
          label="Type"
          {sorts}
          onSort={listState.handleSort}
        />
        <SortableColumn
          column="namespace"
          label="Namespace"
          {sorts}
          onSort={listState.handleSort}
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
          onSort={listState.handleSort}
        />
        <SortableColumn
          column="usedInApis"
          label="Used In APIs"
          {sorts}
          onSort={listState.handleSort}
        />
      </tr>
    {/snippet}

    {#snippet body()}
      {#each filteredFields as field}
        <tr
          onclick={() => selectField(field)}
          class="cursor-pointer transition-colors {isSelected(field) ? 'bg-mono-100' : 'hover:bg-mono-50'}"
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

<Drawer open={listState.drawerOpen}>
  <DrawerHeader title={isCreating ? 'Create Field' : 'Edit Field'} onClose={closeDrawer} />

  <DrawerContent>
    {#if editedField}
      <div class="space-y-4">
        <!-- Namespace (Read-only) -->
        <div>
          <label for="fields-namespace" class="block text-sm text-mono-700 mb-1 font-medium">
            Namespace
          </label>
          <input
            id="fields-namespace"
            type="text"
            value={getNamespaceById(editedField.namespaceId)?.name ?? ''}
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
            bind:value={editedField.name}
            class="w-full px-3 py-2 border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent {validationErrors.name ? 'border-red-500' : ''}"
          />
          {#if validationErrors.name}
            <p class="text-xs text-red-500 mt-1">{validationErrors.name}</p>
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
            selectedTypeName={editedField.type}
            onSelect={(typeName) => {
              if (!editedField) return;
              listState.editedItem = { ...editedField, type: typeName };
              handleTypeChange(typeName);
            }}
            placeholder="Search types..."
            error={!!validationErrors.type}
          />
          {#if validationErrors.type}
            <p class="text-xs text-red-500 mt-1">{validationErrors.type}</p>
          {/if}
        </div>

        <!-- Description -->
        <div>
          <label for="fields-description" class="block text-sm text-mono-700 mb-1 font-medium">Description</label>
          <textarea
            id="fields-description"
            bind:value={editedField.description}
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
            bind:value={editedField.defaultValue}
            placeholder="None"
            class="w-full px-3 py-2 border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent"
          />
        </div>

        <!-- Constraints -->
        <div>
          <h3 class="text-sm text-mono-700 mb-2 font-medium">Field Constraints ({editedField.constraints.length})</h3>

          <div class="space-y-2">
            <!-- Field Constraint Selector Dropdown -->
            <FieldConstraintSelectorDropdown
              availableFieldConstraints={availableFieldConstraints}
              selectedFieldConstraintNames={selectedFieldConstraintNames}
              onSelect={addFieldConstraint}
              placeholder="Add field constraint..."
            />

            <!-- Selected Field Constraints -->
            {#if editedField.constraints.length === 0}
              <div class="p-3 bg-mono-50 rounded border border-mono-200">
                <p class="text-xs text-mono-500">No field constraints selected</p>
              </div>
            {:else}
              <div class="p-2 bg-mono-50 rounded border border-mono-200 space-y-2">
                {#each editedField.constraints as constraintValue, index}
                  {@const constraintMeta = fieldConstraints.find(v => v.name === constraintValue.name)}
                  {#if constraintMeta}
                    <div class="flex items-center space-x-2 p-2 bg-white rounded border border-mono-200">
                      <!-- Field Constraint Name and Type -->
                      <div class="flex items-center space-x-2">
                        <span class="font-mono text-sm text-mono-700">{constraintMeta.name}</span>
                        <span class="text-xs text-mono-500 bg-mono-100 px-2 py-0.5 rounded">{constraintMeta.parameterType}</span>
                      </div>

                      <!-- Description (if available) -->
                      {#if constraintMeta.description}
                        <div class="flex-1 text-xs text-mono-500">
                          {constraintMeta.description}
                        </div>
                      {:else}
                        <div class="flex-1"></div>
                      {/if}

                      <!-- Delete Button (aligned to the right) -->
                      <button
                        type="button"
                        onclick={() => removeFieldConstraint(index)}
                        class="text-red-700 hover:text-red-600 transition-colors"
                        title="Remove field constraint"
                        aria-label="Remove field constraint"
                      >
                        <i class="fa-solid fa-xmark"></i>
                      </button>
                    </div>
                  {:else}
                    <!-- Missing field constraint fallback - constraint was deleted from registry -->
                    <div class="flex items-center gap-2 py-1.5">
                      <i class="fa-solid fa-triangle-exclamation text-red-500 text-sm"></i>
                      <span class="flex-1 text-sm text-red-700">
                        Field constraint not found <span class="font-mono text-xs text-red-500">({constraintValue.name})</span>
                      </span>
                      <button
                        type="button"
                        onclick={() => removeFieldConstraint(index)}
                        class="p-1 text-red-700 hover:text-red-600 hover:bg-red-100 rounded transition-colors"
                        title="Remove missing field constraint reference"
                        aria-label="Remove field constraint"
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
          <h3 class="text-sm text-mono-700 mb-2 font-medium">Used In APIs ({editedField.usedInApis.length})</h3>
          <div class="space-y-2">
            {#each editedField.usedInApis as api}
              <div class="flex items-center justify-between p-3 bg-mono-50 rounded-md">
                <div class="flex items-center space-x-2">
                  <i class="fa-solid fa-code text-mono-400"></i>
                  <span class="text-sm text-mono-900">{api}</span>
                </div>
              </div>
            {/each}
            {#if editedField.usedInApis.length === 0}
              <p class="text-sm text-mono-500 italic">Not used in any APIs</p>
            {/if}
          </div>
        </div>
      </div>
    {/if}
  </DrawerContent>

  <DrawerFooter>
    {#if editedField && isCreating}
      <!-- Creation mode buttons -->
      {@const isFormValid = editedField.name.trim() !== '' && !!editedField.type && !isSaving}
      <button
        type="button"
        onclick={handleCreate}
        disabled={!isFormValid}
        class="w-full px-4 py-2 rounded-md transition-colors font-medium {isFormValid ? 'bg-mono-900 text-white hover:bg-mono-800 cursor-pointer' : 'bg-mono-300 text-mono-500 cursor-not-allowed'}"
      >
        {#if isSaving}
          <i class="fa-solid fa-spinner fa-spin mr-2"></i>
          Creating...
        {:else}
          Create Field
        {/if}
      </button>
      <button
        type="button"
        onclick={closeDrawer}
        class="w-full px-4 py-2 border border-mono-300 text-mono-700 rounded-md hover:bg-mono-50 cursor-pointer transition-colors font-medium"
      >
        Cancel
      </button>
    {:else if editedField}
      <!-- Edit mode buttons -->
      {@const canSave = hasChanges && !isSaving}
      <button
        type="button"
        onclick={handleSave}
        disabled={!canSave}
        class="w-full px-4 py-2 rounded-md transition-colors font-medium {canSave ? 'bg-mono-900 text-white hover:bg-mono-800 cursor-pointer' : 'bg-mono-300 text-mono-500 cursor-not-allowed'}"
      >
        {#if isSaving}
          <i class="fa-solid fa-spinner fa-spin mr-2"></i>
          Saving...
        {:else}
          Save Changes
        {/if}
      </button>
      <button
        type="button"
        onclick={handleUndo}
        disabled={!hasChanges || isSaving}
        class="w-full px-4 py-2 border rounded-md transition-colors font-medium {hasChanges && !isSaving ? 'border-mono-300 text-mono-700 hover:bg-mono-50 cursor-pointer' : 'border-mono-200 text-mono-400 cursor-not-allowed bg-mono-50'}"
      >
        Undo
      </button>
      {#if !showDeleteConfirm}
        <Tooltip text={deleteTooltip} position="top">
          <button
            type="button"
            onclick={() => listState.showDeleteConfirm = true}
            disabled={hasReferences}
            class="w-full px-4 py-2 rounded-md flex items-center justify-center transition-colors font-medium {hasReferences ? 'bg-mono-200 text-mono-400 cursor-not-allowed' : 'bg-mono-100 text-red-700 hover:bg-red-50 cursor-pointer'}"
          >
            <i class="fa-solid fa-xmark mr-2"></i>
            <span>Delete Field</span>
          </button>
        </Tooltip>
      {:else}
        <div class="bg-red-50 border border-red-200 rounded-md p-3">
          <p class="text-sm text-red-800 mb-2">Are you sure you want to delete this field?</p>
          <div class="flex space-x-2">
            <button
              type="button"
              onclick={handleDelete}
              disabled={isDeleting}
              class="flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors {isDeleting ? 'bg-red-400 text-white cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-700 cursor-pointer'}"
            >
              {#if isDeleting}
                <i class="fa-solid fa-spinner fa-spin mr-1"></i>
                Deleting...
              {:else}
                Yes, Delete
              {/if}
            </button>
            <button
              type="button"
              onclick={() => listState.showDeleteConfirm = false}
              disabled={isDeleting}
              class="flex-1 px-3 py-1.5 border rounded-md text-sm font-medium transition-colors {isDeleting ? 'border-mono-200 text-mono-400 cursor-not-allowed bg-mono-50' : 'border-mono-300 text-mono-700 hover:bg-mono-50 cursor-pointer'}"
            >
              Cancel
            </button>
          </div>
        </div>
      {/if}
    {/if}
  </DrawerFooter>
</Drawer>
