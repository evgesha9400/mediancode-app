// tests/unit/lib/stores/stores.test.ts
//
// Public store barrel re-exports.

import { describe, it, expect } from 'vitest';
import { get } from 'svelte/store';
import { apisStore } from '$lib/stores/stores';

describe('stores barrel', () => {
	it('re-exports catalog stores', () => {
		expect(get(apisStore)).toEqual([]);
	});
});
