// src/lib/domain/entityContracts.ts
//
// Declarative contracts defining entity-specific CRUD behavior.
// Each contract tells the generic CrudWorkflow how to validate, map payloads,
// guard deletions, and invoke actions for a specific entity type.

import type { ActionResult } from './mutations';
import {
  createFieldAction, updateFieldAction, deleteFieldAction,
  type CreateFieldRequest, type UpdateFieldRequest
} from './mutations';
import {
  createObjectAction, updateObjectAction, deleteObjectAction,
  type CreateObjectRequest, type UpdateObjectRequest
} from './mutations';
import {
  updateNamespaceAction, deleteNamespaceAction,
  type UpdateNamespaceRequest
} from './mutations';
import { buildDeletionTooltip } from '$lib/utils/references';
import type { Field, ObjectDefinition, Namespace } from '$lib/types';

// ============================================================================
// Contract Interface
// ============================================================================

export interface EntityContract<Item, CreatePayload, UpdatePayload> {
  entityLabel: string;
  uniqueConflictField: string;

  createDraft: () => Item;
  validate: (item: Item) => Record<string, string>;
  toCreatePayload: (item: Item) => { ok: true; data: CreatePayload } | { ok: false; error: string };
  toUpdatePayload: (item: Item) => { ok: true; data: UpdatePayload } | { ok: false; error: string };

  createAction: (payload: CreatePayload) => Promise<ActionResult<Item>>;
  updateAction: (id: string, payload: UpdatePayload) => Promise<ActionResult<Item>>;
  deleteAction: (id: string) => Promise<ActionResult<void>>;

  preSaveGuard?: (item: Item) => string | null;
  deletionGuard?: (item: Item) => { canDelete: boolean; tooltip: string };
}

// ============================================================================
// Object Contract
// ============================================================================

interface ObjectContractDeps {
  getActiveNamespaceId: () => string;
}

// Extended object type with computed properties for sorting
type ObjectWithCounts = ObjectDefinition & {
  fieldCount: number;
  usedInApisCount: number;
  namespaceName: string;
};

export function createObjectContract(deps: ObjectContractDeps): EntityContract<ObjectDefinition, CreateObjectRequest, UpdateObjectRequest> {
  return {
    entityLabel: 'object',
    uniqueConflictField: 'name',

    createDraft: () => ({
      id: '',
      namespaceId: deps.getActiveNamespaceId(),
      name: '',
      description: '',
      fields: [],
      usedInApis: []
    }),

    validate: (item) => {
      const errors: Record<string, string> = {};
      if (!item.name.trim()) errors.name = 'Object name is required';
      return errors;
    },

    toCreatePayload: (item) => ({
      ok: true as const,
      data: {
        namespaceId: item.namespaceId,
        name: item.name,
        description: item.description,
        fields: item.fields
      }
    }),

    toUpdatePayload: (item) => {
      // Strip derived properties before saving
      const { fieldCount, usedInApisCount, namespaceName, ...clean } = item as ObjectWithCounts;
      return {
        ok: true as const,
        data: {
          name: clean.name,
          description: clean.description,
          fields: clean.fields
        }
      };
    },

    createAction: createObjectAction,
    updateAction: updateObjectAction,
    deleteAction: deleteObjectAction,

    deletionGuard: (item) => {
      const hasRefs = item.usedInApis.length > 0;
      return {
        canDelete: !hasRefs,
        tooltip: hasRefs
          ? buildDeletionTooltip('object', 'API', item.usedInApis.map(api => ({ name: api })))
          : ''
      };
    }
  };
}

// ============================================================================
// Field Contract
// ============================================================================

interface FieldContractDeps {
  getActiveNamespaceId: () => string;
  getDefaultType: () => string;
  getTypeIdByName: (name: string) => string | undefined;
}

export function createFieldContract(deps: FieldContractDeps): EntityContract<Field, CreateFieldRequest, UpdateFieldRequest> {
  return {
    entityLabel: 'field',
    uniqueConflictField: 'name',

    createDraft: () => ({
      id: '',
      namespaceId: deps.getActiveNamespaceId(),
      name: '',
      type: deps.getDefaultType(),
      constraints: [],
      usedInApis: [],
      description: '',
      defaultValue: ''
    }),

    validate: (item) => {
      const errors: Record<string, string> = {};
      if (!item.name.trim()) errors.name = 'Field name is required';
      if (!item.type) errors.type = 'Type is required';
      const emptyParam = item.constraints.find(c => c.value === null || c.value === '');
      if (emptyParam) errors.constraints = `Constraint "${emptyParam.name}" requires a value`;
      return errors;
    },

    toCreatePayload: (item) => {
      const typeId = deps.getTypeIdByName(item.type);
      if (!typeId) return { ok: false as const, error: `Unknown type "${item.type}"` };
      return {
        ok: true as const,
        data: {
          namespaceId: item.namespaceId,
          name: item.name,
          typeId,
          description: item.description,
          defaultValue: item.defaultValue,
          constraints: item.constraints.map(c => ({ constraintId: c.constraintId, value: c.value }))
        }
      };
    },

    toUpdatePayload: (item) => {
      const typeId = deps.getTypeIdByName(item.type);
      if (!typeId) return { ok: false as const, error: `Unknown type "${item.type}"` };
      return {
        ok: true as const,
        data: {
          name: item.name,
          typeId,
          description: item.description,
          defaultValue: item.defaultValue,
          constraints: item.constraints.map(c => ({ constraintId: c.constraintId, value: c.value }))
        }
      };
    },

    createAction: createFieldAction,
    updateAction: updateFieldAction,
    deleteAction: deleteFieldAction,

    deletionGuard: (item) => {
      const hasRefs = item.usedInApis.length > 0;
      return {
        canDelete: !hasRefs,
        tooltip: hasRefs
          ? buildDeletionTooltip('field', 'API', item.usedInApis.map(api => ({ name: api })))
          : ''
      };
    }
  };
}

// ============================================================================
// Namespace Contract
// ============================================================================

interface NamespaceContractDeps {
  getNamespaceEntityDetails: (id: string) => { total: number; fields: number; fieldConstraints: number; objects: number; endpoints: number };
}

export function createNamespaceContract(deps: NamespaceContractDeps): EntityContract<Namespace, never, UpdateNamespaceRequest> {
  return {
    entityLabel: 'namespace',
    uniqueConflictField: 'name',

    createDraft: () => ({
      id: '',
      name: '',
      description: '',
      locked: false,
      isDefault: false
    }),

    validate: (item) => {
      const errors: Record<string, string> = {};
      if (!item.name.trim()) errors.name = 'Namespace name is required';
      return errors;
    },

    toCreatePayload: (_item) => {
      // Namespaces create via modal, not the workflow. This should not be called.
      return { ok: false as const, error: 'Namespace creation uses modal, not drawer workflow' };
    },

    toUpdatePayload: (item) => ({
      ok: true as const,
      data: {
        name: item.name,
        description: item.description
      }
    }),

    // createAction is unused for namespaces (modal handles creation)
    createAction: (() => Promise.resolve({ success: false, error: 'Use modal for namespace creation' })) as any,
    updateAction: updateNamespaceAction,
    deleteAction: deleteNamespaceAction,

    preSaveGuard: (item) => {
      if (item.locked) return 'Cannot edit locked namespaces';
      return null;
    },

    deletionGuard: (item) => {
      if (item.locked) {
        return { canDelete: false, tooltip: 'Cannot delete locked namespaces' };
      }
      const details = deps.getNamespaceEntityDetails(item.id);
      if (details.total > 0) {
        return { canDelete: false, tooltip: `Cannot delete: Contains ${details.total} entities` };
      }
      return { canDelete: true, tooltip: '' };
    }
  };
}
