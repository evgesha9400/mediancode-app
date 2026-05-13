// tests/unit/lib/components/form/GlassSelectDropdown.test.ts
import { describe, it, expect } from 'vitest';
import {
  glassSelectEmptyLabels,
  glassSelectOptionsWithEmptyFirst
} from '$lib/components/form/GlassSelectDropdown.svelte';

describe('glassSelectOptionsWithEmptyFirst', () => {
  it('prepends empty value with the given label', () => {
    const opts = glassSelectOptionsWithEmptyFirst('Pick…', [
      { value: 'a', label: 'A' }
    ]);
    expect(opts).toEqual([
      { value: '', label: 'Pick…' },
      { value: 'a', label: 'A' }
    ]);
  });
});

describe('glassSelectEmptyLabels', () => {
  it('exposes stable placeholder copy keys', () => {
    expect(glassSelectEmptyLabels.generic).toBe('Select...');
    expect(glassSelectEmptyLabels.modelField).toBe('Select a field...');
  });
});
