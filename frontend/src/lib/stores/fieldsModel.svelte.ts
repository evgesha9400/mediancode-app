// src/lib/stores/fieldsModel.svelte.ts
//
// Per-entity CRUD model for Fields.
// Composes listViewState for search/filter/sort/drawer, adds entity-specific
// CRUD orchestration (validate, save, create, delete, undo) inline.

import type { Page } from '@sveltejs/kit';
import type { Field, FilterConfig } from '$lib/types';
import type { DrawerMode } from './listViewState.svelte';
import type { MultiSortState } from '$lib/utils/sorting';
import { createListViewState } from './listViewState.svelte';
import {
  createFieldAction,
  updateFieldAction,
  deleteFieldAction,
  type CreateFieldRequest,
  type UpdateFieldRequest
} from '$lib/domain/mutations';
import { buildDeletionTooltip } from '$lib/utils/references';
import { composeState } from '$lib/utils/compose';
import { showToast } from './toasts';

// ============================================================================
// Configuration
// ============================================================================

export interface FieldsModelConfig {
  /** Function returning namespace-filtered fields */
  itemsStore: () => Field[];
  /** Domain-specific search function */
  searchFn: (items: Field[], query: string) => Field[];
  /** Filter sections config (reactive via function) */
  filterSections: () => FilterConfig;
  /** URL navigation scope */
  urlScope: {
    page: Page;
    goto: (url: string, opts?: { replaceState?: boolean; keepFocus?: boolean }) => Promise<void>;
  };
  /** Returns the active namespace ID */
  getActiveNamespaceId: () => string;
  /** Returns the default type name for new fields */
  getDefaultType: () => string;
  /** Resolves a type name to its ID */
  getTypeIdByName: (name: string) => string | undefined;
  /** Returns namespace name for a field */
  getNamespaceName: (namespaceId: string) => string;
}

// ============================================================================
// State Interface
// ============================================================================

export interface FieldsModelState {
  // --- List view state (search, filter, sort, drawer) ---
  query: string;
  filters: FieldFilterState;
  filtersOpen: boolean;
  drawerOpen: boolean;
  selectedItem: Field | null;
  editedItem: Field | null;
  originalItem: Field | null;
  showDeleteConfirm: boolean;

  readonly mode: DrawerMode;
  readonly results: Field[];
  readonly sorts: MultiSortState;
  readonly activeFiltersCount: number;
  readonly hasChanges: boolean;
  readonly highlightedId: string | null;

  handleSort: (columnKey: string, shiftKey: boolean) => void;
  selectItem: (item: Field) => void;
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
  isSelected: (item: Field) => boolean;
}

type FieldFilterState = {
  selectedTypes: string[];
  onlyUsedInApis: boolean;
  onlyHasConstraints: boolean;
};

// ============================================================================
// Factory
// ============================================================================

export function createFieldsModel(config: FieldsModelConfig): FieldsModelState {
  const {
    itemsStore,
    searchFn,
    filterSections,
    urlScope,
    getActiveNamespaceId,
    getDefaultType,
    getTypeIdByName,
    getNamespaceName
  } = config;

  // --- Create list view state (shared utility) ---
  const listState = createListViewState<Field, FieldFilterState>({
    itemsStore,
    searchFn,
    filterSections,
    numericColumns: new Set(['usedInApisCount']),
    urlScope,
    highlightParamKey: 'highlight',
    getItemId: (field) => field.id,
    deriveExtra: (field) => ({
      usedInApisCount: field.usedInApis.length,
      namespaceName: getNamespaceName(field.namespaceId)
    }),
    sortColumnMap: { 'usedInApis': 'usedInApisCount', 'namespace': 'namespaceName' },
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
  let visibleErrors = $derived({ ...(formTouched ? formErrors : {}), ...serverErrors });

  // --- Derived deletion guard ---
  let deletionGuardResult = $derived.by(() => {
    if (!listState.editedItem) return { canDelete: true, tooltip: '' };
    return deletionGuard(listState.editedItem);
  });

  let canDelete = $derived(deletionGuardResult.canDelete);
  let deleteTooltip = $derived(deletionGuardResult.tooltip);

  // --- Entity-specific logic (inlined from fieldContract) ---

  function validate(item: Field): Record<string, string> {
    const errors: Record<string, string> = {};
    if (!item.name.trim()) errors.name = 'Field name is required';
    if (!item.type) errors.type = 'Type is required';
    const emptyParam = item.constraints.find(c => c.value === null || c.value === '');
    if (emptyParam) errors.constraints = `Constraint "${emptyParam.name}" requires a value`;
    return errors;
  }

  function createDraft(): Field {
    return {
      id: '',
      namespaceId: getActiveNamespaceId(),
      name: '',
      type: getDefaultType(),
      constraints: [],
      validators: [],
      usedInApis: [],
      description: '',
      defaultValue: ''
    };
  }

  function toCreatePayload(item: Field): { ok: true; data: CreateFieldRequest } | { ok: false; error: string } {
    const typeId = getTypeIdByName(item.type);
    if (!typeId) return { ok: false, error: `Unknown type "${item.type}"` };
    return {
      ok: true,
      data: {
        namespaceId: item.namespaceId,
        name: item.name,
        typeId,
        description: item.description,
        defaultValue: item.defaultValue,
        constraints: item.constraints.map(c => ({ constraintId: c.constraintId, value: c.value }))
      }
    };
  }

  function toUpdatePayload(item: Field): { ok: true; data: UpdateFieldRequest } | { ok: false; error: string } {
    const typeId = getTypeIdByName(item.type);
    if (!typeId) return { ok: false, error: `Unknown type "${item.type}"` };
    return {
      ok: true,
      data: {
        name: item.name,
        typeId,
        description: item.description,
        defaultValue: item.defaultValue,
        constraints: item.constraints.map(c => ({ constraintId: c.constraintId, value: c.value }))
      }
    };
  }

  function deletionGuard(item: Field): { canDelete: boolean; tooltip: string } {
    const hasRefs = item.usedInApis.length > 0;
    return {
      canDelete: !hasRefs,
      tooltip: hasRefs
        ? buildDeletionTooltip('field', 'API', item.usedInApis.map(api => ({ name: api })))
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

  function isSelected(item: Field): boolean {
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

    const result = await updateFieldAction(listState.editedItem.id, payloadResult.data);

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
    showToast(`Field "${entityName}" updated successfully`, 'success', 3000);
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

    const result = await createFieldAction(payloadResult.data);

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

  // --- Delete ---
  async function handleDelete() {
    if (!listState.editedItem || isDeleting) return;

    const entityName = listState.editedItem.name;
    isDeleting = true;

    const result = await deleteFieldAction(listState.editedItem.id);

    if (result.success) {
      closeDrawer();
      isDeleting = false;
      showToast(`Field "${entityName}" deleted successfully`, 'success', 3000);
    } else {
      isDeleting = false;
      showToast(result.error || 'Failed to delete field', 'error', 5000);
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
  }) as FieldsModelState;
}
