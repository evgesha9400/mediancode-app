// tests/unit/lib/utils/compose.test.ts
import { describe, it, expect } from 'vitest';
import { composeState } from '$lib/utils/compose';

describe('composeState', () => {
  it('merges plain values from base and extension', () => {
    const base = { a: 1, b: 2 };
    const extension = { c: 3 };
    const composed = composeState(base, extension);

    expect(composed.a).toBe(1);
    expect(composed.b).toBe(2);
    expect(composed.c).toBe(3);
  });

  it('preserves getter descriptors from base', () => {
    let counter = 0;
    const base = Object.defineProperties(
      {} as { count: number },
      {
        count: {
          get() { return ++counter; },
          enumerable: true,
          configurable: true
        }
      }
    );
    const extension = { label: 'test' };
    const composed = composeState(base, extension);

    // Each access should increment counter (getter preserved, not snapshotted)
    const first = composed.count;
    const second = composed.count;
    expect(second).toBeGreaterThan(first);
  });

  it('extension overrides base on key collision', () => {
    const base = { name: 'original' };
    const extension = { name: 'override' };
    const composed = composeState(base, extension);

    expect(composed.name).toBe('override');
  });

  it('preserves getter descriptors from extension', () => {
    let value = 'initial';
    const base = { a: 1 };
    const extension = Object.defineProperties(
      {} as { dynamic: string },
      {
        dynamic: {
          get() { return value; },
          enumerable: true,
          configurable: true
        }
      }
    );
    const composed = composeState(base, extension);

    expect(composed.dynamic).toBe('initial');
    value = 'changed';
    expect(composed.dynamic).toBe('changed');
  });
});
