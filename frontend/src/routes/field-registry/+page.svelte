<script lang="ts">
  import { fieldsStore, updateField, deleteField, searchFields, type Field, type FieldValidator } from '$lib/stores/fields';
  import { validatorsStore, getValidatorsByFieldType, type Validator } from '$lib/stores/validators';
  import { getPrimitiveTypes, type PrimitiveTypeName } from '$lib/stores/types';
  import { showToast } from '$lib/stores/toasts';
  import { buildDeletionTooltip } from '$lib/utils/references';
  import {
    DashboardLayout,
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
    Tooltip
  } from '$lib/components';
  import type { FilterConfig } from '$lib/types';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { createListViewState } from '$lib/stores/listViewState.svelte';

  // Extended field type with computed properties for sorting
  type FieldWithApiCount = Field & { usedInApisCount: number };

  // Filter state type
  type FieldFilterState = {
    selectedTypes: string[];
    onlyUsedInApis: boolean;
    onlyHasValidators: boolean;
  };

  // Form tracking
  let previousFieldType = $state<string | null>(null);

  let primitiveTypes = $derived(getPrimitiveTypes());

  // Build filter config from primitive types (reactive to store changes)
  let fieldFilterConfig = $derived.by((): FilterConfig => {
    return [
      {
        type: 'checkbox-group',
        key: 'selectedTypes',
        label: 'Field Type',
        options: primitiveTypes.map(type => ({ label: type.name, value: type.name })),
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
        key: 'onlyHasValidators',
        label: 'Validation',
        toggleLabel: 'Has validators only',
        predicate: (item: Field) => item.validators.length > 0
      }
    ];
  });

  // Create list view state (owns all reactive state)
  const listState = createListViewState<Field, FieldFilterState>({
    itemsStore: () => $fieldsStore,
    searchFn: searchFields,
    filterSections: () => fieldFilterConfig,
    numericColumns: new Set(['usedInApisCount']),
    urlScope: { page, goto },
    highlightParamKey: 'highlight',
    getItemId: (field) => field.id,
    deriveExtra: (field) => ({
      usedInApisCount: field.usedInApis.length
    }),
    sortColumnMap: { 'usedInApis': 'usedInApisCount' },
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

  let validators = $derived($validatorsStore);
  let availableValidators = $derived(editedField ? getValidatorsByFieldType(editedField.type) : []);

  function handleTypeChange(newType: string) {
    if (!editedField) return;

    const typedNewType = newType as PrimitiveTypeName;

    // If type actually changed, reset validators and default value
    if (previousFieldType !== null && previousFieldType !== typedNewType) {
      listState.editedItem = {
        ...editedField,
        validators: [],
        defaultValue: ''
      };
    }

    previousFieldType = typedNewType;
  }

  function selectField(field: Field) {
    listState.selectItem(field);
    previousFieldType = field.type;
  }

  function closeDrawer() {
    listState.closeDrawer();
    previousFieldType = null;
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

  function handleSave() {
    if (!editedField || !validateForm()) return;

    const fieldName = editedField.name;
    updateField(editedField.id, editedField);
    listState.selectedItem = editedField;
    listState.originalItem = JSON.parse(JSON.stringify(editedField));
    showToast(`Field "${fieldName}" updated successfully`, 'success', 3000);
  }

  function handleUndo() {
    if (originalField) {
      listState.editedItem = JSON.parse(JSON.stringify(originalField));
      previousFieldType = originalField.type;
      listState.validationErrors = {};
    }
  }

  function handleDelete() {
    if (!editedField) return;

    const fieldName = editedField.name;
    const result = deleteField(editedField.id);
    if (result.success) {
      closeDrawer();
      showToast(`Field "${fieldName}" deleted successfully`, 'success', 3000);
    } else {
      showToast(result.error || 'Failed to delete field', 'error', 5000);
    }
  }

  function addValidator() {
    if (!editedField) return;
    const available = getValidatorsByFieldType(editedField.type);
    if (available.length === 0) return;

    const firstValidator = available[0];
    listState.editedItem = {
      ...editedField,
      validators: [...editedField.validators, { name: firstValidator.name, params: {} }]
    };
  }

  function removeValidator(index: number) {
    if (!editedField) return;
    listState.editedItem = {
      ...editedField,
      validators: editedField.validators.filter((_, i) => i !== index)
    };
  }

  function updateValidatorName(index: number, name: string) {
    if (!editedField) return;
    const validator = validators.find(v => v.name === name);
    if (!validator) return;

    // Reset params when validator name changes
    editedField.validators[index].params = {};
  }

  function formatValidatorPill(validator: FieldValidator): string {
    if (!validator.params || Object.keys(validator.params).length === 0) {
      return validator.name;
    }
    const value = validator.params.value;
    if (value !== undefined) {
      return `${validator.name}: ${value}`;
    }
    return validator.name;
  }

  function getAllValidatorsForField(field: Field): Array<{ validator: FieldValidator; validatorMeta: Validator | undefined; source: 'inline' | 'custom' }> {
    return field.validators.map(fv => {
      const validatorMeta = validators.find(v => v.name === fv.name);
      return {
        validator: fv,
        validatorMeta,
        source: validatorMeta?.type || 'inline'
      };
    });
  }

  let hasReferences = $derived(editedField ? editedField.usedInApis.length > 0 : false);
  let deleteTooltip = $derived(editedField && hasReferences
    ? buildDeletionTooltip('field', 'API', editedField!.usedInApis.map(api => ({ name: api })))
    : '');
</script>

<DashboardLayout>
  <PageHeader title="Unified Field Registry">
    {#snippet actions()}
      <button
        type="button"
        disabled
        class="px-4 py-2 bg-mono-400 text-white rounded-md flex items-center space-x-2 cursor-not-allowed opacity-60"
        title="Coming soon"
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
        <th scope="col" class="px-6 py-3 text-left text-xs text-mono-500 tracking-wider font-medium">
          <div class="flex items-center space-x-1">
            <span>Validators</span>
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
          <td class="px-6 py-4 text-sm text-mono-500">
            {#if field.validators.length > 0}
              <div class="flex flex-wrap gap-1">
                {#each field.validators as validator}
                  <span class="px-2 py-0.5 text-xs rounded-full bg-mono-100">
                    {formatValidatorPill(validator)}
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
      <EmptyState
        title="No fields found"
        message="Try adjusting your search query"
      />
    {/snippet}
  </Table>
</DashboardLayout>

<Drawer open={listState.drawerOpen}>
  <DrawerHeader title="Edit Field" onClose={closeDrawer} />

  <DrawerContent>
    {#if editedField}
      <div class="space-y-4">
        <!-- Field Name -->
        <div>
          <label for="field-name" class="block text-sm text-mono-700 mb-1 font-medium">
            Field Name <span class="text-red-500">*</span>
          </label>
          <input
            id="field-name"
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
          <label for="field-type" class="block text-sm text-mono-700 mb-1 font-medium">
            Type <span class="text-red-500">*</span>
          </label>
          <div class="relative">
            <select
              id="field-type"
              bind:value={editedField.type}
              onchange={() => editedField && handleTypeChange(editedField.type)}
              class="w-full appearance-none px-3 py-2 border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent pr-8 {validationErrors.type ? 'border-red-500' : ''}"
            >
              {#each primitiveTypes as type}
                <option value={type.name}>{type.name}</option>
              {/each}
            </select>
            <div class="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
              <i class="fa-solid fa-chevron-down text-mono-400"></i>
            </div>
          </div>
          {#if validationErrors.type}
            <p class="text-xs text-red-500 mt-1">{validationErrors.type}</p>
          {/if}
        </div>

        <!-- Description -->
        <div>
          <label for="field-description" class="block text-sm text-mono-700 mb-1 font-medium">Description</label>
          <textarea
            id="field-description"
            bind:value={editedField.description}
            rows="3"
            class="w-full px-3 py-2 border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent"
          ></textarea>
        </div>

        <!-- Default Value -->
        <div>
          <label for="field-default-value" class="block text-sm text-mono-700 mb-1 font-medium">Default Value</label>
          <input
            id="field-default-value"
            type="text"
            bind:value={editedField.defaultValue}
            placeholder="None"
            class="w-full px-3 py-2 border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent"
          />
        </div>

        <!-- Validators -->
        <div>
          <div class="flex justify-between items-center mb-2">
            <div class="block text-sm text-mono-700 font-medium">Validators</div>
            <button
              type="button"
              onclick={addValidator}
              disabled={availableValidators.length === 0}
              class="text-sm flex items-center transition-colors {availableValidators.length > 0 ? 'text-mono-600 hover:text-mono-900 cursor-pointer' : 'text-mono-400 cursor-not-allowed'}"
            >
              <i class="fa-solid fa-plus mr-1"></i>
              <span>Add</span>
            </button>
          </div>
          <div class="space-y-2">
            {#each getAllValidatorsForField(editedField) as { validatorMeta, source }, index}
              <div class="flex items-center space-x-2 p-2 bg-mono-50 rounded-md">
                <div class="flex-1 space-y-1">
                  <div class="flex items-center space-x-2">
                    <div class="relative flex-1">
                      <select
                        bind:value={editedField.validators[index].name}
                        onchange={() => editedField && updateValidatorName(index, editedField.validators[index].name)}
                        class="w-full appearance-none px-3 py-1.5 border border-mono-300 rounded-md text-sm pr-8 focus:ring-2 focus:ring-mono-400 focus:border-transparent"
                      >
                        {#each availableValidators as v}
                          <option value={v.name}>{v.name}</option>
                        {/each}
                      </select>
                      <div class="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                        <i class="fa-solid fa-chevron-down text-mono-400 text-xs"></i>
                      </div>
                    </div>
                    <button
                      type="button"
                      onclick={() => removeValidator(index)}
                      class="text-mono-400 hover:text-mono-600 transition-colors"
                      aria-label="Remove validator"
                    >
                      <i class="fa-solid fa-trash"></i>
                    </button>
                  </div>
                  {#if validatorMeta}
                    <div class="flex items-center space-x-2 pl-3">
                      <span class="px-2 py-0.5 text-xs rounded-full bg-mono-900 text-white capitalize">
                        {validatorMeta.category}
                      </span>
                      <span class="px-2 py-0.5 text-xs rounded-full {source === 'inline' ? 'bg-mono-200 text-mono-700' : 'bg-mono-700 text-white'} capitalize">
                        {source}
                      </span>
                    </div>
                  {/if}
                </div>
              </div>
            {/each}
            {#if editedField.validators.length === 0}
              {#if availableValidators.length === 0}
                <p class="text-sm text-mono-500 italic">No validators available for {editedField.type} type</p>
              {:else}
                <p class="text-sm text-mono-500 italic">No validators added</p>
              {/if}
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
    {#if editedField}
      <button
        type="button"
        onclick={handleSave}
        disabled={!hasChanges}
        class="w-full px-4 py-2 rounded-md transition-colors font-medium {hasChanges ? 'bg-mono-900 text-white hover:bg-mono-800 cursor-pointer' : 'bg-mono-300 text-mono-500 cursor-not-allowed'}"
      >
        Save Changes
      </button>
      <button
        type="button"
        onclick={handleUndo}
        disabled={!hasChanges}
        class="w-full px-4 py-2 border rounded-md transition-colors font-medium {hasChanges ? 'border-mono-300 text-mono-700 hover:bg-mono-50 cursor-pointer' : 'border-mono-200 text-mono-400 cursor-not-allowed bg-mono-50'}"
      >
        Undo
      </button>
      {#if !showDeleteConfirm}
        <Tooltip text={deleteTooltip} position="top">
          <button
            type="button"
            onclick={() => listState.showDeleteConfirm = true}
            disabled={hasReferences}
            class="w-full px-4 py-2 rounded-md flex items-center justify-center transition-colors font-medium {hasReferences ? 'bg-mono-200 text-mono-400 cursor-not-allowed' : 'bg-mono-100 text-mono-600 hover:bg-mono-200 cursor-pointer'}"
          >
            <i class="fa-solid fa-trash mr-2"></i>
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
              class="flex-1 px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium"
            >
              Yes, Delete
            </button>
            <button
              type="button"
              onclick={() => listState.showDeleteConfirm = false}
              class="flex-1 px-3 py-1.5 border border-mono-300 text-mono-700 rounded-md hover:bg-mono-50 text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      {/if}
    {/if}
  </DrawerFooter>
</Drawer>
