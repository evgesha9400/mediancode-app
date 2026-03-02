// src/lib/stores/objectsModel.svelte.ts
//
// Per-entity CRUD model for Objects.
// Composes listViewState for search/filter/sort/drawer, adds entity-specific
// CRUD orchestration (validate, save, create, delete, undo) inline.

import type { Page } from '@sveltejs/kit';
import type { ObjectDefinition, FilterConfig } from '$lib/types';
import type { DrawerMode } from './listViewState.svelte';
import type { MultiSortState } from '$lib/utils/sorting';
import { createListViewState } from './listViewState.svelte';
import {
  createObjectAction,
  updateObjectAction,
  deleteObjectAction,
  type CreateObjectRequest,
  type UpdateObjectRequest
} from '$lib/domain/mutations';
import { buildDeletionTooltip } from '$lib/utils/references';
import { composeState } from '$lib/utils/compose';
import { isValidPascalCaseName } from '$lib/utils/validation';
import { showToast } from './toasts';

// ============================================================================
// Configuration
// ============================================================================

export interface ObjectsModelConfig {
  /** Function returning namespace-filtered objects */
  itemsStore: () => ObjectDefinition[];
  /** Domain-specific search function */
  searchFn: (items: ObjectDefinition[], query: string) => ObjectDefinition[];
  /** Filter sections config (reactive via function) */
  filterSections: () => FilterConfig;
  /** URL navigation scope */
  urlScope: {
    page: Page;
    goto: (url: string, opts?: { replaceState?: boolean; keepFocus?: boolean }) => Promise<void>;
  };
  /** Returns the active namespace ID */
  getActiveNamespaceId: () => string;
  /** Returns namespace name for an object */
  getNamespaceName: (namespaceId: string) => string;
}

// ============================================================================
// State Interface
// ============================================================================

export interface ObjectsModelState {
  // --- List view state (search, filter, sort, drawer) ---
  query: string;
  filters: ObjectFilterState;
  filtersOpen: boolean;
  drawerOpen: boolean;
  selectedItem: ObjectDefinition | null;
  editedItem: ObjectDefinition | null;
  originalItem: ObjectDefinition | null;
  showDeleteConfirm: boolean;

  readonly mode: DrawerMode;
  readonly results: ObjectDefinition[];
  readonly sorts: MultiSortState;
  readonly activeFiltersCount: number;
  readonly hasChanges: boolean;
  readonly highlightedId: string | null;

  handleSort: (columnKey: string, shiftKey: boolean) => void;
  selectItem: (item: ObjectDefinition) => void;
  resetFilters: () => void;
  toggleFilters: () => void;

  // --- CRUD-specific state ---
  readonly isSaving: boolean;
  readonly isDeleting: boolean;
  readonly isFormValid: boolean;
  readonly visibleErrors: Record<string, string>;
  readonly canDelete: boolean;
  readonly deleteTooltip: string;

  // --- CRUD actions ---
  openCreate: () => void;
  closeDrawer: () => void;
  handleSave: () => Promise<void>;
  handleCreate: () => Promise<void>;
  handleUndo: () => void;
  handleDelete: () => Promise<void>;
  isSelected: (item: ObjectDefinition) => boolean;
}

type ObjectFilterState = Record<string, never>;

// Extended object type with computed properties for sorting
type ObjectWithCounts = ObjectDefinition & {
  fieldCount: number;
  usedInApisCount: number;
  namespaceName: string;
};

// ============================================================================
// Factory
// ============================================================================

export function createObjectsModel(config: ObjectsModelConfig): ObjectsModelState {
  const {
    itemsStore,
    searchFn,
    filterSections,
    urlScope,
    getActiveNamespaceId,
    getNamespaceName
  } = config;

  // --- Create list view state (shared utility) ---
  const listState = createListViewState<ObjectDefinition, ObjectFilterState>({
    itemsStore,
    searchFn,
    filterSections,
    numericColumns: new Set(['fieldCount', 'usedInApisCount']),
    urlScope,
    highlightParamKey: 'highlight',
    getItemId: (obj) => obj.id,
    deriveExtra: (obj) => ({
      fieldCount: obj.fields.length,
      usedInApisCount: obj.usedInApis.length,
      namespaceName: getNamespaceName(obj.namespaceId)
    }),
    sortColumnMap: { 'fields': 'fieldCount', 'usedInApis': 'usedInApisCount', 'namespace': 'namespaceName' },
    drawerConfig: {
      trackEdits: true,
      allowDelete: true,
      closeDelay: 300
    }
  });

  // --- CRUD-specific state ---
  let isSaving = $state(false);
  let isDeleting = $state(false);
  let formTouched = $state(false);
  let serverErrors = $state<Record<string, string>>({});

  // --- Derived validation ---
  let formErrors = $derived.by(() => {
    if (!listState.editedItem) return {};
    return validate(listState.editedItem);
  });

  let isFormValid = $derived(listState.editedItem !== null && Object.keys(formErrors).length === 0);
  let immediateErrors = $derived.by(() => {
    const item = listState.editedItem;
    if (!item || !item.name.trim()) return {};
    if (!isValidPascalCaseName(item.name)) {
      return { name: formErrors.name };
    }
    return {};
  });
  let visibleErrors = $derived({ ...immediateErrors, ...(formTouched ? formErrors : {}), ...serverErrors });

  // --- Derived deletion guard ---
  let deletionGuardResult = $derived.by(() => {
    if (!listState.editedItem) return { canDelete: true, tooltip: '' };
    return deletionGuard(listState.editedItem);
  });

  let canDelete = $derived(deletionGuardResult.canDelete);
  let deleteTooltip = $derived(deletionGuardResult.tooltip);

  // --- Entity-specific logic (inlined from objectContract) ---

  function validate(item: ObjectDefinition): Record<string, string> {
    const errors: Record<string, string> = {};
    if (!item.name.trim()) {
      errors.name = 'Object name is required';
    } else if (!isValidPascalCaseName(item.name)) {
      errors.name = 'Must be PascalCase (e.g. UserEmail)';
    }
    return errors;
  }

  function createDraft(): ObjectDefinition {
    return {
      id: '',
      namespaceId: getActiveNamespaceId(),
      name: '',
      description: '',
      fields: [],
      validators: [],
      usedInApis: []
    };
  }

  function toCreatePayload(item: ObjectDefinition): { ok: true; data: CreateObjectRequest } | { ok: false; error: string } {
    return {
      ok: true,
      data: {
        namespaceId: item.namespaceId,
        name: item.name,
        description: item.description,
        fields: item.fields,
        validators: item.validators.length > 0
          ? item.validators.map(v => ({
              templateId: v.templateId,
              parameters: v.parameters ?? undefined,
              fieldMappings: v.fieldMappings
            }))
          : undefined
      }
    };
  }

  function toUpdatePayload(item: ObjectDefinition): { ok: true; data: UpdateObjectRequest } | { ok: false; error: string } {
    // Strip derived properties before saving
    const { fieldCount, usedInApisCount, namespaceName, ...clean } = item as ObjectWithCounts;
    return {
      ok: true,
      data: {
        name: clean.name,
        description: clean.description,
        fields: clean.fields,
        validators: clean.validators.map(v => ({
          templateId: v.templateId,
          parameters: v.parameters ?? undefined,
          fieldMappings: v.fieldMappings
        }))
      }
    };
  }

  function deletionGuard(item: ObjectDefinition): { canDelete: boolean; tooltip: string } {
    const hasMultipleRefs = item.usedInApis.length > 1;
    return {
      canDelete: !hasMultipleRefs,
      tooltip: hasMultipleRefs
        ? buildDeletionTooltip('object', 'API', item.usedInApis.map(api => ({ name: api })))
        : ''
    };
  }

  // --- Internal helpers ---

  function resetFormState() {
    formTouched = false;
    serverErrors = {};
  }

  function closeDrawer() {
    listState.closeDrawer();
    resetFormState();
  }

  function openCreate() {
    listState.openCreate(createDraft());
    resetFormState();
  }

  function isSelected(item: ObjectDefinition): boolean {
    return listState.selectedItem?.id === item.id;
  }

  function handleUndo() {
    if (listState.originalItem) {
      listState.editedItem = JSON.parse(JSON.stringify(listState.originalItem));
      resetFormState();
    }
  }

  // --- Save (update existing) ---
  async function handleSave() {
    if (!listState.editedItem || isSaving) return;

    formTouched = true;
    if (!isFormValid) return;

    const entityName = listState.editedItem.name;
    isSaving = true;

    const payloadResult = toUpdatePayload(listState.editedItem);
    if (!payloadResult.ok) {
      showToast(payloadResult.error, 'error', 5000);
      isSaving = false;
      return;
    }

    const result = await updateObjectAction(listState.editedItem.id, payloadResult.data);

    if (!result.success) {
      isSaving = false;
      if (result.error?.includes('already exists')) {
        serverErrors = { name: result.error };
      } else {
        showToast(result.error || 'Failed to update object', 'error', 5000);
      }
      return;
    }

    listState.selectedItem = result.data!;
    listState.originalItem = JSON.parse(JSON.stringify(result.data!));
    showToast(`Object "${entityName}" updated successfully`, 'success', 3000);
    closeDrawer();
    isSaving = false;
  }

  // --- Create (new entity) ---
  async function handleCreate() {
    if (!listState.editedItem || isSaving) return;

    formTouched = true;
    if (!isFormValid) return;

    isSaving = true;

    const payloadResult = toCreatePayload(listState.editedItem);
    if (!payloadResult.ok) {
      showToast(payloadResult.error, 'error', 5000);
      isSaving = false;
      return;
    }

    const result = await createObjectAction(payloadResult.data);

    if (!result.success) {
      isSaving = false;
      if (result.error?.includes('already exists')) {
        serverErrors = { name: result.error };
      } else {
        showToast(result.error || 'Failed to create object', 'error', 5000);
      }
      return;
    }

    showToast(`Object "${result.data!.name}" created successfully`, 'success', 3000);
    closeDrawer();
    isSaving = false;
  }

  // --- Delete ---
  async function handleDelete() {
    if (!listState.editedItem || isDeleting) return;

    const entityName = listState.editedItem.name;
    isDeleting = true;

    const result = await deleteObjectAction(listState.editedItem.id);

    if (result.success) {
      closeDrawer();
      isDeleting = false;
      showToast(`Object "${entityName}" deleted successfully`, 'success', 3000);
    } else {
      isDeleting = false;
      showToast(result.error || 'Failed to delete object', 'error', 5000);
    }
  }

  // --- Compose list view state with CRUD-specific state ---
  return composeState(listState, {
    // CRUD-specific state
    get isSaving() { return isSaving; },
    get isDeleting() { return isDeleting; },
    get isFormValid() { return isFormValid; },
    get visibleErrors() { return visibleErrors; },
    get canDelete() { return canDelete; },
    get deleteTooltip() { return deleteTooltip; },

    // CRUD actions (override closeDrawer from listState with CRUD-aware version)
    openCreate,
    closeDrawer,
    handleSave,
    handleCreate,
    handleUndo,
    handleDelete,
    isSelected
  }) as ObjectsModelState;
}
