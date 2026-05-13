// tests/unit/lib/stores/fieldsConfig.test.ts
//
// Entity contract factory for fields.

import { describe, it, expect } from 'vitest';
import { createFieldsContract } from '$lib/stores/fieldsConfig.svelte';

describe('fieldsConfig', () => {
	it('builds a field entity contract', () => {
		const contract = createFieldsContract({
			getActiveNamespaceId: () => 'ns-1',
			getDefaultType: () => 'str',
			getTypeIdByName: () => 'type-1'
		});
		expect(contract.entityLabel).toBe('Field');
		expect(contract.nameKey).toBe('name');
	});
});
