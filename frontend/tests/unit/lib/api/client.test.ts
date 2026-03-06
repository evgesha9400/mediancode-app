import { describe, it, expect, vi, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../../shared/msw/server';

// Mock clerk and org store
vi.mock('$lib/clerk', () => ({
  getClerk: vi.fn(() => null)
}));

vi.mock('$lib/stores/organization', () => ({
  getActiveOrganizationId: vi.fn(() => null)
}));

import { apiClient, apiGet, apiPost, apiPut, apiDelete, apiPostBlob, ApiError } from '$lib/api/client';
import { getClerk } from '$lib/clerk';
import { getActiveOrganizationId } from '$lib/stores/organization';

// Base URL from mocked $env/dynamic/public in vitestSetup.ts
const API_BASE = 'http://localhost:3000/v1';

describe('API Client - apiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getClerk as any).mockReturnValue(null);
    (getActiveOrganizationId as any).mockReturnValue(null);
  });

  it('should make GET request to correct URL and parse JSON response', async () => {
    server.use(
      http.get(`${API_BASE}/test`, () => {
        return HttpResponse.json({ data: 'hello' });
      })
    );

    const result = await apiClient<{ data: string }>('/test');
    expect(result).toEqual({ data: 'hello' });
  });

  it('should include Authorization header when clerk session exists', async () => {
    let capturedAuthHeader: string | null = null;
    server.use(
      http.get(`${API_BASE}/auth-test`, ({ request }) => {
        capturedAuthHeader = request.headers.get('Authorization');
        return HttpResponse.json({ ok: true });
      })
    );

    (getClerk as any).mockReturnValue({
      session: { getToken: vi.fn().mockResolvedValue('test-jwt-token') }
    });

    await apiClient('/auth-test');

    expect(capturedAuthHeader).toBe('Bearer test-jwt-token');
  });

  it('should not include Authorization header when skipAuth is true', async () => {
    let capturedAuthHeader: string | null = null;
    server.use(
      http.get(`${API_BASE}/skip-auth`, ({ request }) => {
        capturedAuthHeader = request.headers.get('Authorization');
        return HttpResponse.json({ ok: true });
      })
    );

    (getClerk as any).mockReturnValue({
      session: { getToken: vi.fn().mockResolvedValue('test-jwt-token') }
    });

    await apiClient('/skip-auth', { skipAuth: true });

    expect(capturedAuthHeader).toBeNull();
  });

  it('should include X-Organization-Id when org is active', async () => {
    let capturedOrgHeader: string | null = null;
    server.use(
      http.get(`${API_BASE}/org-test`, ({ request }) => {
        capturedOrgHeader = request.headers.get('X-Organization-Id');
        return HttpResponse.json({ ok: true });
      })
    );

    (getActiveOrganizationId as any).mockReturnValue('org-123');

    await apiClient('/org-test');

    expect(capturedOrgHeader).toBe('org-123');
  });

  it('should send JSON body for POST requests', async () => {
    let capturedBody: any = null;
    let capturedContentType: string | null = null;
    server.use(
      http.post(`${API_BASE}/create`, async ({ request }) => {
        capturedContentType = request.headers.get('Content-Type');
        capturedBody = await request.json();
        return HttpResponse.json({ id: '1' }, { status: 201 });
      })
    );

    await apiClient('/create', { method: 'POST', body: { name: 'test' } });

    expect(capturedContentType).toBe('application/json');
    expect(capturedBody).toEqual({ name: 'test' });
  });

  it('should return undefined for 204 No Content', async () => {
    server.use(
      http.delete(`${API_BASE}/items/1`, () => {
        return new HttpResponse(null, { status: 204 });
      })
    );

    const result = await apiClient('/items/1', { method: 'DELETE' });

    expect(result).toBeUndefined();
  });

  it('should throw ApiError for non-2xx response with detail', async () => {
    server.use(
      http.get(`${API_BASE}/not-found`, () => {
        return HttpResponse.json({ detail: 'Not found' }, { status: 404 });
      })
    );

    try {
      await apiClient('/not-found');
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(404);
      expect((err as ApiError).detail).toBe('Not found');
    }
  });

  it('should throw ApiError with message field when no detail', async () => {
    server.use(
      http.get(`${API_BASE}/error`, () => {
        return HttpResponse.json({ message: 'Server error' }, { status: 500 });
      })
    );

    try {
      await apiClient('/error');
      expect.fail('Should have thrown');
    } catch (err) {
      expect((err as ApiError).detail).toBe('Server error');
    }
  });

  it('should handle non-JSON error responses', async () => {
    server.use(
      http.get(`${API_BASE}/text-error`, () => {
        return new HttpResponse('Internal Server Error', { status: 500 });
      })
    );

    await expect(apiClient('/text-error')).rejects.toThrow(ApiError);
  });

  it('should handle auth token retrieval failure gracefully', async () => {
    let capturedAuthHeader: string | null = null;
    server.use(
      http.get(`${API_BASE}/auth-fail`, ({ request }) => {
        capturedAuthHeader = request.headers.get('Authorization');
        return HttpResponse.json({ ok: true });
      })
    );

    (getClerk as any).mockReturnValue({
      session: { getToken: vi.fn().mockRejectedValue(new Error('Token expired')) }
    });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await apiClient('/auth-fail');

    expect(capturedAuthHeader).toBeNull();
    consoleSpy.mockRestore();
  });
});

describe('API Client - Convenience Methods', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getClerk as any).mockReturnValue(null);
    (getActiveOrganizationId as any).mockReturnValue(null);
  });

  it('apiGet should make GET request', async () => {
    server.use(
      http.get(`${API_BASE}/items`, () => HttpResponse.json([{ id: '1' }]))
    );

    const result = await apiGet<any[]>('/items');
    expect(result).toEqual([{ id: '1' }]);
  });

  it('apiPost should make POST request with body', async () => {
    server.use(
      http.post(`${API_BASE}/items`, () => HttpResponse.json({ id: '1' }, { status: 201 }))
    );

    const result = await apiPost<any>('/items', { name: 'test' });
    expect(result).toEqual({ id: '1' });
  });

  it('apiPut should make PUT request with body', async () => {
    server.use(
      http.put(`${API_BASE}/items/1`, () => HttpResponse.json({ id: '1', name: 'updated' }))
    );

    const result = await apiPut<any>('/items/1', { name: 'updated' });
    expect(result).toEqual({ id: '1', name: 'updated' });
  });

  it('apiDelete should make DELETE request', async () => {
    server.use(
      http.delete(`${API_BASE}/items/1`, () => new HttpResponse(null, { status: 204 }))
    );

    const result = await apiDelete('/items/1');
    expect(result).toBeUndefined();
  });
});

describe('ApiError', () => {
  it('should create error with correct properties', () => {
    const response = new Response(null, { status: 404, statusText: 'Not Found' });
    const error = new ApiError(response, 'Resource not found');

    expect(error.name).toBe('ApiError');
    expect(error.status).toBe(404);
    expect(error.statusText).toBe('Not Found');
    expect(error.detail).toBe('Resource not found');
    expect(error.message).toBe('Resource not found');
  });

  it('should use default message when no detail', () => {
    const response = new Response(null, { status: 500, statusText: 'Internal Server Error' });
    const error = new ApiError(response);

    expect(error.message).toBe('API Error: 500 Internal Server Error');
    expect(error.detail).toBeUndefined();
  });
});

describe('API Client - apiPostBlob', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getClerk as any).mockReturnValue(null);
    (getActiveOrganizationId as any).mockReturnValue(null);
  });

  it('should return a Blob for successful response', async () => {
    const zipContent = new Uint8Array([80, 75, 3, 4]); // PK zip magic bytes
    server.use(
      http.post(`${API_BASE}/generate`, () => {
        return new HttpResponse(zipContent, {
          headers: { 'Content-Type': 'application/zip' }
        });
      })
    );

    const result = await apiPostBlob('/generate');

    expect(result).toBeDefined();
    expect(typeof result.arrayBuffer).toBe('function');
    const arrayBuffer = await result.arrayBuffer();
    expect(new Uint8Array(arrayBuffer)).toEqual(zipContent);
  });

  it('should include auth and org headers', async () => {
    let capturedAuthHeader: string | null = null;
    let capturedOrgHeader: string | null = null;
    server.use(
      http.post(`${API_BASE}/auth-blob`, ({ request }) => {
        capturedAuthHeader = request.headers.get('Authorization');
        capturedOrgHeader = request.headers.get('X-Organization-Id');
        return new HttpResponse(new Uint8Array([1]), {
          headers: { 'Content-Type': 'application/octet-stream' }
        });
      })
    );

    (getClerk as any).mockReturnValue({
      session: { getToken: vi.fn().mockResolvedValue('blob-token') }
    });
    (getActiveOrganizationId as any).mockReturnValue('org-456');

    await apiPostBlob('/auth-blob');

    expect(capturedAuthHeader).toBe('Bearer blob-token');
    expect(capturedOrgHeader).toBe('org-456');
  });

  it('should throw ApiError with detail for non-2xx response', async () => {
    server.use(
      http.post(`${API_BASE}/fail-blob`, () => {
        return HttpResponse.json({ detail: 'Insufficient credits' }, { status: 402 });
      })
    );

    try {
      await apiPostBlob('/fail-blob');
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(402);
      expect((err as ApiError).detail).toBe('Insufficient credits');
    }
  });
});
