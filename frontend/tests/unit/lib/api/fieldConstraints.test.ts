import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/api/client', () => ({
  apiGet: vi.fn()
}));

import { listFieldConstraints } from '$lib/api/fieldConstraints';
import { apiGet } from '$lib/api/client';

const MOCK_CONSTRAINT_RESPONSE = {
  id: 'fc-1',
  namespaceId: 'ns-1',
  name: 'max_length',
  description: 'Maximum string length',
  parameterTypes: ['int'],
  docsUrl: 'https://docs.example.com/max_length',
  compatibleTypes: ['str'],
  usedInFields: 5
};

describe('Field Constraints API Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listFieldConstraints', () => {
    it('should list all field constraints', async () => {
      (apiGet as any).mockResolvedValue([MOCK_CONSTRAINT_RESPONSE]);

      const result = await listFieldConstraints();

      expect(apiGet).toHaveBeenCalledWith('/field-constraints');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(MOCK_CONSTRAINT_RESPONSE);
    });

    it('should filter by namespace', async () => {
      (apiGet as any).mockResolvedValue([]);

      await listFieldConstraints('ns-1');

      expect(apiGet).toHaveBeenCalledWith('/field-constraints?namespace_id=ns-1');
    });
  });
});
