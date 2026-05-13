/**
 * logoVariantForDataTheme tests
 *
 * Location mirrors: src/lib/utils/logoTheme.ts
 */

import { describe, it, expect } from 'vitest';
import { logoVariantForDataTheme } from '$lib/utils/logoTheme';

describe('logoVariantForDataTheme', () => {
	it('maps light theme to light logo variant', () => {
		expect(logoVariantForDataTheme('light')).toBe('light');
	});

	it('maps soft and unknown themes to dark logo variant', () => {
		expect(logoVariantForDataTheme('soft')).toBe('dark');
		expect(logoVariantForDataTheme('')).toBe('dark');
		expect(logoVariantForDataTheme(undefined)).toBe('dark');
		expect(logoVariantForDataTheme(null)).toBe('dark');
	});
});
