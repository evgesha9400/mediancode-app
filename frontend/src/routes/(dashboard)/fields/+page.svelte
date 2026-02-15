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
    CrudDrawerFooter,
    NamespaceSelector,
    FieldConstraintEditor,
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
  let isSaving = $state(false);
  let isDeleting = $state(false);
  let formTouched = $state(false);
  let serverErrors = $state<Record<string, string>>({});

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

  // Truly derived values (read-only computations)
  let filteredFields = $derived(listState.results as FieldWithApiCount[]);
  let sorts = $derived(listState.sorts);
  let activeFiltersCount = $derived(listState.activeFiltersCount);
  let hasChanges = $derived(listState.hasChanges);

  let fieldConstraints = $derived($fieldConstraintsStore);
  // Filter field constraints by field's type compatibility
  let availableFieldConstraints = $derived(
    listState.editedItem
      ? getFieldConstraintsByFieldType(listState.editedItem.type)
      : []
  );

  // Derive selected field constraint names for the FieldConstraintSelectorDropdown
  let selectedFieldConstraintNames = $derived(listState.editedItem?.constraints.map(v => v.name) ?? []);

  // Reactive validation
  let formErrors = $derived.by(() => {
    if (!listState.editedItem) return {};
    const errors: Record<string, string> = {};
    if (!listState.editedItem.name.trim()) errors.name = 'Field name is required';
    if (!listState.editedItem.type) errors.type = 'Type is required';
    const emptyParam = listState.editedItem.constraints.find(
      c => c.value === null || c.value === ''
    );
    if (emptyParam) errors.constraints = `Constraint "${emptyParam.name}" requires a value`;
    return errors;
  });

  let isFormValid = $derived(listState.editedItem !== null && Object.keys(formErrors).length === 0);
  let visibleErrors = $derived({ ...(formTouched ? formErrors : {}), ...serverErrors });

  function handleTypeChange(newType: string) {
    if (!listState.editedItem || listState.editedItem.type === newType) return;
    listState.editedItem = {
      ...listState.editedItem,
      type: newType,
      constraints: [],
      defaultValue: ''
    };
  }

  function selectField(field: Field) {
    listState.selectItem(field);
  }

  function closeDrawer() {
    listState.closeDrawer();
    formTouched = false;
    serverErrors = {};
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
    listState.openCreate(createFieldDraft());
    formTouched = false;
    serverErrors = {};
  }

  function isSelected(field: Field): boolean {
    return listState.selectedItem?.id === field.id;
  }

  async function handleSave() {
    if (!listState.editedItem || isSaving) return;

    formTouched = true;
    if (!isFormValid) return;

    const fieldName = listState.editedItem.name;
    isSaving = true;

    const typeId = getTypeIdByName(listState.editedItem.type);
    if (!typeId) {
      showToast(`Unknown type "${listState.editedItem.type}"`, 'error', 5000);
      isSaving = false;
      return;
    }

    const result = await updateFieldAction(listState.editedItem.id, {
      name: listState.editedItem.name,
      typeId,
      description: listState.editedItem.description,
      defaultValue: listState.editedItem.defaultValue,
      constraints: listState.editedItem.constraints.map(c => ({ constraintId: c.constraintId, value: c.value }))
    });

    if (!result.success) {
      isSaving = false;
      if (result.error?.includes('already exists')) {
        serverErrors = { name: result.error };
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
    if (!listState.editedItem || isSaving) return;

    formTouched = true;
    if (!isFormValid) return;

    isSaving = true;

    const typeId = getTypeIdByName(listState.editedItem.type);
    if (!typeId) {
      showToast(`Unknown type "${listState.editedItem.type}"`, 'error', 5000);
      isSaving = false;
      return;
    }

    const result = await createFieldAction({
      namespaceId: listState.editedItem.namespaceId,
      name: listState.editedItem.name,
      typeId,
      description: listState.editedItem.description,
      defaultValue: listState.editedItem.defaultValue,
      constraints: listState.editedItem.constraints.map(c => ({ constraintId: c.constraintId, value: c.value }))
    });

    if (!result.success) {
      isSaving = false;
      if (result.error?.includes('already exists')) {
        serverErrors = { name: result.error };
      } else {
        showToast(result.error || 'Failed to create field', 'error', 5000);
      }
      return;
    }

    showToast(`Field "${result.data!.name}" created successfully`, 'success', 3000);
    closeDrawer();
    isSaving = false;
  }

  function handleUndo() {
    if (listState.originalItem) {
      listState.editedItem = JSON.parse(JSON.stringify(listState.originalItem));
      formTouched = false;
      serverErrors = {};
    }
  }

  async function handleDelete() {
    if (!listState.editedItem || isDeleting) return;

    const fieldName = listState.editedItem.name;
    isDeleting = true;

    const result = await deleteFieldAction(listState.editedItem.id);

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
    if (!listState.editedItem) return;

    const constraint = fieldConstraints.find(fc => fc.name === constraintName);
    if (!constraint) return;

    listState.editedItem = {
      ...listState.editedItem,
      constraints: [...listState.editedItem.constraints, { name: constraintName, constraintId: constraint.id, value: null }]
    };
  }

  function removeFieldConstraint(index: number) {
    if (!listState.editedItem) return;
    listState.editedItem = {
      ...listState.editedItem,
      constraints: listState.editedItem.constraints.filter((_, i) => i !== index)
    };
  }

  function updateConstraintParam(index: number, rawValue: string, parameterType: string) {
    if (!listState.editedItem) return;

    const updatedConstraints = listState.editedItem.constraints.map((c, i) => {
      if (i !== index) return c;
      return {
        ...c,
        value: rawValue === '' ? null : rawValue
      };
    });

    listState.editedItem = { ...listState.editedItem, constraints: updatedConstraints };
  }

  function formatFieldConstraintPill(constraintValue: FieldConstraintValue): string {
    if (constraintValue.value !== null) {
      return `${constraintValue.name}: ${constraintValue.value}`;
    }
    return constraintValue.name;
  }

  let hasReferences = $derived(listState.editedItem ? listState.editedItem.usedInApis.length > 0 : false);
  let deleteTooltip = $derived(listState.editedItem && hasReferences
    ? buildDeletionTooltip('field', 'API', listState.editedItem.usedInApis.map(api => ({ name: api })))
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
  <DrawerHeader title={listState.mode === 'creating' ? 'Create Field' : 'Edit Field'} onClose={closeDrawer} />

  <DrawerContent>
    {#if listState.editedItem}
      <div class="space-y-4">
        <!-- Namespace (Read-only) -->
        <div>
          <label for="fields-namespace" class="block text-sm text-mono-700 mb-1 font-medium">
            Namespace
          </label>
          <input
            id="fields-namespace"
            type="text"
            value={getNamespaceById(listState.editedItem.namespaceId)?.name ?? ''}
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
            bind:value={listState.editedItem.name}
            class="w-full px-3 py-2 border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent {visibleErrors.name ? 'border-red-500' : ''}"
          />
          {#if visibleErrors.name}
            <p class="text-xs text-red-500 mt-1">{visibleErrors.name}</p>
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
            selectedTypeName={listState.editedItem.type}
            onSelect={handleTypeChange}
            placeholder="Search types..."
            error={!!visibleErrors.type}
          />
          {#if visibleErrors.type}
            <p class="text-xs text-red-500 mt-1">{visibleErrors.type}</p>
          {/if}
        </div>

        <!-- Description -->
        <div>
          <label for="fields-description" class="block text-sm text-mono-700 mb-1 font-medium">Description</label>
          <textarea
            id="fields-description"
            bind:value={listState.editedItem.description}
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
            bind:value={listState.editedItem.defaultValue}
            placeholder="None"
            class="w-full px-3 py-2 border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent"
          />
        </div>

        <!-- Constraints -->
        <FieldConstraintEditor
          constraints={listState.editedItem.constraints}
          availableConstraints={availableFieldConstraints}
          allConstraintMeta={fieldConstraints}
          selectedNames={selectedFieldConstraintNames}
          onAdd={addFieldConstraint}
          onRemove={removeFieldConstraint}
          onParamChange={updateConstraintParam}
          error={visibleErrors.constraints}
        />

        <!-- Used In APIs -->
        <div>
          <h3 class="text-sm text-mono-700 mb-2 font-medium">Used In APIs ({listState.editedItem.usedInApis.length})</h3>
          <div class="space-y-2">
            {#each listState.editedItem.usedInApis as api}
              <div class="flex items-center justify-between p-3 bg-mono-50 rounded-md">
                <div class="flex items-center space-x-2">
                  <i class="fa-solid fa-code text-mono-400"></i>
                  <span class="text-sm text-mono-900">{api}</span>
                </div>
              </div>
            {/each}
            {#if listState.editedItem.usedInApis.length === 0}
              <p class="text-sm text-mono-500 italic">Not used in any APIs</p>
            {/if}
          </div>
        </div>
      </div>
    {/if}
  </DrawerContent>

  <DrawerFooter>
    {#if listState.editedItem}
      <CrudDrawerFooter
        mode={listState.mode === 'creating' ? 'creating' : 'editing'}
        entityName="Field"
        {isSaving}
        {isFormValid}
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
