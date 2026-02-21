import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the API client
vi.mock('$lib/api/client', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn()
}));

import {
  listNamespaces,
  getNamespace,
  createNamespaceApi,
  updateNamespaceApi,
  deleteNamespaceApi
} from '$lib/api/namespaces';
import { apiGet, apiPost, apiPut, apiDelete } from '$lib/api/client';

describe('Namespaces API Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listNamespaces', () => {
    it('should list all namespaces', async () => {
      const mockResponse = [
        { id: 'ns-1', name: 'global', description: null, locked: true, isDefault: false }
      ];
      (apiGet as any).mockResolvedValue(mockResponse);

      const result = await listNamespaces();

      expect(apiGet).toHaveBeenCalledWith('/namespaces');
      expect(result).toEqual([
        { id: 'ns-1', name: 'global', description: undefined, locked: true, isDefault: false }
      ]);
    });
  });

  describe('getNamespace', () => {
    it('should get namespace by ID', async () => {
      const mockResponse = { id: 'ns-1', name: 'global', description: 'Test desc', locked: false, isDefault: true };
      (apiGet as any).mockResolvedValue(mockResponse);

      const result = await getNamespace('ns-1');

      expect(apiGet).toHaveBeenCalledWith('/namespaces/ns-1');
      expect(result.name).toBe('global');
      expect(result.description).toBe('Test desc');
    });

    it('should transform null description to undefined', async () => {
      const mockResponse = { id: 'ns-1', name: 'test', description: null, locked: false, isDefault: false };
      (apiGet as any).mockResolvedValue(mockResponse);

      const result = await getNamespace('ns-1');

      expect(result.description).toBeUndefined();
    });
  });

  describe('createNamespaceApi', () => {
    it('should create namespace and transform response', async () => {
      const mockResponse = { id: 'ns-new', name: 'new', description: null, locked: false, isDefault: false };
      (apiPost as any).mockResolvedValue(mockResponse);

      const result = await createNamespaceApi({ name: 'new' });

      expect(apiPost).toHaveBeenCalledWith('/namespaces', { name: 'new' });
      expect(result.id).toBe('ns-new');
    });
  });

  describe('updateNamespaceApi', () => {
    it('should update namespace and transform response', async () => {
      const mockResponse = { id: 'ns-1', name: 'updated', description: 'new desc', locked: false, isDefault: false };
      (apiPut as any).mockResolvedValue(mockResponse);

      const result = await updateNamespaceApi('ns-1', { name: 'updated', description: 'new desc' });

      expect(apiPut).toHaveBeenCalledWith('/namespaces/ns-1', { name: 'updated', description: 'new desc' });
      expect(result.name).toBe('updated');
    });
  });

  describe('deleteNamespaceApi', () => {
    it('should delete namespace', async () => {
      (apiDelete as any).mockResolvedValue(undefined);

      await deleteNamespaceApi('ns-1');

      expect(apiDelete).toHaveBeenCalledWith('/namespaces/ns-1');
    });
  });
});
