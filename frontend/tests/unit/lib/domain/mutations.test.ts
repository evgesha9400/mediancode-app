// tests/unit/lib/domain/mutations.test.ts
//
// Unit tests for the canonical mutation pipeline (create/update/delete actions).

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { get } from 'svelte/store';

// ---------------------------------------------------------------------------
// Mocks — must be declared before imports that use them
// ---------------------------------------------------------------------------

// Mock API transport functions
vi.mock('$lib/api/fields', () => ({
  createFieldApi: vi.fn(),
  updateFieldApi: vi.fn(),
  deleteFieldApi: vi.fn()
}));
vi.mock('$lib/api/objects', () => ({
  createObjectApi: vi.fn(),
  updateObjectApi: vi.fn(),
  deleteObjectApi: vi.fn()
}));
vi.mock('$lib/api/apis', () => ({
  createApiApi: vi.fn(),
  updateApiApi: vi.fn(),
  deleteApiApi: vi.fn()
}));
vi.mock('$lib/api/endpoints', () => ({
  createEndpointApi: vi.fn(),
  updateEndpointApi: vi.fn(),
  deleteEndpointApi: vi.fn()
}));
vi.mock('$lib/api/namespaces', () => ({
  createNamespaceApi: vi.fn(),
  updateNamespaceApi: vi.fn(),
  deleteNamespaceApi: vi.fn()
}));
vi.mock('$lib/api/fieldValidators', () => ({
  createFieldValidatorApi: vi.fn(),
  updateFieldValidatorApi: vi.fn(),
  deleteFieldValidatorApi: vi.fn()
}));
vi.mock('$lib/api/modelValidators', () => ({
  createModelValidatorApi: vi.fn(),
  updateModelValidatorApi: vi.fn(),
  deleteModelValidatorApi: vi.fn()
}));

// Mock errorMap — use a simplified version
vi.mock('$lib/domain/errorMap', () => ({
  mapApiError: vi.fn((_err: unknown, context: string) => `Failed to ${context}`)
}));

// Mock references — success by default
vi.mock('$lib/utils/references', () => ({
  checkFieldDeletion: vi.fn(() => ({ success: true })),
  checkObjectDeletion: vi.fn(() => ({ success: true }))
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import {
  createFieldAction,
  updateFieldAction,
  deleteFieldAction,
  createObjectAction,
  updateObjectAction,
  deleteObjectAction,
  createApiAction,
  updateApiAction,
  deleteApiAction,
  createEndpointAction,
  updateEndpointAction,
  deleteEndpointAction,
  createNamespaceAction,
  updateNamespaceAction,
  deleteNamespaceAction,
  createFieldValidatorAction,
  updateFieldValidatorAction,
  deleteFieldValidatorAction,
  createModelValidatorAction,
  updateModelValidatorAction,
  deleteModelValidatorAction
} from '$lib/domain/mutations';

import { fieldsStore } from '$lib/stores/fields';
import { objectsStore } from '$lib/stores/objects';
import { apisStore, endpointsStore } from '$lib/stores/apis';
import { namespacesStore, activeNamespaceId, GLOBAL_NAMESPACE_ID } from '$lib/stores/namespaces';
import { fieldConstraintsStore } from '$lib/stores/fieldConstraints';

import { createFieldApi, updateFieldApi, deleteFieldApi } from '$lib/api/fields';
import { createObjectApi, updateObjectApi, deleteObjectApi } from '$lib/api/objects';
import { createApiApi, updateApiApi, deleteApiApi } from '$lib/api/apis';
import { createEndpointApi, updateEndpointApi, deleteEndpointApi } from '$lib/api/endpoints';
import { createNamespaceApi, updateNamespaceApi, deleteNamespaceApi } from '$lib/api/namespaces';
import { createFieldValidatorApi, updateFieldValidatorApi, deleteFieldValidatorApi } from '$lib/api/fieldValidators';
import { createModelValidatorApi, updateModelValidatorApi, deleteModelValidatorApi } from '$lib/api/modelValidators';
import { fieldValidatorsStore } from '$lib/stores/fieldValidators';
import { modelValidatorsStore } from '$lib/stores/modelValidators';
import { checkFieldDeletion, checkObjectDeletion } from '$lib/utils/references';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FIELD_1 = {
  id: 'f-1', name: 'username', namespaceId: 'ns-1', type: 'str',
  description: '', defaultValue: '', constraints: [], usedInApis: []
};

const OBJECT_1 = {
  id: 'o-1', name: 'User', namespaceId: 'ns-1', description: '',
  fields: [], usedInApis: []
};

const API_1 = {
  id: 'a-1', title: 'Users API', version: '1.0', description: '',
  namespaceId: 'ns-1', updatedAt: '', namespaceSlug: ''
};

const ENDPOINT_1 = {
  id: 'e-1', apiId: 'a-1', path: '/users', method: 'GET', summary: '',
  description: '', pathParams: [], queryParams: [], requestObjectId: null,
  responseObjectId: null, responseShape: 'object', expanded: false
};

const NAMESPACE_1 = {
  id: 'ns-1', name: 'Test NS', description: '', locked: false, slug: 'test'
};

const FIELD_VALIDATOR_1 = {
  id: 'fv-1', namespaceId: 'ns-1', name: 'String Cleanup',
  description: 'Strip whitespace', compatibleTypes: ['str'],
  mode: 'before', code: 'v = v.strip()', usedInFields: 0,
  createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z'
};

const FIELD_VALIDATOR_USED = {
  id: 'fv-2', namespaceId: 'ns-1', name: 'Email Format',
  description: 'Validate email', compatibleTypes: ['str'],
  mode: 'after', code: 'validate(v)', usedInFields: 3,
  createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z'
};

const MODEL_VALIDATOR_1 = {
  id: 'mv-1', namespaceId: 'ns-1', name: 'Date Range',
  description: 'Check date range', requiredFields: ['start_date', 'end_date'],
  mode: 'after', code: 'check(self)', usedInObjects: 0,
  createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z'
};

const MODEL_VALIDATOR_USED = {
  id: 'mv-2', namespaceId: 'ns-1', name: 'Company Check',
  description: 'Validate company fields', requiredFields: ['company_name'],
  mode: 'after', code: 'check(self)', usedInObjects: 2,
  createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z'
};

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();

  // Reset stores to known state
  fieldsStore.set([{ ...FIELD_1 }] as any);
  objectsStore.set([{ ...OBJECT_1 }] as any);
  apisStore.set([{ ...API_1 }] as any);
  endpointsStore.set([{ ...ENDPOINT_1 }] as any);
  namespacesStore.set([{ ...NAMESPACE_1 }] as any);
  fieldConstraintsStore.set([]);
  fieldValidatorsStore.set([{ ...FIELD_VALIDATOR_1 }, { ...FIELD_VALIDATOR_USED }] as any);
  modelValidatorsStore.set([{ ...MODEL_VALIDATOR_1 }, { ...MODEL_VALIDATOR_USED }] as any);
  activeNamespaceId.set(GLOBAL_NAMESPACE_ID);

  // Default reference guards: allow deletion
  (checkFieldDeletion as Mock).mockReturnValue({ success: true });
  (checkObjectDeletion as Mock).mockReturnValue({ success: true });
});

// ===========================================================================
// Field Actions
// ===========================================================================

describe('Field Actions', () => {
  describe('createFieldAction', () => {
    it('adds field to store on success', async () => {
      const newField = { ...FIELD_1, id: 'f-new', name: 'email' };
      (createFieldApi as Mock).mockResolvedValue(newField);

      const result = await createFieldAction({ name: 'email', namespaceId: 'ns-1', type: 'str' } as any);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(newField);
      expect(get(fieldsStore)).toHaveLength(2);
    });

    it('returns error on API failure', async () => {
      (createFieldApi as Mock).mockRejectedValue(new Error('fail'));

      const result = await createFieldAction({ name: 'email' } as any);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('updateFieldAction', () => {
    it('applies optimistic update then commits API result', async () => {
      const updated = { ...FIELD_1, name: 'email_updated' };
      (updateFieldApi as Mock).mockResolvedValue(updated);

      const result = await updateFieldAction('f-1', { name: 'email_updated' } as any);

      expect(result.success).toBe(true);
      expect(get(fieldsStore)[0].name).toBe('email_updated');
    });

    it('rolls back on API failure', async () => {
      (updateFieldApi as Mock).mockRejectedValue(new Error('fail'));

      const result = await updateFieldAction('f-1', { name: 'changed' } as any);

      expect(result.success).toBe(false);
      // Rolled back to original
      expect(get(fieldsStore)[0].name).toBe('username');
    });
  });

  describe('deleteFieldAction', () => {
    it('removes field from store on success', async () => {
      (deleteFieldApi as Mock).mockResolvedValue(undefined);

      const result = await deleteFieldAction('f-1');

      expect(result.success).toBe(true);
      expect(get(fieldsStore)).toHaveLength(0);
    });

    it('blocks deletion when guard fails', async () => {
      (checkFieldDeletion as Mock).mockReturnValue({
        success: false, error: 'Cannot delete: used in APIs'
      });

      const result = await deleteFieldAction('f-1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot delete');
      expect(get(fieldsStore)).toHaveLength(1);
    });
  });
});

// ===========================================================================
// Object Actions
// ===========================================================================

describe('Object Actions', () => {
  describe('createObjectAction', () => {
    it('adds object to store on success', async () => {
      const newObj = { ...OBJECT_1, id: 'o-new', name: 'Post' };
      (createObjectApi as Mock).mockResolvedValue(newObj);

      const result = await createObjectAction({ name: 'Post', namespaceId: 'ns-1' } as any);

      expect(result.success).toBe(true);
      expect(get(objectsStore)).toHaveLength(2);
    });

    it('returns error on API failure', async () => {
      (createObjectApi as Mock).mockRejectedValue(new Error('fail'));

      const result = await createObjectAction({ name: 'Post' } as any);
      expect(result.success).toBe(false);
    });
  });

  describe('updateObjectAction', () => {
    it('applies optimistic update then commits', async () => {
      const updated = { ...OBJECT_1, name: 'UserV2' };
      (updateObjectApi as Mock).mockResolvedValue(updated);

      const result = await updateObjectAction('o-1', { name: 'UserV2' } as any);

      expect(result.success).toBe(true);
      expect(get(objectsStore)[0].name).toBe('UserV2');
    });

    it('rolls back on failure', async () => {
      (updateObjectApi as Mock).mockRejectedValue(new Error('fail'));

      await updateObjectAction('o-1', { name: 'changed' } as any);

      expect(get(objectsStore)[0].name).toBe('User');
    });
  });

  describe('deleteObjectAction', () => {
    it('removes object from store on success', async () => {
      (deleteObjectApi as Mock).mockResolvedValue(undefined);

      const result = await deleteObjectAction('o-1');

      expect(result.success).toBe(true);
      expect(get(objectsStore)).toHaveLength(0);
    });

    it('blocks deletion when guard fails', async () => {
      (checkObjectDeletion as Mock).mockReturnValue({
        success: false, error: 'Cannot delete: used in APIs'
      });

      const result = await deleteObjectAction('o-1');

      expect(result.success).toBe(false);
      expect(get(objectsStore)).toHaveLength(1);
    });
  });
});

// ===========================================================================
// API Actions
// ===========================================================================

describe('API Actions', () => {
  describe('createApiAction', () => {
    it('adds API to store on success', async () => {
      const newApi = { ...API_1, id: 'a-new', title: 'Posts API' };
      (createApiApi as Mock).mockResolvedValue(newApi);

      const result = await createApiAction({ title: 'Posts API' } as any);

      expect(result.success).toBe(true);
      expect(get(apisStore)).toHaveLength(2);
    });
  });

  describe('updateApiAction', () => {
    it('applies optimistic update then commits', async () => {
      const updated = { ...API_1, title: 'Updated' };
      (updateApiApi as Mock).mockResolvedValue(updated);

      const result = await updateApiAction('a-1', { title: 'Updated' } as any);

      expect(result.success).toBe(true);
    });

    it('rolls back on failure', async () => {
      (updateApiApi as Mock).mockRejectedValue(new Error('fail'));

      await updateApiAction('a-1', { title: 'changed' } as any);

      expect(get(apisStore)[0].title).toBe('Users API');
    });
  });

  describe('deleteApiAction', () => {
    it('removes API and its endpoints from stores', async () => {
      (deleteApiApi as Mock).mockResolvedValue(undefined);

      const result = await deleteApiAction('a-1');

      expect(result.success).toBe(true);
      expect(get(apisStore)).toHaveLength(0);
      expect(get(endpointsStore)).toHaveLength(0);
    });
  });
});

// ===========================================================================
// Endpoint Actions
// ===========================================================================

describe('Endpoint Actions', () => {
  describe('createEndpointAction', () => {
    it('adds endpoint to store on success', async () => {
      const newEp = { ...ENDPOINT_1, id: 'e-new', path: '/posts' };
      (createEndpointApi as Mock).mockResolvedValue(newEp);

      const result = await createEndpointAction({ apiId: 'a-1', path: '/posts' } as any);

      expect(result.success).toBe(true);
      expect(get(endpointsStore)).toHaveLength(2);
    });
  });

  describe('updateEndpointAction', () => {
    it('applies optimistic update then commits', async () => {
      const updated = { ...ENDPOINT_1, path: '/users/all' };
      (updateEndpointApi as Mock).mockResolvedValue(updated);

      const result = await updateEndpointAction('e-1', { path: '/users/all' } as any);

      expect(result.success).toBe(true);
    });

    it('rolls back on failure', async () => {
      (updateEndpointApi as Mock).mockRejectedValue(new Error('fail'));

      await updateEndpointAction('e-1', { path: '/changed' } as any);

      expect(get(endpointsStore)[0].path).toBe('/users');
    });
  });

  describe('deleteEndpointAction', () => {
    it('removes endpoint from store on success', async () => {
      (deleteEndpointApi as Mock).mockResolvedValue(undefined);

      const result = await deleteEndpointAction('e-1');

      expect(result.success).toBe(true);
      expect(get(endpointsStore)).toHaveLength(0);
    });
  });
});

// ===========================================================================
// Namespace Actions
// ===========================================================================

describe('Namespace Actions', () => {
  describe('createNamespaceAction', () => {
    it('adds namespace to store on success', async () => {
      const newNs = { ...NAMESPACE_1, id: 'ns-new', name: 'New NS' };
      (createNamespaceApi as Mock).mockResolvedValue(newNs);

      const result = await createNamespaceAction({ name: 'New NS' } as any);

      expect(result.success).toBe(true);
      expect(get(namespacesStore)).toHaveLength(2);
    });
  });

  describe('updateNamespaceAction', () => {
    it('applies optimistic update then commits', async () => {
      const updated = { ...NAMESPACE_1, name: 'Renamed' };
      (updateNamespaceApi as Mock).mockResolvedValue(updated);

      const result = await updateNamespaceAction('ns-1', { name: 'Renamed' } as any);

      expect(result.success).toBe(true);
    });

    it('rolls back on failure', async () => {
      (updateNamespaceApi as Mock).mockRejectedValue(new Error('fail'));

      await updateNamespaceAction('ns-1', { name: 'changed' } as any);

      expect(get(namespacesStore)[0].name).toBe('Test NS');
    });
  });

  describe('deleteNamespaceAction', () => {
    it('returns error when namespace not found', async () => {
      const result = await deleteNamespaceAction('nonexistent');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('returns error when namespace is locked', async () => {
      namespacesStore.set([{ ...NAMESPACE_1, locked: true }] as any);

      const result = await deleteNamespaceAction('ns-1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('locked');
    });

    it('returns error when namespace has entities', async () => {
      // Add a field in this namespace
      fieldsStore.set([{ ...FIELD_1, namespaceId: 'ns-1' }] as any);

      const result = await deleteNamespaceAction('ns-1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('1 field');
    });

    it('removes namespace on success and resets active namespace', async () => {
      // Empty out entities so guard passes
      fieldsStore.set([]);
      objectsStore.set([]);
      apisStore.set([]);
      endpointsStore.set([]);
      fieldConstraintsStore.set([]);
      fieldValidatorsStore.set([]);
      modelValidatorsStore.set([]);
      activeNamespaceId.set('ns-1'); // Set as active

      (deleteNamespaceApi as Mock).mockResolvedValue(undefined);

      const result = await deleteNamespaceAction('ns-1');

      expect(result.success).toBe(true);
      expect(get(namespacesStore)).toHaveLength(0);
      expect(get(activeNamespaceId)).toBe(GLOBAL_NAMESPACE_ID);
    });

    it('does not reset active namespace if deleted namespace was not active', async () => {
      fieldsStore.set([]);
      objectsStore.set([]);
      apisStore.set([]);
      endpointsStore.set([]);
      fieldConstraintsStore.set([]);
      fieldValidatorsStore.set([]);
      modelValidatorsStore.set([]);
      activeNamespaceId.set('other-ns');

      (deleteNamespaceApi as Mock).mockResolvedValue(undefined);

      await deleteNamespaceAction('ns-1');

      expect(get(activeNamespaceId)).toBe('other-ns');
    });
  });
});

// ===========================================================================
// Field Validator Actions
// ===========================================================================

describe('Field Validator Actions', () => {
  describe('createFieldValidatorAction', () => {
    it('adds field validator to store on success', async () => {
      const newFv = { ...FIELD_VALIDATOR_1, id: 'fv-new', name: 'New Validator' };
      (createFieldValidatorApi as Mock).mockResolvedValue(newFv);

      const result = await createFieldValidatorAction({
        name: 'New Validator', namespaceId: 'ns-1', description: '',
        compatibleTypes: ['str'], mode: 'before', code: ''
      } as any);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(newFv);
      expect(get(fieldValidatorsStore)).toHaveLength(3);
    });

    it('returns error on API failure', async () => {
      (createFieldValidatorApi as Mock).mockRejectedValue(new Error('fail'));

      const result = await createFieldValidatorAction({ name: 'test' } as any);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('updateFieldValidatorAction', () => {
    it('applies optimistic update then commits API result', async () => {
      const updated = { ...FIELD_VALIDATOR_1, name: 'Updated Name' };
      (updateFieldValidatorApi as Mock).mockResolvedValue(updated);

      const result = await updateFieldValidatorAction('fv-1', { name: 'Updated Name' } as any);

      expect(result.success).toBe(true);
      const fv = get(fieldValidatorsStore).find(f => f.id === 'fv-1');
      expect(fv?.name).toBe('Updated Name');
    });

    it('rolls back on API failure', async () => {
      (updateFieldValidatorApi as Mock).mockRejectedValue(new Error('fail'));

      const result = await updateFieldValidatorAction('fv-1', { name: 'changed' } as any);

      expect(result.success).toBe(false);
      const fv = get(fieldValidatorsStore).find(f => f.id === 'fv-1');
      expect(fv?.name).toBe('String Cleanup');
    });
  });

  describe('deleteFieldValidatorAction', () => {
    it('removes field validator from store on success', async () => {
      (deleteFieldValidatorApi as Mock).mockResolvedValue(undefined);

      const result = await deleteFieldValidatorAction('fv-1');

      expect(result.success).toBe(true);
      expect(get(fieldValidatorsStore).find(f => f.id === 'fv-1')).toBeUndefined();
    });

    it('blocks deletion when validator is used in fields', async () => {
      const result = await deleteFieldValidatorAction('fv-2');

      expect(result.success).toBe(false);
      expect(result.error).toContain('used in 3 fields');
      expect(get(fieldValidatorsStore).find(f => f.id === 'fv-2')).toBeDefined();
    });

    it('returns error on API failure', async () => {
      (deleteFieldValidatorApi as Mock).mockRejectedValue(new Error('fail'));

      const result = await deleteFieldValidatorAction('fv-1');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});

// ===========================================================================
// Model Validator Actions
// ===========================================================================

describe('Model Validator Actions', () => {
  describe('createModelValidatorAction', () => {
    it('adds model validator to store on success', async () => {
      const newMv = { ...MODEL_VALIDATOR_1, id: 'mv-new', name: 'New Validator' };
      (createModelValidatorApi as Mock).mockResolvedValue(newMv);

      const result = await createModelValidatorAction({
        name: 'New Validator', namespaceId: 'ns-1', description: '',
        requiredFields: ['start_date'], mode: 'after', code: ''
      } as any);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(newMv);
      expect(get(modelValidatorsStore)).toHaveLength(3);
    });

    it('returns error on API failure', async () => {
      (createModelValidatorApi as Mock).mockRejectedValue(new Error('fail'));

      const result = await createModelValidatorAction({ name: 'test' } as any);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('updateModelValidatorAction', () => {
    it('applies optimistic update then commits API result', async () => {
      const updated = { ...MODEL_VALIDATOR_1, name: 'Updated Name' };
      (updateModelValidatorApi as Mock).mockResolvedValue(updated);

      const result = await updateModelValidatorAction('mv-1', { name: 'Updated Name' } as any);

      expect(result.success).toBe(true);
      const mv = get(modelValidatorsStore).find(m => m.id === 'mv-1');
      expect(mv?.name).toBe('Updated Name');
    });

    it('rolls back on API failure', async () => {
      (updateModelValidatorApi as Mock).mockRejectedValue(new Error('fail'));

      const result = await updateModelValidatorAction('mv-1', { name: 'changed' } as any);

      expect(result.success).toBe(false);
      const mv = get(modelValidatorsStore).find(m => m.id === 'mv-1');
      expect(mv?.name).toBe('Date Range');
    });
  });

  describe('deleteModelValidatorAction', () => {
    it('removes model validator from store on success', async () => {
      (deleteModelValidatorApi as Mock).mockResolvedValue(undefined);

      const result = await deleteModelValidatorAction('mv-1');

      expect(result.success).toBe(true);
      expect(get(modelValidatorsStore).find(m => m.id === 'mv-1')).toBeUndefined();
    });

    it('blocks deletion when validator is used in objects', async () => {
      const result = await deleteModelValidatorAction('mv-2');

      expect(result.success).toBe(false);
      expect(result.error).toContain('used in 2 objects');
      expect(get(modelValidatorsStore).find(m => m.id === 'mv-2')).toBeDefined();
    });

    it('returns error on API failure', async () => {
      (deleteModelValidatorApi as Mock).mockRejectedValue(new Error('fail'));

      const result = await deleteModelValidatorAction('mv-1');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
