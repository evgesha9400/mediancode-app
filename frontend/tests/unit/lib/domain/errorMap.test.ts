// tests/unit/lib/domain/errorMap.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('$env/dynamic/public', () => ({ env: {} }));
vi.mock('$lib/clerk', () => ({ getClerk: () => null }));
vi.mock('$lib/stores/organization', () => ({ getActiveOrganizationId: () => null }));

// ---------------------------------------------------------------------------
// Imports (after mocks — ApiError is the real class from client.ts)
// ---------------------------------------------------------------------------

import { mapApiError } from '$lib/domain/errorMap';
import { ApiError } from '$lib/api/client';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeApiError(status: number, statusText: string, detail?: string): ApiError {
  return new ApiError({ status, statusText } as Response, detail);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('mapApiError', () => {
  it('returns session expired for 401', () => {
    const err = makeApiError(401, 'Unauthorized');
    expect(mapApiError(err, 'test')).toBe('Session expired. Please sign in again.');
  });

  it('returns generation limit message for 402', () => {
    const err = makeApiError(402, 'Payment Required');
    expect(mapApiError(err, 'test')).toBe(
      'Monthly generation limit reached. Your limit resets at the start of each month.'
    );
  });

  it('returns permission denied for 403', () => {
    const err = makeApiError(403, 'Forbidden');
    expect(mapApiError(err, 'test')).toBe('Permission denied');
  });

  it('returns not found for 404', () => {
    const err = makeApiError(404, 'Not Found');
    expect(mapApiError(err, 'test')).toBe('Resource not found');
  });

  it('returns detail for 409 when detail is provided', () => {
    const err = makeApiError(409, 'Conflict', 'Duplicate name');
    expect(mapApiError(err, 'test')).toBe('Duplicate name');
  });

  it('returns default conflict message for 409 without detail', () => {
    const err = makeApiError(409, 'Conflict');
    expect(mapApiError(err, 'test')).toBe('A resource with this name already exists');
  });

  it('returns server error for status >= 500', () => {
    const err = makeApiError(500, 'Internal Server Error');
    expect(mapApiError(err, 'test')).toBe('Server error - please try again');
  });

  it('returns server error for 503', () => {
    const err = makeApiError(503, 'Service Unavailable');
    expect(mapApiError(err, 'test')).toBe('Server error - please try again');
  });

  it('returns detail for other ApiError statuses when detail is provided', () => {
    const err = makeApiError(422, 'Unprocessable Entity', 'Invalid data');
    expect(mapApiError(err, 'test')).toBe('Invalid data');
  });

  it('returns generic message for other ApiError statuses without detail', () => {
    const err = makeApiError(422, 'Unprocessable Entity');
    expect(mapApiError(err, 'test')).toContain('API Error: 422');
  });

  it('returns network error for TypeError with "fetch"', () => {
    const err = new TypeError('Failed to fetch');
    expect(mapApiError(err, 'test')).toBe('Network error - check your connection');
  });

  it('returns context-based fallback for unknown errors', () => {
    const err = new Error('Something weird');
    expect(mapApiError(err, 'create field')).toBe('Failed to create field');
  });

  it('returns context-based fallback for non-Error values', () => {
    expect(mapApiError('string error', 'delete item')).toBe('Failed to delete item');
  });
});
