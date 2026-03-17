import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/api/client', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn()
}));

import {
  listEndpoints,
  getEndpoint,
  createEndpointApi,
  updateEndpointApi,
  deleteEndpointApi
} from '$lib/api/endpoints';
import { apiGet, apiPost, apiPut, apiDelete } from '$lib/api/client';

const MOCK_ENDPOINT_RESPONSE = {
  id: 'e-1',
  apiId: 'a-1',
  method: 'GET',
  path: '/users',
  description: 'List users',
  tagName: 'users',
  pathParams: [{ name: 'userId', fieldId: 'f-1', field: 'user_id' }],
  queryParams: [{ name: 'min_age', field: 'age', operator: 'gte' }],
  queryParamsObjectId: 'o-1',
  targetObjectId: 'o-3',
  objectId: 'o-2',
  useEnvelope: true,
  responseShape: 'list',
  pagination: true
};

describe('Endpoints API Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listEndpoints', () => {
    it('should list all endpoints', async () => {
      (apiGet as any).mockResolvedValue([MOCK_ENDPOINT_RESPONSE]);

      const result = await listEndpoints();

      expect(apiGet).toHaveBeenCalledWith('/endpoints');
      expect(result).toHaveLength(1);
      expect(result[0].path).toBe('/users');
      expect(result[0].expanded).toBe(false);
    });

    it('should filter by namespace ID', async () => {
      (apiGet as any).mockResolvedValue([]);

      await listEndpoints('ns-1');

      expect(apiGet).toHaveBeenCalledWith('/endpoints?namespace_id=ns-1');
    });
  });

  describe('getEndpoint', () => {
    it('should get endpoint by ID and transform', async () => {
      (apiGet as any).mockResolvedValue({
        ...MOCK_ENDPOINT_RESPONSE,
        tagName: null,
        queryParamsObjectId: null,
        objectId: null
      });

      const result = await getEndpoint('e-1');

      expect(apiGet).toHaveBeenCalledWith('/endpoints/e-1');
      expect(result.tagName).toBeUndefined();
      expect(result.queryParamsObjectId).toBeUndefined();
      expect(result.objectId).toBeUndefined();
      expect(result.expanded).toBe(false);
    });

    it('should transform path params', async () => {
      (apiGet as any).mockResolvedValue(MOCK_ENDPOINT_RESPONSE);

      const result = await getEndpoint('e-1');

      expect(result.pathParams).toHaveLength(1);
      expect(result.pathParams[0]).toEqual({ name: 'userId', fieldId: 'f-1', field: 'user_id' });
    });
  });

  describe('createEndpointApi', () => {
    it('should create endpoint', async () => {
      (apiPost as any).mockResolvedValue(MOCK_ENDPOINT_RESPONSE);

      const result = await createEndpointApi({
        apiId: 'a-1',
        method: 'GET',
        path: '/users'
      });

      expect(apiPost).toHaveBeenCalledWith('/endpoints', expect.any(Object));
      expect(result.id).toBe('e-1');
    });
  });

  describe('updateEndpointApi', () => {
    it('should update endpoint', async () => {
      (apiPut as any).mockResolvedValue({ ...MOCK_ENDPOINT_RESPONSE, path: '/users/all' });

      const result = await updateEndpointApi('e-1', { path: '/users/all' });

      expect(apiPut).toHaveBeenCalledWith('/endpoints/e-1', { path: '/users/all' });
      expect(result.path).toBe('/users/all');
    });
  });

  describe('deleteEndpointApi', () => {
    it('should delete endpoint', async () => {
      (apiDelete as any).mockResolvedValue(undefined);

      await deleteEndpointApi('e-1');

      expect(apiDelete).toHaveBeenCalledWith('/endpoints/e-1');
    });
  });
});
