// tests/unit/lib/utils/urlParser.test.ts
import { describe, it, expect } from 'vitest';
import { extractPathParameters } from '$lib/utils/urlParser';

describe('extractPathParameters', () => {
  it('extracts parameters from a standard path', () => {
    expect(extractPathParameters('/users/{user_id}/posts/{post_id}')).toEqual([
      'user_id',
      'post_id'
    ]);
  });

  it('returns empty array when path has no parameters', () => {
    expect(extractPathParameters('/users/all')).toEqual([]);
  });

  it('extracts a single parameter', () => {
    expect(extractPathParameters('/items/{item_id}')).toEqual(['item_id']);
  });

  it('returns empty array for empty string', () => {
    expect(extractPathParameters('')).toEqual([]);
  });

  it('deduplicates repeated parameter names', () => {
    expect(extractPathParameters('/{id}/sub/{id}')).toEqual(['id']);
  });

  it('handles parameters at the beginning of the path', () => {
    expect(extractPathParameters('{tenant}/users')).toEqual(['tenant']);
  });

  it('handles alphanumeric and underscore parameter names', () => {
    expect(extractPathParameters('/{a1_b2}/{c3}')).toEqual(['a1_b2', 'c3']);
  });
});
