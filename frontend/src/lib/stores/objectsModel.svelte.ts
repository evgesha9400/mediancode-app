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
  createObjectApi,
  updateObjectApi,
  deleteObjectApi,
  createRelationshipApi,
  deleteRelationshipApi,
  type CreateObjectRequest,
  type UpdateObjectRequest
} from '$lib/api/objects';
import { buildDeletionTooltip, checkObjectDeletion } from '$lib/utils/references';
import { mapApiError } from '$lib/domain/errorMap';
import { apisStore } from './apis';
import { get } from 'svelte/store';
import { composeState } from '$lib/utils/compose';
import { isValidPascalCaseName } from '$lib/utils/validation';
import { showToast } from './toasts';
import { objectsStore } from './objects';
import { getFieldById } from './fields';

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

    // Validate server defaults on response-only required non-PK fields.
    // Note: The spec also requires config.database.enabled == true, but the
    // frontend enforces this unconditionally because (a) the object editor
    // doesn't know the generation config, and (b) it's harmless to require
    // a server default even in non-database mode — the value is simply ignored.
    for (const fieldRef of item.fields) {
      if (fieldRef.appears === 'response' && !fieldRef.optional && !fieldRef.isPk) {
        if (!fieldRef.serverDefault) {
          const field = getFieldById(fieldRef.fieldId);
          const fieldName = field?.name ?? fieldRef.fieldId;
          errors[`field_${fieldRef.fieldId}_serverDefault`] =
            `Field "${fieldName}" is response-only and requires a server default`;
        } else if (fieldRef.serverDefault === 'literal' && !fieldRef.defaultLiteral) {
          const field = getFieldById(fieldRef.fieldId);
          const fieldName = field?.name ?? fieldRef.fieldId;
          errors[`field_${fieldRef.fieldId}_defaultLiteral`] =
            `Field "${fieldName}" has literal default but no value set`;
        }
      }
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
      relationships: [],
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
        ? buildDeletionTooltip('object', 'API', item.usedInApis.map(apiId => {
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

    const previousObjects = get(objectsStore);
    objectsStore.update(objects =>
      objects.map(o => (o.id === listState.editedItem!.id ? { ...o, ...payloadResult.data } as ObjectDefinition : o))
    );

    try {
      const object = await updateObjectApi(listState.editedItem.id, payloadResult.data);

      // Diff relationships and persist changes via separate API calls
      const originalRels = (listState.originalItem?.relationships || []).filter(r => !r.isInferred);
      const editedRels = (listState.editedItem!.relationships || []).filter(r => !r.isInferred);
      const originalRelIds = new Set(originalRels.map(r => r.id));
      const editedRelIds = new Set(editedRels.map(r => r.id));

      const addedRels = editedRels.filter(r => !originalRelIds.has(r.id));
      const removedRels = originalRels.filter(r => !editedRelIds.has(r.id));

      let latestObject = object;
      try {
        for (const rel of removedRels) {
          await deleteRelationshipApi(latestObject.id, rel.id);
        }
        for (const rel of addedRels) {
          latestObject = await createRelationshipApi(latestObject.id, {
            targetObjectId: rel.targetObjectId,
            name: rel.name,
            cardinality: rel.cardinality
          });
        }
        // Update store with final state including backend-computed inverses
        if (addedRels.length > 0 || removedRels.length > 0) {
          objectsStore.update(objects => objects.map(o => o.id === latestObject.id ? latestObject : o));
        }
      } catch (err) {
        showToast('Object updated but some relationship changes failed to save', 'error', 5000);
      }

      listState.selectedItem = latestObject;
      listState.originalItem = JSON.parse(JSON.stringify(latestObject));
      showToast(`Object "${entityName}" updated successfully`, 'success', 3000);
      closeDrawer();
    } catch (err) {
      objectsStore.set(previousObjects);
      const error = mapApiError(err, 'update object');
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
      const object = await createObjectApi(payloadResult.data);
      objectsStore.update(objects => [...objects, object]);

      // Persist relationships via separate API calls
      const userRelationships = (listState.editedItem!.relationships || []).filter(r => !r.isInferred);
      if (userRelationships.length > 0) {
        try {
          for (const rel of userRelationships) {
            const created = await createRelationshipApi(object.id, {
              targetObjectId: rel.targetObjectId,
              name: rel.name,
              cardinality: rel.cardinality
            });
            // Update store with backend response (includes inverse relationships)
            objectsStore.update(objects => objects.map(o => o.id === created.id ? created : o));
          }
        } catch (err) {
          showToast('Object created but some relationships failed to save', 'error', 5000);
        }
      }

      showToast(`Object "${object.name}" created successfully`, 'success', 3000);
      closeDrawer();
    } catch (err) {
      const error = mapApiError(err, 'create object');
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
    const obj = get(objectsStore).find(o => o.id === listState.editedItem!.id);
    if (obj) {
      const check = checkObjectDeletion(obj.name, obj.usedInApis);
      if (!check.success) {
        isDeleting = false;
        showToast(check.error || 'Cannot delete object', 'error', 5000);
        return;
      }
    }

    try {
      await deleteObjectApi(listState.editedItem.id);
      objectsStore.update(objects => objects.filter(o => o.id !== listState.editedItem!.id));
      closeDrawer();
      showToast(`Object "${entityName}" deleted successfully`, 'success', 3000);
    } catch (err) {
      showToast(mapApiError(err, 'delete object'), 'error', 5000);
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
  }) as ObjectsModelState;
}
