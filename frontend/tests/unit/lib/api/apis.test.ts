import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/api/client', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn()
}));

import { listApis, getApi, createApiApi, updateApiApi, deleteApiApi } from '$lib/api/apis';
import { apiGet, apiPost, apiPut, apiDelete } from '$lib/api/client';

const MOCK_API_RESPONSE = {
  id: 'a-1',
  namespaceId: 'ns-1',
  title: 'Users API',
  version: '1.0',
  description: 'Manage users',
  baseUrl: '/api',
  serverUrl: 'https://api.example.com',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-15T00:00:00Z'
};

describe('APIs API Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listApis', () => {
    it('should list all APIs', async () => {
      (apiGet as any).mockResolvedValue([MOCK_API_RESPONSE]);

      const result = await listApis();

      expect(apiGet).toHaveBeenCalledWith('/apis');
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Users API');
    });

    it('should filter by namespace', async () => {
      (apiGet as any).mockResolvedValue([]);

      await listApis('ns-1');

      expect(apiGet).toHaveBeenCalledWith('/apis?namespaceId=ns-1');
    });
  });

  describe('getApi', () => {
    it('should get API by ID', async () => {
      (apiGet as any).mockResolvedValue(MOCK_API_RESPONSE);

      const result = await getApi('a-1');

      expect(apiGet).toHaveBeenCalledWith('/apis/a-1');
      expect(result.title).toBe('Users API');
      expect(result.version).toBe('1.0');
    });
  });

  describe('createApiApi', () => {
    it('should create API', async () => {
      (apiPost as any).mockResolvedValue(MOCK_API_RESPONSE);

      const result = await createApiApi({ namespaceId: 'ns-1', title: 'Users API' });

      expect(apiPost).toHaveBeenCalledWith('/apis', expect.any(Object));
      expect(result.id).toBe('a-1');
    });
  });

  describe('updateApiApi', () => {
    it('should update API', async () => {
      (apiPut as any).mockResolvedValue({ ...MOCK_API_RESPONSE, title: 'Updated' });

      const result = await updateApiApi('a-1', { title: 'Updated' });

      expect(apiPut).toHaveBeenCalledWith('/apis/a-1', { title: 'Updated' });
      expect(result.title).toBe('Updated');
    });
  });

  describe('deleteApiApi', () => {
    it('should delete API', async () => {
      (apiDelete as any).mockResolvedValue(undefined);

      await deleteApiApi('a-1');

      expect(apiDelete).toHaveBeenCalledWith('/apis/a-1');
    });
  });
});
