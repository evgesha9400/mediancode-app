import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/api/client', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn()
}));

import {
  listObjects,
  getObject,
  createObjectApi,
  updateObjectApi,
  deleteObjectApi
} from '$lib/api/objects';
import { apiGet, apiPost, apiPut, apiDelete } from '$lib/api/client';

const MOCK_OBJECT_RESPONSE = {
  id: 'o-1',
  namespaceId: 'ns-1',
  name: 'User',
  description: 'User model',
  fields: [
    { fieldId: 'f-1', role: 'writable', optional: false, defaultValue: null },
    { fieldId: 'f-2', role: 'writable', optional: true, defaultValue: null }
  ],
  relationships: [],
  validators: [],
  usedInApis: ['api-1']
};

describe('Objects API Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listObjects', () => {
    it('should list all objects', async () => {
      (apiGet as any).mockResolvedValue([MOCK_OBJECT_RESPONSE]);

      const result = await listObjects();

      expect(apiGet).toHaveBeenCalledWith('/objects');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('User');
      expect(result[0].fields).toHaveLength(2);
    });

    it('should transform model validators with template data', async () => {
      const responseWithValidators = {
        ...MOCK_OBJECT_RESPONSE,
        validators: [
          {
            id: 'v-1',
            templateId: 'tmpl-password-confirm',
            parameters: null,
            fieldMappings: { password_field: 'password', confirm_field: 'confirm_password' }
          }
        ]
      };
      (apiGet as any).mockResolvedValue([responseWithValidators]);

      const result = await listObjects();

      expect(result[0].validators).toHaveLength(1);
      expect(result[0].validators[0]).toEqual({
        id: 'v-1',
        templateId: 'tmpl-password-confirm',
        parameters: null,
        fieldMappings: { password_field: 'password', confirm_field: 'confirm_password' }
      });
    });

    it('should filter by namespace', async () => {
      (apiGet as any).mockResolvedValue([]);

      await listObjects('ns-1');

      expect(apiGet).toHaveBeenCalledWith('/objects?namespace_id=ns-1');
    });
  });

  describe('getObject', () => {
    it('should get object by ID and transform', async () => {
      (apiGet as any).mockResolvedValue({ ...MOCK_OBJECT_RESPONSE, description: null });

      const result = await getObject('o-1');

      expect(apiGet).toHaveBeenCalledWith('/objects/o-1');
      expect(result.description).toBeUndefined();
    });
  });

  describe('createObjectApi', () => {
    it('should create object', async () => {
      (apiPost as any).mockResolvedValue(MOCK_OBJECT_RESPONSE);

      const result = await createObjectApi({
        namespaceId: 'ns-1',
        name: 'User',
        fields: [{ fieldId: 'f-1', role: 'writable' as const, optional: false }]
      });

      expect(apiPost).toHaveBeenCalledWith('/objects', expect.any(Object));
      expect(result.id).toBe('o-1');
    });
  });

  describe('updateObjectApi', () => {
    it('should update object', async () => {
      (apiPut as any).mockResolvedValue({ ...MOCK_OBJECT_RESPONSE, name: 'Updated' });

      const result = await updateObjectApi('o-1', { name: 'Updated' });

      expect(apiPut).toHaveBeenCalledWith('/objects/o-1', { name: 'Updated' });
      expect(result.name).toBe('Updated');
    });
  });

  describe('deleteObjectApi', () => {
    it('should delete object', async () => {
      (apiDelete as any).mockResolvedValue(undefined);

      await deleteObjectApi('o-1');

      expect(apiDelete).toHaveBeenCalledWith('/objects/o-1');
    });
  });
});
