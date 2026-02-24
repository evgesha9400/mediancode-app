import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/api/client', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn()
}));

// Mock types store for buildTypeIdToNameMap
vi.mock('$lib/stores/types', () => ({
  typesBaseStore: {
    subscribe: vi.fn((fn: any) => {
      fn([
        { id: 'type-str', name: 'str' },
        { id: 'type-int', name: 'int' },
        { id: 'type-bool', name: 'bool' }
      ]);
      return () => {};
    })
  }
}));

import {
  listFields,
  getField,
  createFieldApi,
  updateFieldApi,
  deleteFieldApi
} from '$lib/api/fields';
import { apiGet, apiPost, apiPut, apiDelete } from '$lib/api/client';

const MOCK_FIELD_RESPONSE = {
  id: 'f-1',
  namespaceId: 'ns-1',
  name: 'email',
  typeId: 'type-str',
  description: 'User email',
  defaultValue: null,
  constraints: [
    { name: 'max_length', constraintId: 'c-1', value: '255' }
  ],
  validators: [],
  usedInApis: ['api-1']
};

describe('Fields API Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listFields', () => {
    it('should list and transform fields', async () => {
      (apiGet as any).mockResolvedValue([MOCK_FIELD_RESPONSE]);

      const result = await listFields();

      expect(apiGet).toHaveBeenCalledWith('/fields');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('email');
      expect(result[0].type).toBe('str');
      expect(result[0].constraints[0].name).toBe('max_length');
    });

    it('should transform field validators with template data', async () => {
      const responseWithValidators = {
        ...MOCK_FIELD_RESPONSE,
        validators: [
          { id: 'v-1', templateId: 'tmpl-strip-normalize', parameters: { case: 'lowercase' } }
        ]
      };
      (apiGet as any).mockResolvedValue([responseWithValidators]);

      const result = await listFields();

      expect(result[0].validators).toHaveLength(1);
      expect(result[0].validators[0]).toEqual({
        id: 'v-1',
        templateId: 'tmpl-strip-normalize',
        parameters: { case: 'lowercase' }
      });
    });

    it('should filter by namespace', async () => {
      (apiGet as any).mockResolvedValue([]);

      await listFields('ns-1');

      expect(apiGet).toHaveBeenCalledWith('/fields?namespace_id=ns-1');
    });
  });

  describe('getField', () => {
    it('should get field and transform null values', async () => {
      (apiGet as any).mockResolvedValue({
        ...MOCK_FIELD_RESPONSE,
        description: null,
        defaultValue: null
      });

      const result = await getField('f-1');

      expect(apiGet).toHaveBeenCalledWith('/fields/f-1');
      expect(result.description).toBeUndefined();
      expect(result.defaultValue).toBeUndefined();
    });

    it('should handle unknown typeId with fallback to str', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      (apiGet as any).mockResolvedValue({
        ...MOCK_FIELD_RESPONSE,
        typeId: 'unknown-type'
      });

      const result = await getField('f-1');

      expect(result.type).toBe('str');
      consoleSpy.mockRestore();
    });
  });

  describe('createFieldApi', () => {
    it('should create field and transform response', async () => {
      (apiPost as any).mockResolvedValue(MOCK_FIELD_RESPONSE);

      const result = await createFieldApi({
        namespaceId: 'ns-1',
        name: 'email',
        typeId: 'type-str',
        constraints: []
      });

      expect(apiPost).toHaveBeenCalledWith('/fields', expect.any(Object));
      expect(result.id).toBe('f-1');
      expect(result.type).toBe('str');
    });
  });

  describe('updateFieldApi', () => {
    it('should update field and transform response', async () => {
      (apiPut as any).mockResolvedValue({ ...MOCK_FIELD_RESPONSE, name: 'updated_email' });

      const result = await updateFieldApi('f-1', { name: 'updated_email' });

      expect(apiPut).toHaveBeenCalledWith('/fields/f-1', { name: 'updated_email' });
      expect(result.name).toBe('updated_email');
    });
  });

  describe('deleteFieldApi', () => {
    it('should delete field', async () => {
      (apiDelete as any).mockResolvedValue(undefined);

      await deleteFieldApi('f-1');

      expect(apiDelete).toHaveBeenCalledWith('/fields/f-1');
    });
  });
});
