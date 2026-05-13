// tests/unit/lib/stores/namespacesConfig.test.ts
//
// Entity contract factory for namespaces.

import { describe, it, expect } from 'vitest';
import { createNamespacesContract } from '$lib/stores/namespacesConfig.svelte';

describe('namespacesConfig', () => {
	it('builds a namespace entity contract', () => {
		const contract = createNamespacesContract({
			getNamespaceEntityDetails: () => ({
				total: 0,
				fields: 0,
				fieldConstraints: 0,
				objects: 0,
				endpoints: 0
			})
		});
		expect(contract.entityLabel).toBe('Namespace');
		expect(contract.nameKey).toBe('name');
	});
});
