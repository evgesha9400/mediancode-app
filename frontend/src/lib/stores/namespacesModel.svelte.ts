// src/lib/stores/namespacesModel.svelte.ts
//
// Per-entity CRUD model for Namespaces.
// Composes listViewState for search/filter/sort/drawer, adds entity-specific
// CRUD orchestration (validate, save, create, delete, undo) inline.

import type { Page } from '@sveltejs/kit';
import type { Namespace, FilterConfig } from '$lib/types';
import type { DrawerMode } from './listViewState.svelte';
import type { MultiSortState } from '$lib/utils/sorting';
import { createListViewState } from './listViewState.svelte';
import {
  createNamespaceAction,
  updateNamespaceAction,
  deleteNamespaceAction,
  type CreateNamespaceRequest,
  type UpdateNamespaceRequest
} from '$lib/domain/mutations';
import { namespacesStore, activeNamespaceId } from './namespaces';
import { get } from 'svelte/store';
import { composeState } from '$lib/utils/compose';
import { showToast } from './toasts';

// ============================================================================
// Configuration
// ============================================================================

export interface NamespacesModelConfig {
  /** Function returning all namespaces */
  itemsStore: () => Namespace[];
  /** Domain-specific search function */
  searchFn: (items: Namespace[], query: string) => Namespace[];
  /** Filter sections config */
  filterSections: FilterConfig;
  /** URL navigation scope */
  urlScope: {
    page: Page;
    goto: (url: string, opts?: { replaceState?: boolean; keepFocus?: boolean }) => Promise<void>;
  };
  /** Returns entity details for a namespace (used for derived counts and deletion guard) */
  getNamespaceEntityDetails: (id: string) => { total: number; fields: number; fieldConstraints: number; objects: number; endpoints: number };
}

// ============================================================================
// State Interface
// ============================================================================

export interface NamespacesModelState {
  // --- List view state (search, filter, sort, drawer) ---
  query: string;
  filters: NamespaceFilterState;
  filtersOpen: boolean;
  drawerOpen: boolean;
  selectedItem: Namespace | null;
  editedItem: Namespace | null;
  originalItem: Namespace | null;
  showDeleteConfirm: boolean;

  readonly mode: DrawerMode;
  readonly results: Namespace[];
  readonly sorts: MultiSortState;
  readonly activeFiltersCount: number;
  readonly hasChanges: boolean;
  readonly highlightedId: string | null;

  handleSort: (columnKey: string, shiftKey: boolean) => void;
  selectItem: (item: Namespace) => void;
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
  isSelected: (item: Namespace) => boolean;
}

type NamespaceFilterState = {
  onlyUserCreated: boolean;
};

// ============================================================================
// Factory
// ============================================================================

export function createNamespacesModel(config: NamespacesModelConfig): NamespacesModelState {
  const {
    itemsStore,
    searchFn,
    filterSections,
    urlScope,
    getNamespaceEntityDetails
  } = config;

  // --- Create list view state (shared utility) ---
  const listState = createListViewState<Namespace, NamespaceFilterState>({
    itemsStore,
    searchFn,
    filterSections,
    numericColumns: new Set(['entityCount']),
    urlScope,
    getItemId: (namespace) => namespace.id,
    deriveExtra: (namespace) => {
      const details = getNamespaceEntityDetails(namespace.id);
      return {
        entityCount: details.total,
        fieldCount: details.fields,
        fieldConstraintCount: details.fieldConstraints,
        objectCount: details.objects,
        endpointCount: details.endpoints
      };
    },
    sortColumnMap: {},
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

  // --- Entity-specific logic (inlined from namespaceContract) ---

  function validate(item: Namespace): Record<string, string> {
    const errors: Record<string, string> = {};
    if (!item.name.trim()) errors.name = 'Namespace name is required';
    return errors;
  }

  function createDraft(): Namespace {
    return {
      id: '',
      name: '',
      description: '',
      isDefault: false,
      locked: false
    };
  }

  function toCreatePayload(item: Namespace): { ok: true; data: CreateNamespaceRequest } | { ok: false; error: string } {
    return {
      ok: true,
      data: {
        name: item.name,
        description: item.description,
        ...(item.isDefault ? { isDefault: true } : {})
      }
    };
  }

  function toUpdatePayload(item: Namespace): { ok: true; data: UpdateNamespaceRequest } | { ok: false; error: string } {
    // Global namespace: only isDefault can be changed
    if (item.locked) {
      return {
        ok: true,
        data: {
          ...(item.isDefault ? { isDefault: true } : {})
        }
      };
    }

    return {
      ok: true,
      data: {
        name: item.name,
        description: item.description,
        ...(item.isDefault ? { isDefault: true } : {})
      }
    };
  }

  function deletionGuard(item: Namespace): { canDelete: boolean; tooltip: string } {
    if (item.locked) {
      return { canDelete: false, tooltip: 'Cannot delete the Global namespace' };
    }
    if (item.isDefault) {
      return { canDelete: false, tooltip: 'Cannot delete the default namespace' };
    }
    const details = getNamespaceEntityDetails(item.id);
    if (details.total > 0) {
      return { canDelete: false, tooltip: `Cannot delete: Contains ${details.total} entities` };
    }
    return { canDelete: true, tooltip: '' };
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

  function isSelected(item: Namespace): boolean {
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

    const result = await updateNamespaceAction(listState.editedItem.id, payloadResult.data);

    if (!result.success) {
      isSaving = false;
      if (result.error?.includes('already exists')) {
        serverErrors = { name: result.error };
      } else {
        showToast(result.error || 'Failed to update namespace', 'error', 5000);
      }
      return;
    }

    // If this namespace was set as default, clear isDefault on all others in local store
    // and switch the active namespace so other pages reflect the change immediately
    if (result.data!.isDefault) {
      const currentNamespaces = get(namespacesStore);
      namespacesStore.set(
        currentNamespaces.map(ns =>
          ns.id === result.data!.id ? result.data! : { ...ns, isDefault: false }
        )
      );
      activeNamespaceId.set(result.data!.id);
    }

    listState.selectedItem = result.data!;
    listState.originalItem = JSON.parse(JSON.stringify(result.data!));
    showToast(`Namespace "${entityName}" updated successfully`, 'success', 3000);
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

    const result = await createNamespaceAction(payloadResult.data);

    if (!result.success) {
      isSaving = false;
      if (result.error?.includes('already exists')) {
        serverErrors = { name: result.error };
      } else {
        showToast(result.error || 'Failed to create namespace', 'error', 5000);
      }
      return;
    }

    // If this namespace was created as default, clear isDefault on all others in local store
    // and switch the active namespace so other pages reflect the change immediately
    if (result.data!.isDefault) {
      const currentNamespaces = get(namespacesStore);
      namespacesStore.set(
        currentNamespaces.map(ns =>
          ns.id === result.data!.id ? result.data! : { ...ns, isDefault: false }
        )
      );
      activeNamespaceId.set(result.data!.id);
    }

    showToast(`Namespace "${result.data!.name}" created successfully`, 'success', 3000);
    closeDrawer();
    isSaving = false;
  }

  // --- Delete ---
  async function handleDelete() {
    if (!listState.editedItem || isDeleting) return;

    const entityName = listState.editedItem.name;
    isDeleting = true;

    const result = await deleteNamespaceAction(listState.editedItem.id);

    if (result.success) {
      closeDrawer();
      isDeleting = false;
      showToast(`Namespace "${entityName}" deleted successfully`, 'success', 3000);
    } else {
      isDeleting = false;
      showToast(result.error || 'Failed to delete namespace', 'error', 5000);
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
  }) as NamespacesModelState;
}
