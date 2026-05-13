// tests/unit/lib/stores/storeState.test.ts
//
// Canonical writable stores for dashboard catalog data.

import { describe, it, expect } from 'vitest';
import { get } from 'svelte/store';
import { fieldsStore } from '$lib/stores/storeState';

describe('storeState', () => {
	it('initializes fields store empty', () => {
		expect(get(fieldsStore)).toEqual([]);
	});
});
