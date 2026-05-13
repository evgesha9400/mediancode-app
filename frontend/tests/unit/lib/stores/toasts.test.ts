import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { get } from 'svelte/store';
import { toastsStore, showToast, dismissToast } from '$lib/stores/toasts';

describe('toasts store', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    toastsStore.set([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should start with empty toasts', () => {
    expect(get(toastsStore)).toHaveLength(0);
  });

  it('should add a toast with correct properties', () => {
    showToast('Hello', 'info', 5000);

    const toasts = get(toastsStore);
    expect(toasts).toHaveLength(1);
    expect(toasts[0].message).toBe('Hello');
    expect(toasts[0].type).toBe('info');
    expect(toasts[0].duration).toBe(5000);
    expect(toasts[0].id).toMatch(/^toast-/);
  });

  it('should default type to success and duration to 3000', () => {
    showToast('Default toast');

    const toasts = get(toastsStore);
    expect(toasts[0].type).toBe('success');
    expect(toasts[0].duration).toBe(3000);
  });

  it('should auto-dismiss after duration', () => {
    showToast('Temporary', 'success', 2000);

    expect(get(toastsStore)).toHaveLength(1);

    vi.advanceTimersByTime(2000);

    expect(get(toastsStore)).toHaveLength(0);
  });

  it('should not auto-dismiss when duration is 0', () => {
    showToast('Persistent', 'error', 0);

    vi.advanceTimersByTime(10000);

    expect(get(toastsStore)).toHaveLength(1);
  });

  it('should dismiss a toast by ID', () => {
    showToast('Toast 1', 'success', 0);
    showToast('Toast 2', 'error', 0);

    const toasts = get(toastsStore);
    expect(toasts).toHaveLength(2);

    dismissToast(toasts[0].id);

    const remaining = get(toastsStore);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].message).toBe('Toast 2');
  });

  it('should handle dismissing unknown ID gracefully', () => {
    showToast('Toast', 'success', 0);

    dismissToast('nonexistent-id');

    expect(get(toastsStore)).toHaveLength(1);
  });

  it('should handle multiple concurrent toasts', () => {
    showToast('First', 'success', 0);
    showToast('Second', 'error', 0);
    showToast('Third', 'warning', 0);

    expect(get(toastsStore)).toHaveLength(3);
  });

  it('should generate unique IDs for each toast', () => {
    showToast('A', 'success', 0);
    showToast('B', 'success', 0);

    const toasts = get(toastsStore);
    expect(toasts[0].id).not.toBe(toasts[1].id);
  });
});
