// tests/unit/lib/utils/namespace.test.ts
import { describe, it, expect } from 'vitest';
import { SYSTEM_NAMESPACE_ID, isSystemEntity } from '$lib/utils/namespace';

describe('SYSTEM_NAMESPACE_ID', () => {
  it('has the expected UUID value', () => {
    expect(SYSTEM_NAMESPACE_ID).toBe('00000000-0000-0000-0000-000000000001');
  });
});

describe('isSystemEntity', () => {
  it('returns true when entity has system namespace ID', () => {
    expect(isSystemEntity({ namespaceId: SYSTEM_NAMESPACE_ID })).toBe(true);
  });

  it('returns false when entity has a different namespace ID', () => {
    expect(isSystemEntity({ namespaceId: 'user-ns-123' })).toBe(false);
  });

  it('returns false for empty string namespace ID', () => {
    expect(isSystemEntity({ namespaceId: '' })).toBe(false);
  });
});
