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
  createNamespaceApi,
  updateNamespaceApi,
  deleteNamespaceApi,
  type CreateNamespaceRequest,
  type UpdateNamespaceRequest
} from '$lib/api/namespaces';
import { mapApiError } from '$lib/domain/errorMap';
import {
  namespacesStore,
  activeNamespaceId,
  getNamespaceById,
  getNamespaceEntityCount,
  getNamespaceEntityDetails as getNamespaceEntityDetailsFromStore,
  GLOBAL_NAMESPACE_ID
} from './namespaces';
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

    const previousNamespaces = get(namespacesStore);
    namespacesStore.update(namespaces =>
      namespaces.map(ns => (ns.id === listState.editedItem!.id ? { ...ns, ...payloadResult.data } : ns))
    );

    try {
      const namespace = await updateNamespaceApi(listState.editedItem.id, payloadResult.data);
      namespacesStore.update(namespaces => namespaces.map(ns => (ns.id === namespace.id ? namespace : ns)));

      // If this namespace was set as default, propagate locally
      if (namespace.isDefault) {
        const currentNamespaces = get(namespacesStore);
        namespacesStore.set(
          currentNamespaces.map(ns =>
            ns.id === namespace.id ? namespace : { ...ns, isDefault: false }
          )
        );
        activeNamespaceId.set(namespace.id);
      }

      listState.selectedItem = namespace;
      listState.originalItem = JSON.parse(JSON.stringify(namespace));
      showToast(`Namespace "${entityName}" updated successfully`, 'success', 3000);
      closeDrawer();
    } catch (err) {
      namespacesStore.set(previousNamespaces);
      const error = mapApiError(err, 'update namespace');
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
      const namespace = await createNamespaceApi(payloadResult.data);
      namespacesStore.update(namespaces => [...namespaces, namespace]);

      if (namespace.isDefault) {
        const currentNamespaces = get(namespacesStore);
        namespacesStore.set(
          currentNamespaces.map(ns =>
            ns.id === namespace.id ? namespace : { ...ns, isDefault: false }
          )
        );
        activeNamespaceId.set(namespace.id);
      }

      showToast(`Namespace "${namespace.name}" created successfully`, 'success', 3000);
      closeDrawer();
    } catch (err) {
      const error = mapApiError(err, 'create namespace');
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

    const namespace = getNamespaceById(listState.editedItem.id);
    if (!namespace) {
      isDeleting = false;
      showToast(`Namespace with ID "${listState.editedItem.id}" not found.`, 'error', 5000);
      return;
    }

    const entityCount = getNamespaceEntityCount(listState.editedItem.id);
    if (entityCount > 0) {
      const details = getNamespaceEntityDetailsFromStore(listState.editedItem.id);
      const parts: string[] = [];
      if (details.fields > 0) parts.push(`${details.fields} field${details.fields > 1 ? 's' : ''}`);
      if (details.fieldConstraints > 0) parts.push(`${details.fieldConstraints} field constraint${details.fieldConstraints > 1 ? 's' : ''}`);
      if (details.objects > 0) parts.push(`${details.objects} object${details.objects > 1 ? 's' : ''}`);
      if (details.endpoints > 0) parts.push(`${details.endpoints} endpoint${details.endpoints > 1 ? 's' : ''}`);
      if (details.apis > 0) parts.push(`${details.apis} API${details.apis > 1 ? 's' : ''}`);
      isDeleting = false;
      showToast(`Cannot delete namespace "${namespace.name}" because it contains ${parts.join(', ')}. Remove all entities before deleting.`, 'error', 5000);
      return;
    }

    const wasActive = get(activeNamespaceId) === listState.editedItem.id;

    try {
      await deleteNamespaceApi(listState.editedItem.id);
      namespacesStore.update(namespaces => namespaces.filter(ns => ns.id !== listState.editedItem!.id));
      if (wasActive) {
        activeNamespaceId.set(GLOBAL_NAMESPACE_ID);
      }
      closeDrawer();
      showToast(`Namespace "${entityName}" deleted successfully`, 'success', 3000);
    } catch (err) {
      showToast(mapApiError(err, 'delete namespace'), 'error', 5000);
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
  }) as NamespacesModelState;
}
