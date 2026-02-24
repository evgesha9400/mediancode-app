// tests/unit/lib/utils/templatePreview.test.ts
import { describe, it, expect } from 'vitest';
import { previewBody } from '$lib/utils/templatePreview';

describe('previewBody', () => {
  it('replaces known placeholders', () => {
    expect(previewBody('Hello {{name}}!', { name: 'World' })).toBe('Hello World!');
  });

  it('leaves unknown placeholders as-is', () => {
    expect(previewBody('{{a}} and {{b}}', { a: 'X' })).toBe('X and {{b}}');
  });

  it('handles template with no placeholders', () => {
    expect(previewBody('no placeholders', {})).toBe('no placeholders');
  });

  it('replaces multiple occurrences of same placeholder', () => {
    expect(previewBody('{{x}} + {{x}}', { x: '1' })).toBe('1 + 1');
  });

  it('handles empty mappings', () => {
    expect(previewBody('{{a}}', {})).toBe('{{a}}');
  });
});
