// src/lib/stores/crudWorkflow.svelte.ts
//
// Generic CRUD workflow factory. Wraps a ListViewState and an EntityContract
// to provide standardized save/create/delete/undo orchestration with
// validation, error handling, and toast notifications.

import type { EntityContract } from '$lib/domain/entityContracts';
import type { ListViewState } from './listViewState.svelte';
import { showToast } from './toasts';

export interface CrudWorkflowState<Item, FilterState> {
  // --- Forwarded from ListViewState (reactive getters/setters) ---
  query: string;
  filters: FilterState;
  filtersOpen: boolean;
  drawerOpen: boolean;
  selectedItem: Item | null;
  editedItem: Item | null;
  originalItem: Item | null;
  showDeleteConfirm: boolean;

  readonly mode: string;
  readonly results: Item[];
  readonly sorts: any;
  readonly activeFiltersCount: number;
  readonly hasChanges: boolean;
  readonly highlightedId: string | null;

  handleSort: (columnKey: string, shiftKey: boolean) => void;
  selectItem: (item: Item) => void;
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
  isSelected: (item: Item) => boolean;
}

export function createCrudWorkflow<
  Item extends { id: string; name: string },
  FilterState extends Record<string, any>,
  CreatePayload,
  UpdatePayload
>(
  listState: ListViewState<Item, FilterState>,
  contract: EntityContract<Item, CreatePayload, UpdatePayload>
): CrudWorkflowState<Item, FilterState> {

  // --- CRUD-specific state (Svelte 5 runes) ---
  let isSaving = $state(false);
  let isDeleting = $state(false);
  let formTouched = $state(false);
  let serverErrors = $state<Record<string, string>>({});

  // --- Derived validation ---
  let formErrors = $derived.by(() => {
    if (!listState.editedItem) return {};
    return contract.validate(listState.editedItem);
  });

  let isFormValid = $derived(listState.editedItem !== null && Object.keys(formErrors).length === 0);
  let visibleErrors = $derived({ ...(formTouched ? formErrors : {}), ...serverErrors });

  // --- Derived deletion guard ---
  let deletionGuardResult = $derived.by(() => {
    if (!listState.editedItem || !contract.deletionGuard) {
      return { canDelete: true, tooltip: '' };
    }
    return contract.deletionGuard(listState.editedItem);
  });

  let canDelete = $derived(deletionGuardResult.canDelete);
  let deleteTooltip = $derived(deletionGuardResult.tooltip);

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
    listState.openCreate(contract.createDraft());
    resetFormState();
  }

  function isSelected(item: Item): boolean {
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

    // Pre-save guard (e.g. locked namespace check)
    if (contract.preSaveGuard) {
      const guardError = contract.preSaveGuard(listState.editedItem);
      if (guardError) {
        showToast(guardError, 'error', 3000);
        return;
      }
    }

    formTouched = true;
    if (!isFormValid) return;

    const entityName = listState.editedItem.name;
    isSaving = true;

    const payloadResult = contract.toUpdatePayload(listState.editedItem);
    if (!payloadResult.ok) {
      showToast(payloadResult.error, 'error', 5000);
      isSaving = false;
      return;
    }

    const result = await contract.updateAction(listState.editedItem.id, payloadResult.data);

    if (!result.success) {
      isSaving = false;
      if (result.error?.includes('already exists')) {
        serverErrors = { [contract.uniqueConflictField]: result.error };
      } else {
        showToast(result.error || `Failed to update ${contract.entityLabel}`, 'error', 5000);
      }
      return;
    }

    listState.selectedItem = result.data!;
    listState.originalItem = JSON.parse(JSON.stringify(result.data!));
    showToast(`${capitalize(contract.entityLabel)} "${entityName}" updated successfully`, 'success', 3000);
    closeDrawer();
    isSaving = false;
  }

  // --- Create (new entity) ---
  async function handleCreate() {
    if (!listState.editedItem || isSaving) return;

    formTouched = true;
    if (!isFormValid) return;

    isSaving = true;

    const payloadResult = contract.toCreatePayload(listState.editedItem);
    if (!payloadResult.ok) {
      showToast(payloadResult.error, 'error', 5000);
      isSaving = false;
      return;
    }

    const result = await contract.createAction(payloadResult.data);

    if (!result.success) {
      isSaving = false;
      if (result.error?.includes('already exists')) {
        serverErrors = { [contract.uniqueConflictField]: result.error };
      } else {
        showToast(result.error || `Failed to create ${contract.entityLabel}`, 'error', 5000);
      }
      return;
    }

    showToast(`${capitalize(contract.entityLabel)} "${result.data!.name}" created successfully`, 'success', 3000);
    closeDrawer();
    isSaving = false;
  }

  // --- Delete ---
  async function handleDelete() {
    if (!listState.editedItem || isDeleting) return;

    const entityName = listState.editedItem.name;
    isDeleting = true;

    const result = await contract.deleteAction(listState.editedItem.id);

    if (result.success) {
      closeDrawer();
      isDeleting = false;
      showToast(`${capitalize(contract.entityLabel)} "${entityName}" deleted successfully`, 'success', 3000);
    } else {
      isDeleting = false;
      showToast(result.error || `Failed to delete ${contract.entityLabel}`, 'error', 5000);
    }
  }

  // --- Return unified state object ---
  return {
    // Forwarded from listState
    get query() { return listState.query; },
    set query(v: string) { listState.query = v; },

    get filters() { return listState.filters; },
    set filters(v: FilterState) { listState.filters = v; },

    get filtersOpen() { return listState.filtersOpen; },
    set filtersOpen(v: boolean) { listState.filtersOpen = v; },

    get drawerOpen() { return listState.drawerOpen; },
    set drawerOpen(v: boolean) { listState.drawerOpen = v; },

    get selectedItem() { return listState.selectedItem; },
    set selectedItem(v: Item | null) { listState.selectedItem = v; },

    get editedItem() { return listState.editedItem; },
    set editedItem(v: Item | null) { listState.editedItem = v; },

    get originalItem() { return listState.originalItem; },
    set originalItem(v: Item | null) { listState.originalItem = v; },

    get showDeleteConfirm() { return listState.showDeleteConfirm; },
    set showDeleteConfirm(v: boolean) { listState.showDeleteConfirm = v; },

    get mode() { return listState.mode; },
    get results() { return listState.results; },
    get sorts() { return listState.sorts; },
    get activeFiltersCount() { return listState.activeFiltersCount; },
    get hasChanges() { return listState.hasChanges; },
    get highlightedId() { return listState.highlightedId; },

    handleSort: listState.handleSort,
    selectItem: listState.selectItem,
    resetFilters: listState.resetFilters,
    toggleFilters: listState.toggleFilters,

    // CRUD-specific
    get isSaving() { return isSaving; },
    get isDeleting() { return isDeleting; },
    get isFormValid() { return isFormValid; },
    get visibleErrors() { return visibleErrors; },
    get canDelete() { return canDelete; },
    get deleteTooltip() { return deleteTooltip; },

    openCreate,
    closeDrawer,
    handleSave,
    handleCreate,
    handleUndo,
    handleDelete,
    isSelected
  };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
