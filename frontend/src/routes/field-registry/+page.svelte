<script lang="ts">
  import { fieldsStore, updateField, deleteField, searchFields, type Field, type FieldValidator } from '$lib/stores/fields';
  import { validatorsStore, getValidatorsByFieldType, type Validator } from '$lib/stores/validators';
  import { getPrimitiveTypes, type FieldType } from '$lib/stores/types';
  import { showToast } from '$lib/stores/toasts';
  import { buildDeletionTooltip } from '$lib/utils/references';
  import DashboardLayout from '$lib/components/DashboardLayout.svelte';
  import PageHeader from '$lib/components/layout/PageHeader.svelte';
  import SearchBar from '$lib/components/search/SearchBar.svelte';
  import FilterPanel from '$lib/components/search/FilterPanel.svelte';
  import type { FilterConfig } from '$lib/types';
  import Table from '$lib/components/table/Table.svelte';
  import SortableColumn from '$lib/components/table/SortableColumn.svelte';
  import EmptyState from '$lib/components/table/EmptyState.svelte';
  import Drawer from '$lib/components/drawer/Drawer.svelte';
  import DrawerHeader from '$lib/components/drawer/DrawerHeader.svelte';
  import DrawerContent from '$lib/components/drawer/DrawerContent.svelte';
  import DrawerFooter from '$lib/components/drawer/DrawerFooter.svelte';
  import Tooltip from '$lib/components/tooltip/Tooltip.svelte';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { parseMultiSortFromUrl, buildMultiSortUrl, handleSortClick, sortDataMultiColumn } from '$lib/utils/sorting';
  import { browser } from '$app/environment';

  // Extended field type with computed properties for sorting
  type FieldWithApiCount = Field & { usedInApisCount: number };

  let searchQuery = $state('');
  let selectedField = $state<Field | null>(null);
  let drawerOpen = $state(false);
  let editMode = $state(false);

  // Filter state
  type FieldFilterState = {
    selectedTypes: string[];
    onlyUsedInApis: boolean;
    onlyHasValidators: boolean;
  };

  const createFieldFilterState = (): FieldFilterState => ({
    selectedTypes: [],
    onlyUsedInApis: false,
    onlyHasValidators: false
  });

  let filtersOpen = $state(false);
  let filters = $state<FieldFilterState>(createFieldFilterState());

  // Form fields for editing
  let editedField = $state<Field | null>(null);
  let originalField = $state<Field | null>(null);
  let validationErrors = $state<Record<string, string>>({});
  let showDeleteConfirm = $state(false);
  let previousFieldType = $state<string | null>(null);

  // Sort state derived from URL parameters using Svelte 5 $derived rune
  // IMPORTANT: Must use $derived (not $:) with page store from $app/state in Svelte 5
  const sorts = $derived(parseMultiSortFromUrl(new URLSearchParams(page.url.search)));

  // Handle highlight parameter from URL (for navigation from validators)
  const highlightFieldId = $derived(page.url.searchParams.get('highlight'));
  $effect(() => {
    if (browser && highlightFieldId && $fieldsStore.length > 0) {
      const field = $fieldsStore.find(f => f.id === highlightFieldId);
      if (field && !drawerOpen) {
        selectField(field);
        // Clear the highlight parameter after opening (use history.replaceState to avoid navigation)
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('highlight');
        window.history.replaceState({}, '', newUrl.pathname + newUrl.search);
      }
    }
  });

  // Apply filtering and sorting using Svelte 5 $derived rune
  const filteredFields = $derived((() => {
    // Use centralized search helper with reactive store data
    let result = searchFields($fieldsStore, searchQuery);

    // Apply advanced filters
    const { selectedTypes, onlyUsedInApis, onlyHasValidators } = filters;

    if (selectedTypes.length > 0) {
      result = result.filter(field => selectedTypes.includes(field.type));
    }

    if (onlyUsedInApis) {
      result = result.filter(field => field.usedInApis.length > 0);
    }

    if (onlyHasValidators) {
      result = result.filter(field => field.validators.length > 0);
    }

    // Add computed field for usedInApis count
    const withApiCount: FieldWithApiCount[] = result.map(field => ({
      ...field,
      usedInApisCount: field.usedInApis.length
    }));

    // Determine numeric columns for proper sorting
    const numericColumns = new Set(['usedInApisCount']);

    // Transform sorts to use usedInApisCount instead of usedInApis
    const transformedSorts = sorts.map(sort =>
      sort.column === 'usedInApis'
        ? { ...sort, column: 'usedInApisCount' }
        : sort
    );

    return sortDataMultiColumn(withApiCount, transformedSorts, numericColumns);
  })());

  const validators = $derived($validatorsStore);
  const availableValidators = $derived(editedField ? getValidatorsByFieldType(editedField.type) : []);
  const hasChanges = $derived(originalField && editedField ? JSON.stringify(originalField) !== JSON.stringify(editedField) : false);
  const primitiveTypes = $derived(getPrimitiveTypes());

  const fieldFilterConfig = $derived([
    {
      type: 'checkbox-group',
      key: 'selectedTypes',
      label: 'Field Type',
      options: primitiveTypes.map(type => ({ label: type.name, value: type.name }))
    },
    {
      type: 'toggle',
      key: 'onlyUsedInApis',
      label: 'Usage',
      toggleLabel: 'Used in APIs only'
    },
    {
      type: 'toggle',
      key: 'onlyHasValidators',
      label: 'Validation',
      toggleLabel: 'Has validators only'
    }
  ] as FilterConfig);

  // Reset validators and default value when field type changes
  $effect(() => {
    if (editedField && previousFieldType !== null && previousFieldType !== editedField.type) {
      editedField.validators = [];
      editedField.defaultValue = '';
    }
  });

  // Track field type changes
  $effect(() => {
    if (editedField) {
      previousFieldType = editedField.type;
    }
  });

  function selectField(field: Field) {
    selectedField = field;
    editedField = JSON.parse(JSON.stringify(field)); // Deep clone
    originalField = JSON.parse(JSON.stringify(field)); // Store original for comparison
    previousFieldType = field.type; // Initialize type tracking
    drawerOpen = true;
    editMode = true;
    validationErrors = {};
    showDeleteConfirm = false;
  }

  function closeDrawer() {
    drawerOpen = false;
    setTimeout(() => {
      selectedField = null;
      editedField = null;
      originalField = null;
      previousFieldType = null;
      editMode = false;
      validationErrors = {};
      showDeleteConfirm = false;
    }, 300);
  }

  function isSelected(field: Field): boolean {
    return selectedField?.id === field.id;
  }

  function validateForm(): boolean {
    validationErrors = {};
    let isValid = true;

    if (!editedField) return false;

    if (!editedField.name.trim()) {
      validationErrors.name = 'Field name is required';
      isValid = false;
    }

    if (!editedField.type) {
      validationErrors.type = 'Type is required';
      isValid = false;
    }

    return isValid;
  }

  function handleSave() {
    if (!editedField || !validateForm()) return;

    const fieldName = editedField.name;
    updateField(editedField.id, editedField);
    selectedField = editedField;
    originalField = JSON.parse(JSON.stringify(editedField)); // Update original to match saved state
    showToast(`Field "${fieldName}" updated successfully`, 'success', 3000);
  }

  function handleUndo() {
    if (originalField) {
      editedField = JSON.parse(JSON.stringify(originalField));
      validationErrors = {};
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
      // Surface error to user via toast notification
      showToast(result.error || 'Failed to delete field', 'error', 5000);
    }
  }

  function addValidator() {
    if (!editedField) return;
    const available = getValidatorsByFieldType(editedField.type);
    if (available.length === 0) return;

    // Use the first available validator
    const firstValidator = available[0];
    editedField.validators = [...editedField.validators, { name: firstValidator.name, params: {} }];
  }

  function removeValidator(index: number) {
    if (!editedField) return;
    editedField.validators = editedField.validators.filter((_, i) => i !== index);
  }

  function updateValidatorName(index: number, name: string) {
    if (!editedField) return;
    const validator = validators.find(v => v.name === name);
    if (!validator) return;

    const newValidators = [...editedField.validators];
    newValidators[index] = { name, params: {} };
    editedField.validators = newValidators;
  }

  function formatValidatorDisplay(validator: FieldValidator): string {
    if (!validator.params || Object.keys(validator.params).length === 0) {
      return validator.name;
    }
    const paramStr = Object.entries(validator.params)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
    return `${validator.name} (${paramStr})`;
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

  function handleSort(columnKey: string, shiftKey: boolean) {
    const newSorts = handleSortClick(columnKey, sorts, shiftKey);
    const urlParams = buildMultiSortUrl(newSorts);
    goto(`?${urlParams}`, { replaceState: false, keepFocus: true });
  }

  function toggleFilters() {
    filtersOpen = !filtersOpen;
  }

  const activeFiltersCount = $derived((filters.selectedTypes.length > 0 ? 1 : 0) +
    (filters.onlyUsedInApis ? 1 : 0) +
    (filters.onlyHasValidators ? 1 : 0));

  const hasReferences = $derived(editedField ? editedField.usedInApis.length > 0 : false);
  const deleteTooltip = $derived(editedField && hasReferences
    ? buildDeletionTooltip('field', 'API', editedField!.usedInApis.map(api => ({ name: api })))
    : '');
</script>

<DashboardLayout>
  <PageHeader title="Unified Field Registry">
    <svelte:fragment slot="actions">
      <button
        type="button"
        disabled
        class="px-4 py-2 bg-mono-400 text-white rounded-md flex items-center space-x-2 cursor-not-allowed opacity-60"
        title="Coming soon"
      >
        <i class="fa-solid fa-plus"></i>
        <span>Add Field</span>
      </button>
    </svelte:fragment>
  </PageHeader>

  <SearchBar
    bind:searchQuery
    placeholder="Search fields..."
    resultsCount={filteredFields.length}
    resultLabel="field"
    showFilter={true}
    active={filtersOpen || activeFiltersCount > 0}
    on:filterClick={toggleFilters}
  >
    <svelte:fragment slot="filter-panel">
      <FilterPanel
        visible={filtersOpen}
        config={fieldFilterConfig}
        bind:state={filters}
        on:close={() => filtersOpen = false}
        on:clear={() => filtersOpen = false}
      />
    </svelte:fragment>
  </SearchBar>

  <Table isEmpty={filteredFields.length === 0}>
    <svelte:fragment slot="header">
      <tr>
        <SortableColumn
          column="name"
          label="Field Name"
          {sorts}
          onSort={handleSort}
        />
        <SortableColumn
          column="type"
          label="Type"
          {sorts}
          onSort={handleSort}
        />
        <th scope="col" class="px-6 py-3 text-left text-xs text-mono-500 uppercase tracking-wider font-medium">
          <div class="flex items-center space-x-1">
            <span>Validators</span>
          </div>
        </th>
        <SortableColumn
          column="defaultValue"
          label="Default Value"
          {sorts}
          onSort={handleSort}
        />
        <SortableColumn
          column="usedInApis"
          label="Used In APIs"
          {sorts}
          onSort={handleSort}
        />
      </tr>
    </svelte:fragment>

    <svelte:fragment slot="body">
      {#each filteredFields as field}
        <tr
          on:click={() => selectField(field)}
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
    </svelte:fragment>

    <svelte:fragment slot="empty">
      <EmptyState
        title="No fields found"
        message="Try adjusting your search query"
      />
    </svelte:fragment>
  </Table>
</DashboardLayout>

<Drawer open={drawerOpen}>
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
              on:click={addValidator}
              disabled={availableValidators.length === 0}
              class="text-sm flex items-center transition-colors {availableValidators.length > 0 ? 'text-mono-600 hover:text-mono-900 cursor-pointer' : 'text-mono-400 cursor-not-allowed'}"
            >
              <i class="fa-solid fa-plus mr-1"></i>
              <span>Add</span>
            </button>
          </div>
          <div class="space-y-2">
            {#each getAllValidatorsForField(editedField) as { validator, validatorMeta, source }, index}
              <div class="flex items-center space-x-2 p-2 bg-mono-50 rounded-md">
                <div class="flex-1 space-y-1">
                  <div class="flex items-center space-x-2">
                    <div class="relative flex-1">
                      <select
                        value={validator.name}
                        on:change={(e) => updateValidatorName(index, e.currentTarget.value)}
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
                      on:click={() => removeValidator(index)}
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
        on:click={handleSave}
        disabled={!hasChanges}
        class="w-full px-4 py-2 rounded-md transition-colors font-medium {hasChanges ? 'bg-mono-900 text-white hover:bg-mono-800 cursor-pointer' : 'bg-mono-300 text-mono-500 cursor-not-allowed'}"
      >
        Save Changes
      </button>
      <button
        type="button"
        on:click={handleUndo}
        disabled={!hasChanges}
        class="w-full px-4 py-2 border rounded-md transition-colors font-medium {hasChanges ? 'border-mono-300 text-mono-700 hover:bg-mono-50 cursor-pointer' : 'border-mono-200 text-mono-400 cursor-not-allowed bg-mono-50'}"
      >
        Undo
      </button>
      {#if !showDeleteConfirm}
        <Tooltip text={deleteTooltip} position="top">
          <button
            type="button"
            on:click={() => showDeleteConfirm = true}
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
              on:click={handleDelete}
              class="flex-1 px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium"
            >
              Yes, Delete
            </button>
            <button
              type="button"
              on:click={() => showDeleteConfirm = false}
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
