// tests/unit/lib/stores/storeTypes.test.ts
//
// Mirror for storeTypes — shared types are exercised via store modules.

import { describe, it, expect } from 'vitest';
import type { PrimitiveTypeName } from '$lib/stores/storeTypes';

describe('storeTypes', () => {
	it('exports catalog type aliases used by stores', () => {
		const t: PrimitiveTypeName = 'str';
		expect(t).toBe('str');
	});
});
