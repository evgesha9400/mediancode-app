// tests/unit/lib/stores/objectsConfig.test.ts
//
// Entity contract factory for objects.

import { describe, it, expect } from 'vitest';
import { createObjectsContract } from '$lib/stores/objectsConfig.svelte';

describe('objectsConfig', () => {
	it('builds an object entity contract', () => {
		const contract = createObjectsContract({
			getActiveNamespaceId: () => 'ns-1'
		});
		expect(contract.entityLabel).toBe('Object');
		expect(contract.nameKey).toBe('name');
	});
});
