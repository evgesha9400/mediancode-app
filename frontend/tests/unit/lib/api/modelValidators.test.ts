import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/api/client', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn()
}));

import {
  listModelValidators,
  getModelValidator,
  createModelValidatorApi,
  updateModelValidatorApi,
  deleteModelValidatorApi
} from '$lib/api/modelValidators';
import { apiGet, apiPost, apiPut, apiDelete } from '$lib/api/client';

const MOCK_MV_RESPONSE = {
  id: 'mv-1',
  namespaceId: 'ns-1',
  name: 'Date Range Check',
  description: 'Ensure end_date > start_date',
  requiredFields: ['start_date', 'end_date'],
  mode: 'after',
  code: 'check(self)',
  usedInObjects: 2,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z'
};

describe('Model Validators API Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listModelValidators', () => {
    it('should list all model validators', async () => {
      (apiGet as any).mockResolvedValue([MOCK_MV_RESPONSE]);

      const result = await listModelValidators();

      expect(apiGet).toHaveBeenCalledWith('/model-validators');
      expect(result).toHaveLength(1);
    });

    it('should filter by namespace', async () => {
      (apiGet as any).mockResolvedValue([]);

      await listModelValidators('ns-1');

      expect(apiGet).toHaveBeenCalledWith('/model-validators?namespace_id=ns-1');
    });
  });

  describe('getModelValidator', () => {
    it('should get model validator by ID', async () => {
      (apiGet as any).mockResolvedValue(MOCK_MV_RESPONSE);

      const result = await getModelValidator('mv-1');

      expect(apiGet).toHaveBeenCalledWith('/model-validators/mv-1');
      expect(result.name).toBe('Date Range Check');
    });
  });

  describe('createModelValidatorApi', () => {
    it('should create model validator', async () => {
      (apiPost as any).mockResolvedValue(MOCK_MV_RESPONSE);

      const result = await createModelValidatorApi({
        namespaceId: 'ns-1',
        name: 'Date Range Check',
        description: 'Ensure end_date > start_date',
        requiredFields: ['start_date', 'end_date'],
        mode: 'after',
        code: 'check(self)'
      });

      expect(apiPost).toHaveBeenCalledWith('/model-validators', expect.any(Object));
      expect(result.id).toBe('mv-1');
    });
  });

  describe('updateModelValidatorApi', () => {
    it('should update model validator', async () => {
      (apiPut as any).mockResolvedValue({ ...MOCK_MV_RESPONSE, name: 'Updated' });

      const result = await updateModelValidatorApi('mv-1', { name: 'Updated' });

      expect(apiPut).toHaveBeenCalledWith('/model-validators/mv-1', { name: 'Updated' });
      expect(result.name).toBe('Updated');
    });
  });

  describe('deleteModelValidatorApi', () => {
    it('should delete model validator', async () => {
      (apiDelete as any).mockResolvedValue(undefined);

      await deleteModelValidatorApi('mv-1');

      expect(apiDelete).toHaveBeenCalledWith('/model-validators/mv-1');
    });
  });
});
