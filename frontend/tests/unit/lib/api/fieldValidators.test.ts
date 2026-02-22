import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/api/client', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn()
}));

import {
  listFieldValidators,
  getFieldValidator,
  createFieldValidatorApi,
  updateFieldValidatorApi,
  deleteFieldValidatorApi
} from '$lib/api/fieldValidators';
import { apiGet, apiPost, apiPut, apiDelete } from '$lib/api/client';

const MOCK_FV_RESPONSE = {
  id: 'fv-1',
  namespaceId: 'ns-1',
  name: 'String Cleanup',
  description: 'Strip whitespace',
  compatibleTypes: ['str'],
  mode: 'before',
  code: 'v = v.strip()',
  usedInFields: 2,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z'
};

describe('Field Validators API Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listFieldValidators', () => {
    it('should list all field validators', async () => {
      (apiGet as any).mockResolvedValue([MOCK_FV_RESPONSE]);

      const result = await listFieldValidators();

      expect(apiGet).toHaveBeenCalledWith('/field-validators');
      expect(result).toHaveLength(1);
    });

    it('should filter by namespace', async () => {
      (apiGet as any).mockResolvedValue([]);

      await listFieldValidators('ns-1');

      expect(apiGet).toHaveBeenCalledWith('/field-validators?namespace_id=ns-1');
    });
  });

  describe('getFieldValidator', () => {
    it('should get field validator by ID', async () => {
      (apiGet as any).mockResolvedValue(MOCK_FV_RESPONSE);

      const result = await getFieldValidator('fv-1');

      expect(apiGet).toHaveBeenCalledWith('/field-validators/fv-1');
      expect(result.name).toBe('String Cleanup');
    });
  });

  describe('createFieldValidatorApi', () => {
    it('should create field validator', async () => {
      (apiPost as any).mockResolvedValue(MOCK_FV_RESPONSE);

      const result = await createFieldValidatorApi({
        namespaceId: 'ns-1',
        name: 'String Cleanup',
        description: 'Strip whitespace',
        compatibleTypes: ['str'],
        mode: 'before',
        code: 'v = v.strip()'
      });

      expect(apiPost).toHaveBeenCalledWith('/field-validators', expect.any(Object));
      expect(result.id).toBe('fv-1');
    });
  });

  describe('updateFieldValidatorApi', () => {
    it('should update field validator', async () => {
      (apiPut as any).mockResolvedValue({ ...MOCK_FV_RESPONSE, name: 'Updated' });

      const result = await updateFieldValidatorApi('fv-1', { name: 'Updated' });

      expect(apiPut).toHaveBeenCalledWith('/field-validators/fv-1', { name: 'Updated' });
      expect(result.name).toBe('Updated');
    });
  });

  describe('deleteFieldValidatorApi', () => {
    it('should delete field validator', async () => {
      (apiDelete as any).mockResolvedValue(undefined);

      await deleteFieldValidatorApi('fv-1');

      expect(apiDelete).toHaveBeenCalledWith('/field-validators/fv-1');
    });
  });
});
