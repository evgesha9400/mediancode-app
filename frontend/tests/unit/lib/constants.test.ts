/**
 * Constants Tests
 *
 * Unit tests for global application constants.
 * Location mirrors: src/lib/constants.ts
 */

import { describe, it, expect } from 'vitest';
import { GLOBAL_NAMESPACE_ID } from '$lib/constants';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('constants', () => {
	describe('GLOBAL_NAMESPACE_ID', () => {
		it('should be a string', () => {
			expect(typeof GLOBAL_NAMESPACE_ID).toBe('string');
		});

		it('should be non-empty', () => {
			expect(GLOBAL_NAMESPACE_ID.length).toBeGreaterThan(0);
		});

		it('should match UUID format', () => {
			expect(GLOBAL_NAMESPACE_ID).toMatch(UUID_REGEX);
		});
	});
});
