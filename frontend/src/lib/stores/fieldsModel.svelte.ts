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
  createFieldApi,
  updateFieldApi,
  deleteFieldApi,
  type CreateFieldRequest,
  type UpdateFieldRequest
} from '$lib/api/fields';
import { buildDeletionTooltip, checkFieldDeletion } from '$lib/utils/references';
import { mapApiError } from '$lib/domain/errorMap';
import { fieldsStore } from './fields';
import { apisStore } from './apis';
import { get } from 'svelte/store';
import { composeState } from '$lib/utils/compose';
import { isValidSnakeCaseName } from '$lib/utils/validation';
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
  let immediateErrors = $derived.by(() => {
    const item = listState.editedItem;
    if (!item || !item.name.trim()) return {};
    if (!isValidSnakeCaseName(item.name)) {
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

  // --- Entity-specific logic (inlined from fieldContract) ---

  function validate(item: Field): Record<string, string> {
    const errors: Record<string, string> = {};
    if (!item.name.trim()) {
      errors.name = 'Field name is required';
    } else if (!isValidSnakeCaseName(item.name)) {
      errors.name = 'Must be snake_case (e.g. user_email)';
    }
    if (!item.type) errors.type = 'Type is required';
    const emptyParam = item.constraints.find(c => c.value === null || c.value === '');
    if (emptyParam) errors.constraints = `Constraint "${emptyParam.name}" requires a value`;

    if (item.defaultValue && item.defaultValue !== 'None') {
      if (item.type === 'int' && !/^-?\d+$/.test(item.defaultValue)) {
        errors.defaultValue = 'Default value must be a whole number';
      }
      if (item.type === 'float' && !/^-?\d+(\.\d+)?$/.test(item.defaultValue)) {
        errors.defaultValue = 'Default value must be a number';
      }
    }
    return errors;
  }

  function createDraft(): Field {
    return {
      id: '',
      namespaceId: getActiveNamespaceId(),
      name: '',
      type: getDefaultType(),
      container: null,
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
        container: item.container,
        description: item.description,
        defaultValue: item.defaultValue,
        constraints: item.constraints.map(c => ({ constraintId: c.constraintId, value: c.value })),
        validators: item.validators.length > 0
          ? item.validators.map(v => ({ templateId: v.templateId, parameters: v.parameters ?? undefined }))
          : undefined
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
        container: item.container,
        description: item.description,
        defaultValue: item.defaultValue,
        constraints: item.constraints.map(c => ({ constraintId: c.constraintId, value: c.value })),
        validators: item.validators.map(v => ({ templateId: v.templateId, parameters: v.parameters ?? undefined }))
      }
    };
  }

  function deletionGuard(item: Field): { canDelete: boolean; tooltip: string } {
    const hasMultipleRefs = item.usedInApis.length > 1;
    return {
      canDelete: !hasMultipleRefs,
      tooltip: hasMultipleRefs
        ? buildDeletionTooltip('field', 'API', item.usedInApis.map(apiId => {
            const api = get(apisStore).find(a => a.id === apiId);
            return { name: api?.title ?? apiId };
          }))
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

    const previousFields = get(fieldsStore);
    fieldsStore.update(fields =>
      fields.map(f => (f.id === listState.editedItem!.id ? { ...f, ...payloadResult.data } as Field : f))
    );

    try {
      const field = await updateFieldApi(listState.editedItem.id, payloadResult.data);
      fieldsStore.update(fields => fields.map(f => (f.id === field.id ? field : f)));
      listState.selectedItem = field;
      listState.originalItem = JSON.parse(JSON.stringify(field));
      showToast(`Field "${entityName}" updated successfully`, 'success', 3000);
      closeDrawer();
    } catch (err) {
      fieldsStore.set(previousFields);
      const error = mapApiError(err, 'update field');
      if (error.includes('already exists')) {
        serverErrors = { name: error };
      } else {
        showToast(error, 'error', 5000);
      }
    } finally {
      isSaving = false;
    }
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

    try {
      const field = await createFieldApi(payloadResult.data);
      fieldsStore.update(fields => [...fields, field]);
      showToast(`Field "${field.name}" created successfully`, 'success', 3000);
      closeDrawer();
    } catch (err) {
      const error = mapApiError(err, 'create field');
      if (error.includes('already exists')) {
        serverErrors = { name: error };
      } else {
        showToast(error, 'error', 5000);
      }
    } finally {
      isSaving = false;
    }
  }

  // --- Delete ---
  async function handleDelete() {
    if (!listState.editedItem || isDeleting) return;

    const entityName = listState.editedItem.name;
    isDeleting = true;

    // Pre-flight deletion guard (defense-in-depth)
    const field = get(fieldsStore).find(f => f.id === listState.editedItem!.id);
    if (field) {
      const check = checkFieldDeletion(field.name, field.usedInApis);
      if (!check.success) {
        isDeleting = false;
        showToast(check.error || 'Cannot delete field', 'error', 5000);
        return;
      }
    }

    try {
      await deleteFieldApi(listState.editedItem.id);
      fieldsStore.update(fields => fields.filter(f => f.id !== listState.editedItem!.id));
      closeDrawer();
      showToast(`Field "${entityName}" deleted successfully`, 'success', 3000);
    } catch (err) {
      showToast(mapApiError(err, 'delete field'), 'error', 5000);
    } finally {
      isDeleting = false;
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
