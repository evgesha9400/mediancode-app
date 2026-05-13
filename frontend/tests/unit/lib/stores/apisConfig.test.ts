// tests/unit/lib/stores/apisConfig.test.ts
//
// Entity contract factory for APIs.

import { describe, it, expect } from 'vitest';
import { createApisContract } from '$lib/stores/apisConfig.svelte';

describe('apisConfig', () => {
	it('builds an API entity contract', () => {
		const contract = createApisContract({
			getActiveNamespaceId: () => 'ns-1',
			getEndpointCount: () => 0
		});
		expect(contract.entityLabel).toBe('API');
		expect(contract.nameKey).toBe('title');
	});
});
