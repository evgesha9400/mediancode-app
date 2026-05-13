// tests/unit/lib/utils/namespace.test.ts
import { describe, it, expect } from 'vitest';
import { GLOBAL_NAMESPACE_ID, SYSTEM_NAMESPACE_ID, isSystemEntity } from '$lib/utils/namespace';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('SYSTEM_NAMESPACE_ID', () => {
  it('has the expected UUID value', () => {
    expect(SYSTEM_NAMESPACE_ID).toBe('00000000-0000-0000-0000-000000000001');
  });
});

describe('GLOBAL_NAMESPACE_ID', () => {
  it('matches SYSTEM_NAMESPACE_ID', () => {
    expect(GLOBAL_NAMESPACE_ID).toBe(SYSTEM_NAMESPACE_ID);
  });

  it('matches UUID format', () => {
    expect(GLOBAL_NAMESPACE_ID).toMatch(UUID_REGEX);
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
